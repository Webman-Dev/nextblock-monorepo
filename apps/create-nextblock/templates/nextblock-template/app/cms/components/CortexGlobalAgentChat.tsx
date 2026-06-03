"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Brain,
  CheckCircle2,
  History,
  Loader2,
  MessageSquarePlus,
  Send,
  Trash2,
  Wrench,
  XCircle,
} from "lucide-react";

import { Button } from "@nextblock-cms/ui";
import { Textarea } from "@nextblock-cms/ui";
import { cn } from "@nextblock-cms/utils";
import {
  useCortexAiPageContext,
  type CortexAiPageContext,
} from "./CortexAiPageContext";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  content: string;
  id: string;
  role: ChatRole;
};

type ChatThread = {
  createdAt: string;
  id: string;
  messages: ChatMessage[];
  title: string;
  updatedAt: string;
};

type ToolActivity = {
  id: string;
  input?: unknown;
  name: string;
  output?: unknown;
  status: "error" | "running" | "success";
};

type ConfirmedToolCall = {
  confirmationPhrase: string;
  input: unknown;
  toolName: string;
};

type CortexAgentStreamEvent =
  | {
      credentialSource: string;
      modelId: string;
      type: "meta";
    }
  | {
      text: string;
      type: "text-delta";
    }
  | {
      input?: unknown;
      toolCallId?: string;
      toolName: string;
      type: "tool-call";
    }
  | {
      output?: unknown;
      toolCallId?: string;
      toolName: string;
      type: "tool-result";
    }
  | {
      message: string;
      toolCallId?: string;
      toolName?: string;
      type: "tool-error";
    }
  | {
      message: string;
      type: "error";
    }
  | {
      type: "finish";
    };

const LEGACY_STORAGE_KEY = "nextblock-cortex-global-agent-chat";
const THREADS_STORAGE_KEY = "nextblock-cortex-global-agent-chat-threads";
const MAX_STORED_MESSAGES = 40;
const MAX_STORED_THREADS = 20;
const REQUEST_TIMEOUT_MS = 90000;
const CORTEX_AI_SETTINGS_CHANGED_EVENT = "nextblock:cortex-ai-settings-changed";
const MUTATING_TOOL_NAMES = new Set([
  "create_cms_page",
  "create_cms_post",
  "create_cms_product",
  "create_custom_block",
  "delete_cms_item",
  "delete_custom_block",
  "execute_database_action_plan",
  "execute_database_mutation",
  "execute_cms_action_plan",
  "insert_content_block",
  "update_cms_item_field",
  "update_current_cms_fields",
  "update_content_block",
  "update_custom_block",
  "update_footer",
  "update_navigation_bar",
  "update_section_column_block",
]);

// Window event fired after a Cortex mutation so client-rendered lists that fetch
// their own data (e.g. the custom blocks library) can refresh without a full reload.
export const CORTEX_DATA_CHANGED_EVENT = "nextblock:cortex-data-changed";

const TOOL_COPY: Record<string, { done: string; running: string }> = {
  search_documentation: {
    done: "Documentation searched",
    running: "Searching documentation...",
  },
  create_cms_page: {
    done: "Page created",
    running: "Preparing page...",
  },
  create_cms_post: {
    done: "Post created",
    running: "Preparing post...",
  },
  create_cms_product: {
    done: "Product created",
    running: "Preparing product...",
  },
  create_custom_block: {
    done: "Custom block created",
    running: "Designing custom block...",
  },
  update_custom_block: {
    done: "Custom block updated",
    running: "Updating custom block...",
  },
  delete_custom_block: {
    done: "Custom block deleted",
    running: "Preparing delete...",
  },
  list_custom_blocks: {
    done: "Custom blocks listed",
    running: "Listing custom blocks...",
  },
  execute_cms_action_plan: {
    done: "CMS plan completed",
    running: "Preparing CMS plan...",
  },
  describe_database_schema: {
    done: "Database schema inspected",
    running: "Inspecting database schema...",
  },
  execute_database_action_plan: {
    done: "Database plan completed",
    running: "Preparing database plan...",
  },
  execute_database_mutation: {
    done: "Database updated",
    running: "Preparing database update...",
  },
  read_database_records: {
    done: "Database records read",
    running: "Reading database records...",
  },
  insert_content_block: {
    done: "Content block inserted",
    running: "Inserting content block...",
  },
  delete_cms_item: {
    done: "CMS item deleted",
    running: "Preparing delete...",
  },
  prepare_delete_cms_item: {
    done: "Delete reviewed",
    running: "Reviewing delete...",
  },
  update_footer: {
    done: "Footer updated",
    running: "Updating footer...",
  },
  update_navigation_bar: {
    done: "Navigation bar updated",
    running: "Updating navigation bar...",
  },
  read_current_cms_item: {
    done: "Current item read",
    running: "Reading current item...",
  },
  update_current_cms_fields: {
    done: "Current item updated",
    running: "Updating current item...",
  },
  update_cms_item_field: {
    done: "CMS field updated",
    running: "Preparing field update...",
  },
  update_content_block: {
    done: "Content block updated",
    running: "Updating content block...",
  },
  update_section_column_block: {
    done: "Section block updated",
    running: "Updating section block...",
  },
};

