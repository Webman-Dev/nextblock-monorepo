import Papa from 'papaparse';

export interface ReportData {
  id: string;
  created_at: string;
  paid_at: string | null;
  status: string;
  total: number;
  subtotal: number;
  shipping_total: number;
  tax_total: number;
  currency: string;
  provider: string;
  customer_details: any;
  tax_details: any;
  customer?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export function generateCSV(data: any[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function mapGeneralSalesLedger(orders: ReportData[]) {
  return orders.map(order => ({
    'Order ID': order.id,
    'Date': new Date(order.created_at).toLocaleDateString(),
    'Customer Name': order.customer?.full_name || order.customer_details?.name || 'Guest',
    'Customer Email': order.customer?.email || order.customer_details?.email || 'N/A',
    'Subtotal': (order.subtotal / 100).toFixed(2),
    'Tax Amount': (order.tax_total / 100).toFixed(2),
    'Shipping Amount': (order.shipping_total / 100).toFixed(2),
    'Total': (order.total / 100).toFixed(2),
    'Currency': order.currency.toUpperCase(),
    'Payment Status': order.status,
    'Fulfillment Status':
      order.status === 'shipped'
        ? 'Shipped'
        : order.status === 'paid'
          ? 'Paid'
          : order.status === 'trial'
            ? 'Trial'
            : 'Pending',
    'Payment Gateway': order.provider === 'freemius' ? 'Freemius' : 'Stripe'
  }));
}

export function mapTaxLiabilitySummary(orders: ReportData[]) {
  return orders.filter(order => order.status === 'paid').map(order => {
    const shipping = order.customer_details?.shipping || order.customer_details?.billing;
    const country = shipping?.country_code || 'N/A';
    const state = shipping?.state || 'N/A';
    
    // Extract first tax rate name from details if available
    const taxRateName = order.tax_details?.lines?.[0]?.rate?.display_name || 'N/A';
    const taxRatePercentage = order.tax_details?.lines?.[0]?.rate?.percentage || 0;

    return {
      'Date': order.paid_at ? new Date(order.paid_at).toLocaleDateString() : new Date(order.created_at).toLocaleDateString(),
      'Order ID': order.id,
      'Destination': `${state}, ${country}`,
      'Tax Rate Applied': `${taxRatePercentage}% (${taxRateName})`,
      'Total Taxable Amount': (order.subtotal / 100).toFixed(2),
      'Tax Collected': (order.tax_total / 100).toFixed(2),
      'Currency': order.currency.toUpperCase()
    };
  });
}

export function mapMultiCurrencyRevenue(orders: ReportData[]) {
  const summary: Record<string, { volume: number, subtotal: number, tax: number }> = {};

  orders.filter(order => order.status === 'paid').forEach(order => {
    const currency = order.currency.toUpperCase();
    if (!summary[currency]) {
      summary[currency] = { volume: 0, subtotal: 0, tax: 0 };
    }
    summary[currency].volume += order.total;
    summary[currency].subtotal += order.subtotal;
    summary[currency].tax += order.tax_total;
  });

  return Object.entries(summary).map(([currency, totals]) => ({
    'Currency': currency,
    'Total Transaction Volume': (totals.volume / 100).toFixed(2),
    'Total Subtotal': (totals.subtotal / 100).toFixed(2),
    'Total Tax Collected': (totals.tax / 100).toFixed(2)
  }));
}
