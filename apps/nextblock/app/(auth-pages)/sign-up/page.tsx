import { Suspense } from "react";
import { headers } from "next/headers";
import { createClient } from "@nextblock-cms/db/server";
import SignUpForm from "./SignUpForm";

type BotProtectionProvider = 'none' | 'turnstile' | 'recaptcha';

// Server wrapper: resolves the site-wide bot-protection provider + site key
// (CMS → Settings → Bot Protection) and the CSP nonce, then hands them to the
// interactive client form. Mirrors the read in components/BlockRenderer.tsx.
export default async function SignUpPage() {
  let scriptNonce = '';
  try {
    scriptNonce = (await headers()).get('x-nonce') || '';
  } catch (e) {
    console.error('[Bot Protection] Error loading CSP nonce on sign-up page:', e);
  }

  let botProtection: { provider: BotProtectionProvider; siteKey: string } = {
    provider: 'none',
    siteKey: '',
  };
  try {
    const supabase = createClient();
    const { data: publicSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'bot_protection_public')
      .maybeSingle();
    if (publicSetting?.value) {
      const publicVal = publicSetting.value as Record<string, any>;
      botProtection = {
        provider: publicVal.provider || 'none',
        siteKey: publicVal.siteKey || '',
      };
    }
  } catch (e) {
    console.error('[Bot Protection] Error loading settings on sign-up page:', e);
  }

  return (
    <Suspense fallback={null}>
      <SignUpForm botProtection={botProtection} scriptNonce={scriptNonce} />
    </Suspense>
  );
}
