'use server'

import { createClient } from '@nextblock-cms/db/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Logo } from './types'

export async function createLogo(payload: {
  name: string
  media_id: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase.from('logos').insert(payload)

  if (error) {
    console.error('Error creating logo:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/cms/settings/logos')
  return { success: true }
}

export async function updateLogo(payload: {
  id: string
  name: string
  media_id: string
}) {
  const supabase = createClient()
  const { id, ...data } = payload

  const { error } = await supabase.from('logos').update(data).eq('id', id)

  if (error) {
    console.error('Error updating logo:', error)
    // Optionally, handle the error more gracefully
    // redirect('/error?message=Could not update logo')
    return
  }

  revalidatePath('/cms/settings/logos')
  revalidatePath(`/cms/settings/logos/${id}/edit`)
  redirect('/cms/settings/logos')
}

export async function deleteLogo(id: string) {
  const supabase = createClient()

  const { error } = await supabase.from('logos').delete().eq('id', id)

  if (error) {
    console.error('Error deleting logo:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/cms/settings/logos')
  return { success: true }
}

export async function getLogos() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('logos')
    .select('*, media:media_id(*)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching logos:', error.message)
    throw new Error(`Failed to fetch logos: ${error.message}`)
  }

  return data
}

export async function getLogoById(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('logos')
    .select('*, media:media_id(*)')
    .eq('id', id)
    .single()

  if (error) {
    console.error(`Error fetching logo by id ${id}:`, error.message)
    return null
  }

  return data
}

export async function getActiveLogo(): Promise<Logo | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('logos')
    .select(
      `
      *,
      media:media_id (*)
    `
    )
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching active logo:', error.message)
    throw new Error(`Failed to fetch active logo: ${error.message}`)
  }

  return data as Logo | null
}