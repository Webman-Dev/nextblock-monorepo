'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Separator,
} from '@nextblock-cms/ui';
import { useCartSubtotal } from '../cart-store';
import { useCart } from '../use-cart';
import { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  FlaskConical,
  X,
  CreditCard,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import { useTranslations } from '@nextblock-cms/utils';
import { countries, normalizeCountryCode } from '../countries';
import { getShippingEstimates } from '../server-actions/shipping-actions';
import { getTaxEstimate } from '../server-actions/tax-actions';
import { ResolvedShippingMethod } from '../shipping/resolver';
import { isDigitalItem } from '../types';
import { countryUsesStructuredStates, getStatesForCountry } from '../states';
import {
  addressesMatch,
  CheckoutCustomerDefaults,
  CustomerAddressInput,
  emptyCustomerAddress,
  isCustomerAddressComplete,
  normalizeCustomerAddress,
} from '../customer';

const isSandbox = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true';
import { Checkout as FreemiusCheckout } from '@freemius/checkout';

interface CheckoutProps {
  initialCustomer?: CheckoutCustomerDefaults;
}

function buildAddressState(address?: CustomerAddressInput | null, fallbackName?: string | null) {
  return {
    ...emptyCustomerAddress(),
    company_name: address?.company_name || '',
    recipient_name: address?.recipient_name || fallbackName || '',
    line1: address?.line1 || '',
    line2: address?.line2 || '',
    city: address?.city || '',
    state: address?.state || '',
    postal_code: address?.postal_code || '',
    country_code: normalizeCountryCode(address?.country_code) || 'CA',
  };
}

function AddressForm({
  idPrefix,
  title,
  description,
  value,
  onChange,
}: {
  idPrefix: string;
  title: string;
  description: string;
  value: ReturnType<typeof buildAddressState>;
  onChange: (nextValue: ReturnType<typeof buildAddressState>) => void;
}) {
  const { t } = useTranslations();
  const companyNameLabel =
    t('company_name') === 'company_name' ? 'Company name' : t('company_name');
  const availableStates = getStatesForCountry(value.country_code);
  const usesStructuredStates = countryUsesStructuredStates(value.country_code);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-company`}>{companyNameLabel}</Label>
            <Input
              id={`${idPrefix}-company`}
              value={value.company_name}
              onChange={(e) => onChange({ ...value, company_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-name`}>{t('full_name')}</Label>
            <Input
              id={`${idPrefix}-name`}
              value={value.recipient_name}
              onChange={(e) => onChange({ ...value, recipient_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-country`}>{t('country')}</Label>
            <select
              id={`${idPrefix}-country`}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={value.country_code}
              onChange={(e) => {
                const nextCountryCode = e.target.value;
                const nextStates = getStatesForCountry(nextCountryCode);
                onChange({
                  ...value,
                  country_code: nextCountryCode,
                  state: nextStates.some((entry) => entry.code === value.state) ? value.state : '',
                });
              }}
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-line1`}>{t('address_line_1')}</Label>
          <Input
            id={`${idPrefix}-line1`}
            value={value.line1}
            onChange={(e) => onChange({ ...value, line1: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-line2`}>{t('address_line_2')}</Label>
          <Input
            id={`${idPrefix}-line2`}
            value={value.line2}
            onChange={(e) => onChange({ ...value, line2: e.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-city`}>{t('city')}</Label>
            <Input
              id={`${idPrefix}-city`}
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-state`}>{t('state_province')}</Label>
            {usesStructuredStates ? (
              <select
                id={`${idPrefix}-state`}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={value.state}
                onChange={(e) => onChange({ ...value, state: e.target.value })}
              >
                <option value="">{t('select_an_option') || 'Select a state / province'}</option>
                {availableStates.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={`${idPrefix}-state`}
                value={value.state}
                onChange={(e) => onChange({ ...value, state: e.target.value })}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-postal`}>{t('postal_zip_code')}</Label>
            <Input
              id={`${idPrefix}-postal`}
              value={value.postal_code}
              onChange={(e) => onChange({ ...value, postal_code: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const Checkout = ({ initialCustomer }: CheckoutProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [email, setEmail] = useState(initialCustomer?.email || '');
  const [emailError, setEmailError] = useState('');
  const [phone, setPhone] = useState(initialCustomer?.phone || '');
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [isLoadingTaxes, setIsLoadingTaxes] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<ResolvedShippingMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [taxEstimate, setTaxEstimate] = useState<Awaited<
    ReturnType<typeof getTaxEstimate>
  >['tax'] | null>(null);
  const [billingAddress, setBillingAddress] = useState(() =>
    buildAddressState(initialCustomer?.billingAddress, initialCustomer?.fullName)
  );
  const [shippingAddress, setShippingAddress] = useState(() =>
    buildAddressState(
      initialCustomer?.shippingAddress ?? initialCustomer?.billingAddress,
      initialCustomer?.fullName
    )
  );
  const [useBillingForShipping, setUseBillingForShipping] = useState(
    !initialCustomer?.shippingAddress ||
      addressesMatch(initialCustomer?.billingAddress, initialCustomer?.shippingAddress)
  );

  const store = useCart((state) => state);
  const subtotal = useCartSubtotal();
  const { t, lang } = useTranslations();
  const items = store?.items ?? [];

  const isAuthenticated = initialCustomer?.isAuthenticated ?? false;
  const translateOrFallback = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ) => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };

  const hasPhysicalProducts = useMemo(
    () => store?.items.some((item) => !isDigitalItem(item)) ?? false,
    [store?.items]
  );

  const shippingAddressForRates = useMemo(
    () => (useBillingForShipping ? billingAddress : shippingAddress),
    [billingAddress, shippingAddress, useBillingForShipping]
  );
  const taxAddress = useMemo(
    () => (hasPhysicalProducts ? shippingAddressForRates : billingAddress),
    [billingAddress, hasPhysicalProducts, shippingAddressForRates]
  );

  const selectedMethod = useMemo(
    () => shippingMethods.find((method) => method.id === selectedMethodId),
    [shippingMethods, selectedMethodId]
  );

  const total = useMemo(
    () =>
      subtotal +
      (selectedMethod?.amount ?? 0) +
      (taxEstimate && !taxEstimate.isPendingExternalCalculation ? taxEstimate.amount : 0),
    [selectedMethod, subtotal, taxEstimate]
  );

  useEffect(() => {
    if (!hasPhysicalProducts) {
      setShippingMethods([]);
      setSelectedMethodId(null);
      return;
    }

    const fetchRates = async () => {
      if (!shippingAddressForRates.country_code) {
        return;
      }

      setIsLoadingRates(true);
      const result = await getShippingEstimates(
        subtotal,
        {
          country: shippingAddressForRates.country_code,
          state: shippingAddressForRates.state,
          postal_code: shippingAddressForRates.postal_code,
        },
        lang
      );

      if (result.success && result.methods) {
        setShippingMethods(result.methods);
        if (
          result.methods.length > 0 &&
          (!selectedMethodId || !result.methods.find((method) => method.id === selectedMethodId))
        ) {
          setSelectedMethodId(result.methods[0].id);
        }
      } else {
        setShippingMethods([]);
        setSelectedMethodId(null);
      }

      setIsLoadingRates(false);
    };

    const timer = setTimeout(fetchRates, 400);
    return () => clearTimeout(timer);
  }, [
    hasPhysicalProducts,
    selectedMethodId,
    shippingAddressForRates.country_code,
    shippingAddressForRates.postal_code,
    shippingAddressForRates.state,
    subtotal,
    lang,
  ]);

  useEffect(() => {
    const loadTaxes = async () => {
      if (!taxAddress.country_code) {
        setIsLoadingTaxes(false);
        setTaxEstimate(null);
        return;
      }

      if (countryUsesStructuredStates(taxAddress.country_code) && !taxAddress.state) {
        setIsLoadingTaxes(false);
        setTaxEstimate(null);
        return;
      }

      setIsLoadingTaxes(true);
      const result = await getTaxEstimate(items, {
        country_code: taxAddress.country_code,
        state: taxAddress.state,
      });

      if (result.success && result.tax) {
        setTaxEstimate(result.tax);
      } else {
        setTaxEstimate(null);
      }

      setIsLoadingTaxes(false);
    };

    const timer = setTimeout(loadTaxes, 300);
    return () => clearTimeout(timer);
  }, [items, taxAddress.country_code, taxAddress.state]);

  if (!store) {
    return null;
  }

  const closeSandboxModal = () => {
    setShowSandboxModal(false);
    if (store?.clearCart) {
      store.clearCart();
    }
  };

  const handlePay = async () => {
    setCheckoutError(null);

    if (!isAuthenticated && (!email || !/^\S+@\S+\.\S+$/.test(email))) {
      setEmailError(t('ecommerce.invalid_email'));
      return;
    }

    const normalizedBillingAddress = normalizeCustomerAddress(billingAddress);
    if (!isCustomerAddressComplete(normalizedBillingAddress)) {
      alert(t('checkout_complete_billing_address'));
      return;
    }

    const normalizedShippingAddress = hasPhysicalProducts
      ? normalizeCustomerAddress(useBillingForShipping ? billingAddress : shippingAddress)
      : null;

    if (hasPhysicalProducts && !isCustomerAddressComplete(normalizedShippingAddress)) {
      alert(t('checkout_complete_shipping_address'));
      return;
    }

    if (hasPhysicalProducts && !selectedMethodId) {
      alert(t('ecommerce.shipping_method_required'));
      return;
    }

    setEmailError('');

    if (isSandbox) {
      setShowSandboxModal(true);
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customerEmail: isAuthenticated ? undefined : email,
          customerPhone: phone || null,
          billingAddress: normalizedBillingAddress,
          shippingAddress: normalizedShippingAddress,
          shippingMethodId: selectedMethodId,
          locale: lang,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const translatedError =
          data?.errorKey && typeof data.errorKey === 'string'
            ? t(data.errorKey, data.errorParams)
            : data?.error || t('ecommerce.generic_error');
        setCheckoutError(translatedError);
        setIsProcessing(false);
        return;
      }

      if (data.customProps && data.customProps.provider === 'freemius') {
        const cp = data.customProps;
        const checkoutConfig = {
          product_id: cp.plugin_id,
          public_key: cp.public_key,
          sandbox: cp.sandbox,
        };
        const openConfig = {
          name: t('ecommerce.checkout_overlay_title'),
          plan_id: cp.plan_id,
          user_email: cp.user_email,
          sandbox: cp.sandbox,
          success: function () {
            window.location.href = `/checkout/success?session_id=${cp.order_id}`;
          },
        };
        try {
          const handler = new FreemiusCheckout(checkoutConfig);
          handler.open(openConfig);
          setIsProcessing(false);
        } catch (error: any) {
          alert(t('ecommerce.checkout_popup_blocked') + ' ' + (error.message || String(error)));
          if (data.url) {
            window.location.href = data.url;
          }
          setIsProcessing(false);
        }
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(t('ecommerce.checkout_failed') + (data.error || 'Unknown error'));
        setIsProcessing(false);
      }
    } catch (error) {
      console.error(error);
      setCheckoutError(t('ecommerce.generic_error'));
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <h1 className="mb-4 text-2xl font-bold">{t('ecommerce.cart_empty')}</h1>
        <p className="mb-8 text-muted-foreground">{t('ecommerce.cart_empty_description')}</p>
        <Button asChild>
          <a href="/shop">{t('ecommerce.go_to_shop')}</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      {showSandboxModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeSandboxModal}
        >
          <div
            className="relative bg-background border rounded-xl shadow-2xl p-8 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeSandboxModal}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20">
                <FlaskConical className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold">{t('ecommerce.checkout_successful')}</h2>
            </div>
            <p className="text-muted-foreground mb-2">{t('ecommerce.sandbox_notice')}</p>
            <p className="text-muted-foreground mb-6">{t('ecommerce.license_notice')}</p>
            <a
              href="https://nextblock.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-3 px-4 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              {t('ecommerce.purchase_at')}
            </a>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold">{t('ecommerce.checkout')}</h1>

        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {t('ecommerce.contact_information')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAuthenticated ? (
                  <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                      {t('checkout_prefill_notice', { email: initialCustomer?.email || '' })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="checkout-email">
                      {t('ecommerce.email_address')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="checkout-email"
                      type="email"
                      placeholder={t('ecommerce.email_placeholder')}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) {
                          setEmailError('');
                        }
                      }}
                      required
                    />
                    {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="checkout-phone">{t('phone_number')}</Label>
                  <Input
                    id="checkout-phone"
                    placeholder={t('optional')}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <AddressForm
              idPrefix="billing"
              title={t('billing_address')}
              description={t('checkout_billing_address_help')}
              value={billingAddress}
              onChange={setBillingAddress}
            />

            {hasPhysicalProducts && (
              <div className="flex items-center space-x-3 rounded-xl border bg-muted/20 p-4">
                <Checkbox
                  id="use-billing-for-shipping"
                  checked={useBillingForShipping}
                  onCheckedChange={(checked) => setUseBillingForShipping(!!checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="use-billing-for-shipping" className="cursor-pointer">
                    {t('use_billing_for_shipping')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('checkout_use_billing_for_shipping_help')}
                  </p>
                </div>
              </div>
            )}

            {hasPhysicalProducts && !useBillingForShipping && (
              <AddressForm
                idPrefix="shipping"
                title={t('shipping_address')}
                description={t('checkout_shipping_address_help')}
                value={shippingAddress}
                onChange={setShippingAddress}
              />
            )}

            {hasPhysicalProducts && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    {t('ecommerce.shipping_method')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingRates ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : shippingMethods.length > 0 ? (
                    <div className="space-y-3">
                      {shippingMethods.map((method) => (
                        <div
                          key={method.id}
                          onClick={() => setSelectedMethodId(method.id)}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedMethodId === method.id
                              ? 'border-primary bg-primary/5'
                              : 'border-neutral-100 hover:border-neutral-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                selectedMethodId === method.id ? 'border-primary' : 'border-neutral-300'
                              }`}
                            >
                              {selectedMethodId === method.id && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <span className="font-medium">{method.name}</span>
                          </div>
                          <span className="font-bold">${(method.amount / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-muted-foreground bg-muted/30 rounded-lg italic">
                      {shippingAddressForRates.postal_code
                        ? t('ecommerce.no_rates_for_region')
                        : t('ecommerce.enter_address_for_rates')}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>{t('ecommerce.order_summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        {item.image_url && (
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-neutral-100">
                            <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                          </div>
                        )}
                        <div className="grid gap-0.5">
                          <span className="font-medium text-xs line-clamp-1">{item.title}</span>
                          {item.variant_label && (
                            <span className="text-[10px] text-muted-foreground line-clamp-1">
                              {item.variant_label}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {t('ecommerce.qty')}: {item.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="font-medium text-xs">
                          ${(((item.sale_price ?? item.price) * item.quantity) / 100).toFixed(2)}
                        </span>
                        {item.sale_price && (
                          <span className="text-[9px] text-muted-foreground line-through">
                            ${((item.price * item.quantity) / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t('ecommerce.subtotal')}</span>
                    <span>${(subtotal / 100).toFixed(2)}</span>
                  </div>
                  {hasPhysicalProducts && (
                    <div className="flex justify-between">
                      <span>{t('ecommerce.shipping')}</span>
                      <span>{selectedMethod ? `$${(selectedMethod.amount / 100).toFixed(2)}` : '-'}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{translateOrFallback('ecommerce.tax', 'Tax')}</span>
                    <span>
                      {isLoadingTaxes ? (
                        '...'
                      ) : taxEstimate?.isPendingExternalCalculation ? (
                        translateOrFallback(
                          'ecommerce.tax_calculated_on_stripe',
                          'Calculated on Stripe'
                        )
                      ) : taxEstimate ? (
                        `$${(taxEstimate.amount / 100).toFixed(2)}`
                      ) : (
                        '-'
                      )}
                    </span>
                  </div>
                  {taxEstimate && taxEstimate.lines.length > 0 ? (
                    <div className="rounded-lg bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                      {taxEstimate.lines.map((line) => (
                        <div key={line.id || `${line.name}-${line.rate}`} className="flex justify-between gap-3">
                          <span>
                            {line.name} ({line.rate.toFixed(4)}%)
                          </span>
                          <span>${(line.amount / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                    <span>{t('ecommerce.total')}</span>
                    <span className="text-primary">${(total / 100).toFixed(2)}</span>
                  </div>
                </div>

                <Button className="w-full mt-4" size="lg" onClick={handlePay} disabled={isProcessing}>
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isProcessing ? t('ecommerce.processing') : t('ecommerce.pay_now')}
                </Button>

                {checkoutError ? (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {checkoutError}
                  </div>
                ) : null}

                <p className="text-[10px] text-center text-muted-foreground">
                  {taxEstimate?.isPendingExternalCalculation
                    ? translateOrFallback(
                        'checkout_stripe_tax_finalized_notice',
                        'Tax will be finalized by Stripe Tax on the payment step.'
                      )
                    : t('checkout_payment_only_notice')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
