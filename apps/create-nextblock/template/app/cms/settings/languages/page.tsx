// app/cms/settings/languages/page.tsx
import React from 'react';
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
import { Alert, AlertTitle, AlertDescription } from "@nextblock-cms/ui";
import { MoreHorizontal, PlusCircle, Edit3, Languages as LanguagesIcon, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@nextblock-cms/ui";
import type { Database } from "@nextblock-cms/db";
import DeleteLanguageClientButton from './components/DeleteLanguageButton';

type Language = Database['public']['Tables']['languages']['Row'];

async function getLanguages(): Promise<Language[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("languages")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching languages:", error);
    return [];
  }
  return data || [];
}

export default async function CmsLanguagesListPage() {
  const languages = await getLanguages();
  // The following line for searchParams will cause an error during static generation or if window is not defined.
  // It's better to pass searchParams as props if needed from the page component.
  // For this specific page, success messages are handled by redirect query params which Next.js makes available in page props.
  // Let's assume `props.searchParams.success` would be used if passed.
  // const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  // const successMessage = searchParams.get('success');
  const successMessage: string | null = null;
  // If you need to read searchParams, ensure your page component accepts them:
  // export default async function CmsLanguagesListPage({ searchParams }: { searchParams?: { success?: string } }) {
  // successMessage = searchParams?.success ?? null;
  // }


  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Manage Languages</h1>
        <Button variant="default" asChild>
          <Link href="/cms/settings/languages/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Language
          </Link>
        </Button>
      </div>

       {successMessage && (
        <Alert variant="success" className="mb-4">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            {decodeURIComponent(successMessage)}
          </AlertDescription>
        </Alert>
      )}

      {languages.length === 0 ? (
        <div className="text-center py-10 border rounded-lg">
          <LanguagesIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">No languages configured</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add languages to support multilingual content.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/cms/settings/languages/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Language
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {languages.map((lang) => (
                <TableRow key={lang.id}>
                  <TableCell className="font-medium">{lang.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{lang.code}</Badge>
                  </TableCell>
                  <TableCell>
                    {lang.is_default ? (
                      <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Default</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lang.created_at ? new Date(lang.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Language actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/cms/settings/languages/${lang.id}/edit`} className="flex items-center cursor-pointer">
                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DeleteLanguageClientButton language={lang} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="mt-6">
        <Alert variant="warning">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Important Note on Deleting Languages</AlertTitle>
          <AlertDescription>
            Deleting a language is a destructive action. All content (pages, posts, blocks, navigation items) specifically associated with that language will be permanently deleted due to database cascade rules. Please ensure this is intended before proceeding. You cannot delete the current default language if it is the only one.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
