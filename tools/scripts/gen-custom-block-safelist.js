// Generates libs/ui/src/custom-block-safelist.ts — a list of Tailwind color
// utility classes as literal tokens.
//
// Why: custom block layouts store Tailwind classes in the database (authored by
// Cortex AI or by hand). Tailwind only emits CSS for classes it discovers while
// scanning source files, and it cannot scan the database. Listing the color
// families here (a file matched by the Tailwind `content` globs) forces those
// classes to be generated so data-driven blocks render correctly.
//
// Run: node tools/scripts/gen-custom-block-safelist.js

const fs = require('fs');
const path = require('path');

const colors = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];

// Balanced palette tier: drops the rarely-used 50/950 shades and the heaviest
// variant combinations (ring colors, focus:, hover on text/border) to keep the
// CSS lean while still covering what data-driven blocks actually use — solid and
// hover backgrounds, text/border colors, gradients, and colored shadows.
// To go leaner or fuller, edit `slots`/`shades` and regenerate.
const shades = [100, 200, 300, 400, 500, 600, 700, 800, 900];

// property -> which state variants to include
const slots = [
  { prop: 'bg', variants: ['', 'hover:'] },
  { prop: 'text', variants: [''] },
  { prop: 'border', variants: [''] },
  { prop: 'shadow', variants: [''] },
  { prop: 'from', variants: [''] },
  { prop: 'via', variants: [''] },
  { prop: 'to', variants: [''] },
];

// Gradient direction helpers + seed-content classes formerly forced via
// app/force-styles.tsx (consolidated here; that component has been removed).
const staticExtras = [
  // gradient directions (v3 + v4 naming)
  'bg-gradient-to-t', 'bg-gradient-to-tr', 'bg-gradient-to-r', 'bg-gradient-to-br',
  'bg-gradient-to-b', 'bg-gradient-to-bl', 'bg-gradient-to-l', 'bg-gradient-to-tl',
  'bg-linear-to-t', 'bg-linear-to-tr', 'bg-linear-to-r', 'bg-linear-to-br',
  'bg-linear-to-b', 'bg-linear-to-bl', 'bg-linear-to-l', 'bg-linear-to-tl',
  // seed-content classes (previously in force-styles.tsx)
  'mt-10', 'p-8', 'p-10', 'p-12', 'gap-4',
  'grid', 'grid-cols-2', 'sm:grid-cols-4', 'lg:grid-cols-8',
  'dark:text-slate-200', 'dark:text-slate-400', 'dark:text-white',
  'text-sm', 'font-semibold', 'text-center', 'text-white',
  'uppercase', 'tracking-[0.3em]', 'tracking-wide', 'tracking-widest',
  'bg-white/5', 'bg-white/10', 'border-white/10', 'border-white/20',
  'bg-slate-50', 'hover:bg-slate-100', 'dark:bg-white/5', 'dark:hover:bg-white/10',
  'from-blue-400', 'to-cyan-400', 'from-blue-500/10', 'to-purple-500/10',
];

const classes = [];
for (const color of colors) {
  for (const shade of shades) {
    for (const slot of slots) {
      for (const variant of slot.variants) {
        classes.push(`${variant}${slot.prop}-${color}-${shade}`);
      }
    }
  }
}
classes.push(...staticExtras);

const header = `/*
 * AUTO-GENERATED — do not edit by hand.
 * Regenerate with: node tools/scripts/gen-custom-block-safelist.js
 *
 * Custom block layouts store Tailwind classes in the database. Tailwind only
 * emits CSS for classes it finds while scanning source files, so these color
 * utility tokens are listed here to force their generation. This module is never
 * imported at runtime; it exists purely so the Tailwind content scanner sees it.
 * (Consolidates and replaces the former app/force-styles.tsx.)
 */
`;

const body = `export const CUSTOM_BLOCK_TAILWIND_SAFELIST = \`\n${classes.join(' ')}\n\`;\n`;

const repoRoot = path.join(__dirname, '../..');
const contents = `${header}\n${body}`;

// Written into the app's lib/ so it is scanned by Tailwind's content globs
// (`./apps/**`). The create-nextblock sync mirrors apps/nextblock/lib into the
// template, so the scaffolded project picks it up there too (a scaffold consumes
// @nextblock-cms/ui from node_modules, which Tailwind does not scan).
const outPath = path.join(repoRoot, 'apps/nextblock/lib/custom-block-safelist.ts');
fs.writeFileSync(outPath, contents);
console.log(`Wrote ${classes.length} safelist classes to ${path.relative(repoRoot, outPath)}`);
