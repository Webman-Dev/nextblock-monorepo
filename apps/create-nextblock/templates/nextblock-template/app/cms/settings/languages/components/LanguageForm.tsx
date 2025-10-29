// app/cms/settings/languages/components/LanguageForm.tsx
"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@nextblock-cms/ui';
import { Input } from '@nextblock-cms/ui';
import { Label } from '@nextblock-cms/ui';
import { Checkbox } from '@nextblock-cms/ui'; // Assuming shadcn/ui Checkbox
import type { Database } from "@nextblock-cms/db";

type Language = Database["public"]["Tables"]["languages"]["Row"];
import { useAuth } from '@/context/AuthContext';

interface LanguageFormProps {
  language?: Language | null;
  formAction: (formData: FormData) => Promise<{ error?: string } | void>;
  actionButtonText?: string;
  isEditing?: boolean;
  allLanguages?: Language[]; // Pass all languages to check for "only default" scenario
}

export default function LanguageForm({
  language,
  formAction,
  actionButtonText = "Save Language",
  isEditing = false,
  allLanguages = []
}: LanguageFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { isAdmin, isLoading: authLoading } = useAuth();

  const [code, setCode] = useState(language?.code || "");
  const [name, setName] = useState(language?.name || "");
  const [isDefault, setIsDefault] = useState(language?.is_default || false);
  const [isActive, setIsActive] = useState(language?.is_active ?? true);

  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const successMessage = searchParams.get('success');
    const errorMessage = searchParams.get('error');
    if (successMessage) setFormMessage({ type: 'success', text: successMessage });
    else if (errorMessage) setFormMessage({ type: 'error', text: errorMessage });
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);
    const formData = new FormData(event.currentTarget);
    // Checkbox value needs to be explicitly set if not checked
    if (!isDefault) {
        formData.delete('is_default'); // Remove if not checked, action handles "on" or missing
    } else {
        formData.set('is_default', 'on');
    }
    if (isActive) {
      formData.set('is_active', 'on');
    } else {
      formData.delete('is_active');
    }


    startTransition(async () => {
      const result = await formAction(formData);
      if (result?.error) {
        setFormMessage({ type: 'error', text: result.error });
      }
      // Success is handled by redirect with query param in server action
    });
  };

  if (authLoading) return <div>Loading...</div>;
  if (!isAdmin) return <div>Access Denied. Admin role required.</div>;

  const isTheOnlyDefaultLanguage = isEditing && language?.is_default && allLanguages.filter(l => l.is_default).length === 1;


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formMessage && (
        <div
          className={`p-3 rounded-md text-sm ${
            formMessage.type === 'success'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}
        >
          {formMessage.text}
        </div>
      )}
      <div>
        <Label htmlFor="code">Language Code (e.g., en, fr-CA)</Label>
        <Input
          id="code"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          maxLength={10}
          className="mt-1"
          placeholder="en"
        />
        <p className="text-xs text-muted-foreground mt-1">Short, unique BCP 47 language tag.</p>
      </div>

      <div>
        <Label htmlFor="name">Display Name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1"
          placeholder="English"
        />
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="is_default"
          name="is_default"
          checked={isDefault}
          onCheckedChange={(checked) => setIsDefault(checked as boolean)}
          disabled={isTheOnlyDefaultLanguage && isDefault} // Prevent unchecking the only default
        />
        <Label htmlFor="is_default" className="font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Set as Default Language
        </Label>
      </div>
       {isTheOnlyDefaultLanguage && isDefault && (
          <p className="text-xs text-amber-600">This is the only default language. To change, set another language as default.</p>
      )}

      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="is_active"
          name="is_active"
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked as boolean)}
        />
        <Label htmlFor="is_active" className="font-normal leading-none">
          Language is Active
        </Label>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">Inactive languages are hidden from public view but still available for content management.</p>


      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/cms/settings/languages")}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || authLoading}>
          {isPending ? "Saving..." : actionButtonText}
        </Button>
      </div>
    </form>
  );
}
