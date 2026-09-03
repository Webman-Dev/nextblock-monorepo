/**
 * LowContrastTextHint - makes invisible text visible *while editing only*.
 *
 * ## The problem
 *
 * Authors colour text for the section it will finally live in. A hero band with
 * a dark photograph behind it wants white or near-white copy, so that is what
 * the author sets. The Tiptap editing surface, however, is CMS chrome: white in
 * the light theme, near-black in the dark theme, and neither one is the
 * section's real background. We cannot paint the real background image behind
 * the text inside the editor because it would not line up with the section's
 * layout, so the honest fix is to detect the runs whose contrast fails against
 * the surface the author is *actually looking at* and give just those runs a
 * readable chip.
 *
 * ## Why this is safe: the stored document never changes
 *
 * This is a pure view concern, and that is the property that makes the feature
 * safe to ship. The hint is drawn with ProseMirror `Decoration.inline`
 * decorations produced by a plugin's `props.decorations`. Decorations live in
 * the `EditorView`, not in the document: they are not marks, not node
 * attributes, and not schema members. This extension adds no node, no mark, no
 * `addAttributes` and no `addGlobalAttributes`, so it does not touch the schema
 * at all, and it never dispatches a transaction carrying a step. Consequently
 * `editor.getHTML()` and `editor.getJSON()` return byte-identical output whether
 * this extension is registered or not, and nothing it adds can be serialised
 * into a block's JSONB column. Copying is safe for the same reason: ProseMirror
 * builds the clipboard from the document slice, not from the rendered DOM, so
 * copying a hinted run and pasting it back carries no chip with it.
 *
 * The one transaction it does dispatch - to publish a newly measured surface
 * colour - carries only plugin metadata plus `addToHistory: false`, so it
 * changes no content, does not enter the undo stack, and (because Tiptap only
 * emits `update` when `transaction.docChanged`) never triggers an autosave.
 *
 * ## Structure
 *
 * All decision-making lives in the pure, DOM-free `./low-contrast` module,
 * which is unit tested. This file is a thin shell: it reads the real background
 * out of the DOM, walks the document, and turns verdicts into decorations.
 */

