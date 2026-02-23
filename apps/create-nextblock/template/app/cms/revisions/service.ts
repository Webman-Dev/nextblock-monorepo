// apps/nextblock/app/cms/revisions/service.ts
"use server";

import { createClient } from "@nextblock-cms/db/server";
import type { Json } from "@nextblock-cms/db";
import { compare, applyPatch } from 'fast-json-patch';
import type { FullPageContent, FullPostContent } from './utils';


function shouldCreateSnapshot(currentVersion: number): boolean {
  // Create a snapshot every 20 revisions
  return currentVersion % 20 === 0;
}

export async function createPageRevision(
  pageId: number,
  authorId: string,
  previousContent: FullPageContent,
  newContent: FullPageContent
) {
  const supabase = createClient();

  // Get current version
  const { data: page, error: pageError } = await supabase
    .from('pages')
    .select('version')
    .eq('id', pageId)
    .single();
  if (pageError || !page) return { error: 'Page not found' } as const;

  const currentVersion = page.version ?? 1;
  const nextVersion = currentVersion + 1;

  // If we are moving to version 2, it means Version 1 was never saved (it was the initial state).
  // We should save Version 1 now so we have a history base.
  if (nextVersion === 2) {
    await supabase.from('page_revisions').insert({
      page_id: pageId,
      author_id: authorId, // Can be current author or null
      version: 1,
      revision_type: 'snapshot',
      content: previousContent as unknown as Json,
    });
  }

  const makeSnapshot = shouldCreateSnapshot(currentVersion) || nextVersion === 2; // ensure early snapshot cadence

  const revisionType: 'snapshot' | 'diff' = makeSnapshot ? 'snapshot' : 'diff';
  const content: Json = makeSnapshot ? (newContent as unknown as Json) : (compare(previousContent, newContent) as unknown as Json);

  // If it's a diff and there are no changes, skip creating revision
  if (revisionType === 'diff' && Array.isArray(content) && content.length === 0) {
    return { success: true as const, version: currentVersion }; // Return current version as we didn't bump
  }

  const { error: insertError } = await supabase.from('page_revisions').insert({
    page_id: pageId,
    author_id: authorId,
    version: nextVersion,
    revision_type: revisionType,
    content,
  });
  if (insertError) return { error: `Failed to insert page revision: ${insertError.message}` } as const;

  const { error: updateVersionError } = await supabase
    .from('pages')
    .update({ version: nextVersion })
    .eq('id', pageId);
  if (updateVersionError) return { error: `Failed to bump page version: ${updateVersionError.message}` } as const;

  return { success: true as const, version: nextVersion };
}

export async function createPostRevision(
  postId: number,
  authorId: string,
  previousContent: FullPostContent,
  newContent: FullPostContent
) {
  const supabase = createClient();

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('version')
    .eq('id', postId)
    .single();
  if (postError || !post) return { error: 'Post not found' } as const;

  const currentVersion = post.version ?? 1;
  const nextVersion = currentVersion + 1;

  if (nextVersion === 2) {
    await supabase.from('post_revisions').insert({
      post_id: postId,
      author_id: authorId,
      version: 1,
      revision_type: 'snapshot',
      content: previousContent as unknown as Json,
    });
  }

  const makeSnapshot = shouldCreateSnapshot(currentVersion) || nextVersion === 2;

  const revisionType: 'snapshot' | 'diff' = makeSnapshot ? 'snapshot' : 'diff';
  const content: Json = makeSnapshot ? (newContent as unknown as Json) : (compare(previousContent, newContent) as unknown as Json);

  if (revisionType === 'diff' && Array.isArray(content) && content.length === 0) {
    return { success: true as const, version: currentVersion };
  }

  const { error: insertError } = await supabase.from('post_revisions').insert({
    post_id: postId,
    author_id: authorId,
    version: nextVersion,
    revision_type: revisionType,
    content,
  });
  if (insertError) return { error: `Failed to insert post revision: ${insertError.message}` } as const;

  const { error: updateVersionError } = await supabase
    .from('posts')
    .update({ version: nextVersion })
    .eq('id', postId);
  if (updateVersionError) return { error: `Failed to bump post version: ${updateVersionError.message}` } as const;

  return { success: true as const, version: nextVersion };
}

