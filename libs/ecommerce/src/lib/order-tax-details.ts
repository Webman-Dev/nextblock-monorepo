import type Stripe from 'stripe';

import type { TaxCalculationResult, TaxCalculationMode } from './types';

export interface OrderTaxRateDetails {
  id?: string | null;
  display_name: string;
  percentage?: number | null;
  effective_percentage?: number | null;
  jurisdiction?: string | null;
  jurisdiction_level?: string | null;
  country?: string | null;
  state?: string | null;
  tax_type?: string | null;
  inclusive?: boolean | null;
  description?: string | null;
}

export interface OrderTaxLine {
  scope: 'aggregate' | 'line_item' | 'shipping';
  source: 'manual' | 'stripe_checkout';
  amount: number;
  taxable_amount?: number | null;
  description?: string | null;
  line_item_id?: string | null;
  taxability_reason?: string | null;
  rate: OrderTaxRateDetails;
}

export interface OrderTaxDetails {
  source: 'manual' | 'stripe_checkout' | 'none';
  mode: TaxCalculationMode;
  currency: string;
  subtotal: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  is_finalized: boolean;
  lines: OrderTaxLine[];
  updated_at: string;
}

const ORDER_TAX_TYPE_LABELS: Record<string, string> = {
  gst: 'GST',
  qst: 'QST',
  hst: 'HST',
  pst: 'PST',
  vat: 'VAT',
  sales_tax: 'Sales Tax',
  amusement_tax: 'Amusement Tax',
  retail_delivery_fee: 'Retail Delivery Fee',
};

function nowIsoString() {
  return new Date().toISOString();
}

export function getOrderTaxRateLabel(
  rate: Pick<OrderTaxRateDetails, 'display_name' | 'tax_type'>
) {
  const normalizedTaxType = rate.tax_type?.trim().toLowerCase();

  if (normalizedTaxType && ORDER_TAX_TYPE_LABELS[normalizedTaxType]) {
    return ORDER_TAX_TYPE_LABELS[normalizedTaxType];
  }

  return rate.display_name || 'Tax';
}

export function getOrderTaxRatePercentage(
  rate: Pick<OrderTaxRateDetails, 'effective_percentage' | 'percentage'>
) {
  if (typeof rate.effective_percentage === 'number') {
    return rate.effective_percentage;
  }

  if (typeof rate.percentage === 'number') {
    return rate.percentage;
  }

  return null;
}

export function getOrderTaxRateJurisdiction(
  rate: Pick<
    OrderTaxRateDetails,
    'jurisdiction' | 'state' | 'country'
  >
) {
  if (rate.jurisdiction) {
    return rate.jurisdiction;
  }

  const fallbackJurisdiction = [rate.state, rate.country].filter(Boolean).join(', ');
  return fallbackJurisdiction || null;
}

function buildOrderTaxLineAggregationKey(line: OrderTaxLine) {
  return JSON.stringify({
    source: line.source,
    rate_id: line.rate.id ?? null,
    display_name: getOrderTaxRateLabel(line.rate),
    percentage: getOrderTaxRatePercentage(line.rate),
    jurisdiction: getOrderTaxRateJurisdiction(line.rate),
    jurisdiction_level: line.rate.jurisdiction_level ?? null,
    country: line.rate.country ?? null,
    state: line.rate.state ?? null,
    tax_type: line.rate.tax_type ?? null,
    inclusive: line.rate.inclusive ?? null,
  });
}

export function aggregateOrderTaxLines(lines: OrderTaxLine[]) {
  const aggregatedLines = new Map<string, OrderTaxLine>();

  for (const line of lines) {
    const key = buildOrderTaxLineAggregationKey(line);
    const existingLine = aggregatedLines.get(key);

    if (!existingLine) {
      aggregatedLines.set(key, {
        ...line,
        scope: 'aggregate',
        line_item_id: null,
      });
      continue;
    }

    existingLine.amount += line.amount;

    if (
      typeof existingLine.taxable_amount === 'number' ||
      typeof line.taxable_amount === 'number'
    ) {
      existingLine.taxable_amount =
        (typeof existingLine.taxable_amount === 'number' ? existingLine.taxable_amount : 0) +
        (typeof line.taxable_amount === 'number' ? line.taxable_amount : 0);
    } else {
      existingLine.taxable_amount = null;
    }

    if (existingLine.description !== line.description) {
      existingLine.description = null;
    }

    if (existingLine.taxability_reason !== line.taxability_reason) {
      existingLine.taxability_reason = null;
    }
  }

  return [...aggregatedLines.values()].sort((a, b) => {
    const labelComparison = getOrderTaxRateLabel(a.rate).localeCompare(getOrderTaxRateLabel(b.rate));
    if (labelComparison !== 0) {
      return labelComparison;
    }

    return (getOrderTaxRatePercentage(a.rate) ?? 0) - (getOrderTaxRatePercentage(b.rate) ?? 0);
  });
}

