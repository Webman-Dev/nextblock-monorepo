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

  const handleActivate = async () => {
    if (!key) return;
    setLoading(true);
    try {
      const res = await activatePackage(key);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Package "${res?.package}" activated successfully!`);
        setKey('');
      }
    } catch {
      toast.error('Activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-6 border rounded-lg bg-card">
      <h3 className="text-lg font-medium mb-4">Activate a Package</h3>
      <div className="flex gap-4">
        <Input 
          placeholder="Enter your Freemius License Key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="max-w-md"
        />
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