function buildFallbackPageContext(pathname: string | null): CortexAiPageContext | null {
  if (!pathname) {
    return null;
  }

  const pageMatch = pathname.match(/^\/cms\/pages\/(\d+)\/edit$/);
  if (pageMatch?.[1]) {
    return { contentType: "page", entityId: Number(pageMatch[1]) };
  }

  const postMatch = pathname.match(/^\/cms\/posts\/(\d+)\/edit$/);
  if (postMatch?.[1]) {
    return { contentType: "post", entityId: Number(postMatch[1]) };
  }

  const productMatch = pathname.match(/^\/cms\/products\/([^/]+)\/edit$/);
  if (productMatch?.[1]) {
    return { contentType: "product", entityId: productMatch[1] };
  }

  return null;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function isChatMessage(message: unknown): message is ChatMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Partial<ChatMessage>;

  return (
    typeof candidate.id === "string" &&
    (candidate.role === "assistant" || candidate.role === "user") &&
    typeof candidate.content === "string"
  );
}

function sanitizeMessages(messages: unknown) {
  return Array.isArray(messages)
    ? messages.filter(isChatMessage).slice(-MAX_STORED_MESSAGES)
    : [];
}

function getThreadTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user")?.content.trim();

  if (!firstUserMessage) {
    return "New chat";
  }

  return firstUserMessage.length > 44 ? `${firstUserMessage.slice(0, 41)}...` : firstUserMessage;
}

function createChatThread(messages: ChatMessage[] = []): ChatThread {
  const now = new Date().toISOString();

  return {
    createdAt: now,
    id: createId(),
    messages,
    title: getThreadTitle(messages),
    updatedAt: now,
  };
}

function isChatThread(thread: unknown): thread is ChatThread {
  if (!thread || typeof thread !== "object") {
    return false;
  }

  const candidate = thread as Partial<ChatThread>;

  return (
    typeof candidate.id === "string" &&
    Array.isArray(candidate.messages)
  );
}

function readStoredThreads() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(THREADS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    const threads = Array.isArray(parsed)
      ? parsed.filter(isChatThread).map((thread) => {
          const messages = sanitizeMessages(thread.messages);
          const now = new Date().toISOString();

          return {
            createdAt: typeof thread.createdAt === "string" ? thread.createdAt : now,
            id: thread.id,
            messages,
            title: typeof thread.title === "string" ? thread.title : getThreadTitle(messages),
            updatedAt: typeof thread.updatedAt === "string" ? thread.updatedAt : now,
          };
        })
      : [];

    if (threads.length > 0) {
      return threads
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, MAX_STORED_THREADS);
    }

    const legacyMessages = sanitizeMessages(
      JSON.parse(window.sessionStorage.getItem(LEGACY_STORAGE_KEY) || "[]")
    );

    if (legacyMessages.length > 0) {
      return [createChatThread(legacyMessages)];
    }
  } catch {
    return [];
  }

  return [];
}

function formatThreadTime(value: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(timestamp));
}

function getToolCopy(name: string) {
  return (
    TOOL_COPY[name] || {
      done: "Tool finished",
      running: "Running tool...",
    }
  );
}

