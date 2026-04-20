"use client"

import { useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@nextblock-cms/ui';
import { Plus, DollarSign, Gift, Edit2, Languages } from 'lucide-react';
import { createShippingRate, updateShippingRate } from '../server-actions';
import type { Database } from '@nextblock-cms/db';
import {
    getCurrencyMinorUnitFactor,
    majorUnitAmountToMinor,
    minorUnitAmountToMajor,
    normalizeCurrencyCode,
} from '@nextblock-cms/utils';
import {
    convertMinorUnitAmount,
    normalizeCurrencyRecord,
    type CurrencyRecord,
} from '../../../../currency';
import {
    normalizeShippingRateCurrencyMode,
    sanitizeShippingRateAmountMaps,
    type ShippingRateCurrencyMode,
} from '../../../../shipping-rate-currency';

type Language = Pick<
  Database['public']['Tables']['languages']['Row'],
  'code' | 'name' | 'is_default'
>;

interface RateFormProps {
    zoneId: string;
    zoneName: string;
    languages: Language[];
    currencies?: CurrencyRecord[];
    defaultCurrencyCode?: string;
    mode?: 'create' | 'edit';
    initialData?: {
        id: string;
        name: string;
        name_translations?: Record<string, string> | null;
        method_type: 'flat_rate' | 'free_shipping';
        cost_amount: number;
        cost_amounts?: Record<string, number> | null;
        cost_currency?: string | null;
        currency_pricing_mode?: ShippingRateCurrencyMode | null;
        min_order_amount: number;
        min_order_amounts?: Record<string, number> | null;
    };
}

function formatMinorAmountForInput(
    amount: number | null | undefined,
    currencyCode: string
) {
    if (typeof amount !== 'number') {
        return '';
    }

    const majorAmount = minorUnitAmountToMajor(amount, currencyCode);
    return getCurrencyMinorUnitFactor(currencyCode) === 1
        ? majorAmount.toFixed(0)
        : majorAmount.toFixed(2);
}

function buildZeroInputMap(currencies: CurrencyRecord[]) {
    return currencies.reduce<Record<string, string>>((accumulator, currency) => {
        accumulator[currency.code] =
            getCurrencyMinorUnitFactor(currency.code) === 1 ? '0' : '0.00';
        return accumulator;
    }, {});
}

function parseMajorInputToMinor(
    value: string | undefined,
    currencyCode: string
) {
    const normalizedValue = String(value || '').trim();

    if (!normalizedValue) {
        return null;
    }

    const parsedValue = Number(normalizedValue);

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return null;
    }

    return majorUnitAmountToMinor(parsedValue, currencyCode);
}

function buildEditorInputMap(params: {
    amounts: Record<string, number>;
    currencies: CurrencyRecord[];
}) {
    return params.currencies.reduce<Record<string, string>>((accumulator, currency) => {
        accumulator[currency.code] = formatMinorAmountForInput(
            params.amounts[currency.code],
            currency.code
        );
        return accumulator;
    }, {});
}