export async function restorePageToVersion(pageId: number, targetVersion: number, authorId: string) {
  const supabase = createClient();

  // 1. Find latest snapshot at or before target
  const { data: snapshot, error: snapshotError } = await supabase
    .from('page_revisions')
    .select('version, content, revision_type')
    .eq('page_id', pageId)
    .lte('version', targetVersion)
    .eq('revision_type', 'snapshot')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  let content: FullPageContent;
  let baseVersion = 0;

  if (snapshot) {
    content = snapshot.content as unknown as FullPageContent;
    baseVersion = snapshot.version;
  } else if (targetVersion === 1) {
    // Fallback for missing Version 1: use empty content with current meta
    const { data: pageMeta } = await supabase
      .from('pages')
      .select('title, slug, language_id, status, meta_title, meta_description')
      .eq('id', pageId)
      .single();
    if (!pageMeta) return { error: 'Page not found.' } as const;
    content = {
      meta: pageMeta,
      blocks: [],
    };
    baseVersion = 1;
  } else {
    if (snapshotError) return { error: `Snapshot error: ${snapshotError.message}` } as const;
    return { error: 'No snapshot found at or before target version.' } as const;
  }

  // 2. Fetch diffs up to target and apply (only if we are not already at target)
  if (baseVersion < targetVersion) {
    const { data: diffs, error: diffsError } = await supabase
      .from('page_revisions')
      .select('version, content, revision_type')
      .eq('page_id', pageId)
      .gt('version', baseVersion)
      .lte('version', targetVersion)
      .order('version', { ascending: true });
    if (diffsError) return { error: `Failed to fetch diffs: ${diffsError.message}` } as const;

    for (const r of diffs || []) {
      if (r.revision_type === 'diff') {
        const ops = r.content as any[];
        const result = applyPatch(content as any, ops, /*validate*/ false, /*mutateDocument*/ true);
        content = result.newDocument as unknown as FullPageContent;
      } else {
        content = r.content as unknown as FullPageContent;
      }
    }
  }

  // Determine next version number (append a new revision for restored state)
  const { data: pageRow } = await supabase
    .from('pages')
    .select('version')
    .eq('id', pageId)
    .single();
  const newVersion = ((pageRow?.version as number | null) ?? 1) + 1;

  // 3. Apply to DB: update page meta and replace blocks; bump to newVersion
  const { error: updatePageError } = await supabase
    .from('pages')
    .update({
      title: content.meta.title,
      slug: content.meta.slug,
      language_id: content.meta.language_id,
      status: content.meta.status,
      meta_title: content.meta.meta_title,
      meta_description: content.meta.meta_description,
      version: newVersion,
    })
    .eq('id', pageId);
  if (updatePageError) return { error: `Failed to update page: ${updatePageError.message}` } as const;

  // delete all existing blocks for this page then reinsert
  const { error: deleteError } = await supabase.from('blocks').delete().eq('page_id', pageId);
  if (deleteError) return { error: `Failed to clear blocks: ${deleteError.message}` } as const;

  if (content.blocks.length > 0) {
    const toInsert = content.blocks.map(b => ({
      page_id: pageId,
      post_id: null,
      language_id: b.language_id,
      block_type: b.block_type,
      content: b.content,
      order: b.order,
    }));
    const { error: insertError } = await supabase.from('blocks').insert(toInsert);
    if (insertError) return { error: `Failed to insert blocks: ${insertError.message}` } as const;
  }

  // 4. Record a new snapshot revision representing the restored state at newVersion
  const { error: revErr } = await supabase.from('page_revisions').insert({
    page_id: pageId,
    author_id: authorId,
    version: newVersion,
    revision_type: 'snapshot',
    content: content as unknown as Json,
  });
  if (revErr) return { error: `Failed to write restored revision: ${revErr.message}` } as const;

  return { success: true as const };
}

export async function restorePostToVersion(postId: number, targetVersion: number, authorId: string) {
  const supabase = createClient();

  const { data: snapshot, error: snapshotError } = await supabase
    .from('post_revisions')
    .select('version, content, revision_type')
    .eq('post_id', postId)
    .lte('version', targetVersion)
    .eq('revision_type', 'snapshot')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  let content: FullPostContent;
  let baseVersion = 0;

  if (snapshot) {
    content = snapshot.content as unknown as FullPostContent;
    baseVersion = snapshot.version;
  } else if (targetVersion === 1) {
    const { data: postMeta } = await supabase
      .from('posts')
      .select('title, slug, language_id, status, meta_title, meta_description, excerpt, published_at, feature_image_id')
      .eq('id', postId)
      .single();
    if (!postMeta) return { error: 'Post not found.' } as const;
    content = {
      meta: postMeta,
      blocks: [],
    };
    baseVersion = 1;
  } else {
    if (snapshotError) return { error: `Snapshot error: ${snapshotError.message}` } as const;
    return { error: 'No snapshot found at or before target version.' } as const;
  }

  if (baseVersion < targetVersion) {
    const { data: diffs, error: diffsError } = await supabase
      .from('post_revisions')
      .select('version, content, revision_type')
      .eq('post_id', postId)
      .gt('version', baseVersion)
      .lte('version', targetVersion)
      .order('version', { ascending: true });
  if (diffsError) return { error: `Failed to fetch diffs: ${diffsError.message}` } as const;

  for (const r of diffs || []) {
    if (r.revision_type === 'diff') {
      const ops = r.content as any[];
      const result = applyPatch(content as any, ops, /*validate*/ false, /*mutateDocument*/ true);
      content = result.newDocument as unknown as FullPostContent;
    } else {
      content = r.content as unknown as FullPostContent;
    }
    }
  }

  // Determine next version for post
  const { data: postRow } = await supabase
    .from('posts')
    .select('version')
    .eq('id', postId)
    .single();
  const newVersion = ((postRow?.version as number | null) ?? 1) + 1;

  const { error: updatePostError } = await supabase
    .from('posts')
    .update({
      title: content.meta.title,
      slug: content.meta.slug,
      language_id: content.meta.language_id,
      status: content.meta.status,
      meta_title: content.meta.meta_title,
      meta_description: content.meta.meta_description,
      excerpt: content.meta.excerpt,
      published_at: content.meta.published_at,
      feature_image_id: content.meta.feature_image_id,
      version: newVersion,
    })
    .eq('id', postId);
  if (updatePostError) return { error: `Failed to update post: ${updatePostError.message}` } as const;

  const { error: deleteError } = await supabase.from('blocks').delete().eq('post_id', postId);
  if (deleteError) return { error: `Failed to clear blocks: ${deleteError.message}` } as const;

  if (content.blocks.length > 0) {
    const toInsert = content.blocks.map(b => ({
      page_id: null,
      post_id: postId,
      language_id: b.language_id,
      block_type: b.block_type,
      content: b.content,
      order: b.order,
    }));
    const { error: insertError } = await supabase.from('blocks').insert(toInsert);
    if (insertError) return { error: `Failed to insert blocks: ${insertError.message}` } as const;
  }

  const { error: revErr } = await supabase.from('post_revisions').insert({
    post_id: postId,
    author_id: authorId,
    version: newVersion,
    revision_type: 'snapshot',
    content: content as unknown as Json,
  });
  if (revErr) return { error: `Failed to write restored revision: ${revErr.message}` } as const;

  return { success: true as const };
}

