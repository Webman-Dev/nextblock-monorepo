import 'katex/dist/katex.min.css';
import CmsClientLayout from "./CmsClientLayout";
import { verifyPackageOnline } from '@nextblock-cms/db/server';

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isEcommerceActive = await verifyPackageOnline('ecommerce');
  return <CmsClientLayout isEcommerceActive={isEcommerceActive}>{children}</CmsClientLayout>;
}