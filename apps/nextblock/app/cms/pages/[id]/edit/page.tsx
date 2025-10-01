// app/cms/pages/[id]/edit/page.tsx
import React from "react";
import { Separator } from "@nextblock-monorepo/ui";
import { createClient } from "@nextblock-monorepo/db/server";
import PageForm from "../../components/PageForm";
import { updatePage } from "../../actions";
import type { Database } from "@nextblock-monorepo/db";
import { notFound, redirect } from "next/navigation";

type Page = Database['public']['Tables']['pages']['Row'];
type Block = Database['public']['Tables']['blocks']['Row'];
type Language = Database['public']['Tables']['languages']['Row'];
import BlockEditorArea from "@/app/cms/blocks/components/BlockEditorArea";
import Link from "next/link";
import { Button } from "@nextblock-monorepo/ui";
import { Eye, ArrowLeft } from "lucide-react";
import ContentLanguageSwitcher from "@/app/cms/components/ContentLanguageSwitcher";
import { getActiveLanguagesServerSide } from "@nextblock-monorepo/db/server";
import CopyContentFromLanguage from "@/app/cms/components/CopyContentFromLanguage";
import { UploadFolderProvider } from "@/app/cms/media/UploadFolderContext";

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
    <UploadFolderProvider defaultFolder={`pages/${pageWithBlocks.slug}/`}>
    <div className="space-y-8 w-full mx-auto px-6">
      <div className="flex justify-between items-center flex-wrap gap-4 w-full">
        <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" aria-label="Back to pages" asChild>
                <Link href="/cms/pages">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold">Edit Page</h1>
                <p className="text-sm text-muted-foreground truncate max-w-md" title={pageWithBlocks.title}>{pageWithBlocks.title}</p>
            </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap"> {/* Added flex-wrap for responsiveness */}
            {allSiteLanguages.length > 0 && (
                 <ContentLanguageSwitcher
                    currentItem={{
                      ...pageWithBlocks,
                      translation_group_id: pageWithBlocks.translation_group_id ?? ""
                    }}
                    itemType="page"
                    allSiteLanguages={allSiteLanguages}
                  />
            )}
           {pageWithBlocks.translation_group_id && allSiteLanguages.length > 1 && (
             <CopyContentFromLanguage
               parentId={pageId}
               parentType="page"
               currentLanguageId={pageWithBlocks.language_id}
               translationGroupId={pageWithBlocks.translation_group_id}
               allSiteLanguages={allSiteLanguages}
             />
           )}
            <Button variant="outline" asChild>
              <Link href={publicPageUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="mr-2 h-4 w-4" /> View Live
              </Link>
            </Button>
        </div>
      </div>

      <PageForm
        page={pageWithBlocks}
        formAction={updatePageWithId}
        actionButtonText="Update Page Metadata"
        isEditing={true}
        availableLanguagesProp={allSiteLanguages}
      />

      <Separator className="my-8" />

      <div className="w-full mx-auto px-6">
        <h2 className="text-xl font-semibold mb-4">Page Content Blocks</h2>
        <BlockEditorArea
          parentId={pageWithBlocks.id}
          parentType="page"
          initialBlocks={pageWithBlocks.blocks}
          languageId={pageWithBlocks.language_id}
        />
      </div>
    </div>
    </UploadFolderProvider>
  );
}
