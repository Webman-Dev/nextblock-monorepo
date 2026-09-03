"use client";

import Link from "next/link";
import React from "react";
import { Separator } from "@nextblock-cms/ui";
import { Button } from "@nextblock-cms/ui";
import { ArrowLeft, Eye, FilePenLine } from "lucide-react";
import PageForm from "../../components/PageForm";
import VisibilityControl from "../../../components/VisibilityControl";
import { buildViewUrl } from "../../../../../lib/publishing/viewUrl";
import BlockEditorArea from "../../../blocks/components/BlockEditorArea";
import ContentLanguageSwitcher from "../../../components/ContentLanguageSwitcher";
import CopyContentFromLanguage from "../../../components/CopyContentFromLanguage";
import RevisionHistoryButton from "../../../revisions/RevisionHistoryButton";
import { UploadFolderProvider } from '../../../media/UploadFolderContext';
import { CortexAiPageContextRegistrar } from "../../../components/CortexAiPageContext";
import { PageSeoAuditSection } from "../../../../../components/seo/PageSeoAuditSection";
import { PageSeoProvider } from "../../../../../lib/seo/page-audit-context";
import type { Database } from "@nextblock-cms/db";
import DraftStatusActions from "../../../components/DraftStatusActions";

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
  liveStatus: string;
  livePublishedAt: string | null;
  liveViewUrl: string;
  languageCode: string | null;
  languageName: string | null;
  isDraftModeEnabled: boolean;
  initialFeatureImageUrl?: string | null;
  initialFeatureImageId?: string | null;
  hasDraft: boolean;
}

export default function EditPageClient({
  page,
  pageId,
  allSiteLanguages,
  updatePageAction,
  publicPageUrl,
  liveStatus,
  livePublishedAt,
  liveViewUrl,
  languageCode,
  languageName,
  isDraftModeEnabled,
  initialFeatureImageUrl,
  initialFeatureImageId,
  hasDraft,
}: EditPageClientProps) {
  const previewUrl = buildViewUrl({ path: publicPageUrl, languageCode, draft: true });
  const liveUrl = buildViewUrl({ path: liveViewUrl, languageCode });
  const isLive = liveStatus === "published";

  return (
    <UploadFolderProvider defaultFolder={`pages/${page.slug}/`}>
      <CortexAiPageContextRegistrar
        context={{
          contentType: "page",
          entityId: page.id,
          languageId: page.language_id,
          slug: page.slug,
          title: page.title,
          translationGroupId: page.translation_group_id,
        }}
      />
      {/*
        The provider has to enclose both `PageForm` and `BlockEditorArea`,
        because the page-level SEO audit is assembled from halves they each own:
        the form publishes the meta title and description, the block editor
        publishes the live block array, and neither knows the other exists. It is
        seeded from the server-rendered row so the panel has a real document to
        grade on first paint rather than an empty one that scores zero until the
        block editor finishes mounting.
      */}
      <PageSeoProvider
        initialBlocks={page.blocks}
        initialMetaDescription={page.meta_description}
        initialMetaTitle={page.meta_title}
      >
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
                <ArrowLeft className="h-4 w-3.5" />
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
            <Button variant="secondary" asChild>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <FilePenLine className="mr-2 h-4 w-4" /> Preview
              </a>
            </Button>
            {isLive && (
              <Button variant="outline" asChild>
                <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                  <Eye className="mr-2 h-4 w-4" /> View Live
                </a>
              </Button>
            )}
            <RevisionHistoryButton parentType="page" parentId={pageId} />
            <VisibilityControl
              type="page"
              id={pageId}
              status={liveStatus}
              publishedAt={livePublishedAt}
              publicPath={liveViewUrl}
              languageName={languageName ?? undefined}
              translationGroupId={page.translation_group_id}
              languages={allSiteLanguages}
              hasDraft={hasDraft}
            />
          </div>
        </div>

        <DraftStatusActions parentId={pageId} parentType="page" hasDraft={hasDraft} />

        <PageForm
          page={page}
          formAction={updatePageAction}
        // Read-only: the form never writes blocks, it only lets Cortex AI read them so it
        // can summarize the page when drafting meta title and description.
        contentBlocks={page.blocks}
        actionButtonText="Update Page Metadata"
        isEditing={true}
        availableLanguagesProp={allSiteLanguages}
        initialFeatureImageUrl={initialFeatureImageUrl}
        initialFeatureImageId={initialFeatureImageId}
      />

        {/*
          Sits between the metadata form and the blocks because that is what it
          grades: everything above it and everything below it, together. It
          collapses to a single summary row so the block editor keeps its place
          on the screen.
        */}
        <PageSeoAuditSection />

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
      </PageSeoProvider>
    </UploadFolderProvider>
  );
}
