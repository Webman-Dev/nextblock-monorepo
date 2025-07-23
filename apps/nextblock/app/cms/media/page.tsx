// app/cms/media/page.tsx
import React from 'react';
import { createClient } from "@nextblock-monorepo/db/server";
// import Link from "next/link"; // Unused, MediaGridClient handles item links
import type { Database } from "@nextblock-monorepo/db";
// DropdownMenu related imports are now handled within MediaGridClient or its sub-components if needed individually.

type Media = Database['public']['Tables']['media']['Row'];
// If page.tsx itself doesn't directly use DropdownMenu, these can be removed from here.
// For now, assuming MediaGridClient handles its own dropdowns.
import MediaUploadForm from "./components/MediaUploadForm";
// MediaImage and DeleteMediaButtonClient are used by MediaGridClient, not directly here anymore.
import MediaGridClient from "./components/MediaGridClient"; // Import the new client component

async function getMediaItems(): Promise<Media[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching media items:", error);
    return [];
  }
  return data || [];
}

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || "";

export default async function CmsMediaLibraryPage() {
  const mediaItems = await getMediaItems();

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Media Library</h1>
      </div>

      <MediaUploadForm />

      {/* The media grid and empty state are now handled by MediaGridClient */}
      <MediaGridClient initialMediaItems={mediaItems} r2BaseUrl={R2_BASE_URL} />
    </div>
  );
}