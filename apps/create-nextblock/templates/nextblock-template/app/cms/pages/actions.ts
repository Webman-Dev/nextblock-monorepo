// app/cms/pages/actions.ts
"use server";

import { createClient } from "@nextblock-cms/db/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Database } from "@nextblock-cms/db";
import { v4 as uuidv4 } from 'uuid';
import { getOrCreateContentDraft } from "../../../lib/visual-editing/draft-content";

type PageStatus = Database['public']['Enums']['page_status'];
import { encodedRedirect } from "@nextblock-cms/utils/server";

// --- createPage and updatePage functions remain unchanged ---

function getOptionalFeatureImageId(formData: FormData) {
  const value = formData.get("feature_image_id");
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function revalidatePublicPageSlug(slug: string | null | undefined) {
  if (!slug) return;

  revalidatePath(`/${slug}`);
  if (slug === "home" || slug === "accueil") {
    revalidatePath("/");
  }
}

export async function createPage(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return encodedRedirect("error", "/cms/pages/new", "User not authenticated.");


  const rawFormData = {
    title: formData.get("title") as string,
    slug: formData.get("slug") as string,
    language_id: parseInt(formData.get("language_id") as string, 10),
    status: formData.get("status") as PageStatus,
    meta_title: formData.get("meta_title") as string || null,
    meta_description: formData.get("meta_description") as string || null,
    custom_canonical: formData.get("custom_canonical") as string || null,
    feature_image_id: getOptionalFeatureImageId(formData),
  };

  if (!rawFormData.title || !rawFormData.slug || isNaN(rawFormData.language_id) || !rawFormData.status) {
    return encodedRedirect("error", "/cms/pages/new", "Missing required fields: title, slug, language, or status.");
  }

  const translation_group_id = formData.get("translation_group_id") as string || uuidv4();

  // Check if a translation for this language already exists
  if (formData.get("translation_group_id")) {
    const { data: existingTranslation, error: checkError } = await supabase
      .from("pages")
      .select("id")
      .eq("translation_group_id", formData.get("translation_group_id") as string)
      .eq("language_id", rawFormData.language_id)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for existing translation:", checkError);
      // Decide if we should halt or just log. For now, we'll proceed.
    }

    if (existingTranslation) {
      // A translation for this language already exists, redirect to its edit page.
      redirect(`/cms/pages/${existingTranslation.id}/edit?warning=${encodeURIComponent("A page for this language already exists. You are now editing it.")}`);
    }
  }
 
   const pageData: UpsertPagePayload = {
     ...rawFormData,
     author_id: user.id,
     translation_group_id: translation_group_id,
   };
 
   const { data: newPage, error: createError } = await supabase
     .from("pages")
     .insert(pageData)
     .select("id, title, slug, language_id, translation_group_id, feature_image_id")
     .single();

  if (createError) {
    console.error("Error creating page:", createError);
    if (createError.code === '23505' && createError.message.includes('pages_language_id_slug_key')) {
        return encodedRedirect("error", "/cms/pages/new", `The slug "${pageData.slug}" already exists for the selected language. Please use a unique slug.`);
    }
    return encodedRedirect("error", "/cms/pages/new", `Failed to create page: ${createError.message}`);
  }

  revalidatePath("/cms/pages");
  revalidatePublicPageSlug(newPage?.slug);

  if (newPage?.id) {
    redirect(`/cms/pages/${newPage.id}/edit?success=${encodeURIComponent("Page created successfully.")}`);
  } else {
    redirect(`/cms/pages?success=${encodeURIComponent("Page created successfully.")}`);
  }
}

