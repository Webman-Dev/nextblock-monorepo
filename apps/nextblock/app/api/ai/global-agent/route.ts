import { stepCountIs, streamText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createClient,
  getServiceRoleSupabaseClient,
  verifyPackageOnline,
} from '@nextblock-cms/db/server';

import {
  buildCortexAiRoutingPolicy,
  createCortexAiOpenRouterClient,
  isOpenRouterRateLimitError,
  omitUnsupportedCortexAiModelOptions,
} from '../../../../lib/ai-client';
import { safeParseCortexAiModelSelection } from '../../../../lib/ai-model-registry';
import { createCortexGlobalAgentTools } from '../../../../lib/ai-global-agent-tools';

export const dynamic = 'force-dynamic';

const GLOBAL_AGENT_MODEL_ATTEMPT_TIMEOUT_MS = 30000;

const globalAgentMessageSchema = z.strictObject({
  content: z.string().min(1).max(8000),
  role: z.enum(['system', 'user', 'assistant']),
});

const globalAgentRequestSchema = z.strictObject({
  messages: z.array(globalAgentMessageSchema).min(1).max(40),
});

const GLOBAL_AGENT_SYSTEM_PROMPT = [
  'You are NextBlock Cortex AI, the global dashboard agent for a block-based CMS.',
  'Operate as a Planner, Executor, and Evaluator.',
  'Plan the smallest safe change, execute only through typed tools, evaluate the tool result, then answer concisely.',
  'Use update_navigation_bar for public header navigation changes. For requests that ask to add a header link, use update_navigation_bar with mode "append" unless the user clearly asks to replace the whole menu.',
  'For requests that ask to rename or change one existing navigation link, use update_navigation_bar with mode "update" and identify the existing item with match.label or match.url. Never use mode "replace" for a one-link rename.',
  'Use mode "replace" only when the user explicitly asks to rebuild or replace the entire navigation menu and you provide the full menu.',
  'Use update_footer for public footer links or copyright settings.',
  'When a user names a language, pass that language name or its locale code in languageCode; examples: French maps to fr, English maps to en.',
  'For follow-up requests like "also add it in French", use the prior requested item and apply it to the named language.',
  'Use search_documentation before answering implementation or CMS usage questions that require factual project context.',
  'Never invent database fields, raw SQL, markdown content, or unsupported tool arguments.',
].join(' ');

type CortexAgentStreamEvent =
  | {
      credentialSource: string;
      modelId: string;
      type: 'meta';
    }
  | {
      text: string;
      type: 'text-delta';
    }
  | {
      input?: unknown;
      toolCallId?: string;
      toolName: string;
      type: 'tool-call';
    }
  | {
      output?: unknown;
      toolCallId?: string;
      toolName: string;
      type: 'tool-result';
    }
  | {
      message: string;
      toolCallId?: string;
      toolName?: string;
      type: 'tool-error';
    }
  | {
      message: string;
      type: 'error';
    }
  | {
      type: 'finish';
    };

type CortexAgentStreamPart = {
  error?: unknown;
  id?: string;
  input?: unknown;
  output?: unknown;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  type: string;
};

async function requireAdminAccess() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return !profileError && profile?.role === 'ADMIN';
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const encoder = new TextEncoder();

function encodeStreamEvent(event: CortexAgentStreamEvent) {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function serializeStreamError(error: unknown) {
  return error instanceof Error ? error.message : 'Cortex AI global agent failed.';
}

function getToolCallId(part: CortexAgentStreamPart) {
  return part.toolCallId || part.id;
}

function looksLikeRawToolCallLeak(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes('<toolcall') ||
    normalized.includes('</toolcall') ||
    normalized.includes('"arguments"') ||
    normalized.includes('"update_navigation_bar"') ||
    normalized.includes('"update_footer"') ||
    normalized.includes('"search_documentation"')
  );
}

function looksLikeRateLimitText(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes('rate limit exceeded') ||
    normalized.includes('free-models-per-day') ||
    normalized.includes('too many requests')
  );
}

