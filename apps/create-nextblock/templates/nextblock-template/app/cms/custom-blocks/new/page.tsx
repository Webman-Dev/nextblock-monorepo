import React from "react";
import { BlockComposer } from "../components/BlockComposer";

export const dynamic = "force-dynamic";

export default function CreateCustomBlockPage() {
  return (
    <div className="w-full">
      <BlockComposer mode="create" />
    </div>
  );
}
