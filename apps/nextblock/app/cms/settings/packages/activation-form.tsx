'use client';

import { useState } from 'react';
import { activatePackage } from '../../../actions/package-actions';
import { toast } from 'sonner';
import { Button } from '@nextblock-cms/ui/button';
import { Input } from '@nextblock-cms/ui/input';
import { Loader2 } from 'lucide-react';

export function ActivationForm() {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleActivate = async () => {
    if (!key) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await activatePackage(key);
      if (res?.error) {
        toast.error(res.error);
        setErrorMsg(res.error);
      } else {
        toast.success(`Package "${res?.package}" activated successfully!`);
        setKey('');
        setErrorMsg(null);
      }
    } catch {
      toast.error('Activation failed. Please try again.');
      setErrorMsg('Activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-6 border rounded-lg bg-card">
      <h3 className="text-lg font-medium mb-4">Activate a Package</h3>
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-2 flex-1 max-w-md">
          <Input 
            placeholder="Enter your Freemius License Key"
            value={key}
            onChange={(e) => {
                setKey(e.target.value);
                setErrorMsg(null);
            }}
          />
          {errorMsg && (
            <p className="text-sm font-medium text-destructive">{errorMsg}</p>
          )}
        </div>
        <Button onClick={handleActivate} disabled={loading || !key}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Activate License
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Enter the license key you received from Freemius to unlock the package features.
      </p>
    </div>
  );
}
