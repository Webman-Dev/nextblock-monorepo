// app/cms/users/components/UserForm.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@nextblock-cms/ui";
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
import { useAuth } from "@/context/AuthContext";

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
  const [username, setUsername] = useState(userToEditProfile?.username || "");
  const [fullName, setFullName] = useState(userToEditProfile?.full_name || "");
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

    startTransition(async () => {
      const result = await formAction(formData); // The action is already bound with userId
      if (result?.error) {
        setFormMessage({ type: 'error', text: result.error });
      }
      // Success is handled by redirect with query param in server action
    });
  };

  if (authLoading) return <div>Loading...</div>;
  if (!isAdmin) return <div>Access Denied. Admin role required.</div>;

  const userRoles: UserRole[] = ['USER', 'WRITER', 'ADMIN'];

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
        <Label htmlFor="email">Email (Read-only)</Label>
        <Input id="email" name="email" value={email} readOnly disabled className="mt-1 bg-muted/50" />
      </div>

      <div>
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1" />
      </div>

      <div>
        <Label htmlFor="full_name">Full Name</Label>
        <Input id="full_name" name="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
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
          {isPending ? "Saving..." : actionButtonText}
        </Button>
      </div>
    </form>
  );
}