function isMutatingToolName(name: string | undefined) {
  return Boolean(name && MUTATING_TOOL_NAMES.has(name));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toolOutputRequiresConfirmation(output: unknown) {
  return isRecord(output) && output.requiresConfirmation === true;
}

function toolOutputExecutedMutation(output: unknown) {
  return isRecord(output) && output.mutationExecuted === true;
}

function toolOutputIsNotice(output: unknown) {
  return isRecord(output) && (output.success === false || output.unsupported === true);
}

function getToolOutputNavigationPath(output: unknown) {
  if (!toolOutputExecutedMutation(output) || !isRecord(output)) {
    return null;
  }

  const path = output.editPath || output.redirectPath;

  return typeof path === "string" && path.startsWith("/") ? path : null;
}

function readNumberField(value: unknown, key: string) {
  if (!isRecord(value)) {
    return null;
  }

  const parsed = Number(value[key]);

  return Number.isFinite(parsed) ? parsed : null;
}

function readStringField(value: unknown, key: string) {
  if (!isRecord(value)) {
    return null;
  }

  const fieldValue = value[key];

  return typeof fieldValue === "string" ? fieldValue : null;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getConfirmationSummary(activity: ToolActivity) {
  if (!isRecord(activity.output) || !isRecord(activity.output.preview)) {
    return "Complete the requested change.";
  }

  const preview = activity.output.preview;
  const summary = readStringField(preview, "summary");

  if (summary) {
    const actionSummaries = Array.isArray(preview.actionSummaries)
      ? preview.actionSummaries.filter((item): item is string => typeof item === "string")
      : [];

    return actionSummaries.length > 0
      ? `${summary}\n\n${actionSummaries
          .map((item, index) => `${index + 1}. ${item}`)
          .join("\n")}`
      : summary;
  }

  const title = readStringField(preview, "title");
  const slug = readStringField(preview, "slug");
  const status = readStringField(preview, "status");
  const contentType = readStringField(preview, "contentType");
  const field = readStringField(preview, "field");
  const mode = readStringField(preview, "mode");
  const languageCode = readStringField(preview, "languageCode");
  const blockCount = readNumberField(preview, "blockCount");
  const itemCount = readNumberField(preview, "itemCount");
  const affectedCount = readNumberField(preview, "affectedCount");

  if (activity.name === "create_cms_page" || activity.name === "create_cms_post") {
    return `Create ${status || "draft"} ${activity.name === "create_cms_page" ? "page" : "post"} "${title || slug || "Untitled"}"${slug ? ` at slug "${slug}"` : ""}${blockCount !== null ? ` with ${pluralize(blockCount, "content block")}` : ""}.`;
  }

  if (activity.name === "create_cms_product") {
    return `Create ${status || "draft"} product "${title || slug || "Untitled"}"${slug ? ` at slug "${slug}"` : ""}.`;
  }

  if (activity.name === "update_cms_item_field") {
    return `Update ${field || "one field"} on the ${contentType || "CMS item"} "${title || slug || "selected item"}".`;
  }

  if (activity.name === "update_navigation_bar") {
    return `${mode === "append" ? "Add" : mode === "update" ? "Update" : "Replace"} ${itemCount !== null ? pluralize(itemCount, "navigation item") : "navigation items"} in the ${languageCode || "selected"} header navigation.`;
  }

  if (activity.name === "update_footer") {
    const linkCount = readNumberField(preview, "linkCount");
    return `Update the ${languageCode || "selected"} footer${linkCount !== null ? ` with ${pluralize(linkCount, "link")}` : ""}.`;
  }

  if (activity.name === "update_content_block") {
    return `Update the selected ${readStringField(preview, "blockType") || "content"} block.`;
  }

  if (activity.name === "insert_content_block") {
    return `Insert ${readStringField(preview, "blockType") || "content"} block on the ${contentType || "CMS item"} "${title || slug || "selected item"}".`;
  }

  if (activity.name === "update_section_column_block") {
    return `Update the selected nested ${readStringField(preview, "nestedBlockType") || "section"} block.`;
  }

  if (activity.name === "delete_cms_item" || activity.name === "prepare_delete_cms_item") {
    return `Delete ${affectedCount !== null ? pluralize(affectedCount, contentType || "CMS item") : `the selected ${contentType || "CMS item"}`}${title || slug ? ` for "${title || slug}"` : ""}.`;
  }

  return "Complete the requested change.";
}

function getConfirmedToolCall(activity: ToolActivity): ConfirmedToolCall | null {
  if (!toolOutputRequiresConfirmation(activity.output) || !isRecord(activity.output)) {
    return null;
  }

  const confirmationPhrase = activity.output.confirmationPhrase;

  if (typeof confirmationPhrase !== "string" || !activity.input) {
    return null;
  }

  return {
    confirmationPhrase,
    input: activity.input,
    toolName: activity.name === "prepare_delete_cms_item" ? "delete_cms_item" : activity.name,
  };
}

function getConfirmationKey(activity: ToolActivity) {
  if (!toolOutputRequiresConfirmation(activity.output) || !isRecord(activity.output)) {
    return null;
  }

  const phrase = activity.output.confirmationPhrase;

  if (typeof phrase === "string" && phrase.trim()) {
    return phrase;
  }

  return `${activity.name}:${getConfirmationSummary(activity)}`;
}

function getToolActivityDetail(activity: ToolActivity) {
  if (activity.status === "error" && isRecord(activity.output)) {
    const error = activity.output.error;

    return typeof error === "string" ? error : null;
  }

  if (!isRecord(activity.output)) {
    return null;
  }

  if (activity.output.requiresConfirmation === true) {
    return getConfirmationSummary(activity);
  }

  if (activity.output.unsupported === true || activity.output.success === false) {
    const message = activity.output.message;

    return typeof message === "string" ? message : null;
  }

  return null;
}

function getToolActivityId(event: { toolCallId?: string; toolName?: string }) {
  return event.toolCallId || `${event.toolName || "tool"}-${Date.now()}`;
}

function findMatchingToolActivityIndex(
  activities: ToolActivity[],
  event: { toolCallId?: string; toolName?: string }
) {
  if (event.toolCallId) {
    const exactIndex = activities.findIndex((activity) => activity.id === event.toolCallId);

    if (exactIndex >= 0) {
      return exactIndex;
    }
  }

  for (let index = activities.length - 1; index >= 0; index--) {
    const activity = activities[index];

    if (activity.name === event.toolName && activity.status === "running") {
      return index;
    }
  }

  return -1;
}

function parseStreamFrame(frame: string): CortexAgentStreamEvent | null {
  const data = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  if (!data) {
    return null;
  }

  return JSON.parse(data) as CortexAgentStreamEvent;
}

function FormattedText({ text }: { text: string }) {
  // Handle bold (**text**) and inline code (`text`)
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[11px] dark:bg-slate-800"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}

function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="mb-3 mt-1 list-disc space-y-1 pl-5">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check for bullet points (* or -)
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const text = line.slice(line.indexOf(trimmed[0]) + 2);
      currentList.push(
        <li key={`li-${index}`}>
          <FormattedText text={text} />
        </li>
      );
    } else if (trimmed === "" && currentList.length > 0) {
      // Empty line breaks the list
      flushList();
    } else if (trimmed !== "") {
      // Regular line
      flushList();
      elements.push(
        <p key={`p-${index}`} className="mb-2 last:mb-0">
          <FormattedText text={line} />
        </p>
      );
    } else {
      // Empty line (not in list)
      flushList();
      if (index < lines.length - 1) {
        elements.push(<div key={`br-${index}`} className="h-2" />);
      }
    }
  });

  flushList();

  return <div className="markdown-content">{elements}</div>;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[86%] break-words rounded-lg px-3 py-2 text-sm leading-6",
          isUser
            ? "bg-primary text-primary-foreground whitespace-pre-wrap"
            : "border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        )}
      >
        {message.content ? (
          isUser ? (
            message.content
          ) : (
            <MarkdownContent content={message.content} />
          )
        ) : (
          <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </span>
        )}
      </div>
    </div>
  );
}

