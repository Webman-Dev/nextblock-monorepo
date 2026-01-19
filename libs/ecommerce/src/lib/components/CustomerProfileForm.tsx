'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, CardFooter, Alert, AlertDescription, Separator, Avatar, AvatarImage, AvatarFallback, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nextblock-cms/ui';
import { updateProfile, type ProfileUpdateData } from '../server-actions/customer-actions';
import { createClient, type Database } from '@nextblock-cms/db';
import { Github, Globe, Mail, Phone, User as UserIcon, Upload } from 'lucide-react';
import { useTranslations } from '@nextblock-cms/utils';

type UserRole = Database['public']['Enums']['user_role'];

// Extend ProfileUpdateData to optionally include role for admin updates
export interface ExtendedProfileUpdateData extends ProfileUpdateData {
    role?: UserRole;
}

interface CustomerProfileFormProps {
  initialData?: ExtendedProfileUpdateData;
  MediaPickerComponent?: React.ComponentType<any>;
  isAdmin?: boolean; // If true, shows admin-only fields like Role
  email?: string; // Read-only email to display
  onAction?: (data: ExtendedProfileUpdateData) => Promise<{ error?: string } | void>; // Override default update action
  initialSuccessMessage?: string | null;
}

export function CustomerProfileForm({ initialData, MediaPickerComponent, isAdmin, email, onAction, initialSuccessMessage }: CustomerProfileFormProps) {
  const { t } = useTranslations();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(
      initialSuccessMessage ? { type: 'success', text: initialSuccessMessage } : null
  );

  const { register, handleSubmit, formState: { errors }, setValue, getValues, watch, reset } = useForm<ExtendedProfileUpdateData>({
    defaultValues: {
      full_name: initialData?.full_name || '',
      avatar_url: initialData?.avatar_url || '',
      website: initialData?.website || '',
      github_username: initialData?.github_username || '',
      phone: initialData?.phone || '',
      role: initialData?.role, // This will just be ignored if not present/used
      billing_address: {
        line1: initialData?.billing_address?.line1 || '',
        line2: initialData?.billing_address?.line2 || '',
        city: initialData?.billing_address?.city || '',
        state: initialData?.billing_address?.state || '',
        postal_code: initialData?.billing_address?.postal_code || '',
        country: initialData?.billing_address?.country || '',
      }
    }
  });

  // Reset form when initialData changes to ensure fields are populated
  React.useEffect(() => {
    if (initialData) {
      reset({
        full_name: initialData.full_name || '',
        avatar_url: initialData.avatar_url || '',
        website: initialData.website || '',
        github_username: initialData.github_username || '',
        phone: initialData.phone || '',
        role: initialData.role,
        billing_address: {
          line1: initialData.billing_address?.line1 || '',
          line2: initialData.billing_address?.line2 || '',
          city: initialData.billing_address?.city || '',
          state: initialData.billing_address?.state || '',
          postal_code: initialData.billing_address?.postal_code || '',
          country: initialData.billing_address?.country || '',
        }
      });
    }

  }, [initialData, reset]);

  React.useEffect(() => {
      if (initialSuccessMessage) {
          setMsg({ type: 'success', text: initialSuccessMessage });
      }
  }, [initialSuccessMessage]);

  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [githubEmail, setGithubEmail] = useState<string | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const githubIdentity = user.identities?.find((id: any) => id.provider === 'github');
        if (githubIdentity) {
          setIsGithubConnected(true);
          // Try to get email from identity data or user email if provider is github
          const email = githubIdentity.identity_data?.email || (user.app_metadata.provider === 'github' ? user.email : null);
          setGithubEmail(email as string);

          // Extract website/blog if website field is empty and not manually set
          if (!getValues('website')) {
             const blog = githubIdentity.identity_data?.custom_claims?.blog || githubIdentity.identity_data?.blog || githubIdentity.identity_data?.html_url;
             if (blog) {
                setValue('website', blog);
             }
          }

          // Extract avatar if empty
          if (!getValues('avatar_url')) {
             const avatar = githubIdentity.identity_data?.avatar_url;
             if (avatar) {
                setValue('avatar_url', avatar);
             }
          }
          
          // Always update GitHub username from identity to ensure it's correct (no typos)
          const ghUsername = githubIdentity.identity_data?.user_name || githubIdentity.identity_data?.user_name || githubIdentity.identity_data?.preferred_username;
          if (ghUsername) {
              setValue('github_username', ghUsername);
          }
        }
        
        // Fallback: If full_name is empty in profile (from initialData/getValues), try to get it from user_metadata
        if (!getValues('full_name') && user.user_metadata?.full_name) {
            setValue('full_name', user.user_metadata.full_name);
        }
      }
    };
    checkUser();
  }, [initialData]);

  const handleLinkGithub = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.linkIdentity({ provider: 'github' });
    if (error) {
        console.error("Error linking GitHub:", error);
        setMsg({ type: 'error', text: t('github_link_failed') || 'Failed to link GitHub account' });
    }
  };

  const handleMediaSelect = (media: any) => {
     // Construct URL. Assuming R2_BASE_URL is handled by Media object or we construct it.
     // In this specific project, media object has `object_key`.
     const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE_URL || 'https://assets.nextblock.com'; // Fallback
     const url = `${r2BaseUrl}/${media.object_key}`;
     setValue('avatar_url', url);
  };

  const onSubmit = async (data: ExtendedProfileUpdateData) => {
    setLoading(true);
    setMsg(null);
    try {
      if (onAction) {
          // Use provided custom action (e.g. for Admin)
          const result = await onAction(data);
          if (result?.error) throw new Error(result.error);
      } else {
          // Default to self-update
          await updateProfile(data);
      }
      setMsg({ type: 'success', text: t('profile_updated_success') });
    } catch (error: any) {
      if (error.message === 'NEXT_REDIRECT' || error.message?.includes('NEXT_REDIRECT')) {
        return; // Ignore redirect error, let Next.js handle navigation
      }
      console.error(error);
      setMsg({ type: 'error', text: error.message || t('profile_update_failed') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-12 max-w-5xl mx-auto">
      <Card className="md:col-span-4 h-fit">
        <CardHeader>
             <CardTitle className="text-xl">{t('public_profile')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center space-y-4">
             <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-muted">
                    <AvatarImage src={watch('avatar_url') || undefined} className="object-cover" />
                    <AvatarFallback className="text-4xl bg-secondary">
                        {watch('full_name')?.charAt(0)?.toUpperCase() || <UserIcon className="h-12 w-12" />}
                    </AvatarFallback>
                </Avatar>
                {MediaPickerComponent && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full cursor-pointer">
                        <MediaPickerComponent 
                            triggerLabel={<Upload className="h-6 w-6 text-white" />} 
                            triggerVariant="ghost" 
                            title={t('customer_profile')} 
                            onSelect={handleMediaSelect}
                            accept={(m: any) => m.file_type.startsWith('image/')}
                            hideTrigger={false} // Use the trigger inside
                        />
                    </div>
                )}
             </div>
             
             {!MediaPickerComponent && (
                 <div className="w-full">
                     <Label htmlFor="avatar_url" className="sr-only">{t('avatar_url')}</Label>
                     <Input id="avatar_url" {...register('avatar_url')} placeholder="https://..." className="mt-2" />
                 </div>
             )}

             <div className="w-full space-y-1 text-left mt-4">
                 <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('identity')}</div>
                 <div className="flex items-center gap-2">
                     <span className="font-semibold text-lg">{watch('full_name') || t('full_name')}</span>
                 </div>
                 {isGithubConnected && (
                      <Badge variant="secondary" className="mt-2 w-fit gap-1">
                          <Github className="h-3 w-3" /> {t('github_connected') || 'GitHub Connected'}
                      </Badge>
                 )}
             </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-8">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
            <CardTitle>{t('details')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {email && (
             <div className="space-y-2">
               <Label htmlFor="email">{t('email') || 'Email'} (Read-only)</Label>
               <Input id="email" value={email} readOnly disabled className="bg-muted/50" />
             </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
             <div className="space-y-2">
               <Label htmlFor="full_name" className="flex items-center gap-2"><UserIcon className="h-4 w-4" /> {t('full_name')}</Label>
               <Input id="full_name" {...register('full_name')} />
             </div>
             <div className="space-y-2">
               <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="h-4 w-4" /> {t('phone_number')}</Label>
               <Input id="phone" {...register('phone')} />
             </div>
          </div>


          <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                 <Label htmlFor="website" className="flex items-center gap-2"><Globe className="h-4 w-4" /> {t('website')}</Label>
                 <Input id="website" {...register('website')} placeholder="https://example.com" />
              </div>

               <div className="space-y-2">
                  <Label htmlFor="github_username" className="flex items-center gap-2"><Github className="h-4 w-4" /> {t('github_username')}</Label>
                  
                  {isGithubConnected ? (
                      <div className="space-y-2">
                          <Input 
                            id="github_username" 
                            {...register('github_username')} 
                            disabled={true}
                            className="bg-muted"
                          />
                          {githubEmail && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {t('linked_to') || 'Linked to'} {githubEmail}
                              </p>
                          )}
                      </div>
                  ) : (
                      <div>
                          <Button type="button" variant="outline" className="w-full" onClick={handleLinkGithub}>
                              <Github className="mr-2 h-4 w-4" />
                              {t('connect_github')}
                          </Button>
                      </div>
                  )}
              </div>
          </div>

          <Separator className="my-2" />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('billing_address')}</h3>
            <div className="grid gap-2">
              <Label htmlFor="line1">{t('address_line_1')}</Label>
              <Input id="line1" {...register('billing_address.line1', { required: t('address_required') })} />
              {errors.billing_address?.line1 && <p className="text-red-500 text-xs">{errors.billing_address.line1.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="line2">{t('address_line_2')}</Label>
              <Input id="line2" {...register('billing_address.line2')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">{t('city')}</Label>
                <Input id="city" {...register('billing_address.city', { required: t('city_required') })} />
                {errors.billing_address?.city && <p className="text-red-500 text-xs">{errors.billing_address.city.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">{t('state_province')}</Label>
                <Input id="state" {...register('billing_address.state')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="postal_code">{t('postal_zip_code')}</Label>
                <Input id="postal_code" {...register('billing_address.postal_code', { required: t('zip_code_required') })} />
                {errors.billing_address?.postal_code && <p className="text-red-500 text-xs">{errors.billing_address.postal_code.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">{t('country')}</Label>
                <Input id="country" {...register('billing_address.country', { required: t('country_required') })} />
                {errors.billing_address?.country && <p className="text-red-500 text-xs">{errors.billing_address.country.message}</p>}
              </div>
            </div>
          </div>
          
            {msg && (
            <Alert variant={msg.type === 'success' ? 'success' : 'destructive'} className="mt-4">
               <AlertDescription>{msg.text}</AlertDescription>
            </Alert>
          )}

          {isAdmin && (
              <div className="border-t pt-4 mt-4">
                 <h3 className="text-sm font-medium mb-3">Admin Settings</h3>
                 <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Select 
                        value={watch('role') || 'USER'} 
                        onValueChange={(val: UserRole) => setValue('role', val)}
                    >
                        <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="USER">User</SelectItem>
                            <SelectItem value="WRITER">Writer</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
              </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={loading} size="lg">
            {loading ? t('saving') : t('save_changes')}
          </Button>
        </CardFooter>
      </form>
      </Card>
    </div>
  );
}
