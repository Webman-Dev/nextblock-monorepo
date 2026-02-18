'use client';

import { PackageDef } from '@nextblock-cms/utils';
import { Button } from '@nextblock-cms/ui';
import { deactivatePackage } from '../../../actions/package-actions';
// or better, if we have an alias? No, let's use relative but correct one.
// The file is apps/nextblock/app/cms/settings/packages/package-card.tsx
// actions is apps/nextblock/app/actions/package-actions.ts
// ../../../../actions/package-actions
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2, CheckCircle, ExternalLink } from 'lucide-react';

interface PackageCardProps {
    pkg: PackageDef;
    isActive: boolean;
    licenseKey?: string;
}

export function PackageCard({ pkg, isActive, licenseKey }: PackageCardProps) {
    const [loading, setLoading] = useState(false);

    const handleDeactivate = async () => {
        if (!confirm('Are you sure you want to deactivate this package? functionality will be locked instantly.')) return;
        setLoading(true);
        try {
            const res = await deactivatePackage(pkg.id);
            if (res?.error) {
                toast.error(res.error);
            } else {
                toast.success('Package deactivated.');
            }
        } catch {
            toast.error('Deactivation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border rounded-lg p-6 flex flex-col justify-between h-full bg-card shadow-sm">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-semibold">{pkg.name}</h3>
                        {isActive ? (
                            <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 mt-1">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 mt-1">
                                Inactive
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-muted-foreground mb-6">{pkg.description}</p>
            </div>

            <div className="pt-4 border-t">
                {isActive ? (
                    <div className="flex flex-col gap-3">
                        <div className="text-xs text-muted-foreground">
                            License: <span className="font-mono bg-muted px-1 rounded">{licenseKey ? `•••• ${licenseKey.slice(-4)}` : '••••'}</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleDeactivate} disabled={loading} className="w-full text-destructive hover:text-destructive">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Deactivate License'}
                        </Button>
                    </div>
                ) : (
                    <Button asChild className="w-full">
                        <a href={pkg.purchase_url} target="_blank" rel="noopener noreferrer">
                            Buy License <ExternalLink className="ml-2 w-3 h-3" />
                        </a>
                    </Button>
                )}
            </div>
        </div>
    );
}