function ToolActivityRow({
  activity,
  disabled,
  onCancel,
  onConfirm,
}: {
  activity: ToolActivity;
  disabled?: boolean;
  onCancel: (activity: ToolActivity) => void;
  onConfirm: (toolCall: ConfirmedToolCall) => void;
}) {
  const copy = getToolCopy(activity.name);
  const requiresConfirmation = toolOutputRequiresConfirmation(activity.output);
  const isNotice = toolOutputIsNotice(activity.output);
  const detail = getToolActivityDetail(activity);
  const confirmedToolCall = getConfirmedToolCall(activity);
  const label =
    activity.status === "running"
      ? copy.running
      : activity.status === "success"
        ? requiresConfirmation
          ? "Confirmation needed"
          : isNotice
            ? "Tool notice"
            : copy.done
        : "Tool failed";
  const iconState =
    activity.status === "running"
      ? "running"
      : activity.status === "success" && !isNotice
        ? "success"
        : "error";
  const row = (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      {iconState === "running" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      ) : iconState === "success" ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-destructive" />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {confirmedToolCall ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            className="h-7 rounded-md px-2.5 text-xs"
            disabled={disabled}
            onClick={() => onConfirm(confirmedToolCall)}
            type="button"
          >
            Confirm
          </Button>
          <Button
            className="h-7 rounded-md px-2.5 text-xs"
            disabled={disabled}
            onClick={() => onCancel(activity)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Wrench className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      )}
    </div>
  );

  if (confirmedToolCall) {
    return (
      <div className="rounded-md">
        {row}
        {detail && (
          <div className="mt-1 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {detail}
          </div>
        )}
      </div>
    );
  }

  if (!detail) {
    return row;
  }

  return (
    <details className="group rounded-md">
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
        {row}
      </summary>
      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
        {detail}
      </pre>
    </details>
  );
}

