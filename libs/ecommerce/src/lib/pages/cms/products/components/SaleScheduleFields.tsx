'use client';

import { Input, Label } from '@nextblock-cms/ui';
import { cn } from '@nextblock-cms/utils';

export type SaleScheduleField = 'sale_start_at' | 'sale_end_at';

interface SaleScheduleFieldsProps {
  idPrefix?: string;
  startAt?: string | null;
  endAt?: string | null;
  onChange: (field: SaleScheduleField, value: string | null) => void;
  error?: string;
  disabled?: boolean;
  description?: string;
  /** Slimmer boxed layout. */
  dense?: boolean;
  /** Inline STARTS → ENDS only, no box / heading (e.g. inside a variant row). */
  bare?: boolean;
}

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Converts a stored ISO-8601 UTC timestamp into the `YYYY-MM-DDTHH:mm` value a
 * native datetime-local input expects, rendered in the viewer's local timezone.
 */
function isoToLocalInput(iso?: string | null): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Converts a datetime-local input value (interpreted as local time) into an
 * ISO-8601 UTC string for storage, or null when cleared.
 */
function localInputToIso(local: string): string | null {
  if (!local) {
    return null;
  }
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

export function SaleScheduleFields({
  idPrefix = 'product',
  startAt,
  endAt,
  onChange,
  error,
  disabled,
  description,
  dense,
  bare,
}: SaleScheduleFieldsProps) {
  const timezoneLabel = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const inputClass = cn('h-7 text-xs', dense || bare ? 'w-[150px]' : 'w-[160px] sm:w-[180px]');

  const fields = (
    <>
      <Label
        htmlFor={`${idPrefix}-sale-start-at`}
        className="text-[10px] uppercase tracking-wider text-muted-foreground"
      >
        Starts
      </Label>
      <Input
        id={`${idPrefix}-sale-start-at`}
        type="datetime-local"
        value={isoToLocalInput(startAt)}
        disabled={disabled}
        onChange={(event) => onChange('sale_start_at', localInputToIso(event.target.value))}
        className={inputClass}
      />
      <span className="text-xs text-muted-foreground">→</span>
      <Label
        htmlFor={`${idPrefix}-sale-end-at`}
        className="text-[10px] uppercase tracking-wider text-muted-foreground"
      >
        Ends
      </Label>
      <Input
        id={`${idPrefix}-sale-end-at`}
        type="datetime-local"
        value={isoToLocalInput(endAt)}
        disabled={disabled}
        onChange={(event) => onChange('sale_end_at', localInputToIso(event.target.value))}
        className={inputClass}
      />
    </>
  );

  if (bare) {
    // Two stacked cells (label above input) so they line up as equal-width
    // columns alongside the Price/Sale cells inside a shared grid.
    return (
      <>
        <div className="min-w-0 space-y-1">
          <Label
            htmlFor={`${idPrefix}-sale-start-at`}
            className="block text-[10px] uppercase font-bold tracking-widest text-muted-foreground"
          >
            Starts
          </Label>
          <Input
            id={`${idPrefix}-sale-start-at`}
            type="datetime-local"
            value={isoToLocalInput(startAt)}
            disabled={disabled}
            onChange={(event) => onChange('sale_start_at', localInputToIso(event.target.value))}
            className="h-8 w-full text-xs"
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Label
            htmlFor={`${idPrefix}-sale-end-at`}
            className="block text-[10px] uppercase font-bold tracking-widest text-muted-foreground"
          >
            Ends
          </Label>
          <Input
            id={`${idPrefix}-sale-end-at`}
            type="datetime-local"
            value={isoToLocalInput(endAt)}
            disabled={disabled}
            onChange={(event) => onChange('sale_end_at', localInputToIso(event.target.value))}
            className="h-8 w-full text-xs"
          />
          {error ? <p className="mt-0.5 text-[10px] text-destructive">{error}</p> : null}
        </div>
      </>
    );
  }

  return (
    <div
      className={cn('rounded border border-dashed bg-muted/5 space-y-1', dense ? 'p-1.5' : 'p-2')}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Sale window
        </span>
        {fields}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {timezoneLabel || 'local time'} · empty = always on
        </span>
      </div>
      {description && !dense ? (
        <p className="text-[10px] leading-snug text-muted-foreground">{description}</p>
      ) : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
