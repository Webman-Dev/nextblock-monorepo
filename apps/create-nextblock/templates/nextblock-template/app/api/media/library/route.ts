import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@nextblock-cms/db';

const MAX_MEDIA_LIBRARY_ITEMS = 100;
const DEFAULT_MEDIA_LIBRARY_ITEMS = 50;
export const dynamic = 'force-dynamic';

function getMediaLibrarySupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables for media library API');
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() ?? '';
    const limitParam = Number.parseInt(searchParams.get('limit') ?? '', 10);
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, MAX_MEDIA_LIBRARY_ITEMS)
        : DEFAULT_MEDIA_LIBRARY_ITEMS;

    const supabase = getMediaLibrarySupabaseClient();

    let mediaQuery = supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (query) {
      mediaQuery = mediaQuery.ilike('file_name', `%${query}%`);
    }

    const { data, error } = await mediaQuery;

    if (error) {
      console.error('[Media Library API] Failed to load media:', error);
      return NextResponse.json(
        { error: 'Failed to load media library.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error('[Media Library API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unexpected media library error.' },
      { status: 500 }
    );
  }
}
