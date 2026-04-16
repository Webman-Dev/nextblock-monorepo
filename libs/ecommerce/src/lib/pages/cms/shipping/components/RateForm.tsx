"use client"

import React, { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Button,
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

type Language = Pick<
  Database['public']['Tables']['languages']['Row'],
  'code' | 'name' | 'is_default'
>;

interface RateFormProps {
    zoneId: string;
    zoneName: string;
    languages: Language[];
    mode?: 'create' | 'edit';
    initialData?: {
        id: string;
        name: string;
        name_translations?: Record<string, string> | null;
        method_type: 'flat_rate' | 'free_shipping';
        cost_amount: number;
        min_order_amount: number;
    };
}

export function RateForm({ zoneId, zoneName, languages, mode = 'create', initialData }: RateFormProps) {
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
    
    const [name, setName] = useState(initialData?.name || '');
    const [nameTranslations, setNameTranslations] = useState<Record<string, string>>(
      initialData?.name_translations || {}
    );
    const [type, setType] = useState<'flat_rate' | 'free_shipping'>(initialData?.method_type || 'flat_rate');
    const [cost, setCost] = useState(initialData ? (initialData.cost_amount / 100).toFixed(2) : '0.00');
    const [minOrder, setMinOrder] = useState(initialData ? (initialData.min_order_amount / 100).toFixed(2) : '0.00');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && initialData) {
            setName(initialData.name);
            setNameTranslations(initialData.name_translations || {});
            setType(initialData.method_type);
            setCost((initialData.cost_amount / 100).toFixed(2));
            setMinOrder((initialData.min_order_amount / 100).toFixed(2));
        }

        if (open && !initialData) {
            setName('');
            setNameTranslations({});
            setType('flat_rate');
            setCost('0.00');
            setMinOrder('0.00');
        }
    }, [open, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const amountCents = Math.round(parseFloat(cost || '0') * 100);
        const minAmountCents = Math.round(parseFloat(minOrder || '0') * 100);
        
        let result;
        if (isEdit && initialData?.id) {
            result = await updateShippingRate(initialData.id, { 
                name,
                nameTranslations,
                type, 
                cost: amountCents,
                minOrderAmount: minAmountCents
            });
        } else {
            result = await createShippingRate(zoneId, { 
                name,
                nameTranslations,
                type, 
                cost: amountCents,
                minOrderAmount: minAmountCents
            });
        }
        
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
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
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
                                onValueChange={(val: 'flat_rate' | 'free_shipping') => {
                                    setType(val);
                                    if (val === 'free_shipping') setCost('0.00');
                                }}
                            >
                                <SelectTrigger className="bg-slate-50/50 dark:bg-slate-900/50">
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cost">Cost (USD)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input 
                                        id="cost" 
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={cost} 
                                        onChange={(e) => setCost(e.target.value)}
                                        className="pl-9 bg-slate-50/50 dark:bg-slate-900/50 disabled:opacity-50"
                                        disabled={type === 'free_shipping'}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="min-order">Min. Order Total</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input 
                                        id="min-order" 
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={minOrder} 
                                        onChange={(e) => setMinOrder(e.target.value)}
                                        className="pl-9 bg-slate-50/50 dark:bg-slate-900/50"
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500">Apply rate for orders above this total.</p>
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
