"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@nextblock-cms/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@nextblock-cms/ui/avatar";
import { Badge } from "@nextblock-cms/ui/badge";
import { updateInteractionStatus, saveNotificationEmails } from "../../actions/interactions";
import { cn } from "@nextblock-cms/utils";
import {
  MessageSquare,
  Check,
  X,
  Star,
  Inbox,
  Filter,
  ExternalLink,
  ThumbsUp,
  AlertCircle,
  Mail
} from "lucide-react";
import Link from "next/link";

interface InteractionsModerationClientProps {
  initialInteractions: any[];
  isAdmin: boolean;
}

export default function InteractionsModerationClient({
  initialInteractions,
  isAdmin,
}: InteractionsModerationClientProps) {
  const [interactions, setInteractions] = useState<any[]>(initialInteractions);

  // Notification settings states
  const [emailsInput, setEmailsInput] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savingEmails, setSavingEmails] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    if (isAdmin) {
      import("../../actions/interactions").then(({ getNotificationEmails }) => {
        getNotificationEmails().then((res) => {
          if (res.success && res.emails) {
            setEmailsInput(res.emails);
          }
        });
      });
    }
  }, [isAdmin]);

  const handleSaveEmails = async () => {
    setSavingEmails(true);
    setSettingsError(null);
    setSettingsSuccess(null);

    const res = await saveNotificationEmails(emailsInput);
    setSavingEmails(false);

    if (res.error) {
      setSettingsError(res.error);
    } else {
      setSettingsSuccess("Notification settings saved successfully.");
      if (res.emails) {
        setEmailsInput(res.emails);
      }
      setTimeout(() => {
        setSettingsSuccess(null);
        setIsSettingsOpen(false);
      }, 1500);
    }
  };
  const [filterType, setFilterType] = useState<"all" | "review" | "comment">("all");
  const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "denied">("pending");
  const [, startTransition] = useTransition();
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Counter helper
  const getCount = (status: "pending" | "approved" | "denied") => {
    return interactions.filter((i) => i.status === status).length;
  };

  // Filtered interactions
  const filteredInteractions = interactions.filter((item) => {
    const matchesStatus = item.status === filterStatus;
    const matchesType = filterType === "all" ? true : item.type === filterType;
    return matchesStatus && matchesType;
  });

  const handleModerate = async (interactionId: string, status: "approved" | "denied") => {
    if (!isAdmin) {
      setActionError("Only administrators can moderate reviews and comments.");
      return;
    }

    setModeratingId(interactionId);
    setActionError(null);

    startTransition(async () => {
      const res = await updateInteractionStatus(interactionId, status);
      setModeratingId(null);

      if (res.error) {
        setActionError(res.error);
      } else {
        // Update local state
        setInteractions((prev) =>
          prev.map((item) => (item.id === interactionId ? { ...item, status } : item))
        );
      }
    });
  };

  const getInitials = (profile: any) => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "U";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <MessageSquare className="h-8 w-8 text-primary" />
            Interactions Moderation
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Review and moderate customer reviews and blog comments.
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 text-xs"
              variant="outline"
            >
              <Mail className="h-4 w-4" />
              Notifications
            </Button>
          </div>
        )}
      </div>

      {/* Tabs / Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(["pending", "approved", "denied"] as const).map((status) => {
            const count = getCount(status);
            const isActive = filterStatus === status;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/100"
                )}
              >
                <span className="capitalize">{status}</span>
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5",
                    isActive ? "bg-white/20 text-white" : "text-muted-foreground border-border/80"
                  )}
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <select
            value={filterType}
            onChange={(e: any) => setFilterType(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-2 text-sm font-medium text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="review">Reviews Only</option>
            <option value="comment">Comments Only</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {actionError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-4 flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="font-medium">{actionError}</span>
        </div>
      )}

      {/* Interactions List */}
      <div className="space-y-4">
        {filteredInteractions.length > 0 ? (
          filteredInteractions.map((item) => {
            const authorName = item.profiles?.full_name || item.profiles?.github_username || "Anonymous";
            const dateStr = new Date(item.created_at).toLocaleString();
            const targetName = item.products?.title || item.posts?.title || "Unknown Target";
            const targetUrl = item.product_id
              ? `/product/${item.products?.slug}`
              : `/article/${item.posts?.slug}`;
            const targetLabel = item.product_id ? "Product" : "Article";

            return (
              <div
                key={item.id}
                className={cn(
                  "bg-card border rounded-2xl p-5 shadow-sm space-y-4 hover:border-border/100 transition-all duration-300 relative",
                  item.status === "pending" && "border-amber-200/60 dark:border-amber-900/30"
                )}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={item.profiles?.avatar_url || undefined} alt={authorName} />
                      <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
                        {getInitials(item.profiles)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground leading-none">
                          {authorName}
                        </h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold uppercase py-0 px-2",
                            item.type === "review"
                              ? "border-amber-500/20 bg-amber-500/5 text-amber-600"
                              : "border-sky-500/20 bg-sky-500/5 text-sky-600"
                          )}
                        >
                          {item.type}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1.5 block" suppressHydrationWarning>
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  {/* Target Link */}
                  <div className="flex items-center text-xs">
                    <span className="text-muted-foreground mr-1.5 font-medium">{targetLabel}:</span>
                    <Link
                      href={targetUrl}
                      target="_blank"
                      className="text-primary hover:underline font-semibold flex items-center gap-1 group"
                    >
                      {targetName}
                      <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </div>
                </div>

                {/* Rating if Review */}
                {item.type === "review" && item.rating && (
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4.5 w-4.5",
                          i < item.rating ? "fill-amber-500 text-amber-500" : "text-slate-200 dark:text-slate-800"
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* Body Content */}
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line text-left">
                  {item.content}
                </p>

                {/* Reactions Count */}
                {Object.keys(item.reactions || {}).length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900/20 px-3 py-1.5 rounded-xl w-fit">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>Likes:</span>
                    <span className="font-semibold text-foreground">
                      {item.reactions.likes || 0}
                    </span>
                  </div>
                )}

                {/* Moderation Actions */}
                {isAdmin && (
                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    {item.status !== "approved" && (
                      <Button
                        size="sm"
                        onClick={() => handleModerate(item.id, "approved")}
                        disabled={moderatingId === item.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 rounded-xl shadow-sm transition-all"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                    )}
                    {item.status !== "denied" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleModerate(item.id, "denied")}
                        disabled={moderatingId === item.id}
                        className="border-destructive/30 hover:border-destructive hover:bg-destructive/5 text-destructive flex items-center gap-1.5 rounded-xl transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                        Deny
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 border border-dashed rounded-2xl bg-slate-50/50 dark:bg-slate-900/10">
            <Inbox className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
            <h3 className="mt-4 text-sm font-semibold text-foreground">All caught up!</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">
              No interactions matching status <span className="font-semibold">&quot;{filterStatus}&quot;</span> and type <span className="font-semibold">&quot;{filterType}&quot;</span>.
            </p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Notification Settings
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground text-left">
              Configure which email addresses receive notification alerts when new pending reviews or comments are submitted.
            </p>
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Email Recipients
              </label>
              <textarea
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                placeholder="admin@example.com, moderator@example.com"
                className="w-full min-h-[80px] bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <span className="text-[10px] text-muted-foreground">
                Enter a comma-separated list of email addresses.
              </span>
            </div>

            {settingsError && <div className="text-xs font-medium text-destructive text-left">{settingsError}</div>}
            {settingsSuccess && <div className="text-xs font-medium text-emerald-600 text-left">{settingsSuccess}</div>}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setIsSettingsOpen(false)}
                disabled={savingEmails}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEmails}
                disabled={savingEmails}
                className="min-w-[100px]"
              >
                {savingEmails ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
