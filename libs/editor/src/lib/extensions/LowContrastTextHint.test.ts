import { Extension, getSchema } from '@tiptap/core';
import type { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';

import { editorExtensions } from '../kit';
import { LowContrastTextHint } from './LowContrastTextHint';

/**
 * The ProseMirror plugin itself needs a live `EditorView` and this workspace
 * has no DOM test environment, so it is deliberately a thin shell over the pure
 * `./low-contrast` module (tested next door) and is not unit tested here.
 *
 * What *is* tested is the one property that makes the feature safe to ship: the
 * hint is a view decoration and must not be able to reach the stored document.
 * `editor.getHTML()` is `getHTMLFromFragment(doc.content, schema)` and
 * `getJSON()` is `doc.toJSON()` - both are pure functions of the document and
 * the schema. The extension dispatches no transaction carrying a step, so the
 * document cannot change; these tests cover the other half by showing the
 * schema is byte-for-byte the same with and without the extension registered.
 */

/** The real kit as shipped, minus the extension under test. */
const withoutHint = editorExtensions.filter(
  (extension) => extension.name !== LowContrastTextHint.name,
);

/**
 * A serialisable fingerprint of everything `getHTML()` can depend on: the type
 * names, their attributes (including defaults), and the `toDOM` renderers that
 * actually produce the markup.
 */
function schemaFingerprint(schema: Schema): Record<string, unknown> {
  const describeSpecs = (
    specs: Record<string, { spec: { attrs?: Record<string, { default?: unknown }>; toDOM?: unknown } }>,
    prefix: string,
  ): Record<string, unknown> => {
    const fingerprint: Record<string, unknown> = {};
    for (const name of Object.keys(specs).sort()) {
      const spec = specs[name].spec;
      fingerprint[`${prefix}:${name}`] = {
        attrs: Object.entries(spec.attrs ?? {})
          .map(([attribute, definition]) => `${attribute}=${JSON.stringify(definition.default)}`)
          .sort(),
        toDOM: typeof spec.toDOM === 'function' ? spec.toDOM.toString() : String(spec.toDOM),
      };
    }
    return fingerprint;
  };

  return {
    ...describeSpecs(schema.nodes, 'node'),
    ...describeSpecs(schema.marks, 'mark'),
    topNode: schema.topNodeType.name,
  };
}

describe('LowContrastTextHint', () => {
  it('is registered in the shipped editor kit', () => {
    expect(editorExtensions.map((extension) => extension.name)).toContain('lowContrastTextHint');
    expect(withoutHint).toHaveLength(editorExtensions.length - 1);
  });

  it('leaves the ProseMirror schema identical, so getHTML/getJSON output cannot change', () => {
    expect(schemaFingerprint(getSchema(editorExtensions))).toEqual(
      schemaFingerprint(getSchema(withoutHint)),
    );
  });

  it('would notice a schema change, so the equality above is not vacuous', () => {
    // An equality assertion between two fingerprints is only worth anything if
    // the fingerprint is sensitive to the kind of change we are ruling out, so
    // a probe extension that does exactly what this one must never do is used
    // to prove the harness has teeth.
    const probe = Extension.create({
      name: 'lowContrastSchemaProbe',
      addGlobalAttributes() {
        return [{ types: ['paragraph'], attributes: { probe: { default: null } } }];
      },
    });

    expect(schemaFingerprint(getSchema([...editorExtensions, probe]))).not.toEqual(
      schemaFingerprint(getSchema(editorExtensions)),
    );
  });

  it('contributes no node, mark or attribute of its own', () => {
    // Restated at the level a reviewer can check at a glance: adding the
    // extension to a bare document schema must not introduce a single name.
    const bare = getSchema(withoutHint);
    const hinted = getSchema(editorExtensions);
    expect(Object.keys(hinted.nodes)).toEqual(Object.keys(bare.nodes));
    expect(Object.keys(hinted.marks)).toEqual(Object.keys(bare.marks));
  });

  it('exposes an opt-out and a configurable threshold', () => {
    expect(LowContrastTextHint.options).toEqual({
      enabled: true,
      maxDocumentSize: 60000,
      threshold: 4.5,
    });
    expect(LowContrastTextHint.configure({ enabled: false }).options.enabled).toBe(false);
    expect(LowContrastTextHint.configure({ threshold: 7 }).options.threshold).toBe(7);
  });
});