function readNumberField(value: unknown, key: string) {
  if (!value || typeof value !== 'object' || !(key in value)) {
    return null;
  }

  const parsed = Number((value as Record<string, unknown>)[key]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getToolCompletionMessage(toolName?: string, output?: unknown) {
  if (toolName === 'update_navigation_bar') {
    const insertedCount = readNumberField(output, 'insertedCount');
    const skippedCount = readNumberField(output, 'skippedCount');

    if ((insertedCount ?? 0) === 0 && (skippedCount ?? 0) > 0) {
      return 'That navigation link already exists, so I left the header unchanged.';
    }

    return 'Done. I updated the navigation bar.';
  }

  if (toolName === 'update_footer') {
    return 'Done. I updated the footer.';
  }

  if (toolName === 'search_documentation') {
    return 'I searched the documentation, but the model was interrupted before it could finish a summary.';
  }

  return 'Done. I completed the requested update.';
}

function getRetryableStreamError(
  error: unknown,
  sawRawToolCallLeak: boolean,
  sawRateLimitText: boolean
) {
  if (sawRawToolCallLeak) {
    return new Error('OpenRouter returned an invalid raw tool-call payload.');
  }

  if (sawRateLimitText) {
    return new Error('OpenRouter rate limit exceeded.');
  }

  return error;
}

function createAttemptAbortSignal(requestSignal: AbortSignal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('Cortex AI response timed out. Please try again.'));
  }, GLOBAL_AGENT_MODEL_ATTEMPT_TIMEOUT_MS);
  const abortFromRequest = () => controller.abort(requestSignal.reason);

  if (requestSignal.aborted) {
    abortFromRequest();
  } else {
    requestSignal.addEventListener('abort', abortFromRequest, { once: true });
  }

  return {
    cleanup: () => {
      clearTimeout(timeoutId);
      requestSignal.removeEventListener('abort', abortFromRequest);
    },
    signal: controller.signal,
  };
}

