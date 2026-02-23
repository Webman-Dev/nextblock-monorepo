// app/cms/settings/languages/new/page.tsx
import React from "react";
import LanguageForm from "../components/LanguageForm";
import { createLanguage } from "../actions";
import { createClient } from "@nextblock-cms/db/server"; // To fetch all languages for the form logic
import type { Database } from "@nextblock-cms/db";

type Language = Database['public']['Tables']['languages']['Row'];

async function getAllLanguages(): Promise<Language[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from("languages").select("*");
    if (error) {
        console.error("Error fetching languages for new page form:", error);
        return [];
    }
    return data || [];
}


export default async function NewLanguagePage() {
  const allLanguages = await getAllLanguages();
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Language</h1>
      <LanguageForm
        formAction={createLanguage}
        actionButtonText="Add Language"
        isEditing={false}
        allLanguages={allLanguages}
      />
    </div>
  );
}
