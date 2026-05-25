import { redirect } from 'next/navigation';

export default async function ProductsSettingsPageRedirect() {
  redirect('/cms/shipping');
}
