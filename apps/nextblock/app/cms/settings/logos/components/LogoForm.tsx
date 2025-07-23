'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Input } from '@nextblock-monorepo/ui'
import { Label } from '@nextblock-monorepo/ui'
import { Button } from '@nextblock-monorepo/ui'
import type { Database } from '@nextblock-monorepo/db'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@nextblock-monorepo/ui'
import { Search, CheckCircle, ImageIcon, X as XIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import MediaUploadForm from '@/app/cms/media/components/MediaUploadForm'
import { Separator } from '@nextblock-monorepo/ui'
import { cn } from '@nextblock-monorepo/utils'

type Logo = Database['public']['Tables']['logos']['Row'];
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

interface LogoFormProps {
  logo?: Logo & { media: Media | null }
  action: (
    payload:
      | { name: string; media_id: string }
      | { id: string; name: string; media_id: string },
  ) => Promise<{ success: boolean; error?: string }>
}

export default function LogoForm({ logo, action }: LogoFormProps) {
  const { supabase } = useAuth()
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

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mediaLibrary, setMediaLibrary] = useState<Media[]>([])
  const [isLoadingMedia, setIsLoadingMedia] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  useEffect(() => {
    if (isModalOpen) {
      const fetchLibrary = async () => {
        if (!supabase) return
        setIsLoadingMedia(true)
        console.log('Executing media library query...')
        try {
          let query = supabase
            .from('media')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
          if (searchTerm) {
            query = query.ilike('file_name', `%${searchTerm}%`)
          }
          const { data, error } = await query
          if (data) {
            setMediaLibrary(data)
          } else {
            console.error('Error fetching media library:', error)
          }
        } catch (e) {
          console.error('FATAL: Media library query failed:', e)
        } finally {
          setIsLoadingMedia(false)
        }
      }
      fetchLibrary()
    }
  }, [isModalOpen, searchTerm, supabase])

  const handleMediaSelect = (media: Media) => {
    setLogoDetails(prev => ({
      ...prev,
      media_id: media.id,
      object_key: media.object_key,
      width: media.width ?? null,
      height: media.height ?? null,
      blur_data_url: media.blur_data_url ?? null,
    }))
    setIsModalOpen(false)
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

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="name">Logo Name</Label>
        <Input
          id="name"
          name="name"
          value={logoDetails.name}
          onChange={e =>
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

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="mt-3">
                {logoDetails.object_key ? 'Change Image' : 'Select from Library'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] md:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Select or Upload Logo</DialogTitle>
              </DialogHeader>

              <div className="p-1">
                <MediaUploadForm
                  returnJustData={true}
                  onUploadSuccess={handleMediaSelect}
                />
              </div>

              <Separator className="my-4" />

              <div className="flex flex-col flex-grow overflow-hidden">
                <h3 className="text-lg font-medium mb-3 text-center">
                  Or Select from Library
                </h3>
                <div className="relative mb-2">
                  <Input
                    type="search"
                    placeholder="Search library..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {isLoadingMedia ? (
                  <div className="flex-grow flex items-center justify-center">
                    <p>Loading media...</p>
                  </div>
                ) : mediaLibrary.length === 0 ? (
                  <div className="flex-grow flex items-center justify-center">
                    <p>No media found.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3 overflow-y-auto min-h-0 pr-2 pb-2">
                    {mediaLibrary
                      .filter(m => m.file_type?.startsWith('image/'))
                      .map(media => {
                        if (
                          typeof media.width !== 'number' ||
                          typeof media.height !== 'number' ||
                          media.width <= 0 ||
                          media.height <= 0
                        ) {
                          return (
                            <div
                              key={media.id}
                              className="relative aspect-square border rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground p-1 text-center"
                            >
                              Image has invalid dimensions
                            </div>
                          )
                        }
                        return (
                          <button
                            key={media.id}
                            type="button"
                            className={cn(
                              'relative aspect-square border rounded-md overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary min-w-0',
                              'w-[calc(33.33%-8px)] sm:w-[calc(25%-9px)] md:w-[calc(20%-10px)] lg:w-[calc(16.66%-10px)]',
                            )}
                            onClick={() => handleMediaSelect(media)}
                          >
                            <Image
                              src={`${R2_BASE_URL}/${media.object_key}`}
                              alt={
                                media.description ||
                                media.file_name ||
                                'Media library image'
                              }
                              width={media.width}
                              height={media.height}
                              className="absolute inset-0 w-full h-full object-cover"
                              placeholder={
                                media.blur_data_url ? 'blur' : 'empty'
                              }
                              blurDataURL={media.blur_data_url || undefined}
                              sizes="(max-width: 639px) 33vw, (max-width: 767px) 25vw, (max-width: 1023px) 20vw, 17vw"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center">
                              <CheckCircle className="h-8 w-8 text-white" />
                            </div>
                            <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate text-center">
                              {media.file_name}
                            </p>
                          </button>
                        )
                      })}
                  </div>
                )}
              </div>
              <DialogFooter className="mt-auto pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={isPending || !logoDetails.name || !logoDetails.media_id}
        >
          {isPending ? 'Saving...' : `${logo ? 'Update' : 'Create'} Logo`}
        </Button>
        {formError && (
          <div className="text-red-500 text-sm">{formError}</div>
        )}
      </div>
    </div>
  )
}