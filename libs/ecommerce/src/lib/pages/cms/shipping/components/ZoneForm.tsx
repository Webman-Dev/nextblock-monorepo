"use client"

import React, { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Card,
    Checkbox,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Input,
    Label,
} from '@nextblock-cms/ui';
import { Edit2, MapPin, Plus, Search } from 'lucide-react';

import { countries as countriesList } from '../../../../countries';
import { getStatesForCountry } from '../../../../states';
import {
    createShippingZone,
    type ShippingZoneLocationInput,
    updateShippingZone,
} from '../server-actions';

interface ZoneFormProps {
    mode?: 'create' | 'edit';
    initialData?: {
        id: string;
        name: string;
        priority_order: number;
        locations: ShippingZoneLocationInput[];
    };
}

function buildSelectedCountries(locations: ShippingZoneLocationInput[] = []) {
    return [...new Set(locations.map((location) => location.country_code))];
}

function buildSelectedStates(locations: ShippingZoneLocationInput[] = []) {
    return locations.reduce<Record<string, string[]>>((accumulator, location) => {
        if (!location.state_code) {
            return accumulator;
        }

        const current = new Set(accumulator[location.country_code] || []);
        current.add(location.state_code);
        accumulator[location.country_code] = [...current];
        return accumulator;
    }, {});
}

function buildLocationsPayload(
    selectedCountries: string[],
    selectedStatesByCountry: Record<string, string[]>
): ShippingZoneLocationInput[] {
    return selectedCountries.flatMap<ShippingZoneLocationInput>((countryCode) => {
        const selectedStates = selectedStatesByCountry[countryCode] || [];

        if (selectedStates.length === 0) {
            return [{ country_code: countryCode, state_code: null }];
        }

        return selectedStates.map((stateCode) => ({
            country_code: countryCode,
            state_code: stateCode,
        }));
    });
}

