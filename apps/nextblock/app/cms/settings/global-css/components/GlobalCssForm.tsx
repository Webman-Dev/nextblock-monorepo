'use client';

import React, { useState } from 'react';
import { updateGlobalCss } from '../actions';
import { Button } from '@nextblock-cms/ui';
import { Label } from '@nextblock-cms/ui';
import { toast } from 'sonner';

export default function GlobalCssForm({ initialCss }: { initialCss: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [css, setCss] = useState(initialCss);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await updateGlobalCss(css);
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="css">Custom CSS</Label>
        <textarea
          id="css"
          name="css"
          value={css}
          onChange={(e) => setCss(e.target.value)}
          className="w-full flex min-h-[400px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
          placeholder={`body {\n  background-color: #f0f0f0;\n}`}
        />
      </div>
      <div className="flex justify-start">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}
