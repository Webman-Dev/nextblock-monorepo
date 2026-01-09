'use client';

import { signInAction } from "../../actions";
import { FormMessage, Message } from "../../../components/form-message";
import { SubmitButton } from "../../../components/submit-button";
import { Input } from "@nextblock-cms/ui";
import { Label } from "@nextblock-cms/ui";
import Link from "next/link";
import { useTranslations } from "@nextblock-cms/utils";
import { useSearchParams } from "next/navigation";

import { SandboxCredentialsAlert } from "../../../components/SandboxCredentialsAlert";

function getMessage(searchParams: URLSearchParams): Message | undefined {
    if (searchParams.has('error')) {
        const error = searchParams.get('error');
        if (error) return { error };
    }
    if (searchParams.has('success')) {
        const success = searchParams.get('success');
        if (success) return { success };
    }
    if (searchParams.has('message')) {
        const message = searchParams.get('message');
        if (message) return { message };
    }
    return undefined;
}

export default function Login() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const formMessage = getMessage(searchParams);

  return (
    <form className="flex-1 flex flex-col w-full max-w-160 mx-auto">
      <SandboxCredentialsAlert />
      <h1 className="text-2xl font-medium">{t('sign_in')}</h1>
      <p className="text-sm text-foreground">
        {t('dont_have_account')}{" "}
        <Link className="text-foreground font-medium underline" href="/sign-up">
          {t('sign_up')}
        </Link>
      </p>
      <div className="flex flex-col gap-2 [&>input]:mb-3 mt-8">
        <Label htmlFor="email">{t('email')}</Label>
        <Input name="email" placeholder={t('you_at_example_com')} required />
        <div className="flex justify-between items-center">
          <Label htmlFor="password">{t('password')}</Label>
          <Link
            className="text-xs text-foreground underline"
            href="/forgot-password"
          >
            {t('forgot_password')}
          </Link>
        </div>
        <Input
          type="password"
          name="password"
          placeholder={t('your_password')}
          required
        />
        <SubmitButton pendingText={t('signing_in_pending')} formAction={signInAction}>
          {t('sign_in')}
        </SubmitButton>
        <FormMessage message={formMessage} />
      </div>
    </form>
  );
}
