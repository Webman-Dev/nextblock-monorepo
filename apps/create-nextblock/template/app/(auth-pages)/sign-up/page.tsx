'use client';

import { signUpAction } from "../../actions";
import { FormMessage, Message } from "../../../components/form-message";
import { SubmitButton } from "../../../components/submit-button";
import { Input } from "@nextblock-cms/ui";
import { Label } from "@nextblock-cms/ui";
import Link from "next/link";
import { useTranslations } from "@nextblock-cms/utils";
import { useSearchParams } from "next/navigation";
import { GitHubLoginButton } from "../../../components/GitHubLoginButton";

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

export default function Signup() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const formMessage = getMessage(searchParams);

  if (formMessage && 'message' in formMessage) {
    return (
      <div className="w-full flex-1 flex items-center h-screen sm:max-w-md justify-center gap-2 p-4">
        <FormMessage message={formMessage} />
      </div>
    );
  }

  return (
    <>
      <form className="flex flex-col w-full max-w-160 mx-auto">
        <SandboxCredentialsAlert />
        <h1 className="text-2xl font-medium">{t('sign_up')}</h1>
        <p className="text-sm text text-foreground">
          {t('already_have_account')}{" "}
          <Link className="text-primary font-medium underline" href="/sign-in">
            {t('sign_in')}
          </Link>
        </p>
        <div className="flex flex-col gap-2 mt-8">
          <GitHubLoginButton t={t} />

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{t('or_continue_with') || "Or continue with"}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 [&>input]:mb-3">
            <Label htmlFor="email">{t('email')}</Label>
            <Input name="email" placeholder={t('you_at_example_com')} required />
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              type="password"
              name="password"
              placeholder={t('your_password')}
              minLength={6}
              required
            />
            <SubmitButton formAction={signUpAction} pendingText={t('signing_up_pending')}>
              {t('sign_up')}
            </SubmitButton>
            <FormMessage message={formMessage} />
          </div>
        </div>
      </form>
    </>
  );
}
