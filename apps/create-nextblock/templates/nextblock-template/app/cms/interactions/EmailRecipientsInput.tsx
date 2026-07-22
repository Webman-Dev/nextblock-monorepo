"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@nextblock-cms/utils";

// Same address shape used elsewhere in the app (createUser). Intentionally pragmatic
// rather than RFC-exhaustive: something@something.tld with no whitespace.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim().toLowerCase());
}

export interface EmailRecipientsInputHandle {
  /**
   * Commit any text still sitting in the input, then return the full recipient list.
   * Returns `null` (and shows an inline error) when that pending text is not a valid
   * email — the caller should abort the save in that case. Reading the returned array
   * directly (rather than parent state) avoids a stale-closure race on save.
   */
  flush: () => string[] | null;
}

interface EmailRecipientsInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  disabled?: boolean;
  inputId?: string;
}

const EmailRecipientsInput = forwardRef<EmailRecipientsInputHandle, EmailRecipientsInputProps>(
  function EmailRecipientsInput({ value, onChange, disabled, inputId }, ref) {
    const [inputValue, setInputValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const hasEmail = (list: string[], email: string) =>
      list.some((e) => e.toLowerCase() === email);

    // Commit a single typed token. Returns the resulting list, or null when invalid.
    const commit = (raw: string): string[] | null => {
      const email = raw.trim().toLowerCase();
      if (!email) return value;
      if (!EMAIL_RE.test(email)) {
        setError(`"${raw.trim()}" is not a valid email address.`);
        return null;
      }
      if (hasEmail(value, email)) {
        // Already a recipient — harmless. Clear the input without raising an error so
        // it can't collide with the save-success banner when committed via Save/flush.
        setInputValue("");
        setError(null);
        return value;
      }
      const next = [...value, email];
      onChange(next);
      setInputValue("");
      setError(null);
      return next;
    };

    // Add several tokens at once (paste of a comma/space/newline separated list).
    const addMany = (raw: string) => {
      const tokens = raw
        .split(/[,\s;]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (tokens.length === 0) return;

      const next = [...value];
      const invalid: string[] = [];
      for (const token of tokens) {
        const email = token.toLowerCase();
        if (!EMAIL_RE.test(email)) {
          invalid.push(token);
          continue;
        }
        if (!hasEmail(next, email)) next.push(email);
      }
      onChange(next);
      setInputValue("");
      setError(
        invalid.length
          ? `Skipped ${invalid.length} invalid address${invalid.length > 1 ? "es" : ""}: ${invalid.join(", ")}`
          : null,
      );
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        commit(inputValue);
      } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
        onChange(value.slice(0, -1));
        setError(null);
      } else if (error) {
        setError(null);
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData("text");
      if (/[,\s;]/.test(text)) {
        e.preventDefault();
        // Prepend whatever is already typed so a pasted "@corp.com, ..." completes the
        // in-progress "support" rather than discarding it.
        addMany(inputValue + text);
      }
    };

    const removeAt = (idx: number) => {
      onChange(value.filter((_, i) => i !== idx));
      setError(null);
      inputRef.current?.focus();
    };

    // `commit` closes over the latest inputValue/value, so re-create the handle when
    // either changes to keep flush() reading current state.
    useImperativeHandle(ref, () => ({ flush: () => commit(inputValue) }), [inputValue, value]);

    return (
      <div className="space-y-1.5">
        <div
          onClick={() => inputRef.current?.focus()}
          className={cn(
            "flex flex-wrap gap-1.5 min-h-[84px] w-full items-start content-start bg-background border rounded-xl px-2.5 py-2 text-sm cursor-text transition-colors",
            "focus-within:ring-1 focus-within:ring-primary focus-within:border-primary",
            error ? "border-destructive" : "border-border",
            disabled && "opacity-60 pointer-events-none",
          )}
        >
          {value.map((email, idx) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
            >
              {email}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(idx);
                }}
                className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/15 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors"
                aria-label={`Remove ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            id={inputId}
            ref={inputRef}
            type="email"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={() => commit(inputValue)}
            disabled={disabled}
            aria-invalid={!!error}
            placeholder={value.length === 0 ? "admin@example.com" : "Add another…"}
            className="flex-1 min-w-[160px] h-7 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-muted-foreground">
            Type an address and press Enter or comma to add it.
          </span>
          {value.length > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground shrink-0">
              {value.length} recipient{value.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {error && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);

export default EmailRecipientsInput;
