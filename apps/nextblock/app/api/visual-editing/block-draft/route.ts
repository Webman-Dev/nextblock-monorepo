import { NextResponse } from "next/server";
import type { Json } from "@nextblock-cms/db";
import { saveVisualEditingBlockDraftMutation } from "../../../../lib/visual-editing/mutations";
import type { VisualEditingBlockRequest } from "../../../../lib/visual-editing/types";

type SaveBlockDraftBody = {
  request?: VisualEditingBlockRequest;
  content?: Json;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: SaveBlockDraftBody;

  try {
    body = (await request.json()) as SaveBlockDraftBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid visual editing draft payload." },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  if (!body.request) {
    return NextResponse.json(
      { error: "Missing visual editing draft target." },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const result = await saveVisualEditingBlockDraftMutation(
    body.request,
    body.content ?? null
  );

  return NextResponse.json(result, {
    status: "error" in result ? 400 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
