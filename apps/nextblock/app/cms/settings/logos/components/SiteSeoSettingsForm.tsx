'use client'

import { useState, useTransition } from 'react'
import { Button, Input, Label, Textarea } from '@nextblock-cms/ui'

import { saveSiteSeoSettings, type SiteSeoSettings } from '../actions'

interface SiteSeoSettingsFormProps {
  initialSettings: SiteSeoSettings
}

const TITLE_RECOMMENDED_MAX = 60
const DESCRIPTION_RECOMMENDED_MAX = 160

export default function SiteSeoSettingsForm({ initialSettings }: SiteSeoSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [settings, setSettings] = useState<SiteSeoSettings>(() => ({
    siteTitle: initialSettings.siteTitle ?? '',
    siteDescription: initialSettings.siteDescription ?? '',
    siteKeywords: initialSettings.siteKeywords ?? '',
  }))

  const handleSave = () => {
    setMessage(null)
    startTransition(async () => {
      const result = await saveSiteSeoSettings(settings)

      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
        return
      }

      setMessage({ type: 'success', text: 'Site SEO settings updated successfully.' })
    })
  }

  return (
    <div className="space-y-6 rounded-xl border bg-background p-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Site identity &amp; SEO</h2>
        <p className="text-sm text-muted-foreground">
          Used for the browser tab, search results, and social link previews (Open Graph / Twitter).
          The site title is also appended to every page title and shown next to the logo.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="seo-site-title">Site title</Label>
          <span
            className={`text-xs ${
              settings.siteTitle.length > TITLE_RECOMMENDED_MAX
                ? 'text-amber-600'
                : 'text-muted-foreground'
            }`}
          >
            {settings.siteTitle.length}/{TITLE_RECOMMENDED_MAX}
          </span>
        </div>
        <Input
          id="seo-site-title"
          placeholder="NextBlock™ CMS"
          value={settings.siteTitle}
          onChange={(event) =>
            setSettings((current) => ({ ...current, siteTitle: event.target.value }))
          }
        />
        <p className="text-xs text-muted-foreground">
          Example result: <span className="font-medium">Home | {settings.siteTitle || 'NextBlock™ CMS'}</span>
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="seo-site-description">Default meta description</Label>
          <span
            className={`text-xs ${
              settings.siteDescription.length > DESCRIPTION_RECOMMENDED_MAX
                ? 'text-amber-600'
                : 'text-muted-foreground'
            }`}
          >
            {settings.siteDescription.length}/{DESCRIPTION_RECOMMENDED_MAX}
          </span>
        </div>
        <Textarea
          id="seo-site-description"
          rows={3}
          placeholder="A short, compelling summary of your site for search engines and social cards."
          value={settings.siteDescription}
          onChange={(event) =>
            setSettings((current) => ({ ...current, siteDescription: event.target.value }))
          }
        />
        <p className="text-xs text-muted-foreground">
          Shown when a page has no description of its own. Aim for ~150–160 characters.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="seo-site-keywords">Default keywords</Label>
        <Input
          id="seo-site-keywords"
          placeholder="NextBlock, CMS, Next.js, Supabase"
          value={settings.siteKeywords}
          onChange={(event) =>
            setSettings((current) => ({ ...current, siteKeywords: event.target.value }))
          }
        />
        <p className="text-xs text-muted-foreground">Comma-separated. Used as the default meta keywords.</p>
      </div>

      {message ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save SEO Settings'}
        </Button>
      </div>
    </div>
  )
}
