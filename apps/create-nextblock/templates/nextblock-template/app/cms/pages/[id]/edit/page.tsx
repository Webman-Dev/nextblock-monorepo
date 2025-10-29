// app/cms/pages/[id]/edit/page.tsx
import React from "react";
import { createClient } from "@nextblock-cms/db/server";
import { updatePage } from "../../actions";
import type { Database } from "@nextblock-cms/db";
import { notFound, redirect } from "next/navigation";

type Page = Database['public']['Tables']['pages']['Row'];
type Block = Database['public']['Tables']['blocks']['Row'];
type Language = Database['public']['Tables']['languages']['Row'];
import { getActiveLanguagesServerSide } from "@nextblock-cms/db/server";
import EditPageClient from "./EditPageClient";

// ... (Interface PageWithBlocks and getPageDataWithBlocks remain the same) ...
interface PageWithBlocks extends Page {
  blocks: Block[];
  language_code?: string;
  translation_group_id: string;
}

async function getPageDataWithBlocks(id: number): Promise<PageWithBlocks | null> {
  const supabase = createClient();
  const { data: pageData, error: pageError } = await supabase
    .from("pages")
    .select(`
      *,
      languages!inner (code),
      blocks (*)
    `)
    .eq("id", id)
    .order('order', { foreignTable: 'blocks', ascending: true })
    .single();

  if (pageError) {
    console.error("Error fetching page with blocks for edit:", pageError);
    return null;
  }

  const langCode = Array.isArray(pageData.languages)
    ? pageData.languages[0]?.code
    : (pageData.languages as Language)?.code;

  return { ...pageData, blocks: pageData.blocks || [], language_code: langCode } as PageWithBlocks;
}


export default async function EditPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const pageId = parseInt(params.id, 10);
  if (isNaN(pageId)) return notFound();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/sign-in?redirect=/cms/pages/${pageId}/edit`);
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['ADMIN', 'WRITER'].includes(profile.role)) {
      return <div className="p-6">Access Denied.</div>;
  }

  const [pageWithBlocks, allSiteLanguages] = await Promise.all([
    getPageDataWithBlocks(pageId),
    getActiveLanguagesServerSide()
  ]);

  if (!pageWithBlocks) return notFound();

  const updatePageWithId = updatePage.bind(null, pageId);
  const publicPageUrl = `/${pageWithBlocks.slug}`;

  return (
    <EditPageClient
      page={pageWithBlocks}
      pageId={pageId}
      allSiteLanguages={allSiteLanguages}
      updatePageAction={updatePageWithId}
      publicPageUrl={publicPageUrl}
    />
  );
}
