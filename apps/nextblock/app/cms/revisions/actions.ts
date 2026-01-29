// apps/nextblock/app/cms/revisions/actions.ts
"use server";

import { createClient } from "@nextblock-cms/db/server";
import { restorePageToVersion, restorePostToVersion, reconstructPageVersionContent, reconstructPostVersionContent } from './service';
import { getFullPageContent, getFullPostContent } from './utils';
import { compare } from 'fast-json-patch';

type RevisionListItem = {
  id: number;
  version: number;
  revision_type: 'snapshot' | 'diff';
  created_at: string;
  author_id: string | null;
  author?: { full_name?: string | null; github_username?: string | null } | null;
};

const REVISIONS_PER_PAGE = 10; // Reduced to 10 as requested

export async function listPageRevisions(pageId: number, page = 1, startDate?: string, endDate?: string) {
  const supabase = createClient();

  let query = supabase
    .from('page_revisions')
    .select('id, page_id, author_id, version, revision_type, created_at, content, author:profiles(full_name, github_username)', { count: 'exact' })
    .eq('page_id', pageId)
    .order('version', { ascending: false })
    .limit(1000); // Fetch up to 1000 recent revisions to allow dense pagination after filtering

  if (startDate) {
    query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
  }

  const { data, error } = await query; // count is less useful now as we filter

  if (error) return { error: error.message } as const;
  
  const { data: pageRow } = await supabase.from('pages').select('version, created_at').eq('id', pageId).single();
  const currentVersion = pageRow?.version ?? null;
  const currentContent = await getFullPageContent(pageId);

  // Map data to include useful flags instead of filtering
  const allRevisions = (data || []).map((r: any) => {
    let has_changes = true;

    // 1. Check Diffs
    if (r.revision_type === 'diff') {
      let ops = r.content;
      if (typeof ops === 'string') {
          try { ops = JSON.parse(ops); } catch { ops = []; }
      }
      
      // Strict check: Diff must be a non-empty array of operations
      if (!Array.isArray(ops) || ops.length === 0) {
          has_changes = false;
      } else {
        // Check metadata/variant
        const ignoredSuffixes = ['/updated_at', '/created_at', '/last_modified', '/modified_at', '/version', '/id', '/published_at', '/author_id', '/variant'];
        const usefulOps = ops.filter((op: any) => {
            if (!op.path) return true;
            return !ignoredSuffixes.some(suffix => op.path.endsWith(suffix));
        });
        if (usefulOps.length === 0) has_changes = false;
      }
    }

    // 2. Check Snapshots
    if (r.revision_type === 'snapshot' && currentContent && r.version !== currentVersion) {
        let snapshotContent = r.content;
        if (typeof snapshotContent === 'string') {
            try { snapshotContent = JSON.parse(snapshotContent); } catch { /* default true */ }
        }
        
        const ops = compare(currentContent, snapshotContent);
        
        const ignoredSuffixes = ['/updated_at', '/created_at', '/last_modified', '/modified_at', '/version', '/id', '/published_at', '/author_id', '/variant'];
        const usefulOps = ops.filter((op: any) => {
             if (!op.path) return true;
             return !ignoredSuffixes.some(suffix => op.path.endsWith(suffix));
        });

        if (usefulOps.length === 0) has_changes = false;
    }

    return { ...r, has_changes };
  }) as (RevisionListItem & { has_changes: boolean; content: any })[];

  // Append Synthetic V1
  const hasVersion1 = allRevisions.some(r => r.version === 1);
  const pageCreatedAt = pageRow?.created_at;
  
  let matchesDate = true;
  if (pageCreatedAt) {
      if (startDate && pageCreatedAt < `${startDate}T00:00:00.000Z`) matchesDate = false;
      if (endDate && pageCreatedAt > `${endDate}T23:59:59.999Z`) matchesDate = false;
  }
  
  if (!hasVersion1 && (currentVersion ?? 0) > 1 && matchesDate) {
   allRevisions.push({
     id: -1,
     version: 1,
     revision_type: 'snapshot',
     created_at: pageCreatedAt ?? new Date().toISOString(),
     author_id: null,
     author: { full_name: 'System (Initial)', github_username: 'system' },
     has_changes: true, // V1 always counts
     content: null
   });
  }
  
  allRevisions.sort((a, b) => b.version - a.version);

  const totalFiltered = allRevisions.length;
  const totalPages = Math.ceil(totalFiltered / REVISIONS_PER_PAGE);
  
  const fromIndex = (page - 1) * REVISIONS_PER_PAGE;
  // Use map to strip heavy content if not needed, but keep flags
  const slicedRevisions = allRevisions
    .slice(fromIndex, fromIndex + REVISIONS_PER_PAGE)
    .map(({ content, ...rest }) => rest);

  return { 
      success: true as const, 
      revisions: slicedRevisions, 
      currentVersion, 
      count: totalFiltered, 
      totalPages, 
      hasMore: (page * REVISIONS_PER_PAGE) < totalFiltered 
  };
}

