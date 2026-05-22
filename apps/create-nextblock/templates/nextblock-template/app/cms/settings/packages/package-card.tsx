'use client';

import { PackageDef } from '@nextblock-cms/utils';
import { Button } from '@nextblock-cms/ui';
import { deactivatePackage } from '../../../actions/package-actions';
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2, CheckCircle, ExternalLink, FlaskConical, X } from 'lucide-react';

const isSandbox = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true';

interface PackageCardProps {
    pkg: PackageDef;
    isActive: boolean;
    licenseKey?: string;
}

export function PackageCard({ pkg, isActive, licenseKey }: PackageCardProps) {
    const [loading, setLoading] = useState(false);
    const [showSandboxModal, setShowSandboxModal] = useState(false);

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
        <>
            {/* Sandbox Mock Checkout Modal */}
            {showSandboxModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSandboxModal(false)}>
                    <div className="relative bg-background border rounded-xl shadow-2xl p-8 max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowSandboxModal(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20">
                                <FlaskConical className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h2 className="text-xl font-semibold">Checkout Successful</h2>
                        </div>
                        <p className="text-muted-foreground mb-2">
                            🎉 This is a <strong>Sandbox environment</strong>. The Freemius checkout is
                            skipped here for demo purposes.
                        </p>
                        <p className="text-muted-foreground mb-6">
                            To purchase a real license for your self-hosted NextBlock™ instance, visit:
                        </p>
                        <a
                            href="https://nextblock.ca"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center py-3 px-4 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                        >
                            Purchase at nextblock.ca
                        </a>
                    </div>
                </div>
            )}

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
                            <Button variant="outline" size="sm" onClick={handleDeactivate} disabled={loading || isSandbox} className="w-full text-destructive hover:text-destructive">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Deactivate License'}
                            </Button>
                        </div>
                    ) : isSandbox ? (
                        <Button className="w-full" onClick={() => setShowSandboxModal(true)}>
                            <FlaskConical className="mr-2 w-4 h-4" />
                            Buy License (Sandbox Demo)
                        </Button>
                    ) : (
                        <Button asChild className="w-full">
                            <a href="https://nextblock.ca" target="_blank" rel="noopener noreferrer">
                                Buy License <ExternalLink className="ml-2 w-3 h-3" />
                            </a>
                        </Button>
                    )}
                </div>
            </div>
        </>
    );
}