import { Extension } from '@tiptap/core';
import type { Mark, Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { formatRgba, parseCssColor, resolveCssColor, rgbaToHex, type Rgba } from '@nextblock-cms/utils';

import {
  BODY_TEXT_CONTRAST_THRESHOLD,
  buildLowContrastHintAttrs,
  contrastThresholdFor,
  extractStyleDeclaration,
  flattenBackgroundLayers,
  flattenColorOver,
  inferSurfaceFromTextColor,
  isLargeTextRun,
  pickBackdropColor,
  shouldFlagLowContrast,
} from './low-contrast';

export interface LowContrastTextHintOptions {
  /** Set to `false` to disable the hint entirely without unregistering it. */
  enabled: boolean;
  /**
   * Documents larger than this (in ProseMirror content units) skip the walk.
   * The editor's own `CharacterCount` caps authored content at 50,000
   * characters, so this only ever fires for pathological pasted markup, where
   * freezing the tab would be far worse than losing the hint.
   */
  maxDocumentSize: number;
  /** Minimum contrast ratio for body copy. Large text is scaled from this. */
  threshold: number;
}

/**
 * Upper bound on decorations per rebuild. A document where hundreds of runs
 * fail has a systemic colour problem the author will spot from the first
 * handful; drawing thousands of chips would only cost frames.
 */
const MAX_HINT_DECORATIONS = 400;

/** How far up the DOM we are willing to walk looking for an opaque backdrop. */
const MAX_BACKGROUND_ANCESTORS = 32;

/** CSS-wide keywords we cannot turn into a concrete colour on our own. */
const UNRESOLVABLE_COLOR_KEYWORDS = new Set([
  'currentcolor',
  'inherit',
  'initial',
  'revert',
  'revert-layer',
  'unset',
]);

export const lowContrastTextHintKey = new PluginKey<LowContrastPluginState>('lowContrastTextHint');

interface LowContrastPluginState {
  decorations: DecorationSet;
  /** The resolved editing surface the current `decorations` were measured against. */
  surface: Rgba | null;
}

interface LowContrastMeta {
  surface: Rgba | null;
}

/** Colour context inherited from the ancestors of a text node. */
interface InheritedContext {
  /** Background layers, nearest to the text first. */
  backgrounds: readonly Rgba[];
  /** The nearest ancestor's inline `color`, if any. */
  color: string | null;
}

/** Compare two surfaces cheaply enough to run on every measurement. */
function surfaceKey(surface: Rgba | null): string {
  return surface ? rgbaToHex(surface, true) : 'none';
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function readInlineStyle(node: ProseMirrorNode | Mark): string | null {
  const style: unknown = node.attrs?.['style'];
  return typeof style === 'string' ? style : null;
}

/**
 * Read the colour actually painted behind the editor.
 *
 * We walk up from the ProseMirror content element compositing translucent
 * layers until we hit an opaque one, because assuming `#fff` would be exactly
 * backwards in the dark and 'vibrant' themes, where it is the *dark* author
 * colours that disappear.
 */
function readSurfaceColor(element: HTMLElement | null): Rgba | null {
  if (!element || typeof window === 'undefined') return null;

  const layers: Rgba[] = [];
  let node: HTMLElement | null = element;

  for (let depth = 0; node && depth < MAX_BACKGROUND_ANCESTORS; depth += 1) {
    const parsed = parseCssColor(window.getComputedStyle(node).backgroundColor);
    if (parsed && parsed.a > 0) {
      layers.push(parsed);
      if (parsed.a >= 1) break;
    }
    node = node.parentElement;
  }

  const defaultTextColor = parseCssColor(window.getComputedStyle(element).color);
  const fallback = inferSurfaceFromTextColor(defaultTextColor ?? { r: 0, g: 0, b: 0, a: 1 });

  return flattenBackgroundLayers(layers, fallback);
}

/**
 * Build the hint decorations for a document.
 *
 * The walk is hand-rolled rather than using `doc.descendants` because we need
 * to thread inherited colour and background down the tree: pasted markup keeps
 * its raw `style` attributes (see `PreserveAllAttributesExtension` and
 * `SpanNode`), so a paragraph inside a dark `div` really does render dark in
 * the editor, and measuring against the page surface alone would flag text that
 * is perfectly readable.
 */
function buildDecorations(
  doc: ProseMirrorNode,
  surface: Rgba | null,
  options: LowContrastTextHintOptions,
  host: HTMLElement | null,
): DecorationSet {
  if (!options.enabled || !surface) return DecorationSet.empty;
  if (doc.content.size > options.maxDocumentSize) return DecorationSet.empty;

  // Resolving a colour can cost a DOM probe (named colours, `color-mix()`), so
  // memoise per rebuild - a document usually reuses a handful of brand colours.
  const cache = new Map<string, Rgba | null>();
  const resolve = (value: string | null | undefined): Rgba | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed || UNRESOLVABLE_COLOR_KEYWORDS.has(trimmed.toLowerCase())) return null;
    if (cache.has(trimmed)) return cache.get(trimmed) ?? null;
    const resolved = resolveCssColor(trimmed, host);
    cache.set(trimmed, resolved);
    return resolved;
  };

  const decorations: Decoration[] = [];

  const visitText = (
    node: ProseMirrorNode,
    pos: number,
    parent: ProseMirrorNode,
    context: InheritedContext,
  ): void => {
    // Highlighted text already sits on the backdrop it needs, so a second chip
    // would fight the author's own choice rather than help.
    if (node.marks.some((mark) => mark.type.name === 'highlight')) return;

    const textStyle = node.marks.find((mark) => mark.type.name === 'textStyle');
    const markStyle = textStyle ? readInlineStyle(textStyle) : null;

    const colorValue =
      firstString(textStyle?.attrs['color'], extractStyleDeclaration(markStyle, 'color')) ??
      context.color;
    const foreground = resolve(colorValue);
    // No colour means the run inherits the theme's own foreground, which is
    // legible by construction. Fully transparent text is a different bug and a
    // chip would not reveal it.
    if (!foreground || foreground.a === 0) return;

    const markBackground = resolve(
      firstString(
        textStyle?.attrs['backgroundColor'],
        extractStyleDeclaration(markStyle, 'background-color'),
      ),
    );
    const runSurface = flattenBackgroundLayers(
      markBackground ? [markBackground, ...context.backgrounds] : context.backgrounds,
      surface,
    );

    const largeText = isLargeTextRun({
      bold: node.marks.some((mark) => mark.type.name === 'bold'),
      fontSize: firstString(
        textStyle?.attrs['fontSize'],
        extractStyleDeclaration(markStyle, 'font-size'),
      ),
      headingLevel:
        parent.type.name === 'heading' && typeof parent.attrs['level'] === 'number'
          ? parent.attrs['level']
          : null,
    });

    const verdict = shouldFlagLowContrast(
      formatRgba(foreground),
      formatRgba(runSurface),
      largeText,
      options.threshold,
    );
    if (!verdict.flag) return;

    decorations.push(
      Decoration.inline(
        pos,
        pos + node.nodeSize,
        buildLowContrastHintAttrs({
          backdrop: pickBackdropColor(flattenColorOver(foreground, runSurface)),
          foreground: formatRgba(foreground),
          ratio: verdict.ratio,
          threshold: contrastThresholdFor(largeText, options.threshold),
        }),
      ),
    );
  };

  const visitContent = (
    parent: ProseMirrorNode,
    contentStart: number,
    context: InheritedContext,
  ): void => {
    parent.forEach((child, offset) => {
      if (decorations.length >= MAX_HINT_DECORATIONS) return;

      const pos = contentStart + offset;

      if (child.isText) {
        visitText(child, pos, parent, context);
        return;
      }

      const style = readInlineStyle(child);
      const ownBackground = resolve(
        firstString(
          child.attrs?.['backgroundColor'],
          extractStyleDeclaration(style, 'background-color'),
          // The `background` shorthand only contributes when it is a plain
          // colour; gradients and images resolve to null and fall away.
          extractStyleDeclaration(style, 'background'),
        ),
      );
      const ownColor = firstString(child.attrs?.['color'], extractStyleDeclaration(style, 'color'));

      visitContent(child, pos + 1, {
        backgrounds: ownBackground ? [ownBackground, ...context.backgrounds] : context.backgrounds,
        color: ownColor ?? context.color,
      });
    });
  };

  visitContent(doc, 0, { backgrounds: [], color: null });

  return decorations.length ? DecorationSet.create(doc, decorations) : DecorationSet.empty;
}

