"use client";

import { CustomerProfileForm, ExtendedProfileUpdateData, addressesMatch, type CustomerAddressInput } from "@nextblock-cms/ecommerce";
import MediaPickerDialog from "../../media/components/MediaPickerDialog";
import type { Database } from "@nextblock-cms/db";
import { useSearchParams } from "next/navigation";


type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserFormProps {
  userToEditAuth: { email: string | undefined; id: string };
  userToEditProfile: Profile | null;
  userToEditAddresses: {
    billingAddress: CustomerAddressInput | null;
    shippingAddress: CustomerAddressInput | null;
  };
  formAction: (formData: FormData) => Promise<{ error?: string } | void>;
}

export default function UserForm({ userToEditAuth, userToEditProfile, userToEditAddresses, formAction }: UserFormProps) {
  const searchParams = useSearchParams();
  const successMsg = searchParams.get('success');

  const handleAdminSave = async (data: ExtendedProfileUpdateData) => {
      const formData = new FormData();
      // Only append if defined to avoid null string issues if server doesn't handle them, 
      // but server action expects strings or checks presence.
      // Standard practice: append everything that has a value.
      if (data.full_name !== undefined) formData.append('full_name', data.full_name || '');
      if (data.avatar_url !== undefined) formData.append('avatar_url', data.avatar_url || '');
      if (data.website !== undefined) formData.append('website', data.website || '');
      if (data.github_username !== undefined) formData.append('github_username', data.github_username || '');
      if (data.phone !== undefined) formData.append('phone', data.phone || '');
      if (data.role !== undefined) formData.append('role', data.role);
      
      formData.append('billing_address', JSON.stringify(data.billing_address ?? null));
      formData.append('shipping_address', JSON.stringify(data.shipping_address ?? null));
      formData.append('use_billing_for_shipping', data.use_billing_for_shipping ? 'true' : 'false');

      return await formAction(formData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <CustomerProfileForm 
          initialData={{
              full_name: userToEditProfile?.full_name || '',
              avatar_url: userToEditProfile?.avatar_url || '',
              website: userToEditProfile?.website || '',
              github_username: userToEditProfile?.github_username || '',
              phone: userToEditProfile?.phone || '',
              role: userToEditProfile?.role || 'USER',
              billing_address: userToEditAddresses.billingAddress,
              shipping_address: userToEditAddresses.shippingAddress,
              use_billing_for_shipping:
                !userToEditAddresses.shippingAddress ||
                addressesMatch(
                  userToEditAddresses.billingAddress,
                  userToEditAddresses.shippingAddress
                ),
          }}
          MediaPickerComponent={MediaPickerDialog}
          isAdmin={true}
          email={userToEditAuth.email}
          onAction={handleAdminSave}
          initialSuccessMessage={successMsg}
      />
    </div>
  );
}