export function normalizeOrderTaxDetails(value: unknown): OrderTaxDetails | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<OrderTaxDetails>;

  if (typeof candidate.currency !== 'string') {
    return null;
  }

  return {
    source:
      candidate.source === 'manual' ||
      candidate.source === 'stripe_checkout' ||
      candidate.source === 'none'
        ? candidate.source
        : 'none',
    mode: candidate.mode === 'automatic' ? 'automatic' : 'manual',
    currency: candidate.currency,
    subtotal: typeof candidate.subtotal === 'number' ? candidate.subtotal : 0,
    shipping_total:
      typeof candidate.shipping_total === 'number' ? candidate.shipping_total : 0,
    tax_total: typeof candidate.tax_total === 'number' ? candidate.tax_total : 0,
    total: typeof candidate.total === 'number' ? candidate.total : 0,
    is_finalized: Boolean(candidate.is_finalized),
    lines: Array.isArray(candidate.lines)
      ? aggregateOrderTaxLines(candidate.lines as OrderTaxLine[])
      : [],
    updated_at:
      typeof candidate.updated_at === 'string' ? candidate.updated_at : nowIsoString(),
  };
}

export function buildOrderTaxDetailsFromCalculation(input: {
  calculation: TaxCalculationResult;
  subtotal: number;
  shippingTotal: number;
  total: number;
  currency?: string;
}): OrderTaxDetails {
  const currency = input.currency || 'usd';
  const isFinalized =
    input.calculation.mode === 'manual' &&
    !input.calculation.isPendingExternalCalculation;

  return {
    source:
      input.calculation.enabled && input.calculation.mode === 'manual'
        ? 'manual'
        : input.calculation.mode === 'automatic'
          ? 'stripe_checkout'
          : 'none',
    mode: input.calculation.mode,
    currency,
    subtotal: input.subtotal,
    shipping_total: input.shippingTotal,
    tax_total: input.calculation.amount,
    total: input.total,
    is_finalized: isFinalized,
    lines:
      input.calculation.enabled && input.calculation.mode === 'manual'
        ? input.calculation.lines.map((line) => ({
            scope: 'aggregate' as const,
            source: 'manual' as const,
            amount: line.amount,
            taxable_amount: input.calculation.taxableSubtotal,
            description: line.name,
            rate: {
              id: line.id ?? null,
              display_name: line.name,
              percentage: line.rate,
              country: line.country_code,
              state: line.state_code ?? null,
            },
          }))
        : [],
    updated_at: nowIsoString(),
  };
}

function mapStripeTaxRate(rate: Stripe.TaxRate): OrderTaxRateDetails {
  return {
    id: rate.id,
    display_name: rate.display_name,
    percentage: rate.percentage,
    effective_percentage: rate.effective_percentage,
    jurisdiction: rate.jurisdiction,
    jurisdiction_level: rate.jurisdiction_level,
    country: rate.country,
    state: rate.state,
    tax_type: rate.tax_type,
    inclusive: rate.inclusive,
    description: rate.description,
  };
}

export function buildOrderTaxDetailsFromStripeSession(input: {
  session: Stripe.Checkout.Session;
  lineItems: Stripe.LineItem[];
  subtotal: number;
  shippingTotal: number;
  fallbackMode?: TaxCalculationMode;
  currency?: string | null;
}): OrderTaxDetails {
  const currency = input.currency || input.session.currency || 'usd';
  const total = typeof input.session.amount_total === 'number' ? input.session.amount_total : 0;
  const taxTotal = input.session.total_details?.amount_tax ?? 0;

  const rawLines: OrderTaxLine[] = [];

  for (const lineItem of input.lineItems) {
    for (const tax of lineItem.taxes || []) {
      rawLines.push({
        scope: 'line_item',
        source: 'stripe_checkout',
        amount: tax.amount,
        taxable_amount: tax.taxable_amount,
        description: lineItem.description || undefined,
        line_item_id: lineItem.id,
        taxability_reason: tax.taxability_reason,
        rate: mapStripeTaxRate(tax.rate),
      });
    }
  }

  if (rawLines.length === 0) {
    for (const tax of input.session.total_details?.breakdown?.taxes || []) {
      rawLines.push({
        scope: 'aggregate',
        source: 'stripe_checkout',
        amount: tax.amount,
        taxable_amount: tax.taxable_amount,
        description: tax.rate.display_name,
        taxability_reason: tax.taxability_reason,
        rate: mapStripeTaxRate(tax.rate),
      });
    }
  }

  const lines = aggregateOrderTaxLines(rawLines);

  return {
    source: taxTotal > 0 || lines.length > 0 ? 'stripe_checkout' : 'none',
    mode: input.fallbackMode === 'manual' ? 'manual' : 'automatic',
    currency,
    subtotal: input.subtotal,
    shipping_total: input.shippingTotal,
    tax_total: taxTotal,
    total,
    is_finalized: true,
    lines,
    updated_at: nowIsoString(),
  };
}