export const LowContrastTextHint = Extension.create<LowContrastTextHintOptions>({
  name: 'lowContrastTextHint',

  addOptions() {
    return {
      enabled: true,
      maxDocumentSize: 60000,
      threshold: BODY_TEXT_CONTRAST_THRESHOLD,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    // `this.editor.view` does not exist yet while plugins are being built, so
    // the host element is fetched lazily and only ever used for colour probes.
    const hostElement = (): HTMLElement | null => {
      const dom = this.editor?.view?.dom;
      return dom instanceof HTMLElement ? dom : null;
    };

    return [
      new Plugin<LowContrastPluginState>({
        key: lowContrastTextHintKey,

        state: {
          init(): LowContrastPluginState {
            // No view means no measurable surface yet; the plugin view below
            // publishes one as soon as the editor is mounted.
            return { decorations: DecorationSet.empty, surface: null };
          },

          apply(
            tr: Transaction,
            previous: LowContrastPluginState,
            _oldState: EditorState,
            newState: EditorState,
          ): LowContrastPluginState {
            const meta = tr.getMeta(lowContrastTextHintKey) as LowContrastMeta | undefined;
            const nextSurface = meta ? meta.surface : previous.surface;
            const surfaceChanged = surfaceKey(nextSurface) !== surfaceKey(previous.surface);

            // The plugin runs on every transaction, including every keystroke
            // and every selection move, so the expensive walk is reserved for
            // the two things that can actually change the answer.
            if (!tr.docChanged && !surfaceChanged) {
              return {
                decorations: previous.decorations.map(tr.mapping, tr.doc),
                surface: previous.surface,
              };
            }

            return {
              decorations: buildDecorations(newState.doc, nextSurface, options, hostElement()),
              surface: nextSurface,
            };
          },
        },

        props: {
          decorations(state: EditorState): DecorationSet {
            return lowContrastTextHintKey.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },

        view(view: EditorView) {
          let destroyed = false;
          let scheduled = false;

          const publishSurface = (): void => {
            if (destroyed || scheduled) return;

            const measured = readSurfaceColor(view.dom instanceof HTMLElement ? view.dom : null);
            const current = lowContrastTextHintKey.getState(view.state)?.surface ?? null;
            if (surfaceKey(measured) === surfaceKey(current)) return;

            // Measuring can be triggered from inside the view's own lifecycle
            // or from a MutationObserver microtask, and dispatching there would
            // re-enter ProseMirror's update. Deferring lets the stack unwind.
            scheduled = true;
            queueMicrotask(() => {
              scheduled = false;
              if (destroyed) return;

              const latest = readSurfaceColor(view.dom instanceof HTMLElement ? view.dom : null);
              const state = lowContrastTextHintKey.getState(view.state)?.surface ?? null;
              if (surfaceKey(latest) === surfaceKey(state)) return;

              view.dispatch(
                view.state.tr
                  .setMeta(lowContrastTextHintKey, { surface: latest } satisfies LowContrastMeta)
                  // This transaction carries no steps and must never look like
                  // an edit: keeping it out of history stops an undo from
                  // "undoing" a theme switch.
                  .setMeta('addToHistory', false),
              );
            });
          };

          // Which colours are unreadable flips entirely between the light, dark
          // and 'vibrant' themes, so measuring once at mount is not enough.
          const observer =
            typeof MutationObserver === 'undefined' ? null : new MutationObserver(publishSurface);
          if (observer && typeof document !== 'undefined') {
            const observed: MutationObserverInit = {
              attributeFilter: ['class', 'style', 'data-theme'],
              attributes: true,
            };
            observer.observe(document.documentElement, observed);
            if (document.body) observer.observe(document.body, observed);
          }

          // A theme that follows the OS changes no attribute at all.
          const media =
            typeof window !== 'undefined' && typeof window.matchMedia === 'function'
              ? window.matchMedia('(prefers-color-scheme: dark)')
              : null;
          media?.addEventListener?.('change', publishSurface);

          publishSurface();

          return {
            destroy() {
              destroyed = true;
              observer?.disconnect();
              media?.removeEventListener?.('change', publishSurface);
            },
          };
        },
      }),
    ];
  },
});

export default LowContrastTextHint;
