import { Checkout } from '@nextblock-cms/ecommerce';
import { createClient } from '@nextblock-cms/db/server';
import { getDefaultUserAddresses } from '@nextblock-cms/ecommerce/server';

export default async function CheckoutPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <Checkout initialCustomer={{ isAuthenticated: false }} />;
  }

  const [{ data: profile }, { billingAddress, shippingAddress }] = await Promise.all([
    supabase.from('profiles').select('full_name, phone').eq('id', user.id).single(),
    getDefaultUserAddresses(user.id, supabase),
  ]);

  return (
    <Checkout
      initialCustomer={{
        isAuthenticated: true,
        email: user.email,
        fullName: profile?.full_name || null,
        phone: profile?.phone || null,
        billingAddress,
        shippingAddress,
      }}
    />
  );
}
