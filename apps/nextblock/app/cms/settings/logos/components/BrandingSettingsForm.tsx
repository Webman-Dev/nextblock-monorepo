'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button, Input, Label } from '@nextblock-cms/ui'
import { useTranslations } from '@nextblock-cms/utils'
import {
  DEFAULT_INVOICE_SETTINGS,
  type InvoiceSettings,
  type InvoiceTaxRegistration,
} from '@nextblock-cms/ecommerce'

import { saveInvoiceSettings } from '../actions'

interface BrandingSettingsFormProps {
  initialSettings: InvoiceSettings
}

function createEmptyRegistration(): InvoiceTaxRegistration {
  return {
    label: '',
    value: '',
  }
}

export default function BrandingSettingsForm({
  initialSettings,
}: BrandingSettingsFormProps) {
  const { t } = useTranslations()
  const translateOrFallback = (key: string, fallback: string) => {
    const translated = t(key)
    return translated === key ? fallback : translated
  }
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )
  const [settings, setSettings] = useState<InvoiceSettings>(() => ({
    ...DEFAULT_INVOICE_SETTINGS,
    ...initialSettings,
    address: {
      ...DEFAULT_INVOICE_SETTINGS.address,
      ...initialSettings.address,
    },
    taxRegistrations:
      initialSettings.taxRegistrations.length > 0
        ? initialSettings.taxRegistrations
        : [createEmptyRegistration()],
  }))

  const normalizedRegistrations = useMemo(
    () => settings.taxRegistrations.filter((entry) => entry.label || entry.value),
    [settings.taxRegistrations]
  )

  const handleSave = () => {
    setMessage(null)
    startTransition(async () => {
      const result = await saveInvoiceSettings({
        ...settings,
        taxRegistrations: normalizedRegistrations,
      })

      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
        return
      }

      setMessage({
        type: 'success',
        text: 'Branding settings updated successfully.',
      })
    })
  }

  return (
    <div className="space-y-6 rounded-xl border bg-background p-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">
          {translateOrFallback('invoice_settings', 'Invoice settings')}
        </h2>
        <p className="text-sm text-muted-foreground">
          Seller details shown on printed invoices and customer order confirmations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="branding-business-name">
            {translateOrFallback('business_name', 'Business name')}
          </Label>
          <Input
            id="branding-business-name"
            value={settings.businessName}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                businessName: event.target.value,
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branding-email">{t('email') || 'Email'}</Label>
          <Input
            id="branding-email"
            value={settings.email}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="branding-phone">{t('phone_number')}</Label>
          <Input
            id="branding-phone"
            value={settings.phone}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                phone: event.target.value,
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branding-country">{t('country')}</Label>
          <Input
            id="branding-country"
            placeholder="CA"
            value={settings.address.country_code || ''}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                address: {
                  ...current.address,
                  country_code: event.target.value.toUpperCase(),
                },
              }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="branding-line1">{t('address_line_1')}</Label>
        <Input
          id="branding-line1"
          value={settings.address.line1 || ''}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              address: {
                ...current.address,
                line1: event.target.value,
              },
            }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="branding-line2">{t('address_line_2')}</Label>
        <Input
          id="branding-line2"
          value={settings.address.line2 || ''}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              address: {
                ...current.address,
                line2: event.target.value,
              },
            }))
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="branding-city">{t('city')}</Label>
          <Input
            id="branding-city"
            value={settings.address.city || ''}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                address: {
                  ...current.address,
                  city: event.target.value,
                },
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branding-state">{t('state_province')}</Label>
          <Input
            id="branding-state"
            value={settings.address.state || ''}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                address: {
                  ...current.address,
                  state: event.target.value,
                },
              }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branding-postal">{t('postal_zip_code')}</Label>
          <Input
            id="branding-postal"
            value={settings.address.postal_code || ''}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                address: {
                  ...current.address,
                  postal_code: event.target.value,
                },
              }))
            }
          />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-medium">
              {translateOrFallback('tax_registrations', 'Tax registrations')}
            </h3>
            <p className="text-sm text-muted-foreground">
              Add GST, QST, VAT, or other seller tax identifiers to print them on invoices.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setSettings((current) => ({
                ...current,
                taxRegistrations: [...current.taxRegistrations, createEmptyRegistration()],
              }))
            }
          >
            Add Tax Number
          </Button>
        </div>

        <div className="space-y-3">
          {settings.taxRegistrations.map((registration, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
              <div className="space-y-2">
                <Label htmlFor={`tax-label-${index}`}>Label</Label>
                <Input
                  id={`tax-label-${index}`}
                  placeholder="GST"
                  value={registration.label}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      taxRegistrations: current.taxRegistrations.map((entry, entryIndex) =>
                        entryIndex === index
                          ? { ...entry, label: event.target.value }
                          : entry
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`tax-value-${index}`}>Number</Label>
                <Input
                  id={`tax-value-${index}`}
                  placeholder="123456789 RT0001"
                  value={registration.value}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      taxRegistrations: current.taxRegistrations.map((entry, entryIndex) =>
                        entryIndex === index
                          ? { ...entry, value: event.target.value }
                          : entry
                      ),
                    }))
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      taxRegistrations:
                        current.taxRegistrations.length > 1
                          ? current.taxRegistrations.filter((_, entryIndex) => entryIndex !== index)
                          : [createEmptyRegistration()],
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
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
          {isPending ? 'Saving...' : 'Save Branding Settings'}
        </Button>
      </div>
    </div>
  )
}
