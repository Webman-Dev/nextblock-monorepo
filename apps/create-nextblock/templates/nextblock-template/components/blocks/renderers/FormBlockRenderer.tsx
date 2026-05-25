"use client";

import React, { useActionState, useState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import Script from 'next/script';
import { handleFormSubmission } from '../../../app/actions/formActions';
import type { FormBlockContent, FormField } from '../../../lib/blocks/blockRegistry';
import { Button } from '@nextblock-cms/ui';
import { Checkbox } from '@nextblock-cms/ui';
import { Input } from '@nextblock-cms/ui';
import { Label } from '@nextblock-cms/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nextblock-cms/ui';
import { Textarea } from '@nextblock-cms/ui';
import type { VisualEditAttributes } from '../../../lib/visual-editing/types';

interface FormBlockRendererProps {
  content: FormBlockContent;
  languageId: number;
  visualEditAttributes?: VisualEditAttributes;
  botProtectionPublic?: BotProtectionPublicSettings;
  scriptNonce?: string;
}

type BotProtectionProvider = 'none' | 'turnstile' | 'recaptcha';

type BotProtectionPublicSettings = {
  provider: BotProtectionProvider;
  siteKey: string;
};

function SubmitButton({ text, verifying }: { text: string; verifying?: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = pending || verifying;
  return (
    <Button type="submit" disabled={isDisabled}>
      {verifying ? 'Verifying...' : pending ? 'Submitting...' : text}
    </Button>
  );
}

function resolveBotProtection(
  content: FormBlockContent,
  botProtectionPublic?: BotProtectionPublicSettings
) {
  const blockProvider = content.botProtectionProvider;
  const provider: BotProtectionProvider =
    blockProvider === 'turnstile' || blockProvider === 'recaptcha'
      ? blockProvider
      : botProtectionPublic?.provider || 'none';
  const fallbackSiteKey =
    provider === 'turnstile'
      ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
      : provider === 'recaptcha'
        ? process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
        : '';
  const publicSiteKey =
    provider === botProtectionPublic?.provider ? botProtectionPublic?.siteKey || '' : '';
  const siteKey = content.botProtectionSiteKey?.trim() ||
    publicSiteKey ||
    fallbackSiteKey ||
    '';

  return { provider, siteKey };
}

const FormBlockRenderer: React.FC<FormBlockRendererProps> = ({ content, visualEditAttributes, botProtectionPublic, scriptNonce }) => {
  const { provider, siteKey } = resolveBotProtection(content, botProtectionPublic);
  const [state, formAction] = useActionState(handleFormSubmission.bind(null, {
    recipient: content.recipient_email,
    botProtectionProvider: provider,
  }), {
    success: false,
    message: '',
  });

  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const pendingTurnstileFormRef = useRef<HTMLFormElement | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileError, setTurnstileError] = useState<string>('');
  const [isVerifyingTurnstile, setIsVerifyingTurnstile] = useState(false);

  useEffect(() => {
    if (provider === 'turnstile' && siteKey && typeof window !== 'undefined') {
      let widgetId: string | null = null;

      const renderWidget = () => {
        if ((window as any).turnstile && turnstileRef.current) {
          // Clear any stale children
          turnstileRef.current.innerHTML = '';
          try {
            widgetId = (window as any).turnstile.render(turnstileRef.current, {
              sitekey: siteKey,
              theme: 'light',
              execution: 'execute',
              'response-field': false,
              callback: (token: string) => {
                setTurnstileToken(token);
                setTurnstileError('');
                setIsVerifyingTurnstile(false);

                const form = pendingTurnstileFormRef.current;
                if (form) {
                  pendingTurnstileFormRef.current = null;
                  const input = form.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null;
                  if (input) {
                    input.value = token;
                  }
                  form.requestSubmit();
                }
              },
              'expired-callback': () => {
                setTurnstileToken('');
              },
              'error-callback': () => {
                setTurnstileToken('');
                pendingTurnstileFormRef.current = null;
                setIsVerifyingTurnstile(false);
                setTurnstileError('Security verification could not be completed. Please try again.');
              },
              'timeout-callback': () => {
                setTurnstileToken('');
                pendingTurnstileFormRef.current = null;
                setIsVerifyingTurnstile(false);
                setTurnstileError('Security verification timed out. Please try again.');
              },
            });
            turnstileWidgetIdRef.current = widgetId;

            if (widgetId && pendingTurnstileFormRef.current) {
              try {
                (window as any).turnstile.execute(widgetId);
              } catch (err) {
                console.error("Turnstile execute error:", err);
                pendingTurnstileFormRef.current = null;
                setIsVerifyingTurnstile(false);
                setTurnstileError('Security verification could not be started. Please try again.');
              }
            }
          } catch (err) {
            console.error("Turnstile render error:", err);
            pendingTurnstileFormRef.current = null;
            setIsVerifyingTurnstile(false);
            setTurnstileError('Security verification could not be loaded. Please refresh and try again.');
          }
        }
      };

      if ((window as any).turnstile) {
        renderWidget();
      } else {
        const interval = setInterval(() => {
          if ((window as any).turnstile) {
            clearInterval(interval);
            renderWidget();
          }
        }, 100);
        return () => clearInterval(interval);
      }

      return () => {
        if (widgetId && (window as any).turnstile) {
          try {
            (window as any).turnstile.remove(widgetId);
          } catch {
            // Ignore
          }
        }
        turnstileWidgetIdRef.current = null;
      };
    }
  }, [provider, siteKey]);

  useEffect(() => {
    if (!state.success && state.message) {
      setRecaptchaToken('');

      if (provider === 'turnstile') {
        setTurnstileToken('');
        pendingTurnstileFormRef.current = null;
        setIsVerifyingTurnstile(false);
        const widgetId = turnstileWidgetIdRef.current;
        if (widgetId && typeof window !== 'undefined' && (window as any).turnstile) {
          try {
            (window as any).turnstile.reset(widgetId);
          } catch {
            // Ignore reset failures; the next render can still create a fresh token.
          }
        }
      }
    }
  }, [provider, state.message, state.success]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (provider === 'turnstile' && siteKey) {
      const widgetId = turnstileWidgetIdRef.current;
      const turnstile = typeof window !== 'undefined' ? (window as any).turnstile : undefined;
      const token = widgetId && turnstile
        ? turnstile.getResponse(widgetId)
        : turnstileToken;

      const input = e.currentTarget.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null;
      if (token && input) {
        input.value = token;
        return;
      }

      e.preventDefault();

      if (!widgetId || !turnstile) {
        pendingTurnstileFormRef.current = e.currentTarget;
        setTurnstileError('');
        setIsVerifyingTurnstile(true);
        return;
      }

      pendingTurnstileFormRef.current = e.currentTarget;
      setTurnstileError('');
      setIsVerifyingTurnstile(true);

      try {
        turnstile.execute(widgetId);
      } catch (err) {
        console.error("Turnstile execute error:", err);
        pendingTurnstileFormRef.current = null;
        setIsVerifyingTurnstile(false);
        setTurnstileError('Security verification could not be started. Please try again.');
      }
      return;
    }

    if (provider === 'recaptcha' && siteKey && !recaptchaToken) {
      e.preventDefault();
      const form = e.currentTarget;
      if (typeof window !== 'undefined' && (window as any).grecaptcha) {
        (window as any).grecaptcha.ready(() => {
          (window as any).grecaptcha.execute(siteKey, { action: 'submit' }).then((token: string) => {
            setRecaptchaToken(token);
            const input = form.querySelector('input[name="g-recaptcha-response"]') as HTMLInputElement;
            if (input) {
              input.value = token;
            }
            form.requestSubmit();
          });
        });
      }
    }
  };

  if (state.success) {
    return (
      <div
        className="p-4 rounded-md bg-green-100 text-green-800 text-center"
        {...visualEditAttributes}
      >
        {content.success_message}
      </div>
    );
  }

  return (
    <>
      {provider === 'recaptcha' && siteKey && (
        <Script
          strategy="lazyOnload"
          src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
          nonce={scriptNonce}
        />
      )}
      {provider === 'turnstile' && siteKey && (
        <Script
          strategy="afterInteractive"
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          nonce={scriptNonce}
          onError={() => {
            pendingTurnstileFormRef.current = null;
            setIsVerifyingTurnstile(false);
            setTurnstileError('Security verification could not be loaded. Please refresh and try again.');
          }}
        />
      )}

      <form
        action={formAction}
        onSubmit={handleSubmit}
        className="space-y-4 my-6 container mx-auto"
        {...visualEditAttributes}
      >
        {/* Invisible Honeypot input field */}
        <div className="absolute opaque-0 opacity-0 w-0 h-0 pointer-events-none select-none" style={{ opacity: 0, width: 0, height: 0, zIndex: -1 }}>
          <Label htmlFor="verification_secondary_email" className="sr-only">Do not fill this field</Label>
          <Input
            id="verification_secondary_email"
            type="text"
            name="verification_secondary_email"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {content.fields.map((field: FormField) => (
          <div key={field.temp_id} className="space-y-2">
            <Label htmlFor={field.temp_id}>
              {field.label} {field.is_required && <span className="text-red-500">*</span>}
            </Label>
            {renderField(field)}
          </div>
        ))}

        {provider === 'recaptcha' && (
          <input type="hidden" name="g-recaptcha-response" value={recaptchaToken} readOnly />
        )}

        {provider === 'turnstile' && siteKey && (
          <div className="my-4 flex justify-start">
            <input type="hidden" name="cf-turnstile-response" value={turnstileToken} readOnly />
            <div ref={turnstileRef}></div>
          </div>
        )}

        {turnstileError && (
          <p className="text-sm text-red-600">{turnstileError}</p>
        )}

        {state.message && !state.success && (
            <p className="text-sm text-red-600">{state.message}</p>
        )}
        <SubmitButton text={content.submit_button_text} verifying={isVerifyingTurnstile} />
      </form>
    </>
  );
};

const renderField = (field: FormField) => {
    const commonProps = {
        id: field.temp_id,
        name: field.label.toLowerCase().replace(/\s+/g, '_'),
        placeholder: field.placeholder || '',
        required: field.is_required,
    };

    switch (field.field_type) {
        case 'textarea':
            return <Textarea {...commonProps} />;
        case 'select':
            return (
                <Select name={commonProps.name} required={field.is_required}>
                    <SelectTrigger id={commonProps.id}><SelectValue placeholder={field.placeholder || 'Select an option'} /></SelectTrigger>
                    <SelectContent>
                        {field.options?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            );
        case 'radio':
            return (
                <div className="space-y-2">
                    {field.options?.map(opt => (
                        <div key={opt.value} className="flex items-center gap-2">
                            <input type="radio" id={`${commonProps.id}-${opt.value}`} name={commonProps.name} value={opt.value} required={field.is_required} className="h-4 w-4"/>
                            <Label htmlFor={`${commonProps.id}-${opt.value}`}>{opt.label}</Label>
                        </div>
                    ))}
                </div>
            );
        case 'checkbox':
             return (
                <div className="flex items-center gap-2">
                    <Checkbox id={commonProps.id} name={commonProps.name} required={field.is_required} />
                    <Label htmlFor={commonProps.id} className="font-normal">{field.placeholder || "I agree"}</Label>
                </div>
             );
        case 'email':
            return <Input type="email" {...commonProps} />;
        case 'text':
        default:
            return <Input type="text" {...commonProps} />;
    }
};

export default FormBlockRenderer;
