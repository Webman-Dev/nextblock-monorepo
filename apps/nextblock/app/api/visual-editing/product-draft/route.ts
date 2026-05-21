import { NextResponse } from "next/server";
import type { Json } from "@nextblock-cms/db";
import { saveProductVisualEditingDraftMutation } from "../../../../lib/visual-editing/product-drafts";
import type { VisualEditingProductFieldRequest } from "../../../../lib/visual-editing/types";

type SaveProductDraftBody = {
  request?: VisualEditingProductFieldRequest;
  content?: Json;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: SaveProductDraftBody;

  try {
    body = (await request.json()) as SaveProductDraftBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid product draft payload." },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  if (!body.request) {
    return NextResponse.json(
      { error: "Missing product draft target." },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const result = await saveProductVisualEditingDraftMutation(
    body.request,
    body.content ?? null
  );

  return NextResponse.json(result, {
    status: "error" in result ? 400 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
