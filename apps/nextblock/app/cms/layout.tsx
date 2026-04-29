import 'katex/dist/katex.min.css';
import CmsClientLayout from "./CmsClientLayout";
import { verifyPackageOnline } from '@nextblock-cms/db/server';

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isEcommerceActive, isCortexAiActive] = await Promise.all([
    verifyPackageOnline('ecommerce'),
    verifyPackageOnline('cortex-ai'),
  ]);

  return (
    <CmsClientLayout isCortexAiActive={isCortexAiActive} isEcommerceActive={isEcommerceActive}>
      {children}
    </CmsClientLayout>
  );
}