export function CortexGlobalAgentChat() {
  const pathname = usePathname();
  const router = useRouter();
  const cortexAiPageContext = useCortexAiPageContext();
  const [isMounted, setIsMounted] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [toolActivities, setToolActivities] = useState<ToolActivity[]>([]);
  const [cancelledConfirmationKeys, setCancelledConfirmationKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [, setMetadata] = useState<{ credentialSource: string; modelId: string } | null>(
    null
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingRefreshPathRef = useRef<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedThreads = readStoredThreads();
    const initialThreads = storedThreads.length > 0 ? storedThreads : [createChatThread()];

    setThreads(initialThreads);
    setActiveThreadId(initialThreads[0]?.id ?? null);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || threads.length === 0) {
      return;
    }

    try {
      window.localStorage.setItem(
        THREADS_STORAGE_KEY,
        JSON.stringify(threads.slice(0, MAX_STORED_THREADS))
      );
    } catch {
      // Ignore storage failures in private browsing or locked-down environments.
    }
  }, [isMounted, threads]);

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({
      behavior: "smooth",
      top: scrollAreaRef.current.scrollHeight,
    });
  }, [activeThreadId, threads, toolActivities]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    const resetProviderMetadata = () => setMetadata(null);

    window.addEventListener(CORTEX_AI_SETTINGS_CHANGED_EVENT, resetProviderMetadata);

    return () => {
      window.removeEventListener(CORTEX_AI_SETTINGS_CHANGED_EVENT, resetProviderMetadata);
    };
  }, []);

  useEffect(() => {
    if (!pendingRefreshPathRef.current || pendingRefreshPathRef.current !== pathname) {
      return;
    }

    pendingRefreshPathRef.current = null;
    router.refresh();
  }, [pathname, router]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  );
  const messages = activeThread?.messages ?? [];
  const canSubmit = useMemo(() => input.trim().length > 0 && !isStreaming, [input, isStreaming]);
  const fallbackPageContext = useMemo(() => buildFallbackPageContext(pathname), [pathname]);
  const pageContext = cortexAiPageContext?.pageContext ?? fallbackPageContext;
  const hasSuccessfulMutationActivity = useMemo(
    () =>
      toolActivities.some(
        (activity) =>
          activity.status === "success" &&
          isMutatingToolName(activity.name) &&
          toolOutputExecutedMutation(activity.output)
      ),
    [toolActivities]
  );
  const visibleToolActivities = useMemo(
    () =>
      toolActivities.filter((activity, index) => {
        if (hasSuccessfulMutationActivity && activity.status === "error") {
          return false;
        }

        if (activity.status !== "error") {
          const confirmationKey = getConfirmationKey(activity);

          if (confirmationKey) {
            if (cancelledConfirmationKeys.has(confirmationKey)) {
              return false;
            }

            return !toolActivities
              .slice(index + 1)
              .some((nextActivity) => getConfirmationKey(nextActivity) === confirmationKey);
          }

          return true;
        }

        return !toolActivities
          .slice(index + 1)
          .some((nextActivity) => nextActivity.status === "success" && !toolOutputIsNotice(nextActivity.output));
      }),
    [cancelledConfirmationKeys, hasSuccessfulMutationActivity, toolActivities]
  );

  const updateThreadMessages = (
    threadId: string,
    updater: (currentMessages: ChatMessage[]) => ChatMessage[]
  ) => {
    setThreads((currentThreads) => {
      let updatedThread: ChatThread | null = null;
      const remainingThreads: ChatThread[] = [];

      for (const thread of currentThreads) {
        if (thread.id === threadId) {
          const nextMessages = updater(thread.messages).slice(-MAX_STORED_MESSAGES);
          updatedThread = {
            ...thread,
            messages: nextMessages,
            title: getThreadTitle(nextMessages),
            updatedAt: new Date().toISOString(),
          };
        } else {
          remainingThreads.push(thread);
        }
      }

      if (!updatedThread) {
        return currentThreads;
      }

      return [updatedThread, ...remainingThreads].slice(0, MAX_STORED_THREADS);
    });
  };

  const createNewThread = () => {
    if (isStreaming) {
      return;
    }

    const thread = createChatThread();

    setThreads((currentThreads) => [thread, ...currentThreads].slice(0, MAX_STORED_THREADS));
    setActiveThreadId(thread.id);
    setInput("");
    setStreamError(null);
    setToolActivities([]);
    setCancelledConfirmationKeys(new Set());
    setShowHistory(false);
  };

  const selectThread = (threadId: string) => {
    if (isStreaming) {
      return;
    }

    setActiveThreadId(threadId);
    setStreamError(null);
    setToolActivities([]);
    setCancelledConfirmationKeys(new Set());
    setShowHistory(false);
  };

  const deleteThread = (threadId: string) => {
    if (isStreaming) {
      return;
    }

    const nextThreads = threads.filter((thread) => thread.id !== threadId);
    const normalizedThreads = nextThreads.length > 0 ? nextThreads : [createChatThread()];

    setThreads(normalizedThreads);

    if (activeThreadId === threadId || !normalizedThreads.some((thread) => thread.id === activeThreadId)) {
      setActiveThreadId(normalizedThreads[0]?.id ?? null);
      setStreamError(null);
      setToolActivities([]);
    }
  };

  const applyStreamEvent = (
    event: CortexAgentStreamEvent,
    assistantId: string,
    threadId: string
  ) => {
    if (event.type === "meta") {
      setMetadata({
        credentialSource: event.credentialSource,
        modelId: event.modelId,
      });
      return;
    }

    if (event.type === "text-delta") {
      updateThreadMessages(threadId, (currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantId
            ? { ...message, content: `${message.content}${event.text}` }
            : message
        )
      );
      return;
    }

    if (event.type === "tool-call") {
      const id = getToolActivityId(event);
      setToolActivities((current) => [
        ...current,
        {
          id,
          input: event.input,
          name: event.toolName,
          status: "running",
        },
      ]);
      return;
    }

    if (event.type === "tool-result") {
      if (isRecord(event.output) && event.output.success !== false) {
        setStreamError(null);
      }

      setToolActivities((current) => {
        const activityIndex = findMatchingToolActivityIndex(current, event);

        if (activityIndex < 0) {
          return [
            ...current,
            {
              id: getToolActivityId(event),
              name: event.toolName,
              output: event.output,
              status: "success",
            },
          ];
        }

        return current.map((activity, index) =>
          index === activityIndex
            ? {
                ...activity,
                output: event.output,
                status: "success",
              }
            : activity
        );
      });
      return;
    }

    if (event.type === "tool-error") {
      setToolActivities((current) => {
        const activityIndex = findMatchingToolActivityIndex(current, event);

        if (activityIndex < 0) {
          return [
            ...current,
            {
              id: getToolActivityId(event),
              name: event.toolName || "tool",
              output: { error: event.message },
              status: "error",
            },
          ];
        }

        return current.map((activity, index) =>
          index === activityIndex
            ? {
                ...activity,
                output: { error: event.message },
                status: "error",
              }
            : activity
        );
      });
      setStreamError(event.message);
      return;
    }

    if (event.type === "error") {
      setStreamError(event.message);
      updateThreadMessages(threadId, (currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantId && !message.content
            ? { ...message, content: event.message }
            : message
        )
      );
    }
  };

  const sendMessage = async (options?: {
    confirmedToolCall?: ConfirmedToolCall;
    displayContent?: string;
    prompt?: string;
  }) => {
    const prompt = (options?.prompt ?? input).trim();
    const displayContent = (options?.displayContent ?? prompt).trim();

    if (!prompt || isStreaming) {
      return;
    }

    const userMessage: ChatMessage = {
      content: displayContent || prompt,
      id: createId(),
      role: "user",
    };
    const assistantMessage: ChatMessage = {
      content: "",
      id: createId(),
      role: "assistant",
    };
    let threadId = activeThread?.id ?? activeThreadId;
    const currentMessages = activeThread?.messages ?? [];
    const requestMessages = [...currentMessages, userMessage].slice(-20).map(({ content, role }) => ({
      content,
      role,
    }));
    const abortController = new AbortController();
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      abortController.abort();
    }, REQUEST_TIMEOUT_MS);

    if (!threadId) {
      const thread = createChatThread([userMessage, assistantMessage]);

      threadId = thread.id;
      setThreads((currentThreads) => [thread, ...currentThreads].slice(0, MAX_STORED_THREADS));
      setActiveThreadId(thread.id);
    } else {
      updateThreadMessages(threadId, (threadMessages) => [
        ...threadMessages,
        userMessage,
        assistantMessage,
      ]);
    }

    abortControllerRef.current = abortController;
    setInput("");
    setStreamError(null);
    setToolActivities([]);
    setCancelledConfirmationKeys(new Set());
    setIsStreaming(true);
    setShowHistory(false);
    let shouldRefreshAfterMutation = false;
    let navigationPath: string | null = null;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (process.env.NEXT_PUBLIC_IS_SANDBOX === "true") {
        const sandboxKey = window.localStorage.getItem("cortex_ai_sandbox_openrouter_api_key");
        const sandboxModel = window.localStorage.getItem("cortex_ai_sandbox_openrouter_model_selection");
        if (sandboxKey) {
          headers["x-sandbox-openrouter-key"] = sandboxKey;
        }
        if (sandboxModel) {
          headers["x-sandbox-openrouter-model"] = sandboxModel;
        }
      }

      const response = await fetch("/api/ai/global-agent", {
        body: JSON.stringify({
          ...(options?.confirmedToolCall ? { confirmedToolCall: options.confirmedToolCall } : {}),
          messages: requestMessages,
          ...(pageContext ? { pageContext } : {}),
        }),
        headers,
        method: "POST",
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || "Cortex AI request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawFinish = false;

      while (!sawFinish) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";

        for (const frame of frames) {
          const event = parseStreamFrame(frame);

          if (event) {
            if (
              event.type === "tool-result" &&
              isMutatingToolName(event.toolName) &&
              toolOutputExecutedMutation(event.output)
            ) {
              navigationPath = getToolOutputNavigationPath(event.output) || navigationPath;
              shouldRefreshAfterMutation = true;
            }

            applyStreamEvent(event, assistantMessage.id, threadId);

            if (event.type === "finish") {
              sawFinish = true;
              await reader.cancel().catch(() => undefined);
              break;
            }
          }
        }
      }

      if (!sawFinish && buffer.trim()) {
        const event = parseStreamFrame(buffer);

        if (event) {
          if (
            event.type === "tool-result" &&
            isMutatingToolName(event.toolName) &&
            toolOutputExecutedMutation(event.output)
          ) {
            navigationPath = getToolOutputNavigationPath(event.output) || navigationPath;
            shouldRefreshAfterMutation = true;
          }

          applyStreamEvent(event, assistantMessage.id, threadId);
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        if (!timedOut) {
          return;
        }
      }

      const message = timedOut
        ? "Cortex AI took too long to respond. Please try again."
        : error instanceof Error
          ? error.message
          : "Cortex AI request failed.";
      setStreamError(message);
      setToolActivities((current) =>
        current.map((activity) =>
          activity.status === "running"
            ? {
                ...activity,
                output: { error: message },
                status: "error",
              }
            : activity
        )
      );
      updateThreadMessages(threadId, (threadMessages) =>
        threadMessages.map((chatMessage) =>
          chatMessage.id === assistantMessage.id
            ? { ...chatMessage, content: chatMessage.content || message }
            : chatMessage
        )
      );
    } finally {
      window.clearTimeout(timeoutId);
      if (shouldRefreshAfterMutation && typeof window !== "undefined") {
        // Let client-rendered lists (e.g. the custom blocks library) refetch even
        // though router.refresh() does not re-run their mount-time data fetch.
        window.dispatchEvent(new Event(CORTEX_DATA_CHANGED_EVENT));
      }
      if (navigationPath) {
        if (shouldRefreshAfterMutation) {
          pendingRefreshPathRef.current = navigationPath;
        }

        router.push(navigationPath);

        if (shouldRefreshAfterMutation && pathname === navigationPath) {
          pendingRefreshPathRef.current = null;
          router.refresh();
        }
      } else if (shouldRefreshAfterMutation) {
        router.refresh();
      }
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const cancelToolCall = (activity: ToolActivity) => {
    const confirmationKey = getConfirmationKey(activity);

    if (confirmationKey) {
      setCancelledConfirmationKeys((current) => {
        const next = new Set(current);
        next.add(confirmationKey);
        return next;
      });
    }
  };

  const confirmToolCall = (toolCall: ConfirmedToolCall) => {
    void sendMessage({
      confirmedToolCall: toolCall,
      displayContent: "Confirmed",
      prompt: toolCall.confirmationPhrase,
    });
  };

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <Button
        aria-label="NextBlock Cortex AI"
        className="fixed bottom-20 right-4 z-50 h-12 w-12 rounded-full shadow-lg md:bottom-5"
        onClick={() => setOpen((current) => !current)}
        size="icon"
        title="NextBlock Cortex AI"
      >
        <Brain className="h-6 w-6" />
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:pointer-events-none md:bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed bottom-0 right-0 top-16 z-50 flex w-[calc(100vw-1rem)] translate-x-full flex-col overflow-hidden border-l border-slate-200 bg-background shadow-2xl transition-transform duration-300 dark:border-slate-800 sm:max-w-md md:top-0",
          open && "translate-x-0"
        )}
      >
        <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Brain className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold text-foreground">
                NextBlock Cortex AI
              </h2>
            </div>
            <Button
              disabled={isStreaming}
              onClick={() => setShowHistory((current) => !current)}
              size="icon"
              title="Chat history"
              variant={showHistory ? "outline" : "ghost"}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              disabled={isStreaming}
              onClick={createNewThread}
              size="icon"
              title="New chat"
              variant="ghost"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setOpen(false)}
              size="icon"
              title="Close"
              variant="ghost"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showHistory && (
          <div className="max-h-64 overflow-y-auto border-b border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="space-y-1">
              {threads.map((thread) => {
                const isActive = thread.id === activeThreadId;

                return (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5",
                      isActive && "bg-white shadow-sm dark:bg-slate-900"
                    )}
                    key={thread.id}
                  >
                    <button
                      className="min-w-0 flex-1 text-left"
                      disabled={isStreaming}
                      onClick={() => selectThread(thread.id)}
                      type="button"
                    >
                      <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {thread.title}
                      </span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {formatThreadTime(thread.updatedAt)}
                      </span>
                    </button>
                    <Button
                      disabled={isStreaming}
                      onClick={() => deleteThread(thread.id)}
                      size="icon"
                      title="Delete chat"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div ref={scrollAreaRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[320px] items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
              {activeThread?.title || "New chat"}
            </div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}

          {visibleToolActivities.length > 0 && (
            <div className="space-y-2">
              {visibleToolActivities.map((activity) => (
                <ToolActivityRow
                  key={activity.id}
                  activity={activity}
                  disabled={isStreaming}
                  onCancel={cancelToolCall}
                  onConfirm={confirmToolCall}
                />
              ))}
            </div>
          )}
        </div>

        {streamError && (
          <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {streamError}
          </div>
        )}

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-end gap-2">
            <Textarea
              className="max-h-36 min-h-12 resize-none rounded-lg text-sm"
              disabled={isStreaming}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setInput(event.target.value)
              }
              onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Message Cortex AI..."
              value={input}
            />
            {isStreaming ? (
              <Button onClick={stopStreaming} size="icon" variant="outline" title="Stop">
                <XCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button disabled={!canSubmit} onClick={() => void sendMessage()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