export async function POST(request: Request) {
  try {
    const hasAccess = await requireAdminAccess();

    if (!hasAccess) {
      return jsonError('You do not have permission to use the global Cortex AI agent.', 403);
    }

    const isCortexAiActive = await verifyPackageOnline('cortex-ai');

    if (!isCortexAiActive) {
      return jsonError('NextBlock Cortex AI is not active for this workspace.', 403);
    }

    const body = await request.json().catch(() => null);
    const parsedRequest = globalAgentRequestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return jsonError('Invalid Cortex AI global-agent request.', 400);
    }

    const sandboxKey = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true' ? request.headers.get('x-sandbox-openrouter-key') : null;
    const sandboxModelRaw = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true' ? request.headers.get('x-sandbox-openrouter-model') : null;
    
    let modelSelection = null;
    if (sandboxModelRaw) {
      try {
        modelSelection = safeParseCortexAiModelSelection(JSON.parse(sandboxModelRaw));
      } catch {
        // Ignore parse errors from headers
      }
    }

    const client = await createCortexAiOpenRouterClient({
      apiKey: sandboxKey || undefined,
      modelSelection: sandboxKey && modelSelection ? modelSelection : undefined,
    });
    const routingPolicy = buildCortexAiRoutingPolicy({
      credentialSource: client.credentialSource,
      selectedModel: client.modelSelection,
    });
    const modelIds = routingPolicy.modelIds;
    const tools = createCortexGlobalAgentTools({
      supabase: getServiceRoleSupabaseClient(),
    });

    const stream = new ReadableStream({
      async start(controller) {
        let completed = false;
        let lastError: unknown = null;

        for (const [index, modelId] of modelIds.entries()) {
          let textBuffer = '';
          let sawRawToolCallLeak = false;
          let sawRateLimitText = false;
          let hasToolCall = false;
          let hasSuccessfulToolResult = false;
          let lastToolName: string | undefined;
          let lastToolOutput: unknown;

          controller.enqueue(
            encodeStreamEvent({
              credentialSource: client.credentialSource,
              modelId,
              type: 'meta',
            })
          );

          try {
            const attemptAbort = createAttemptAbortSignal(request.signal);
            const attemptOptions = omitUnsupportedCortexAiModelOptions(
              {
                abortSignal: attemptAbort.signal,
                maxOutputTokens: 2000,
                messages: parsedRequest.data.messages,
                maxRetries: 0,
                stopWhen: stepCountIs(6),
                system: GLOBAL_AGENT_SYSTEM_PROMPT,
                temperature: 0.1,
                tools,
              } as Record<string, unknown>,
              {
                modelId,
                modelSelection: routingPolicy.modelSelection,
              }
            );
            const result = streamText({
              ...attemptOptions,
              model: client.model(modelId),
            } as Parameters<typeof streamText>[0]);

            try {
              for await (const rawPart of result.fullStream) {
                const part = rawPart as CortexAgentStreamPart;

                if (part.type === 'text-delta' && part.text) {
                  textBuffer = `${textBuffer}${part.text}`;
                  sawRawToolCallLeak = sawRawToolCallLeak || looksLikeRawToolCallLeak(textBuffer);
                  sawRateLimitText = sawRateLimitText || looksLikeRateLimitText(textBuffer);
                }

                if (part.type === 'tool-call' && part.toolName) {
                  hasToolCall = true;
                  lastToolName = part.toolName;
                  controller.enqueue(
                    encodeStreamEvent({
                      input: part.input,
                      toolCallId: getToolCallId(part),
                      toolName: part.toolName,
                      type: 'tool-call',
                    })
                  );
                }

                if (part.type === 'tool-result' && part.toolName) {
                  hasSuccessfulToolResult = true;
                  lastToolName = part.toolName;
                  lastToolOutput = part.output;
                  controller.enqueue(
                    encodeStreamEvent({
                      output: part.output,
                      toolCallId: getToolCallId(part),
                      toolName: part.toolName,
                      type: 'tool-result',
                    })
                  );
                }

                if (part.type === 'tool-error') {
                  hasToolCall = true;
                  controller.enqueue(
                    encodeStreamEvent({
                      message: serializeStreamError(part.error),
                      toolCallId: getToolCallId(part),
                      toolName: part.toolName,
                      type: 'tool-error',
                    })
                  );
                }

                if (part.type === 'error') {
                  throw part.error || new Error('Cortex AI stream failed.');
                }
              }
            } finally {
              attemptAbort.cleanup();
            }

            if ((sawRawToolCallLeak || sawRateLimitText) && !hasToolCall) {
              lastError = getRetryableStreamError(
                null,
                sawRawToolCallLeak,
                sawRateLimitText
              );

              if (index < modelIds.length - 1) {
                continue;
              }

              throw lastError;
            }

            if ((sawRawToolCallLeak || sawRateLimitText) && !hasSuccessfulToolResult) {
              lastError = getRetryableStreamError(
                null,
                sawRawToolCallLeak,
                sawRateLimitText
              );
              throw lastError;
            }

            if ((sawRawToolCallLeak || sawRateLimitText) && hasSuccessfulToolResult) {
              controller.enqueue(
                encodeStreamEvent({
                  text: getToolCompletionMessage(lastToolName, lastToolOutput),
                  type: 'text-delta',
                })
              );
            } else if (textBuffer.trim() && !looksLikeRawToolCallLeak(textBuffer)) {
              controller.enqueue(
                encodeStreamEvent({
                  text: textBuffer,
                  type: 'text-delta',
                })
              );
            } else if (hasSuccessfulToolResult) {
              controller.enqueue(
                encodeStreamEvent({
                  text: getToolCompletionMessage(lastToolName, lastToolOutput),
                  type: 'text-delta',
                })
              );
            }

            controller.enqueue(encodeStreamEvent({ type: 'finish' }));
            completed = true;
            break;
          } catch (error) {
            lastError = getRetryableStreamError(error, sawRawToolCallLeak, sawRateLimitText);

            if (hasSuccessfulToolResult) {
              controller.enqueue(
                encodeStreamEvent({
                  text: getToolCompletionMessage(lastToolName, lastToolOutput),
                  type: 'text-delta',
                })
              );
              controller.enqueue(encodeStreamEvent({ type: 'finish' }));
              completed = true;
              break;
            }

            if (
              !hasToolCall &&
              isOpenRouterRateLimitError(lastError) &&
              index < modelIds.length - 1
            ) {
              continue;
            }

            if (
              !hasToolCall &&
              (sawRawToolCallLeak || sawRateLimitText) &&
              index < modelIds.length - 1
            ) {
              continue;
            }

            controller.enqueue(
              encodeStreamEvent({
                message: serializeStreamError(lastError),
                type: 'error',
              })
            );
            controller.enqueue(encodeStreamEvent({ type: 'finish' }));
            completed = true;
            break;
          }

          if (completed) {
            break;
          }
        }

        if (!completed) {
          controller.enqueue(
            encodeStreamEvent({
              message: serializeStreamError(lastError),
              type: 'error',
            })
          );
          controller.enqueue(encodeStreamEvent({ type: 'finish' }));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[Cortex AI] Global agent failed:', error);
    return jsonError(error instanceof Error ? error.message : 'Global agent failed.', 500);
  }
}
