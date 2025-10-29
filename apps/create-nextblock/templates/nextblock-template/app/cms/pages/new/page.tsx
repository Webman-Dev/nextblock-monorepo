// app/cms/pages/new/page.tsx
import PageForm from "../components/PageForm";
import { createPage } from "../actions"; // Server action for creating a page
import { createClient } from "@nextblock-cms/db/server";
import type { Database } from "@nextblock-cms/db";

type Language = Database['public']['Tables']['languages']['Row'];

interface NewPageProps {
  searchParams?: Promise<{
    from_group?: string | string[];
    target_lang_id?: string | string[];
  }>;
}

export default async function NewPage(props: NewPageProps) {
  const searchParams = (await props.searchParams) || {};
  const supabase = createClient();
  const { data: fetchedLanguages, error: languagesError } = await supabase
    .from("languages")
    .select("*")
    .order("name");

  if (languagesError) {
    console.error("Error fetching languages for NewPage:", languagesError.message);
    // Optionally, you could redirect or show a more user-friendly error
  }

  const availableLanguages: Language[] = fetchedLanguages || [];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Page</h1>
      <PageForm
        formAction={createPage}
        actionButtonText="Create Page"
        isEditing={false}
        availableLanguagesProp={availableLanguages}
        translationGroupId={
          Array.isArray(searchParams.from_group)
            ? searchParams.from_group[0]
            : searchParams.from_group
        }
        target_lang_id={
          Array.isArray(searchParams.target_lang_id)
            ? searchParams.target_lang_id[0]
            : searchParams.target_lang_id
        }
      />
    </div>
  );
}
