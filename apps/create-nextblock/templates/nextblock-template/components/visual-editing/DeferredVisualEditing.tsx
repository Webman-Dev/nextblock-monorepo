'use client';

import dynamic from 'next/dynamic';

// Defer the visual-editing toolbar (and its heavy editor graph: BlockEditorModal,
// the per-block editors, and editor.css) out of the public bundle. The layout only
// renders this in draft/visual-editing mode, but a *static* import would still ship
// the entire editor graph to every public page. Loading it via next/dynamic with
// ssr:false keeps it out of the public homepage's render-blocking CSS and JS, and
// pulls it in client-side only when visual editing is actually active.
const NextblockVisualEditing = dynamic(
  () =>
    import('./NextblockVisualEditing').then(
      (module) => module.NextblockVisualEditing
    ),
  { ssr: false }
);

export function DeferredVisualEditing() {
  return <NextblockVisualEditing />;
}
