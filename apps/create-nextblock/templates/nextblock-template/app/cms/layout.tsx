import 'katex/dist/katex.min.css';
import { redirect } from 'next/navigation';
import CmsClientLayout from "./CmsClientLayout";
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { evaluateTwoFactor } from '../../lib/auth/twoFactor';

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce any outstanding second factor before rendering the CMS. This guards
  // direct navigation to /cms/* with an aal1 (password-only) session.
  const twoFactor = await evaluateTwoFactor();
  if (twoFactor.status === 'totp_required' || twoFactor.status === 'email_required') {
    redirect('/two-factor?redirect_to=/cms/dashboard');
  }

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