export function RateForm({
    zoneId,
    zoneName,
    languages,
    currencies = [],
    defaultCurrencyCode = 'USD',
    mode = 'create',
    initialData,
}: RateFormProps) {
    const [open, setOpen] = useState(false);
    const isEdit = mode === 'edit';
    const defaultLanguage = useMemo(
      () => languages.find((language) => language.is_default) || languages[0] || null,
      [languages]
    );
    const translatableLanguages = useMemo(
      () => languages.filter((language) => !language.is_default),
      [languages]
    );
    const normalizedDefaultCurrencyCode = normalizeCurrencyCode(defaultCurrencyCode);
    const availableCurrencies = useMemo(() => {
        const fallbackCurrency = normalizeCurrencyRecord({
            code: normalizedDefaultCurrencyCode,
            symbol: normalizedDefaultCurrencyCode,
            exchange_rate: 1,
            is_default: true,
            is_active: true,
        });

        const normalizedCurrencies = (currencies.length > 0 ? currencies : [fallbackCurrency])
            .map((currency) => normalizeCurrencyRecord(currency))
            .filter((currency) => currency.is_active !== false)
            .sort((left, right) => {
                if (left.is_default !== right.is_default) {
                    return left.is_default ? -1 : 1;
                }

                return left.code.localeCompare(right.code);
            });

        return normalizedCurrencies.length > 0
            ? normalizedCurrencies
            : [fallbackCurrency];
    }, [currencies, normalizedDefaultCurrencyCode]);
    const defaultCurrency = useMemo(
        () => availableCurrencies.find((currency) => currency.is_default) || availableCurrencies[0],
        [availableCurrencies]
    );

    const [name, setName] = useState(initialData?.name || '');
    const [nameTranslations, setNameTranslations] = useState<Record<string, string>>(
      initialData?.name_translations || {}
    );
    const [type, setType] = useState<'flat_rate' | 'free_shipping'>(
        initialData?.method_type || 'flat_rate'
    );
    const [pricingMode, setPricingMode] = useState<ShippingRateCurrencyMode>(
        normalizeShippingRateCurrencyMode(initialData?.currency_pricing_mode)
    );
    const [sourceCurrencyCode, setSourceCurrencyCode] = useState(
        normalizeCurrencyCode(initialData?.cost_currency || defaultCurrency?.code || normalizedDefaultCurrencyCode)
    );
    const [costAmounts, setCostAmounts] = useState<Record<string, string>>({});
    const [minOrderAmounts, setMinOrderAmounts] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const displayedCostAmounts = useMemo(() => {
        if (pricingMode === 'manual') {
            return availableCurrencies.reduce<Record<string, string>>((accumulator, currency) => {
                accumulator[currency.code] = costAmounts[currency.code] ?? '';
                return accumulator;
            }, {});
        }

        const nextAmounts = availableCurrencies.reduce<Record<string, string>>(
            (accumulator, currency) => {
                accumulator[currency.code] =
                    costAmounts[currency.code] ?? (currency.code === sourceCurrencyCode ? '' : '');
                return accumulator;
            },
            {}
        );
        const sourceAmount = parseMajorInputToMinor(
            costAmounts[sourceCurrencyCode],
            sourceCurrencyCode
        );

        if (sourceAmount === null) {
            return nextAmounts;
        }

        for (const currency of availableCurrencies) {
            if (currency.code === sourceCurrencyCode) {
                nextAmounts[currency.code] =
                    costAmounts[currency.code] ?? formatMinorAmountForInput(sourceAmount, currency.code);
                continue;
            }

            nextAmounts[currency.code] = formatMinorAmountForInput(
                convertMinorUnitAmount({
                    amount: sourceAmount,
                    fromCurrencyCode: sourceCurrencyCode,
                    toCurrencyCode: currency.code,
                    currencies: availableCurrencies,
                }),
                currency.code
            );
        }

        return nextAmounts;
    }, [availableCurrencies, costAmounts, pricingMode, sourceCurrencyCode]);

    const displayedMinOrderAmounts = useMemo(() => {
        if (pricingMode === 'manual') {
            return availableCurrencies.reduce<Record<string, string>>((accumulator, currency) => {
                accumulator[currency.code] = minOrderAmounts[currency.code] ?? '';
                return accumulator;
            }, {});
        }

        const nextAmounts = availableCurrencies.reduce<Record<string, string>>(
            (accumulator, currency) => {
                accumulator[currency.code] = minOrderAmounts[currency.code] ?? '';
                return accumulator;
            },
            {}
        );
        const sourceAmount = parseMajorInputToMinor(
            minOrderAmounts[sourceCurrencyCode],
            sourceCurrencyCode
        );

        if (sourceAmount === null) {
            return nextAmounts;
        }

        for (const currency of availableCurrencies) {
            if (currency.code === sourceCurrencyCode) {
                nextAmounts[currency.code] =
                    minOrderAmounts[currency.code] ??
                    formatMinorAmountForInput(sourceAmount, currency.code);
                continue;
            }

            nextAmounts[currency.code] = formatMinorAmountForInput(
                convertMinorUnitAmount({
                    amount: sourceAmount,
                    fromCurrencyCode: sourceCurrencyCode,
                    toCurrencyCode: currency.code,
                    currencies: availableCurrencies,
                }),
                currency.code
            );
        }

        return nextAmounts;
    }, [availableCurrencies, minOrderAmounts, pricingMode, sourceCurrencyCode]);

    useEffect(() => {
        if (!defaultCurrency) {
            return;
        }

        if (!availableCurrencies.some((currency) => currency.code === sourceCurrencyCode)) {
            setSourceCurrencyCode(defaultCurrency.code);
        }
    }, [availableCurrencies, defaultCurrency, sourceCurrencyCode]);

    useEffect(() => {
        if (!open || !defaultCurrency) {
            return;
        }

        const initialPricingMode = normalizeShippingRateCurrencyMode(
            initialData?.currency_pricing_mode
        );
        const sanitizedAmounts = sanitizeShippingRateAmountMaps({
            currencies: availableCurrencies,
            mode: initialPricingMode,
            sourceCurrencyCode:
                initialData?.cost_currency || defaultCurrency.code,
            costAmounts: initialData?.cost_amounts || undefined,
            minOrderAmounts: initialData?.min_order_amounts || undefined,
            fallbackCostAmount: initialData?.cost_amount,
            fallbackMinOrderAmount: initialData?.min_order_amount,
        });

        setName(initialData?.name || '');
        setNameTranslations(initialData?.name_translations || {});
        setType(initialData?.method_type || 'flat_rate');
        setPricingMode(initialPricingMode);
        setSourceCurrencyCode(sanitizedAmounts.sourceCurrencyCode);
        setCostAmounts(
            buildEditorInputMap({
                amounts: sanitizedAmounts.costAmounts,
                currencies: availableCurrencies,
            })
        );
        setMinOrderAmounts(
            buildEditorInputMap({
                amounts: sanitizedAmounts.minOrderAmounts,
                currencies: availableCurrencies,
            })
        );
    }, [availableCurrencies, defaultCurrency, initialData, open]);

    const handlePricingModeChange = (nextMode: ShippingRateCurrencyMode) => {
        if (nextMode === pricingMode) {
            return;
        }

        if (nextMode === 'manual') {
            setCostAmounts(displayedCostAmounts);
            setMinOrderAmounts(displayedMinOrderAmounts);
        }

        setPricingMode(nextMode);
    };

    const handleSourceCurrencyChange = (nextCurrencyCode: string) => {
        const normalizedCurrencyCode = normalizeCurrencyCode(nextCurrencyCode);

        setCostAmounts((current) => ({
            ...current,
            [normalizedCurrencyCode]:
                displayedCostAmounts[normalizedCurrencyCode] ??
                current[normalizedCurrencyCode] ??
                '',
        }));
        setMinOrderAmounts((current) => ({
            ...current,
            [normalizedCurrencyCode]:
                displayedMinOrderAmounts[normalizedCurrencyCode] ??
                current[normalizedCurrencyCode] ??
                '',
        }));
        setSourceCurrencyCode(normalizedCurrencyCode);
    };

    const handleMethodTypeChange = (nextType: 'flat_rate' | 'free_shipping') => {
        setType(nextType);

        if (nextType === 'free_shipping') {
            setCostAmounts(buildZeroInputMap(availableCurrencies));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const nextCostAmounts: Record<string, number> = {};
        const nextMinOrderAmounts: Record<string, number> = {};

        if (pricingMode === 'manual') {
            for (const currency of availableCurrencies) {
                const currencyCode = currency.code;

                if (type === 'free_shipping') {
                    nextCostAmounts[currencyCode] = 0;
                } else {
                    const parsedCostAmount = parseMajorInputToMinor(
                        costAmounts[currencyCode],
                        currencyCode
                    );

                    if (parsedCostAmount === null) {
                        setIsLoading(false);
                        alert(`Enter a valid shipping cost for ${currencyCode}.`);
                        return;
                    }

                    nextCostAmounts[currencyCode] = parsedCostAmount;
                }

                nextMinOrderAmounts[currencyCode] =
                    parseMajorInputToMinor(minOrderAmounts[currencyCode], currencyCode) ?? 0;
            }
        } else {
            const parsedSourceCostAmount =
                type === 'free_shipping'
                    ? 0
                    : parseMajorInputToMinor(
                          costAmounts[sourceCurrencyCode],
                          sourceCurrencyCode
                      );

            if (parsedSourceCostAmount === null) {
                setIsLoading(false);
                alert(`Enter a valid shipping cost for ${sourceCurrencyCode}.`);
                return;
            }

            nextCostAmounts[sourceCurrencyCode] = parsedSourceCostAmount;
            nextMinOrderAmounts[sourceCurrencyCode] =
                parseMajorInputToMinor(
                    minOrderAmounts[sourceCurrencyCode],
                    sourceCurrencyCode
                ) ?? 0;
        }
        
        const payload = {
            name,
            nameTranslations,
            type,
            currencyPricingMode: pricingMode,
            sourceCurrencyCode,
            costAmounts: nextCostAmounts,
            minOrderAmounts: nextMinOrderAmounts,
        };
        const result =
            isEdit && initialData?.id
                ? await updateShippingRate(initialData.id, payload)
                : await createShippingRate(zoneId, payload);
        
        setIsLoading(false);
        if (result.success) {
            setOpen(false);
        } else if (result.error) {
            alert(result.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {isEdit ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-primary">
                        <Edit2 className="h-3 w-3" />
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 border-dashed hover:border-solid shadow-sm">
                        <Plus className="h-3.5 w-3.5" />
                        Add Rate
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit Shipping Rate' : 'Add Shipping Rate'}</DialogTitle>
                        <DialogDescription>
                            Configure shipping costs and localized labels for matching orders in <strong>{zoneName}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="rate-name">
                              Rate Name{defaultLanguage ? ` (${defaultLanguage.name})` : ''}
                            </Label>
                            <Input 
                                id="rate-name" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Standard, Express, Free Shipping" 
                                required
                            />
                        </div>

                        {translatableLanguages.length > 0 && (
                          <div className="space-y-4 rounded-xl border bg-slate-50/70 p-4 dark:bg-slate-900/40">
                            <div className="flex items-center gap-2">
                              <Languages className="h-4 w-4 text-slate-500" />
                              <div>
                                <p className="text-sm font-medium">Translations</p>
                                <p className="text-xs text-muted-foreground">
                                  Add translated shipping rate labels for the active storefront languages.
                                </p>
                              </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              {translatableLanguages.map((language) => (
                                <div key={language.code} className="space-y-2">
                                  <Label htmlFor={`rate-name-${language.code}`}>
                                    {language.name}
                                  </Label>
                                  <Input
                                    id={`rate-name-${language.code}`}
                                    value={nameTranslations[language.code] || ''}
                                    onChange={(event) =>
                                      setNameTranslations((current) => ({
                                        ...current,
                                        [language.code]: event.target.value,
                                      }))
                                    }
                                    placeholder={name || 'Translated label'}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="type">Method Type</Label>
                            <Select
                                value={type}
                                onValueChange={handleMethodTypeChange}
                            >
                                <SelectTrigger
                                    id="type"
                                    className="bg-slate-50/50 dark:bg-slate-900/50"
                                >
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="flat_rate">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 min-w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                                                <DollarSign className="h-3 w-3" />
                                            </div>
                                            <span>Flat Rate</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="free_shipping">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 min-w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                                                <Gift className="h-3 w-3" />
                                            </div>
                                            <span>Free Shipping</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3 rounded-xl border bg-slate-50/70 p-4 dark:bg-slate-900/40">
                            <label className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={pricingMode === 'auto'}
                                    onChange={(event) =>
                                        handlePricingModeChange(
                                            event.target.checked ? 'auto' : 'manual'
                                        )
                                    }
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <span className="space-y-1">
                                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                                        Auto-sync all currency rates from one source amount
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                        Turn this off to set exact shipping costs and free-shipping thresholds for every active currency manually.
                                    </span>
                                </span>
                            </label>

                            {pricingMode === 'auto' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="rate-currency">Sync From Currency</Label>
                                    <Select
                                        value={sourceCurrencyCode}
                                        onValueChange={handleSourceCurrencyChange}
                                    >
                                        <SelectTrigger
                                            id="rate-currency"
                                            className="bg-background"
                                        >
                                            <SelectValue placeholder="Select currency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableCurrencies.map((currency) => (
                                                <SelectItem key={currency.code} value={currency.code}>
                                                    {currency.code}
                                                    {currency.is_default ? ' (Default)' : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-slate-500">
                                        Enter the source amount once and the other currencies will be derived automatically using the current FX rates.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-[10px] text-slate-500">
                                    Manual mode stores exact values per currency. This is the best choice when shipping should not follow exchange-rate math directly.
                                </p>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-medium">Currency Rates</p>
                                <p className="text-xs text-muted-foreground">
                                    {type === 'free_shipping'
                                        ? 'Free-shipping methods keep cost at zero, but you can still control the threshold per currency.'
                                        : pricingMode === 'auto'
                                          ? `Only ${sourceCurrencyCode} is editable. The rest are derived automatically.`
                                          : 'Set the exact shopper-facing shipping price for each active currency.'}
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {availableCurrencies.map((currency) => {
                                    const isDerived =
                                        pricingMode === 'auto' &&
                                        currency.code !== sourceCurrencyCode;
                                    const currencyInputStep =
                                        getCurrencyMinorUnitFactor(currency.code) === 1
                                            ? '1'
                                            : '0.01';

                                    return (
                                        <div
                                            key={currency.code}
                                            className="space-y-4 rounded-xl border bg-card/70 p-4 shadow-sm"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div>
                                                    <p className="font-medium">{currency.code}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Rate {currency.exchange_rate}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {currency.is_default ? (
                                                        <Badge variant="outline">Default</Badge>
                                                    ) : null}
                                                    {pricingMode === 'auto' &&
                                                    currency.code === sourceCurrencyCode ? (
                                                        <Badge>Source</Badge>
                                                    ) : null}
                                                    {isDerived ? (
                                                        <Badge variant="outline">Derived</Badge>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor={`rate-cost-${currency.code}`}>
                                                    Cost ({currency.code})
                                                </Label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                                    <Input
                                                        id={`rate-cost-${currency.code}`}
                                                        type="number"
                                                        step={currencyInputStep}
                                                        min="0"
                                                        value={displayedCostAmounts[currency.code] ?? ''}
                                                        onChange={(event) =>
                                                            setCostAmounts((current) => ({
                                                                ...current,
                                                                [currency.code]: event.target.value,
                                                            }))
                                                        }
                                                        className="pl-9 bg-slate-50/50 dark:bg-slate-900/50 disabled:opacity-70"
                                                        disabled={type === 'free_shipping' || isDerived}
                                                        required={
                                                            type !== 'free_shipping' &&
                                                            pricingMode === 'manual'
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor={`rate-threshold-${currency.code}`}>
                                                    Free-Shipping Threshold ({currency.code})
                                                </Label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                                    <Input
                                                        id={`rate-threshold-${currency.code}`}
                                                        type="number"
                                                        step={currencyInputStep}
                                                        min="0"
                                                        value={displayedMinOrderAmounts[currency.code] ?? ''}
                                                        onChange={(event) =>
                                                            setMinOrderAmounts((current) => ({
                                                                ...current,
                                                                [currency.code]: event.target.value,
                                                            }))
                                                        }
                                                        className="pl-9 bg-slate-50/50 dark:bg-slate-900/50 disabled:opacity-70"
                                                        disabled={isDerived}
                                                        placeholder={
                                                            getCurrencyMinorUnitFactor(currency.code) === 1
                                                                ? '0'
                                                                : '0.00'
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {isDerived ? (
                                                <p className="text-[10px] text-muted-foreground">
                                                    This currency is synced automatically from {sourceCurrencyCode}.
                                                </p>
                                            ) : pricingMode === 'manual' ? (
                                                <p className="text-[10px] text-muted-foreground">
                                                    Enter the exact amount shoppers should see in this currency.
                                                </p>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50 dark:bg-slate-900/50 -mx-6 -mb-6 p-4 border-t dark:border-slate-800">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>Cancel</Button>
                        <Button type="submit" disabled={isLoading || !name.trim()}>
                            {isLoading 
                                ? (isEdit ? 'Saving...' : 'Adding...') 
                                : (isEdit ? 'Save Changes' : 'Add Rate')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
