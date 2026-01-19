// app/cms/users/components/UserForm.tsx
"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useHotkeys } from "../../../../hooks/use-hotkeys";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@nextblock-cms/ui";
import { Spinner, Alert, AlertDescription, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@nextblock-cms/ui";
import { Info } from "lucide-react";
import { Input } from "@nextblock-cms/ui";
import { Label } from "@nextblock-cms/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nextblock-cms/ui";
import type { Database } from "@nextblock-cms/db";
import { useAuth } from "../../../../context/AuthContext";
import { useTranslations } from "@nextblock-cms/utils";

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Enums']['user_role'];
type AuthUser = {
    id: string;
    email: string | undefined;
    created_at: string | undefined;
    last_sign_in_at: string | undefined;
};

interface UserFormProps {
  userToEditAuth: AuthUser; // Auth details (email, id) - email usually not editable here
  userToEditProfile: Profile | null; // Profile details (role, username, etc.)
  formAction: (formData: FormData) => Promise<{ error?: string } | void>;
  actionButtonText?: string;
}

export default function UserForm({
  userToEditAuth,
  userToEditProfile,
  formAction,
  actionButtonText = "Save Changes",
}: UserFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { isAdmin, isLoading: authLoading } = useAuth(); // For client-side guard

  const [role, setRole] = useState<UserRole>(userToEditProfile?.role || "USER");
  const [fullName, setFullName] = useState(userToEditProfile?.full_name || "");
  const [githubUsername, setGithubUsername] = useState(userToEditProfile?.github_username || "");
  const [phone, setPhone] = useState(userToEditProfile?.phone || "");
  // Using a simplified JSON check or just text for now as we don't have a JSON editor component in context
  // Initialize useTranslations
  const { t } = useTranslations();

  // Address State
  const initialAddress = userToEditProfile?.billing_address as any || {};
  const [addressLine1, setAddressLine1] = useState(initialAddress.line1 || "");
  const [addressLine2, setAddressLine2] = useState(initialAddress.line2 || "");
  const [city, setCity] = useState(initialAddress.city || "");
  const [state, setState] = useState(initialAddress.state || "");
  const [postalCode, setPostalCode] = useState(initialAddress.postal_code || "");
  const [country, setCountry] = useState(initialAddress.country || "");

  // Computed JSON for the hidden input
  const billingAddressJSON = JSON.stringify({
    line1: addressLine1,
    line2: addressLine2,
    city: city,
    state: state,
    postal_code: postalCode,
    country: country
  });

  // Email is typically not changed here by an admin, it's part of auth.users managed by user or super-admin
  const email = userToEditAuth.email || "N/A";

  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const successMessage = searchParams.get('success');
    const errorMessage = searchParams.get('error');
    if (successMessage) {
      setFormMessage({ type: 'success', text: successMessage });
      // Optionally clear the query param from URL
      // router.replace(pathname, undefined, { shallow: true }); // if using next/router
    } else if (errorMessage) {
      setFormMessage({ type: 'error', text: errorMessage });
    }
  }, [searchParams, router]);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);
    const formData = new FormData(event.currentTarget);
    // Add user ID to form data if needed by action, or pass it directly
    // formData.append("userId", userToEditAuth.id);
    
    // Ensure billing address is set correctly (though the hidden input should handle it)
    formData.set('billing_address', billingAddressJSON);

    startTransition(async () => {
      const result = await formAction(formData); // The action is already bound with userId
      if (result?.error) {
        setFormMessage({ type: 'error', text: result.error });
      }
      // Success is handled by redirect with query param in server action
    });
  };

  if (authLoading) return <div>{t('loading') || 'Loading...'}</div>;
  if (!isAdmin) return <div>{t('access_denied') || 'Access Denied.'}</div>;

  const userRoles: UserRole[] = ['USER', 'WRITER', 'ADMIN'];

  const formRef = useRef<HTMLFormElement>(null);
  useHotkeys('ctrl+s', () => formRef.current?.requestSubmit());

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="billing_address" value={billingAddressJSON} />
      {formMessage && (
        <Alert variant={formMessage.type === 'success' ? 'success' : 'destructive'}>
           <AlertDescription>{formMessage.text}</AlertDescription>
        </Alert>
      )}
      <div>
        <Label htmlFor="email">{t('email')} (Read-only)</Label>
        <Input id="email" name="email" value={email} readOnly disabled className="mt-1 bg-muted/50" />
      </div>

      <div>
        <Label htmlFor="full_name">{t('full_name')}</Label>
        <Input id="full_name" name="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="github_username">{t('github_username')} ({t('optional') || 'Optional'})</Label>
          <Input 
            id="github_username" 
            name="github_username" 
            value={githubUsername} 
            onChange={(e) => setGithubUsername(e.target.value)} 
            className="mt-1" 
          />
        </div>
        <div>
           <Label htmlFor="phone">{t('phone_number')} ({t('optional') || 'Optional'})</Label>
           <Input 
             id="phone" 
             name="phone" 
             value={phone} 
             onChange={(e) => setPhone(e.target.value)} 
             className="mt-1" 
           />
        </div>
      </div>

       <div className="space-y-4 border p-4 rounded-md">
        <h3 className="text-sm font-medium">{t('billing_address')}</h3>
        <div className="grid gap-2">
            <Label htmlFor="line1">{t('address_line_1')}</Label>
            <Input id="line1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="mt-1" />
        </div>
        <div className="grid gap-2">
            <Label htmlFor="line2">{t('address_line_2')}</Label>
            <Input id="line2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="city">{t('city')}</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="state">{t('state_province')}</Label>
                <Input id="state" value={state} onChange={(e) => setState(e.target.value)} className="mt-1" />
            </div>
        </div>
         <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="postal_code">{t('postal_zip_code')}</Label>
                <Input id="postal_code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="mt-1" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="country">{t('country')}</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1" />
            </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Label htmlFor="role">Role</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground opacity-70 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p><strong>ADMIN:</strong> Full access to settings and content.</p>
                <p><strong>WRITER:</strong> Can create/edit content, no settings access.</p>
                <p><strong>USER:</strong> Read-only access.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Select name="role" value={role} onValueChange={(value) => setRole(value as UserRole)} required>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Select role" /></SelectTrigger>
          <SelectContent>
            {userRoles.map((r) => (
              <SelectItem key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={() => router.push("/cms/users")} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || authLoading}>
          {isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4" /> Saving...
            </>
          ) : (
            actionButtonText
          )}
        </Button>
      </div>
    </form>
  );
}
