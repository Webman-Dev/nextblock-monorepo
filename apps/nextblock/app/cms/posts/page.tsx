// app/cms/posts/page.tsx
import React from "react";
import { createClient } from "@nextblock-cms/db/server";
import Link from "next/link";
import { Button } from "@nextblock-cms/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nextblock-cms/ui";
import { Badge } from "@nextblock-cms/ui";
import { Alert, AlertDescription } from "@nextblock-cms/ui";
import { MoreHorizontal, PlusCircle, Edit3, PenTool } from "lucide-react"; // Removed Trash2 as it's in the client component
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@nextblock-cms/ui";
// deletePost server action is now used by DeletePostButtonClient
import type { Database } from "@nextblock-cms/db";
import { getActiveLanguagesServerSide } from "@nextblock-cms/db/server";

type Post = Database['public']['Tables']['posts']['Row'] & { feature_image_url?: string | null };
import LanguageFilterSelect from "@/app/cms/components/LanguageFilterSelect";
import DeletePostButtonClient from "./components/DeletePostButtonClient"; // Import the new client component

async function getPostsWithDetails(filterLanguageId?: number): Promise<{ post: Post; languageCode: string }[]> {
  const supabase = createClient();
  const languages = await getActiveLanguagesServerSide();
  const langMap = new Map(languages.map(l => [l.id, l.code]));

  let query = supabase
    .from("posts")
    .select("*, languages!inner(code), media ( object_key )")
    .order("created_at", { ascending: false });

  if (filterLanguageId) {
    query = query.eq("language_id", filterLanguageId);
  }

  const { data: postsData, error } = await query;

  if (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
  if (!postsData) return [];

  return postsData.map(p => {
    const langInfo = p.languages as unknown as { code: string } | null;
    return {
      post: { ...p, feature_image_url: p.media?.object_key ? `${process.env.NEXT_PUBLIC_R2_BASE_URL}/${p.media.object_key}` : null } as Post,
      languageCode: langInfo?.code?.toUpperCase() || langMap.get(p.language_id)?.toUpperCase() || 'N/A',
    };
  });
}

interface CmsPostsListPageProps {
  searchParams?: Promise<{
    lang?: string;
    success?: string;
  }>;
}

export default async function CmsPostsListPage(props: CmsPostsListPageProps) {
  const searchParams = await props.searchParams;
  const allLanguages = await getActiveLanguagesServerSide();
  const selectedLangId = searchParams?.lang ? parseInt(searchParams.lang, 10) : undefined;
  const isValidLangId = selectedLangId ? allLanguages.some(l => l.id === selectedLangId) : true;
  const filterLangId = isValidLangId ? selectedLangId : undefined;

  const postsWithDetails = await getPostsWithDetails(filterLangId);
  const successMessage = searchParams?.success;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-semibold">Manage Posts</h1>
        <div className="flex items-center gap-3">
          <LanguageFilterSelect
            allLanguages={allLanguages}
            currentFilterLangId={filterLangId}
            basePath="/cms/posts"
          />
          <Button variant="default" asChild>
            <Link href="/cms/posts/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Post
            </Link>
          </Button>
        </div>
      </div>

      {successMessage && (
        <Alert variant="success" className="mb-4">
          <AlertDescription>
            {decodeURIComponent(successMessage)}
          </AlertDescription>
        </Alert>
      )}

      {postsWithDetails.length === 0 ? (
        <div className="text-center py-10 border rounded-lg dark:border-slate-700">
          <PenTool className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">
            {filterLangId ? "No posts found for the selected language." : "No posts found."}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by creating a new post.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/cms/posts/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Post
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden dark:border-slate-700">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-slate-700">
                <TableHead className="w-[300px] sm:w-[400px]">Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Language</TableHead>
                <TableHead className="hidden md:table-cell">Slug</TableHead>
                <TableHead className="hidden lg:table-cell">Published At</TableHead>
                <TableHead className="text-right w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postsWithDetails.map(({ post, languageCode }) => (
                <TableRow key={post.id} className="dark:border-slate-700">
                  <TableCell className="font-medium">
                    <Link
                      href={`/cms/posts/${post.id}/edit`}
                      className="flex items-center cursor-pointer"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      {post.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        post.status === "published" ? "default" :
                        post.status === "draft" ? "secondary" : "destructive"
                      }
                      className={
                        post.status === "published" ? "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 dark:border-green-700/50" :
                        post.status === "draft" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-700/50" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300 dark:border-slate-600"
                      }
                    >
                      {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="dark:border-slate-600">{languageCode}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs hidden md:table-cell">/article/{post.slug}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString() : "Not yet"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                           <span className="sr-only">Post actions for {post.title}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/cms/posts/${post.id}/edit`} className="flex items-center cursor-pointer">
                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DeletePostButtonClient postId={post.id} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
