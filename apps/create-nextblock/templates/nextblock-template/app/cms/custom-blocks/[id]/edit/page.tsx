import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@nextblock-cms/ui";
import { BlockComposer } from "../../components/BlockComposer";
import { getCustomBlockDefinition } from "../../actions";

interface EditCustomBlockPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function EditCustomBlockPage(props: EditCustomBlockPageProps) {
  const params = await props.params;
  const blockId = params.id;

  try {
    const res = await getCustomBlockDefinition(blockId);

    if (!res.success || !res.data) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 max-w-md mx-auto">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold">Block Not Found</h3>
          <p className="text-sm text-muted-foreground mt-2">
            The custom block definition you are trying to edit could not be loaded. It may have been deleted or does not exist.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/cms/custom-blocks">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blocks
            </Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="w-full">
        <BlockComposer initialData={res.data} mode="edit" />
      </div>
    );
  } catch (err) {
    console.error("Error loading custom block definition for edit:", err);
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4 max-w-md mx-auto">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">Unexpected Error</h3>
        <p className="text-sm text-muted-foreground mt-2">
          An error occurred while trying to load the custom block definition. Please try again.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/cms/custom-blocks">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blocks
          </Link>
        </Button>
      </div>
    );
  }
}
