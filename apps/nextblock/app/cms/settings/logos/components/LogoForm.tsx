'use client'

import { useState, useTransition, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Input } from '@nextblock-cms/ui'
import { Label } from '@nextblock-cms/ui'
import { Button } from '@nextblock-cms/ui'
import { Alert, AlertDescription, Spinner } from '@nextblock-cms/ui'
import type { Database } from '@nextblock-cms/db'
import { ImageIcon, X as XIcon } from 'lucide-react'
import MediaPickerDialog from '@/app/cms/media/components/MediaPickerDialog'
import { useHotkeys } from '@/hooks/use-hotkeys'
type Media = Database['public']['Tables']['media']['Row'];
const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || ''

interface LogoDetails {
  id?: string
  name: string
  media_id: string | null
  object_key: string | null
  width: number | null
  height: number | null
  blur_data_url: string | null
}

interface LogoFormProps {  logo?: Database["public"]["Tables"]["logos"]["Row"] & { media: Media | null }
  action: (
    payload:
      | { name: string; media_id: string }
      | { id: string; name: string; media_id: string },
  ) => Promise<{ success: boolean; error?: string }>
}

export default function LogoForm({ logo, action }: LogoFormProps) {
  const router = useRouter()
  const [logoDetails, setLogoDetails] = useState<LogoDetails>({
    id: logo?.id,
    name: logo?.name || '',
    media_id: logo?.media_id || null,
    object_key: logo?.media?.object_key || null,
    width: logo?.media?.width || null,
    height: logo?.media?.height || null,
    blur_data_url: logo?.media?.blur_data_url || null,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Removed unused media library state and effect

  const handleMediaSelect = (media: Media) => {
    setLogoDetails(prev => ({
      ...prev,
      media_id: media.id,
      object_key: media.object_key,
      width: media.width ?? null,
      height: media.height ?? null,
      blur_data_url: media.blur_data_url ?? null,
    }))
    // MediaPickerDialog closes itself after selection
  }

  const handleRemoveImage = () => {
    setLogoDetails(prev => ({
      ...prev,
      media_id: null,
      object_key: null,
      width: null,
      height: null,
      blur_data_url: null,
    }))
  }

  const handleSave = async () => {
    if (!logoDetails.name || !logoDetails.media_id) {
      setFormError('Please provide a name and select an image.')
      return
    }

    setFormError(null)

    startTransition(async () => {
      const payload = {
        name: logoDetails.name,
        media_id: logoDetails.media_id as string,
        ...(logoDetails.id && { id: logoDetails.id }),
      }
      const result = await action(payload)

      if (result?.error) {
        setFormError(result.error)
      }

      if (result?.success) {
        router.push('/cms/settings/logos')
        router.refresh()
      }
    })
  }

  useHotkeys('ctrl+s', handleSave, [handleSave]);

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="name">Logo Name</Label>
        <Input
          id="name"
          name="name"
          value={logoDetails.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setLogoDetails(prev => ({ ...prev, name: e.target.value }))
          }
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label>Logo Image</Label>
        <div className="mt-1 p-3 border rounded-md bg-muted/30 min-h-[120px] flex flex-col items-center justify-center">
          {logoDetails.object_key &&
          logoDetails.width &&
          logoDetails.height ? (
            <div
              className="relative group inline-block"
              style={{ maxWidth: logoDetails.width, maxHeight: 200 }}
            >
              <Image
                src={`${R2_BASE_URL}/${logoDetails.object_key}`}
                alt={logoDetails.name || 'Selected logo'}
                width={logoDetails.width}
                height={logoDetails.height}
                className="rounded-md object-contain"
                style={{ maxHeight: '200px' }}
                placeholder={logoDetails.blur_data_url ? 'blur' : 'empty'}
                blurDataURL={logoDetails.blur_data_url || undefined}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                onClick={handleRemoveImage}
                title="Remove Image"
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <ImageIcon className="h-16 w-16 text-muted-foreground" />
          )}

          <MediaPickerDialog
            triggerLabel={logoDetails.object_key ? 'Change Image' : 'Select from Library'}
            onSelect={handleMediaSelect}
            accept={(m: Media) => !!m.file_type?.startsWith('image/')}
            title="Select or Upload Logo"
            defaultFolder="logos/"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={isPending || !logoDetails.name || !logoDetails.media_id}
        >
          {isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4" /> Saving...
            </>
          ) : (
            `${logo ? 'Update' : 'Create'} Logo`
          )}
        </Button>
        {formError && (
          <Alert variant="destructive" className="py-2 px-4 w-auto inline-flex items-center">
             <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}




