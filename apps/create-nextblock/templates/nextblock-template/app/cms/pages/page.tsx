// app/cms/pages/page.tsx
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
import {
  MoreHorizontal,
  PlusCircle,
  Edit3,
  FileText,
} from "lucide-react"; // Trash2 removed from here
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@nextblock-cms/ui";
// Server action `deletePage` is used by DeletePageButtonClient
import type { Database } from "@nextblock-cms/db";
import { getActiveLanguagesServerSide } from "@nextblock-cms/db/server";

type Page = Database["public"]["Tables"]["pages"]["Row"];
import LanguageFilterSelect from "@/app/cms/components/LanguageFilterSelect";
import DeletePageButtonClient from "./components/DeletePageButtonClient"; // Import the client component

async function getPagesWithDetails(
  filterLanguageId?: number
): Promise<{ page: Page; languageCode: string }[]> {
  const supabase = createClient();
  const languages = await getActiveLanguagesServerSide();
  const langMap = new Map(languages.map((l) => [l.id, l.code]));

  let query = supabase
    .from("pages")
    .select("*, languages!inner(code)")
    .order("created_at", { ascending: false });

  if (filterLanguageId) {
    query = query.eq("language_id", filterLanguageId);
  }

  const { data: pagesData, error } = await query;

  if (error) {
    console.error("Error fetching pages:", error);
    return [];
  }
  if (!pagesData) return [];

  return pagesData.map((p) => {
    const langInfo = p.languages as unknown as { code: string } | null;
    return {
      page: p as Page,
      languageCode:
        langInfo?.code?.toUpperCase() ||
        langMap.get(p.language_id)?.toUpperCase() ||
        "N/A",
    };
  });
}

interface CmsPagesListPageProps {
  searchParams?: Promise<{
    lang?: string;
    success?: string;
  }>;
}

export default async function CmsPagesListPage(props: CmsPagesListPageProps) {
  const searchParams = await props.searchParams;
  const allLanguages = await getActiveLanguagesServerSide();
  const selectedLangId = searchParams?.lang
    ? parseInt(searchParams.lang, 10)
    : undefined;

  const isValidLangId = selectedLangId
    ? allLanguages.some((l) => l.id === selectedLangId)
    : true;
  const filterLangId = isValidLangId ? selectedLangId : undefined;

  const pagesWithDetails = await getPagesWithDetails(filterLangId);
  const successMessage = searchParams?.success;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-semibold">Manage Pages</h1>
        <div className="flex items-center gap-3">
          <LanguageFilterSelect
            allLanguages={allLanguages}
            currentFilterLangId={filterLangId}
            basePath="/cms/pages"
          />
          <Button variant="default" asChild>
            <Link href="/cms/pages/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Page
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

      {pagesWithDetails.length === 0 ? (
        <div className="text-center py-10 border rounded-lg dark:border-slate-700">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">
            {filterLangId
              ? "No pages found for the selected language."
              : "No pages found."}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by creating a new page.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/cms/pages/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Page
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
                <TableHead className="hidden lg:table-cell">
                  Last Updated
                </TableHead>
                <TableHead className="text-right w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagesWithDetails.map(({ page, languageCode }) => (
                <TableRow key={page.id} className="dark:border-slate-700">
                  <TableCell className="font-medium">
                    <Link
                      href={`/cms/pages/${page.id}/edit`}
                      className="flex items-center cursor-pointer"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      {page.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        page.status === "published"
                          ? "default"
                          : page.status === "draft"
                            ? "secondary"
                            : "destructive"
                      }
                      className={
                        page.status === "published"
                          ? "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 dark:border-green-700/50"
                          : page.status === "draft"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-700/50"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300 dark:border-slate-600"
                      }
                    >
                      {page.status.charAt(0).toUpperCase() +
                        page.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="dark:border-slate-600">
                      {languageCode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
                    /{page.slug}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {new Date(page.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">
                            Page actions for {page.title}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/cms/pages/${page.id}/edit`}
                            className="flex items-center cursor-pointer"
                          >
                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {/* Use the Client Component for the delete button */}
                        <DeletePageButtonClient
                          pageId={page.id}
                          pageTitle={page.title}
                        />
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
