import { editorBlockDocumentSchema } from '@nextblock-cms/utils/editor-blocks';
import { describe, expect, it } from 'vitest';

import { editorDocumentFromHtml } from './editor-document-from-html';

describe('editorDocumentFromHtml', () => {
  it('converts headings, paragraphs, and lists into editor nodes', () => {
    const doc = editorDocumentFromHtml(
      '<h2>Benefits</h2><p>Traditional herbal support.</p><ul><li>Kidney health</li><li>Ayurvedic botanical</li></ul>'
    );

    expect(doc).toEqual({
      content: [
        {
          attrs: { level: 2 },
          content: [{ text: 'Benefits', type: 'text' }],
          type: 'heading',
        },
        {
          content: [{ text: 'Traditional herbal support.', type: 'text' }],
          type: 'paragraph',
        },
        {
          content: [
            {
              content: [{ content: [{ text: 'Kidney health', type: 'text' }], type: 'paragraph' }],
              type: 'listItem',
            },
            {
              content: [
                { content: [{ text: 'Ayurvedic botanical', type: 'text' }], type: 'paragraph' },
              ],
              type: 'listItem',
            },
          ],
          type: 'bulletList',
        },
      ],
      type: 'doc',
    });
  });

  it('maps inline tags to marks and links', () => {
    const doc = editorDocumentFromHtml(
      '<p>Use <strong>daily</strong> and <em>consistently</em>. <a href="https://example.com/x">Learn more</a></p>'
    );
    const paragraph = doc?.content[0] as { content: any[] };

    expect(paragraph.content).toEqual([
      { text: 'Use ', type: 'text' },
      { marks: [{ type: 'bold' }], text: 'daily', type: 'text' },
      { text: ' and ', type: 'text' },
      { marks: [{ type: 'italic' }], text: 'consistently', type: 'text' },
      { text: '. ', type: 'text' },
      {
        marks: [{ attrs: { href: 'https://example.com/x', target: '_blank' }, type: 'link' }],
        text: 'Learn more',
        type: 'text',
      },
    ]);
  });

  it('handles nested markup, ordered lists, blockquotes, and rules', () => {
    const doc = editorDocumentFromHtml(
      '<div><section><h3>How to use</h3><ol><li>Take <b>one</b> capsule</li></ol><blockquote><p>Consult a practitioner.</p></blockquote><hr></section></div>'
    );
    const types = (doc?.content || []).map((node: any) => node.type);

    // Transparent wrappers (div/section) are flattened away.
    expect(types).toEqual(['heading', 'orderedList', 'blockquote', 'horizontalRule']);

    const listItem = (doc?.content[1] as any).content[0];
    expect(listItem.type).toBe('listItem');
    expect(listItem.content[0].content).toEqual([
      { text: 'Take ', type: 'text' },
      { marks: [{ type: 'bold' }], text: 'one', type: 'text' },
      { text: ' capsule', type: 'text' },
    ]);
  });

  it('drops scripts, styles, and empty nodes', () => {
    const doc = editorDocumentFromHtml(
      '<p>Real copy.</p><script>alert(1)</script><style>.a{color:red}</style><p>   </p><p></p>'
    );

    expect(doc?.content).toEqual([
      { content: [{ text: 'Real copy.', type: 'text' }], type: 'paragraph' },
    ]);
  });

  it('decodes entities without double-decoding ampersands', () => {
    const doc = editorDocumentFromHtml('<p>Herbs &amp; Roots &lt;tag&gt; &quot;quoted&quot;</p>');

    expect((doc?.content[0] as any).content[0].text).toBe('Herbs & Roots <tag> "quoted"');
  });

  it('treats plain text as paragraphs split on blank lines', () => {
    const doc = editorDocumentFromHtml('First paragraph.\n\nSecond paragraph\nwrapped line.');

    expect(doc?.content).toEqual([
      { content: [{ text: 'First paragraph.', type: 'text' }], type: 'paragraph' },
      { content: [{ text: 'Second paragraph wrapped line.', type: 'text' }], type: 'paragraph' },
    ]);
  });

  it('recovers text from markup it cannot map to blocks', () => {
    const doc = editorDocumentFromHtml('<img src="/a.jpg"><span>Loose text</span>');

    expect(doc?.content[0]).toMatchObject({ type: 'paragraph' });
    expect(JSON.stringify(doc)).toContain('Loose text');
  });

  it('returns null for empty or content-free input', () => {
    expect(editorDocumentFromHtml('')).toBeNull();
    expect(editorDocumentFromHtml('   ')).toBeNull();
    expect(editorDocumentFromHtml('<script>x()</script>')).toBeNull();
  });

  it('survives unclosed tags without dropping the copy', () => {
    const doc = editorDocumentFromHtml('<p>One<p>Two');
    const text = JSON.stringify(doc);

    expect(text).toContain('One');
    expect(text).toContain('Two');
  });

  it('unwraps a markdown code fence and an <html>/<body> wrapper', () => {
    const fenced = editorDocumentFromHtml('```html\n<p>Fenced copy.</p>\n```');
    expect(fenced?.content).toEqual([
      { content: [{ text: 'Fenced copy.', type: 'text' }], type: 'paragraph' },
    ]);

    const wrapped = editorDocumentFromHtml('<html><body><h1>Title</h1><p>Copy.</p></body></html>');
    expect((wrapped?.content || []).map((node: any) => node.type)).toEqual([
      'heading',
      'paragraph',
    ]);
  });

  // The tool's own validator is permissive, but the CMS Tiptap editor parses
  // this JSON when a human opens the product — anything the real editor schema
  // rejects would be silently dropped there.
  it('produces documents the real editor schema accepts', () => {
    const doc = editorDocumentFromHtml(
      [
        '<h2>Heading</h2>',
        '<p><strong>bold</strong> <em>italic</em> <u>underline</u> <s>strike</s> <code>code</code>',
        ' <mark>highlight</mark> <sub>sub</sub> <sup>sup</sup>',
        ' <a href="https://example.com">link</a></p>',
        '<ul><li>bullet</li></ul>',
        '<ol><li>ordered</li></ol>',
        '<blockquote><p>quote</p></blockquote>',
        '<pre>code block</pre>',
        '<hr>',
        '<p>line<br>break</p>',
      ].join('')
    );

    const result = editorBlockDocumentSchema.safeParse(doc);

    if (!result.success) {
      throw new Error(
        `Converter emitted nodes the editor rejects: ${JSON.stringify(result.error.issues, null, 2)}`
      );
    }

    expect(result.success).toBe(true);
  });

  it('does not recurse without bound on deeply nested markup', () => {
    const deep = `${'<div>'.repeat(80)}<p>Deep copy.</p>${'</div>'.repeat(80)}`;

    expect(() => editorDocumentFromHtml(deep)).not.toThrow();
  });
});
