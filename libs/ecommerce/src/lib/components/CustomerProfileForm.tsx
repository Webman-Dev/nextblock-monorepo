'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@nextblock-cms/ui';
import { updateProfile, type ProfileUpdateData } from '../server-actions/customer-actions';

interface CustomerProfileFormProps {
  initialData?: ProfileUpdateData;
}

import { useTranslations } from '@nextblock-cms/utils';

export function CustomerProfileForm({ initialData }: CustomerProfileFormProps) {
  const { t } = useTranslations();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileUpdateData>({
    defaultValues: {
      full_name: initialData?.full_name || '',
      github_username: initialData?.github_username || '',
      phone: initialData?.phone || '',
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

  const onSubmit = async (data: ProfileUpdateData) => {
    setLoading(true);
    setMsg(null);
    try {
      await updateProfile(data);
      setMsg({ type: 'success', text: t('profile_updated_success') });
    } catch (error) {
      console.error(error);
      setMsg({ type: 'error', text: t('profile_update_failed') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t('customer_profile')}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('personal_information')}</h3>
            <div className="grid gap-2">
              <Label htmlFor="full_name">{t('full_name')}</Label>
              <Input id="full_name" {...register('full_name')} />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="github_username">{t('github_username')}</Label>
              <Input id="github_username" {...register('github_username')} />
              <p className="text-xs text-muted-foreground">{t('github_username_help')}</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">{t('phone_number')}</Label>
              <Input id="phone" {...register('phone')} />
            </div>
          </div>

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
            <div className={`p-3 rounded text-sm ${msg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {msg.text}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? t('saving') : t('save_profile')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
