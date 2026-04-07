"use client"

import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { 
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
    Button, Input, Label, Checkbox,
    Card
} from '@nextblock-cms/ui';
import { Plus, Search, Edit2 } from 'lucide-react';
import { createShippingZone, updateShippingZone } from '../server-actions';
import { countries as countriesList } from '../../../../countries'; 

// Sub-component to isolate re-renders for individual country items
const RegionRow = memo(({ country, isSelected, toggle }: {
    country: any,
    isSelected: boolean,
    toggle: (code: string) => void
}) => {
    return (
        <div 
            className={`flex items-center space-x-2 p-2 rounded-md transition-colors border ${
                isSelected 
                    ? 'bg-primary/5 text-primary border-primary/20 font-semibold' 
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
        >
            <Checkbox 
                id={`check-${country.code}`}
                checked={isSelected}
                onCheckedChange={() => toggle(country.code)}
            />
            <label 
                htmlFor={`check-${country.code}`}
                className="text-xs cursor-pointer flex-1 truncate py-1"
            >
                {country.name} ({country.code})
            </label>
        </div>
    );
});
RegionRow.displayName = 'RegionRow';

interface ZoneFormProps {
    mode?: 'create' | 'edit';
    initialData?: {
        id: string;
        name: string;
        priority_order: number;
        countries: string[];
    };
}

export function ZoneForm({ mode = 'create', initialData }: ZoneFormProps) {
    const [open, setOpen] = useState(false);
    const isEdit = mode === 'edit';
    
    // Internal states
    const [name, setName] = useState(initialData?.name || '');
    const [priority, setPriority] = useState(initialData?.priority_order || 0);
    const [selectedCountries, setSelectedCountries] = useState<string[]>(initialData?.countries || []);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Sync state if initialData changes or dialog opens
    useEffect(() => {
        if (open && initialData) {
            setName(initialData.name);
            setPriority(initialData.priority_order);
            setSelectedCountries(initialData.countries);
        }
    }, [open, initialData]);

    // Stable toggle callback
    const toggleCountry = useCallback((code: string) => {
        setSelectedCountries(prev => 
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    }, []);

    // Stable filtered list
    const filteredCountries = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return countriesList.filter((c: any) => 
            c.name.toLowerCase().includes(query) || 
            c.code.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || selectedCountries.length === 0) return;
        
        setIsLoading(true);
        let result;
        
        if (isEdit && initialData?.id) {
            result = await updateShippingZone(initialData.id, name, priority, selectedCountries);
        } else {
            result = await createShippingZone(name, priority, selectedCountries);
        }
        
        setIsLoading(false);
        
        if (result.success) {
            setOpen(false);
            if (!isEdit) {
                setName('');
                setPriority(0);
                setSelectedCountries([]);
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
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit Shipping Zone' : 'Create Shipping Zone'}</DialogTitle>
                        <DialogDescription>
                            {isEdit 
                                ? 'Update the regions and priority for this shipping zone.' 
                                : 'Define a geographical area. You can apply specific rates to this zone afterwards.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-6 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Zone Name</Label>
                            <Input 
                                id="name" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. North America, EU, Rest of World" 
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

                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <Label className="text-sm font-semibold">Select Countries ({selectedCountries.length})</Label>
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input 
                                        placeholder="Search countries..." 
                                        className="pl-9 h-9"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <Card className="p-0 border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                                <div className="h-[300px] p-4 overflow-y-auto">
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                        {filteredCountries.map((country: any) => (
                                            <RegionRow 
                                                key={country.code}
                                                country={country}
                                                isSelected={selectedCountries.includes(country.code)}
                                                toggle={toggleCountry}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <DialogFooter className="mt-auto border-t pt-4">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading || !name || selectedCountries.length === 0}>
                            {isLoading 
                                ? (isEdit ? 'Updating...' : 'Creating...') 
                                : (isEdit ? 'Save Changes' : 'Create Zone')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