export function ZoneForm({ mode = 'create', initialData }: ZoneFormProps) {
    const [open, setOpen] = useState(false);
    const isEdit = mode === 'edit';

    const [name, setName] = useState(initialData?.name || '');
    const [priority, setPriority] = useState(initialData?.priority_order || 0);
    const [selectedCountries, setSelectedCountries] = useState<string[]>(
        buildSelectedCountries(initialData?.locations)
    );
    const [selectedStatesByCountry, setSelectedStatesByCountry] = useState<Record<string, string[]>>(
        buildSelectedStates(initialData?.locations)
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        setName(initialData?.name || '');
        setPriority(initialData?.priority_order || 0);
        setSelectedCountries(buildSelectedCountries(initialData?.locations));
        setSelectedStatesByCountry(buildSelectedStates(initialData?.locations));
        setSearchQuery('');
    }, [initialData, open]);

    const filteredCountries = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) {
            return countriesList;
        }

        return countriesList.filter(
            (country) =>
                country.name.toLowerCase().includes(query) ||
                country.code.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const selectedCountryEntries = useMemo(() => {
        return countriesList.filter((country) => selectedCountries.includes(country.code));
    }, [selectedCountries]);

    const toggleCountry = (countryCode: string) => {
        setSelectedCountries((current) =>
            current.includes(countryCode)
                ? current.filter((entry) => entry !== countryCode)
                : [...current, countryCode]
        );

        setSelectedStatesByCountry((current) => {
            if (current[countryCode]) {
                const next = { ...current };
                delete next[countryCode];
                return next;
            }

            return current;
        });
    };

    const toggleState = (countryCode: string, stateCode: string) => {
        setSelectedStatesByCountry((current) => {
            const existing = new Set(current[countryCode] || []);

            if (existing.has(stateCode)) {
                existing.delete(stateCode);
            } else {
                existing.add(stateCode);
            }

            return {
                ...current,
                [countryCode]: [...existing],
            };
        });
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!name || selectedCountries.length === 0) {
            return;
        }

        setIsLoading(true);
        const locations = buildLocationsPayload(selectedCountries, selectedStatesByCountry);

        const result =
            isEdit && initialData?.id
                ? await updateShippingZone(initialData.id, name, priority, locations)
                : await createShippingZone(name, priority, locations);

        setIsLoading(false);

        if (result.success) {
            setOpen(false);

            if (!isEdit) {
                setName('');
                setPriority(0);
                setSelectedCountries([]);
                setSelectedStatesByCountry({});
                setSearchQuery('');
            }
        } else if (result.error) {
            alert(result.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {isEdit ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                        <Edit2 className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button className="gap-2 shadow-sm">
                        <Plus className="h-4 w-4" />
                        New Zone
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <form onSubmit={handleSubmit} className="flex h-full flex-col overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit Shipping Zone' : 'Create Shipping Zone'}</DialogTitle>
                        <DialogDescription>
                            Select countries first, then optionally limit a zone to specific
                            states or provinces. Leaving state selections empty keeps the whole
                            country in the zone.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 overflow-y-auto py-6 pr-2">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Zone Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. North America, Canada East, US West"
                                className="col-span-3"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="priority" className="text-right">Priority Order</Label>
                            <Input
                                id="priority"
                                type="number"
                                value={priority}
                                onChange={(e) => setPriority(Number(e.target.value))}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                            <div className="space-y-4">
                                <div className="flex items-end justify-between gap-3">
                                    <Label className="text-sm font-semibold">
                                        Countries ({selectedCountries.length})
                                    </Label>
                                    <div className="relative w-full max-w-xs">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Search countries..."
                                            className="pl-9 h-9"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Card className="border-slate-200 bg-slate-50/30 p-4 dark:border-slate-800 dark:bg-slate-900/30">
                                    <div className="grid max-h-[360px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                                        {filteredCountries.map((country) => {
                                            const isSelected = selectedCountries.includes(country.code);

                                            return (
                                                <div
                                                    key={country.code}
                                                    className={`flex items-center space-x-2 rounded-md border p-2 transition-colors ${
                                                        isSelected
                                                            ? 'border-primary/30 bg-primary/5 text-primary'
                                                            : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                                    }`}
                                                >
                                                    <Checkbox
                                                        id={`country-${country.code}`}
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleCountry(country.code)}
                                                    />
                                                    <label
                                                        htmlFor={`country-${country.code}`}
                                                        className="flex-1 cursor-pointer text-xs py-1"
                                                    >
                                                        {country.name} ({country.code})
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-slate-500" />
                                    <Label className="text-sm font-semibold">States / Provinces</Label>
                                </div>

                                {selectedCountryEntries.length === 0 ? (
                                    <Card className="border-dashed p-4 text-sm text-muted-foreground">
                                        Select one or more countries to optionally narrow the zone
                                        to specific states or provinces.
                                    </Card>
                                ) : (
                                    <div className="space-y-4">
                                        {selectedCountryEntries.map((country) => {
                                            const states = getStatesForCountry(country.code);
                                            const selectedStates = selectedStatesByCountry[country.code] || [];

                                            return (
                                                <Card key={country.code} className="p-4">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div>
                                                                <p className="font-medium">
                                                                    {country.name} ({country.code})
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {states.length > 0
                                                                        ? 'Leave all unchecked to apply this zone to the whole country.'
                                                                        : 'This country uses a country-level zone in the current UI.'}
                                                                </p>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                {selectedStates.length > 0
                                                                    ? `${selectedStates.length} selected`
                                                                    : 'Whole country'}
                                                            </span>
                                                        </div>

                                                        {states.length > 0 ? (
                                                            <div className="grid max-h-[220px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                                                                {states.map((state) => {
                                                                    const isChecked = selectedStates.includes(state.code);

                                                                    return (
                                                                        <div
                                                                            key={`${country.code}-${state.code}`}
                                                                            className={`flex items-center space-x-2 rounded-md border p-2 transition-colors ${
                                                                                isChecked
                                                                                    ? 'border-primary/30 bg-primary/5 text-primary'
                                                                                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                                                            }`}
                                                                        >
                                                                            <Checkbox
                                                                                id={`${country.code}-${state.code}`}
                                                                                checked={isChecked}
                                                                                onCheckedChange={() =>
                                                                                    toggleState(country.code, state.code)
                                                                                }
                                                                            />
                                                                            <label
                                                                                htmlFor={`${country.code}-${state.code}`}
                                                                                className="flex-1 cursor-pointer text-xs py-1"
                                                                            >
                                                                                {state.name} ({state.code})
                                                                            </label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-auto border-t pt-4">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !name || selectedCountries.length === 0}>
                            {isLoading
                                ? isEdit
                                    ? 'Updating...'
                                    : 'Creating...'
                                : isEdit
                                    ? 'Save Changes'
                                    : 'Create Zone'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
