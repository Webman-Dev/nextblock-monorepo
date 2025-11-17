// app/cms/posts/[id]/edit/page.tsx
import React from "react";
import { Separator } from "@nextblock-cms/ui";
import { createClient } from "@nextblock-cms/db/server";
import PostForm from "../../components/PostForm"; // Adjusted path
import { updatePost } from "../../actions";
import type { Database } from "@nextblock-cms/db"; // Ensure Language and Media are imported
import { notFound, redirect } from "next/navigation";

type PostType = Database['public']['Tables']['posts']['Row'];
type BlockType = Database['public']['Tables']['blocks']['Row'];
type Language = Database['public']['Tables']['languages']['Row'];
import BlockEditorArea from "@/app/cms/blocks/components/BlockEditorArea";
import Link from "next/link";
import { Button } from "@nextblock-cms/ui";
import { Eye, ArrowLeft } from "lucide-react"; // Removed SeparatorVertical, use <Separator />
import ContentLanguageSwitcher from "@/app/cms/components/ContentLanguageSwitcher";
import { getActiveLanguagesServerSide } from "@nextblock-cms/db/server"; // Correct server-side fetch
import CopyContentFromLanguage from "@/app/cms/components/CopyContentFromLanguage";
import { UploadFolderProvider } from "@/app/cms/media/UploadFolderContext";
import RevisionHistoryButton from "@/app/cms/revisions/RevisionHistoryButton";

interface PostWithBlocks extends PostType {
  blocks: BlockType[];
  language_code?: string; // From joined languages table
  translation_group_id: string;
}

async function getPostDataWithBlocks(id: number): Promise<PostWithBlocks | null> {
  const supabase = createClient();
  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select(`
      *,
      languages!inner (code),
      blocks (*)
    `)
    .eq("id", id)
    .order('order', { foreignTable: 'blocks', ascending: true })
    .single();

  if (postError) {
    console.error("Error fetching post with blocks for edit:", postError);
    return null;
  }

  const langCode = (postData.languages as unknown as Language)?.code;

  return {
    ...postData,
    blocks: postData.blocks || [],
    language_code: langCode,
    translation_group_id: postData.translation_group_id,
  } as PostWithBlocks;
}

export default async function EditPostPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const postId = parseInt(params.id, 10);
  if (isNaN(postId)) {
    return notFound();
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/sign-in?redirect=/cms/posts/${postId}/edit`);

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['ADMIN', 'WRITER'].includes(profile.role)) {
      return <div className="p-6 text-center text-red-600">Access Denied. You do not have permission to edit posts.</div>;
  }

  // Fetch post data and all site languages concurrently
  const [postWithBlocks, allSiteLanguages] = await Promise.all([
    getPostDataWithBlocks(postId),
    getActiveLanguagesServerSide() // Fetch languages on the server
  ]);

  if (!postWithBlocks) {
    return notFound();
  }

  let initialFeatureImageUrl: string | null = null;
  let initialFeatureImageIdProp: string | null = null;

  // The PostType defines feature_image_id as number | null.
  // However, Media.id is a string (uuid), and PostForm expects a string UUID.
  // This assumes that postWithBlocks.feature_image_id, despite its 'number' typing,
  // actually holds a value that can be used to identify a media item by its UUID,
  // or that the type definition for Post.feature_image_id is outdated.
  // Casting to `unknown` then `string` for the query.
  const featureImageIdFromDb = postWithBlocks.feature_image_id as unknown as (string | number | null);

  if (featureImageIdFromDb) {
    const { data: mediaItem, error: mediaError } = await supabase
      .from("media")
      .select("id, object_key")
      .eq("id", String(featureImageIdFromDb)) // Query using the ID as string
      .single();

    if (mediaError) {
      console.error(`Error fetching media item for feature_image_id '${featureImageIdFromDb}':`, mediaError.message);
      // Not critical enough to notFound(), form will just not have initial image.
    } else if (mediaItem) {
      initialFeatureImageIdProp = mediaItem.id; // string UUID from media table
      const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE_URL;
      if (r2BaseUrl && mediaItem.object_key) {
        initialFeatureImageUrl = `${r2BaseUrl}/${mediaItem.object_key}`;
      } else if (!r2BaseUrl) {
        console.warn("NEXT_PUBLIC_R2_PUBLIC_URL is not set. Cannot construct feature image URL for edit page.");
      }
    }
  }

  const updatePostWithId = updatePost.bind(null, postId);
  const publicPostUrl = `/article/${postWithBlocks.slug}`;
  
  return (
    <UploadFolderProvider defaultFolder={`posts/${postWithBlocks.slug}/`}>
    <div className="space-y-8 w-full mx-auto px-6">
      <div className="flex justify-between items-center flex-wrap gap-4 w-full">
        <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" aria-label="Back to posts" asChild>
                <Link href="/cms/posts">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold">Edit Post</h1>
                <p className="text-sm text-muted-foreground truncate max-w-md" title={postWithBlocks.title}>{postWithBlocks.title}</p>
            </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap"> {/* Added flex-wrap for responsiveness */}
            {allSiteLanguages.length > 0 && (
                 <ContentLanguageSwitcher
                    currentItem={postWithBlocks}
                    itemType="post"
                    allSiteLanguages={allSiteLanguages}
                  />
            )}
            {postWithBlocks.translation_group_id && allSiteLanguages.length > 1 && (
              <CopyContentFromLanguage
                parentId={postId}
                parentType="post"
                currentLanguageId={postWithBlocks.language_id}
                translationGroupId={postWithBlocks.translation_group_id}
                allSiteLanguages={allSiteLanguages}
              />
            )}
            <Button variant="outline" asChild>
              <Link href={publicPostUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="mr-2 h-4 w-4" /> View Live Post
              </Link>
            </Button>
            <RevisionHistoryButton parentType="post" parentId={postId} />
        </div>
      </div>

      <PostForm
        post={postWithBlocks as PostType & { feature_image_id?: string | null }} // Asserting feature_image_id might be string for PostForm
        formAction={updatePostWithId}
        actionButtonText="Update Post Metadata"
        isEditing={true}
        availableLanguagesProp={allSiteLanguages}
        initialFeatureImageUrl={initialFeatureImageUrl}
        initialFeatureImageId={initialFeatureImageIdProp}
      />

      <Separator className="my-8" />

      <div className="w-full mx-auto px-6">
        <h2 className="text-xl font-semibold mb-4">Post Content Blocks</h2>
        <BlockEditorArea
          parentId={postWithBlocks.id}
          parentType="post"
          initialBlocks={postWithBlocks.blocks}
          languageId={postWithBlocks.language_id}
        />
      </div>
    </div>
    </UploadFolderProvider>
  );
}