export async function updatePage(pageId: number, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const pageEditPath = `/cms/pages/${pageId}/edit`;

  if (!user) return { error: "User not authenticated." };

  const { data: existingPage, error: fetchError } = await supabase
    .from("pages")
    .select("translation_group_id, slug")
    .eq("id", pageId)
    .single();

  if (fetchError || !existingPage) {
    return { error: "Original page not found or error fetching it." };
  }

  const rawFormData = {
    title: formData.get("title") as string,
    slug: formData.get("slug") as string,
    language_id: parseInt(formData.get("language_id") as string, 10),
    status: formData.get("status") as PageStatus,
    meta_title: formData.get("meta_title") as string || null,
    meta_description: formData.get("meta_description") as string || null,
    custom_canonical: formData.get("custom_canonical") as string || null,
    feature_image_id: getOptionalFeatureImageId(formData),
  };

  if (!rawFormData.title || !rawFormData.slug || isNaN(rawFormData.language_id) || !rawFormData.status) {
     return { error: "Missing required fields: title, slug, language, or status." };
  }

  const pageUpdateData: Partial<Omit<UpsertPagePayload, 'translation_group_id' | 'author_id'>> = {
    title: rawFormData.title,
    slug: rawFormData.slug,
    language_id: rawFormData.language_id,
    status: rawFormData.status,
    meta_title: rawFormData.meta_title,
    meta_description: rawFormData.meta_description,
    custom_canonical: rawFormData.custom_canonical,
    feature_image_id: rawFormData.feature_image_id,
  };

  try {
    const draft = await getOrCreateContentDraft(supabase, "page", pageId, user.id);
    const updatedMeta = {
      ...draft.meta,
      ...pageUpdateData,
    };

    const { error: updateError } = await supabase
      .from("content_drafts")
      .update({ meta: updatedMeta as any })
      .eq("id", draft.id);

    if (updateError) {
      console.error("Error updating page draft:", updateError);
      if (updateError.code === '23505' && updateError.message.includes('pages_language_id_slug_key')) {
        return { error: `The slug "${pageUpdateData.slug}" already exists for the selected language. Please use a unique slug.` };
      }
      return { error: `Failed to update draft: ${updateError.message}` };
    }
  } catch (err: any) {
    console.error("Error loading/creating draft for page metadata update:", err);
    return { error: `Failed to load draft: ${err.message || err}` };
  }

  revalidatePath("/cms/pages");
  revalidatePublicPageSlug(existingPage.slug);
  if (rawFormData.slug && rawFormData.slug !== existingPage.slug) {
      revalidatePublicPageSlug(rawFormData.slug);
  }

  revalidatePath(pageEditPath);
  return { success: true };
}


export async function deletePage(pageId: number) {
  const supabase = createClient();

  // 1. Fetch the Translation Group
  const { data: page, error: fetchError } = await supabase
    .from("pages")
    .select("translation_group_id")
    .eq("id", pageId)
    .single();

  if (fetchError || !page) {
    console.error("Error fetching page for deletion:", fetchError);
    return encodedRedirect("error", "/cms/pages", "Page not found.");
  }

  const { translation_group_id } = page;

  // 2. Find All Related Pages
  const { data: relatedPages, error: relatedPagesError } = await supabase
    .from("pages")
    .select("slug")
    .eq("translation_group_id", translation_group_id);

  if (relatedPagesError) {
    console.error("Error fetching related pages:", relatedPagesError);
    return encodedRedirect("error", "/cms/pages", "Could not fetch related pages for deletion.");
  }

  // 3. Delete All Associated Navigation Links
  if (relatedPages && relatedPages.length > 0) {
    const slugs = relatedPages.map(p => p.slug).filter((s): s is string => s !== null);
    if (slugs.length > 0) {
        const pathsToDelete = slugs.map(slug => `/${slug}`);
        const { error: navError } = await supabase
          .from("navigation_items")
          .delete()
          .in("url", pathsToDelete);

        if (navError) {
          console.error("Error deleting navigation links:", navError);
          // Do not block deletion of pages if nav items fail to delete
        }
    }
  }

  // 4. Delete All Related Pages
  const { error: deletePagesError } = await supabase
    .from("pages")
    .delete()
    .eq("translation_group_id", translation_group_id);

  if (deletePagesError) {
    console.error("Error deleting pages:", deletePagesError);
    return encodedRedirect("error", "/cms/pages", `Failed to delete pages: ${deletePagesError.message}`);
  }

  // Revalidate paths to reflect the deletion
  revalidatePath("/cms/pages");
  revalidatePath("/cms/navigation");
  if (relatedPages) {
    relatedPages.forEach(p => {
      revalidatePublicPageSlug(p.slug);
    });
  }

  // 5. Update Redirect Message
  redirect(`/cms/pages?success=${encodeURIComponent("Page and all its translations were deleted successfully.")}`);
}

type UpsertPagePayload = {
  language_id: number;
  author_id: string | null;
  title: string;
  slug: string; // Now language-specific
  status: PageStatus;
  meta_title?: string | null;
  meta_description?: string | null;
  custom_canonical?: string | null;
  feature_image_id?: string | null;
  translation_group_id: string; // UUID
};
