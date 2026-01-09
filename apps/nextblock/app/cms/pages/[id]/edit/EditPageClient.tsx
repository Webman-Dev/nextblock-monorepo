"use client";

import Link from "next/link";
import React from "react";
import { Separator } from "@nextblock-cms/ui";
import { Button } from "@nextblock-cms/ui";
import { Eye, ArrowLeft } from "lucide-react";
import PageForm from "../../components/PageForm";
import BlockEditorArea from "@/app/cms/blocks/components/BlockEditorArea";
import ContentLanguageSwitcher from "@/app/cms/components/ContentLanguageSwitcher";
import CopyContentFromLanguage from "@/app/cms/components/CopyContentFromLanguage";
import RevisionHistoryButton from "@/app/cms/revisions/RevisionHistoryButton";
import { UploadFolderProvider } from "@/app/cms/media/UploadFolderContext";
import type { Database } from "@nextblock-cms/db";

type Page = Database["public"]["Tables"]["pages"]["Row"];
type Block = Database["public"]["Tables"]["blocks"]["Row"];
type Language = Database["public"]["Tables"]["languages"]["Row"];

interface PageWithBlocks extends Page {
  blocks: Block[];
  language_code?: string;
  translation_group_id: string;
}

interface EditPageClientProps {
  page: PageWithBlocks;
  pageId: number;
  allSiteLanguages: Language[];
  updatePageAction: (formData: FormData) => Promise<{ error?: string } | void>;
  publicPageUrl: string;
}

export default function EditPageClient({
  page,
  pageId,
  allSiteLanguages,
  updatePageAction,
  publicPageUrl,
}: EditPageClientProps) {
  return (
    <UploadFolderProvider defaultFolder={`pages/${page.slug}/`}>
      <div className="space-y-8 w-full mx-auto px-6">
        <div className="flex justify-between items-center flex-wrap gap-4 w-full">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              aria-label="Back to pages"
              asChild
            >
              <Link href="/cms/pages">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Page</h1>
              <p
                className="text-sm text-muted-foreground truncate max-w-md"
                title={page.title}
              >
                {page.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {allSiteLanguages.length > 0 && (
              <ContentLanguageSwitcher
                currentItem={{
                  ...page,
                  translation_group_id: page.translation_group_id ?? "",
                }}
                itemType="page"
                allSiteLanguages={allSiteLanguages}
              />
            )}
            {page.translation_group_id && allSiteLanguages.length > 1 && (
              <CopyContentFromLanguage
                parentId={pageId}
                parentType="page"
                currentLanguageId={page.language_id}
                translationGroupId={page.translation_group_id}
                allSiteLanguages={allSiteLanguages}
              />
            )}
            <Button variant="outline" asChild>
              <Link
                href={publicPageUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Eye className="mr-2 h-4 w-4" /> View Live
              </Link>
            </Button>
            <RevisionHistoryButton parentType="page" parentId={pageId} />
          </div>
        </div>

        <PageForm
          page={page}
          formAction={updatePageAction}
          actionButtonText="Update Page Metadata"
          isEditing={true}
          availableLanguagesProp={allSiteLanguages}
        />

        <Separator className="my-8" />

        <div className="w-full mx-auto px-6">
          <h2 className="text-xl font-semibold mb-4">Page Content Blocks</h2>
          <BlockEditorArea
            parentId={page.id}
            parentType="page"
            initialBlocks={page.blocks}
            languageId={page.language_id}
          />
        </div>
      </div>
    </UploadFolderProvider>
  );
}
