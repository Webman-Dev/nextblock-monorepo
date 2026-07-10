'use client';

import React, { useState, useTransition } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
} from '@nextblock-cms/ui';
import { toast } from 'react-hot-toast';
import { Ban, Globe, Info, MapPin, Route } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { updateLanguageDetectionSettings } from '../actions';
import type {
  LanguageDetectionMode,
  LanguageDetectionSettings,
} from '../../../../../lib/i18n/detection';

interface ModeOption {
  value: LanguageDetectionMode;
  title: string;
  description: string;
  icon: LucideIcon;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: 'browser',
    title: 'Browser language',
    description:
      "Serve the language the visitor's browser prefers (Accept-Language header). Recommended — it reflects what each person actually reads.",
    icon: Globe,
  },
  {
    value: 'country',
    title: "Visitor's country (IP)",
    description:
      'Serve the main language of the country the visitor browses from, using the geolocation headers provided by your host (Vercel, Cloudflare, CloudFront).',
    icon: MapPin,
  },
  {
    value: 'browser_then_country',
    title: 'Browser language, then country',
    description:
      "Try the browser's preferred language first; when none of your languages match, fall back to the visitor's country.",
    icon: Route,
  },
  {
    value: 'default',
    title: 'No detection',
    description:
      'Always serve the default language to new visitors. They can still switch manually with the language switcher (shown when more than one language is active).',
    icon: Ban,
  },
];

const COUNTRY_MODES: LanguageDetectionMode[] = ['country', 'browser_then_country'];

export default function LanguageDetectionPanel({
  initialSettings,
  activeLanguageCount,
}: {
  initialSettings: LanguageDetectionSettings;
  activeLanguageCount: number;
}) {
  const [mode, setMode] = useState<LanguageDetectionMode>(initialSettings.mode);
  const [rememberVisitorChoice, setRememberVisitorChoice] = useState<boolean>(
    initialSettings.rememberVisitorChoice,
  );
  const [savedSettings, setSavedSettings] = useState<LanguageDetectionSettings>(initialSettings);
  const [isPending, startTransition] = useTransition();

  // With fewer than two active languages every mode resolves to the same locale,
  // so the whole panel is a no-op and the public language switcher is hidden.
  const isMoot = activeLanguageCount < 2;

  const isDirty =
    mode !== savedSettings.mode || rememberVisitorChoice !== savedSettings.rememberVisitorChoice;

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateLanguageDetectionSettings({ mode, rememberVisitorChoice });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setSavedSettings({ mode, rememberVisitorChoice });
      toast.success(result?.success ?? 'Language detection settings saved.');
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Language Detection</CardTitle>
        <CardDescription>
          How the site picks the first language for a new visitor. A language chosen with the
          language switcher overrides detection for the rest of the visit — and for a year when
          &ldquo;Remember the visitor&apos;s language&rdquo; is on. Changes reach new visitors
          within about a minute.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isMoot && (
          <p className="flex items-start gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Language detection takes effect once at least two active languages are configured.
              With a single language every visitor receives that language and the public language
              switcher is hidden — you can still choose a mode here so it applies as soon as you add
              another language.
            </span>
          </p>
        )}
        <RadioGroup
          value={mode}
          onValueChange={(value) => setMode(value as LanguageDetectionMode)}
          className="grid gap-3 md:grid-cols-2"
        >
          {MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
            >
              <RadioGroupItem
                value={option.value}
                className="mt-1"
                aria-label={option.title}
                aria-describedby={`detection-mode-desc-${option.value}`}
              />
              <span className="space-y-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <option.icon className="h-4 w-4 text-muted-foreground" />
                  {option.title}
                </span>
                <span
                  id={`detection-mode-desc-${option.value}`}
                  className="block text-sm text-muted-foreground"
                >
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>

        <div aria-live="polite">
          {COUNTRY_MODES.includes(mode) && (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Country detection relies on the geolocation header your hosting platform adds to each
              request (Vercel, Cloudflare, and CloudFront do this automatically). When the header is
              missing, visitors get the default language
              {mode === 'browser_then_country' ? ' unless their browser language matches' : ''}.
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            checked={rememberVisitorChoice}
            onCheckedChange={(checked) => setRememberVisitorChoice(checked === true)}
            className="mt-0.5"
            aria-label="Remember the visitor's language"
            aria-describedby="remember-visitor-desc"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium">Remember the visitor&apos;s language</span>
            <span id="remember-visitor-desc" className="block text-sm text-muted-foreground">
              Keep the detected or chosen language in a cookie for a year. When off, the language
              only sticks for the browsing session and is detected again on the next visit.
            </span>
          </span>
        </label>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={handleSave} disabled={!isDirty || isPending}>
          {isPending ? 'Saving...' : 'Save Detection Settings'}
        </Button>
      </CardFooter>
    </Card>
  );
}