export async function listPostRevisions(postId: number, page = 1, startDate?: string, endDate?: string) {
  const supabase = createClient();



  let query = supabase
    .from('post_revisions')
    .select('id, post_id, author_id, version, revision_type, created_at, content, author:profiles(full_name, github_username)', { count: 'exact' })
    .eq('post_id', postId)
    .order('version', { ascending: false })
    .limit(1000);

  if (startDate) {
    query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  if (error) return { error: error.message } as const;

  const { data: postRow } = await supabase.from('posts').select('version, created_at').eq('id', postId).single();
  const currentVersion = postRow?.version ?? null;
  const currentContent = await getFullPostContent(postId);

  const allRevisions = (data || []).map((r: any) => {
    let has_changes = true;

    // 1. Check Diffs
    if (r.revision_type === 'diff') {
      let ops = r.content;
      if (typeof ops === 'string') {
          try { ops = JSON.parse(ops); } catch { ops = []; }
      }
      
      // Strict check: Diff must be a non-empty array of operations
      if (!Array.isArray(ops) || ops.length === 0) {
          has_changes = false;
      } else {
        // Check metadata/variant
        const ignoredSuffixes = ['/updated_at', '/created_at', '/last_modified', '/modified_at', '/version', '/id', '/published_at', '/author_id', '/variant'];
        const usefulOps = ops.filter((op: any) => {
            if (!op.path) return true;
            return !ignoredSuffixes.some(suffix => op.path.endsWith(suffix));
        });
        if (usefulOps.length === 0) has_changes = false;
      }
    }
    
    // 2. Check Snapshots
    if (r.revision_type === 'snapshot' && currentContent && r.version !== currentVersion) {
        let snapshotContent = r.content;
        if (typeof snapshotContent === 'string') {
            try { snapshotContent = JSON.parse(snapshotContent); } catch { /* default true */ }
        }
        
        const ops = compare(currentContent, snapshotContent);
        
        const ignoredSuffixes = ['/updated_at', '/created_at', '/last_modified', '/modified_at', '/version', '/id', '/published_at', '/author_id', '/variant'];
        const usefulOps = ops.filter((op: any) => {
             if (!op.path) return true;
             return !ignoredSuffixes.some(suffix => op.path.endsWith(suffix));
        });

        if (usefulOps.length === 0) has_changes = false;
    }

    return { ...r, has_changes };
  }) as (RevisionListItem & { has_changes: boolean; content: any })[];

  // Synthetic V1
  const hasVersion1 = allRevisions.some(r => r.version === 1);
  const postCreatedAt = postRow?.created_at;
  
  let matchesDate = true;
  if (postCreatedAt) {
      if (startDate && postCreatedAt < `${startDate}T00:00:00.000Z`) matchesDate = false;
      if (endDate && postCreatedAt > `${endDate}T23:59:59.999Z`) matchesDate = false;
  }

  if (!hasVersion1 && (currentVersion ?? 0) > 1 && matchesDate) {
   allRevisions.push({
     id: -1,
     version: 1,
     revision_type: 'snapshot',
     created_at: postCreatedAt ?? new Date().toISOString(),
     author_id: null,
     author: { full_name: 'System (Initial)', github_username: 'system' },
     has_changes: true,
     content: null
   });
  }

  allRevisions.sort((a, b) => b.version - a.version);

  const totalFiltered = allRevisions.length;
  const totalPages = Math.ceil(totalFiltered / REVISIONS_PER_PAGE);
  
  const fromIndex = (page - 1) * REVISIONS_PER_PAGE;
  // Use map to strip heavy content if not needed, but keep flags
  const slicedRevisions = allRevisions
    .slice(fromIndex, fromIndex + REVISIONS_PER_PAGE)
    .map(({ content, ...rest }) => rest);

  return { success: true as const, revisions: slicedRevisions, currentVersion, count: totalFiltered, totalPages, hasMore: (page * REVISIONS_PER_PAGE) < totalFiltered };
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
