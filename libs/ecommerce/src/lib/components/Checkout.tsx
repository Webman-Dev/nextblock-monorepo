'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Input,
  Label
} from '@nextblock-cms/ui';
import { useCartSubtotal } from '../cart-store';
import { useCart } from '../use-cart';
import { useState, useEffect, useMemo } from 'react';
import { Loader2, FlaskConical, X, Truck, CreditCard, ChevronRight } from 'lucide-react';
import { useTranslations } from '@nextblock-cms/utils';
import { countries } from '../countries';
import { getShippingEstimates } from '../server-actions/shipping-actions';
import { ResolvedShippingMethod } from '../shipping/resolver';
import { isDigitalItem } from '../types';

const isSandbox = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true';
import { Checkout as FreemiusCheckout } from '@freemius/checkout';

export const Checkout = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // Logistics State
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'CA'
  });
  const [shippingMethods, setShippingMethods] = useState<ResolvedShippingMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const store = useCart((state) => state);
  const subtotal = useCartSubtotal();
  const { t } = useTranslations();

  const hasPhysicalProducts = useMemo(() => 
    store?.items.some(item => !isDigitalItem(item)) ?? false
  , [store?.items]);

  const selectedMethod = useMemo(() => 
    shippingMethods.find(m => m.id === selectedMethodId)
  , [shippingMethods, selectedMethodId]);

  const total = useMemo(() => 
    subtotal + (selectedMethod?.amount ?? 0)
  , [subtotal, selectedMethod]);

  // Fetch shipping methods when address/country changes
  useEffect(() => {
    if (!hasPhysicalProducts) return;
    
    const fetchRates = async () => {
      if (!shippingAddress.country) return;
      
      setIsLoadingRates(true);
      const result = await getShippingEstimates(subtotal, {
        country: shippingAddress.country,
        state: shippingAddress.state,
        postal_code: shippingAddress.zip
      });
      
      if (result.success && result.methods) {
        setShippingMethods(result.methods);
        // Auto-select first method if none selected or if previously selected is gone
        if (result.methods.length > 0 && (!selectedMethodId || !result.methods.find(m => m.id === selectedMethodId))) {
          setSelectedMethodId(result.methods[0].id);
        }
      }
      setIsLoadingRates(false);
    };

    const timer = setTimeout(fetchRates, 600); // Simple debounce
    return () => clearTimeout(timer);
  }, [shippingAddress.country, shippingAddress.state, shippingAddress.zip, subtotal, hasPhysicalProducts, selectedMethodId]);


  if (!store) return null;

  const { items } = store;

  const closeSandboxModal = () => {
    setShowSandboxModal(false);
    if (store?.clearCart) store.clearCart();
  };

  const handlePay = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError(t('ecommerce.invalid_email'));
      return;
    }

    if (hasPhysicalProducts && (!shippingAddress.name || !shippingAddress.address || !shippingAddress.zip)) {
        alert(t('ecommerce.address_required'));
        return;
    }

    if (hasPhysicalProducts && !selectedMethodId) {
        alert(t('ecommerce.shipping_method_required'));
        return;
    }

    setEmailError('');

    // In sandbox mode, skip real checkout and show mock modal
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
            items: items, 
            customerEmail: email,
            shippingAddress: hasPhysicalProducts ? shippingAddress : null,
            shippingMethodId: selectedMethodId
        }),
      });
      const data = await res.json();
      
      if (data.customProps && data.customProps.provider === 'freemius') {
          // ... Freemius flow remains same ...
          const cp = data.customProps;
          const checkoutConfig = { product_id: cp.plugin_id, public_key: cp.public_key, sandbox: cp.sandbox };
          const openConfig = {
              name: t('ecommerce.checkout_overlay_title'),
              plan_id: cp.plan_id,
              user_email: cp.user_email,
              sandbox: cp.sandbox,
              success: function() { window.location.href = `/checkout/success?session_id=${cp.order_id}`; }
          };
          try {
              const handler = new FreemiusCheckout(checkoutConfig);
              handler.open(openConfig);
              setIsProcessing(false);
          } catch (e: any) {
              alert(t('ecommerce.checkout_popup_blocked') + ' ' + (e.message || String(e)));
              if (data.url) window.location.href = data.url;
              setIsProcessing(false);
          }
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        alert(t('ecommerce.checkout_failed') + (data.error || 'Unknown error'));
        setIsProcessing(false);
      }
    } catch (error) {
       console.error(error);
       alert(t('ecommerce.generic_error'));
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
     )
  }


  return (
    <div className="container mx-auto px-4 py-12 md:px-6">

      {/* Sandbox Mock Checkout Modal */}
      {showSandboxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeSandboxModal}>
          <div className="relative bg-background border rounded-xl shadow-2xl p-8 max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={closeSandboxModal} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20">
                <FlaskConical className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold">{t('ecommerce.checkout_successful')}</h2>
            </div>
            <p className="text-muted-foreground mb-2">
              🎉 {t('ecommerce.sandbox_notice')}
            </p>
            <p className="text-muted-foreground mb-6">
              {t('ecommerce.license_notice')}
            </p>
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
            {/* Left Column: Logistics & Details */}
            <div className="lg:col-span-8 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            {t('ecommerce.contact_information')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="checkout-email">{t('ecommerce.email_address')} <span className="text-destructive">*</span></Label>
                                <Input 
                                    id="checkout-email" 
                                    type="email" 
                                    placeholder={t('ecommerce.email_placeholder')} 
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (emailError) setEmailError('');
                                    }}
                                    required
                                />
                                {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {hasPhysicalProducts && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="w-5 h-5" />
                                {t('ecommerce.shipping_address')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="sh-name">{t('ecommerce.full_name')}</Label>
                                    <Input id="sh-name" value={shippingAddress.name} onChange={e => setShippingAddress({...shippingAddress, name: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sh-country">{t('ecommerce.country')}</Label>
                                    <select 
                                        id="sh-country" 
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={shippingAddress.country} 
                                        onChange={e => setShippingAddress({...shippingAddress, country: e.target.value})}
                                    >
                                        {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sh-addr">{t('ecommerce.address')}</Label>
                                <Input id="sh-addr" value={shippingAddress.address} onChange={e => setShippingAddress({...shippingAddress, address: e.target.value})} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="sh-city">{t('ecommerce.city')}</Label>
                                    <Input id="sh-city" value={shippingAddress.city} onChange={e => setShippingAddress({...shippingAddress, city: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sh-state">{t('ecommerce.state_province')}</Label>
                                    <Input id="sh-state" value={shippingAddress.state} onChange={e => setShippingAddress({...shippingAddress, state: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sh-zip">{t('ecommerce.zip_postal')}</Label>
                                    <Input id="sh-zip" value={shippingAddress.zip} onChange={e => setShippingAddress({...shippingAddress, zip: e.target.value})} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
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
                                    {shippingMethods.map(m => (
                                        <div 
                                            key={m.id} 
                                            onClick={() => setSelectedMethodId(m.id)}
                                            className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedMethodId === m.id ? 'border-primary bg-primary/5' : 'border-neutral-100 hover:border-neutral-200'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethodId === m.id ? 'border-primary' : 'border-neutral-300'}`}>
                                                    {selectedMethodId === m.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                                                </div>
                                                <span className="font-medium">{m.name}</span>
                                            </div>
                                            <span className="font-bold">${(m.amount / 100).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-4 text-center text-muted-foreground bg-muted/30 rounded-lg italic">
                                    {shippingAddress.zip ? t('ecommerce.no_rates_for_region') : t('ecommerce.enter_address_for_rates')}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Right Column: Summary & Payment */}
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
                                                <img src={item.image_url} alt={item.title} className="h-full w-full object-cover"/>
                                            </div>
                                        )}
                                        <div className="grid gap-0.5">
                                            <span className="font-medium text-xs line-clamp-1">{item.title}</span>
                                            <span className="text-[10px] text-muted-foreground">{t('ecommerce.qty')}: {item.quantity}</span>
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
                                    <span>{selectedMethod ? `$${(selectedMethod.amount / 100).toFixed(2)}` : '—'}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                                <span>{t('ecommerce.total')}</span>
                                <span className="text-primary">${(total / 100).toFixed(2)}</span>
                            </div>
                        </div>

                        <Button className="w-full mt-4" size="lg" onClick={handlePay} disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isProcessing ? t('ecommerce.processing') : t('ecommerce.pay_now')}
                        </Button>
                        
                        <p className="text-[10px] text-center text-muted-foreground">
                            {t('ecommerce.secure_checkout_guarantee')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
};