export async function reconstructPageVersionContent(pageId: number, targetVersion: number) {
  const supabase = createClient();

  const { data: snapshot, error: snapshotError } = await supabase
    .from('page_revisions')
    .select('version, content, revision_type')
    .eq('page_id', pageId)
    .lte('version', targetVersion)
    .eq('revision_type', 'snapshot')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  let content: FullPageContent;
  let baseVersion = 0;

  if (snapshot) {
    content = snapshot.content as unknown as FullPageContent;
    baseVersion = snapshot.version;
  } else if (targetVersion === 1) {
    const { data: pageMeta } = await supabase
      .from('pages')
      .select('title, slug, language_id, status, meta_title, meta_description')
      .eq('id', pageId)
      .single();
    if (!pageMeta) return { error: 'Page not found.' } as const;
    content = {
      meta: pageMeta,
      blocks: [],
    };
    baseVersion = 1;
  } else {
    if (snapshotError) return { error: `Snapshot error: ${snapshotError.message}` } as const;
    return { error: 'No snapshot found at or before target version.' } as const;
  }

  if (baseVersion < targetVersion) {
    const { data: diffs, error: diffsError } = await supabase
      .from('page_revisions')
      .select('version, content, revision_type')
      .eq('page_id', pageId)
      .gt('version', baseVersion)
      .lte('version', targetVersion)
      .order('version', { ascending: true });
  if (diffsError) return { error: `Failed to fetch diffs: ${diffsError.message}` } as const;

  for (const r of diffs || []) {
    if (r.revision_type === 'diff') {
      const ops = r.content as any[];
      const result = applyPatch(content as any, ops, false, true);
      content = result.newDocument as unknown as FullPageContent;
    } else {
      content = r.content as unknown as FullPageContent;
    }
  }
  }
  return { success: true as const, content };
}

export async function reconstructPostVersionContent(postId: number, targetVersion: number) {
  const supabase = createClient();

  const { data: snapshot, error: snapshotError } = await supabase
    .from('post_revisions')
    .select('version, content, revision_type')
    .eq('post_id', postId)
    .lte('version', targetVersion)
    .eq('revision_type', 'snapshot')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  let content: FullPostContent;
  let baseVersion = 0;

  if (snapshot) {
    content = snapshot.content as unknown as FullPostContent;
    baseVersion = snapshot.version;
  } else if (targetVersion === 1) {
    const { data: postMeta } = await supabase
      .from('posts')
      .select('title, slug, language_id, status, meta_title, meta_description, excerpt, published_at, feature_image_id')
      .eq('id', postId)
      .single();
    if (!postMeta) return { error: 'Post not found.' } as const;
    content = {
      meta: postMeta,
      blocks: [],
    };
    baseVersion = 1;
  } else {
    if (snapshotError) return { error: `Snapshot error: ${snapshotError.message}` } as const;
    return { error: 'No snapshot found at or before target version.' } as const;
  }

  if (baseVersion < targetVersion) {
    const { data: diffs, error: diffsError } = await supabase
      .from('post_revisions')
      .select('version, content, revision_type')
      .eq('post_id', postId)
      .gt('version', baseVersion)
      .lte('version', targetVersion)
      .order('version', { ascending: true });
  if (diffsError) return { error: `Failed to fetch diffs: ${diffsError.message}` } as const;

  for (const r of diffs || []) {
    if (r.revision_type === 'diff') {
      const ops = r.content as any[];
      const result = applyPatch(content as any, ops, false, true);
      content = result.newDocument as unknown as FullPostContent;
    } else {
      content = r.content as unknown as FullPostContent;
    }
  }
  }
  return { success: true as const, content };
}
