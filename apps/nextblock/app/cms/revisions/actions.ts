// apps/nextblock/app/cms/revisions/actions.ts
"use server";

import { createClient } from "@nextblock-monorepo/db/server";
import { restorePageToVersion, restorePostToVersion, reconstructPageVersionContent, reconstructPostVersionContent } from './service';
import { getFullPageContent, getFullPostContent } from './utils';

type RevisionListItem = {
  id: number;
  version: number;
  revision_type: 'snapshot' | 'diff';
  created_at: string;
  author_id: string | null;
  author?: { full_name?: string | null; username?: string | null } | null;
};

export async function listPageRevisions(pageId: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('page_revisions')
    .select('id, page_id, author_id, version, revision_type, created_at, author:profiles(full_name, username)')
    .eq('page_id', pageId)
    .order('version', { ascending: false });
  if (error) return { error: error.message } as const;
  const { data: pageRow } = await supabase.from('pages').select('version').eq('id', pageId).single();
  const currentVersion = pageRow?.version ?? null;
  return { success: true as const, revisions: data as RevisionListItem[], currentVersion };
}

export async function listPostRevisions(postId: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('post_revisions')
    .select('id, post_id, author_id, version, revision_type, created_at, author:profiles(full_name, username)')
    .eq('post_id', postId)
    .order('version', { ascending: false });
  if (error) return { error: error.message } as const;
  const { data: postRow } = await supabase.from('posts').select('version').eq('id', postId).single();
  const currentVersion = postRow?.version ?? null;
  return { success: true as const, revisions: data as RevisionListItem[], currentVersion };
}

export async function restorePageVersion(pageId: number, targetVersion: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'User not authenticated.' } as const;
  // Role checks are enforced by RLS; we can still short-circuit if needed
  return await restorePageToVersion(pageId, targetVersion, user.id);
}

export async function restorePostVersion(postId: number, targetVersion: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'User not authenticated.' } as const;
  return await restorePostToVersion(postId, targetVersion, user.id);
}

import type { FullPageContent, FullPostContent } from './utils';

type CompareResponse<T> = { success: true; current: T; target: T } | { error: string };

export async function comparePageVersion(pageId: number, targetVersion: number): Promise<CompareResponse<FullPageContent>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'User not authenticated.' } as const;

  const current = await getFullPageContent(pageId);
  if (!current) return { error: 'Failed to fetch current content.' } as const;
  const reconstructed = await reconstructPageVersionContent(pageId, targetVersion);
  if ('error' in reconstructed) return { error: reconstructed.error ?? 'Unknown error occurred while reconstructing page version' } as const;
  return { success: true as const, current, target: reconstructed.content };
}

export async function comparePostVersion(postId: number, targetVersion: number): Promise<CompareResponse<FullPostContent>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'User not authenticated.' } as const;

  const current = await getFullPostContent(postId);
  if (!current) return { error: 'Failed to fetch current content.' } as const;
  const reconstructed = await reconstructPostVersionContent(postId, targetVersion);
  if ('error' in reconstructed) return { error: reconstructed.error ?? 'Unknown error occurred while reconstructing post version' } as const;
  return { success: true as const, current, target: reconstructed.content };
}
