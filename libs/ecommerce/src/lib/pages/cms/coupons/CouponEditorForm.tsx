import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from '@nextblock-cms/ui';
import { getCurrencyMinorUnitFactor, minorUnitAmountToMajor } from '@nextblock-cms/utils';

import { ProductScopePicker, type CouponProductOption } from './ProductScopePicker';

type CouponFormValues = {
  id?: string;
  code?: string | null;
  name?: string | null;
  internal_note?: string | null;
  provider_scope?: string | null;
  discount_type?: string | null;
  discount_amount?: number | null;
  is_active?: boolean | null;
  starts_at?: string | null;
  ends_at?: string | null;
  redemption_limit?: number | null;
};

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 16);
}

function formatMajorAmount(value: number, currencyCode: string) {
  const decimals = getCurrencyMinorUnitFactor(currencyCode) === 1 ? 0 : 2;
  return value.toFixed(decimals);
}

function getDisplayDiscountAmount(coupon: CouponFormValues | null | undefined, currencyCode: string) {
  if (!coupon?.discount_amount) {
    return 10;
  }

  if (coupon.discount_type === 'fixed') {
    return formatMajorAmount(
      minorUnitAmountToMajor(coupon.discount_amount, currencyCode),
      currencyCode
    );
  }

  return coupon.discount_amount;
}

export function CouponEditorForm({
  action,
  products,
  coupon,
  selectedProductIds = [],
  submitLabel,
  currencyCode = 'USD',
}: {
  action: (formData: FormData) => Promise<void>;
  products: CouponProductOption[];
  coupon?: CouponFormValues | null;
  selectedProductIds?: string[];
  submitLabel: string;
  currencyCode?: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="currency_code" value={currencyCode} />
      <Card>
        <CardHeader>
          <CardTitle>{coupon?.id ? 'Edit Coupon' : 'Create Coupon'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Code</Label>
              <Input
                id="coupon-code"
                name="code"
                defaultValue={coupon?.code || ''}
                className="uppercase"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-name">Name</Label>
              <Input id="coupon-name" name="name" defaultValue={coupon?.name || ''} required />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="provider-scope">Provider scope</Label>
              <select
                id="provider-scope"
                name="provider_scope"
                defaultValue={coupon?.provider_scope || 'all'}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Stripe + Freemius</option>
                <option value="stripe">Stripe only</option>
                <option value="freemius">Freemius only</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-type">Discount type</Label>
              <select
                id="discount-type"
                name="discount_type"
                defaultValue={coupon?.discount_type || 'percent'}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-amount">Amount</Label>
              <Input
                id="discount-amount"
                name="discount_amount"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={getDisplayDiscountAmount(coupon, currencyCode)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Percent coupons use 1-100. Fixed coupons use regular amounts, for example $10.00.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="starts-at">Starts at</Label>
              <Input
                id="starts-at"
                name="starts_at"
                type="datetime-local"
                defaultValue={toDateTimeLocal(coupon?.starts_at)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends-at">Ends at</Label>
              <Input
                id="ends-at"
                name="ends_at"
                type="datetime-local"
                defaultValue={toDateTimeLocal(coupon?.ends_at)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redemption-limit">Redemption limit</Label>
              <Input
                id="redemption-limit"
                name="redemption_limit"
                type="number"
                min="1"
                defaultValue={coupon?.redemption_limit || ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="internal-note">Internal note</Label>
            <Textarea
              id="internal-note"
              name="internal_note"
              defaultValue={coupon?.internal_note || ''}
              rows={3}
            />
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            <input type="hidden" name="is_active" value="false" />
            <label htmlFor="coupon-active" className="flex cursor-pointer items-start gap-3">
              <input
                id="coupon-active"
                name="is_active"
                type="checkbox"
                value="true"
                defaultChecked={coupon?.is_active ?? true}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span>
                <span className="block text-sm font-medium">Active</span>
                <span className="block text-sm text-muted-foreground">
                  Active coupons can be applied by shoppers during cart and checkout.
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold">Product scope</h3>
              <p className="text-sm text-muted-foreground">
                Leave every product unchecked to apply this coupon to all products in the selected provider scope.
              </p>
            </div>
            <ProductScopePicker products={products} selectedProductIds={selectedProductIds} />
          </div>

          <div className="flex justify-end">
            <Button type="submit">{submitLabel}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
