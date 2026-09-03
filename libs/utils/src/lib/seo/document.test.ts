import { describe, expect, it } from 'vitest';
import {
  buildSeoDocument,
  emptySeoDocument,
  getPhraseBlockBoundaries,
  isExternalHref,
  stripHtmlToSeoText,
  tokenizeWords,
} from './document';

const TIPTAP_DOC = {
  content: [
    { attrs: { level: 1 }, content: [{ text: 'Cat Food', type: 'text' }], type: 'heading' },
    {
      content: [
        { text: 'Buy ', type: 'text' },
        {
          marks: [{ attrs: { href: 'https://shop.example.com' }, type: 'link' }],
          text: 'cat food',
          type: 'text',
        },
        { text: ' today.', type: 'text' },
      ],
      type: 'paragraph',
    },
    { attrs: { alt: '', src: '/cat.png' }, type: 'image' },
  ],
  type: 'doc',
};

describe('tokenizeWords', () => {
  it('lowercases and splits on everything that is not a letter, number or apostrophe', () => {
    expect(tokenizeWords('Hello, World -- 42 times!')).toEqual(['hello', 'world', '42', 'times']);
  });

  it('keeps an internal apostrophe but strips the ones on the edges', () => {
    // A quoted word has to tokenise identically to a bare one, otherwise a
    // keyphrase would fail to match content that merely quotes it.
    expect(tokenizeWords("don't stop 'quoted' words")).toEqual([
      "don't",
      'stop',
      'quoted',
      'words',
    ]);
  });

  it('treats a curly apostrophe as an apostrophe rather than a word break', () => {
    expect(tokenizeWords('don’t')).toEqual(["don't"]);
  });

  it('supports unicode letters', () => {
    expect(tokenizeWords('Café naïve Ünterstützung')).toEqual([
      'café',
      'naïve',
      'ünterstützung',
    ]);
  });

  it('drops tokens that survive as punctuation only', () => {
    expect(tokenizeWords("--- ''' ---")).toEqual([]);
  });

  it('returns nothing for empty input', () => {
    expect(tokenizeWords('')).toEqual([]);
  });
});

describe('isExternalHref', () => {
  it('recognises absolute and protocol-relative hrefs', () => {
    expect(isExternalHref('https://example.com')).toBe(true);
    expect(isExternalHref('HTTP://example.com')).toBe(true);
    expect(isExternalHref('//example.com/x')).toBe(true);
  });

  it('treats a site-relative href as internal', () => {
    expect(isExternalHref('/blog/post')).toBe(false);
    expect(isExternalHref('blog/post')).toBe(false);
    expect(isExternalHref('')).toBe(false);
  });
});

describe('stripHtmlToSeoText', () => {
  it('inserts whitespace where a block tag was, so adjacent paragraphs do not glue together', () => {
    // This is the bug the whole block/inline distinction exists to prevent: a
    // naive tag strip turns this into "the end.The next", which corrupts the
    // word count, the sentence split and every keyword match at once.
    expect(stripHtmlToSeoText('<p>the end.</p><p>The next</p>')).toBe('the end. The next');
  });

  it('does not insert whitespace where an inline tag was', () => {
    expect(stripHtmlToSeoText('<p>a <em>b</em>c</p>')).toBe('a bc');
    expect(stripHtmlToSeoText('<p>the <strong>cat</strong>s tail</p>')).toBe('the cats tail');
  });

  it('drops script and style bodies entirely', () => {
    expect(
      stripHtmlToSeoText('<p>Before</p><script>var glued = 1;</script><style>p{color:red}</style><p>After</p>')
    ).toBe('Before After');
  });

  it('decodes named and numeric entities', () => {
    expect(stripHtmlToSeoText('<p>Tom &amp; Jerry &lt;3 &#39;quoted&#39;&nbsp;&#x41;</p>')).toBe(
      "Tom & Jerry <3 'quoted' A"
    );
  });

  it('leaves an undecodable numeric escape as literal text instead of throwing', () => {
    expect(stripHtmlToSeoText('<p>&#99999999999;</p>')).toBe('&#99999999999;');
  });

  it('does not let a > inside an attribute value truncate the tag', () => {
    // `[^>]*` cut the tag at the first '>', which left the tail of the markup
    // behind as literal text and polluted the word count and keyword density.
    expect(stripHtmlToSeoText('<p title="a > b">Hello</p>')).toBe('Hello');
    expect(stripHtmlToSeoText("<p title='a > b'>Hello</p>")).toBe('Hello');
  });

  it('still removes a tag whose quote is never closed', () => {
    // The quote-aware pattern cannot match this, so the lenient second sweep has
    // to, or raw markup would survive into the token stream.
    expect(stripHtmlToSeoText('<p class="broken>Hello</p>')).toBe('Hello');
  });
});

describe('buildSeoDocument with HTML input', () => {
  it('extracts headings, images, links, text and words', () => {
    const document = buildSeoDocument(
      '<h1>Cat Food Guide</h1><p>Buy the best <a href="/shop">cat food</a>.</p>' +
        '<img src="/cat.png" alt="A cat"><h2 class="sub">Why it matters</h2><p>Because.</p>'
    );

    expect(document.headings).toEqual([
      { level: 1, order: 0, text: 'Cat Food Guide' },
      { level: 2, order: 1, text: 'Why it matters' },
    ]);
    expect(document.images).toEqual([{ alt: 'A cat', src: '/cat.png' }]);
    expect(document.links).toEqual([{ external: false, href: '/shop', text: 'cat food' }]);
    expect(document.text).toBe('Cat Food Guide Buy the best cat food. Why it matters Because.');
    expect(document.words.slice(0, 4)).toEqual(['cat', 'food', 'guide', 'buy']);
  });

  it('keeps an empty heading so the audit can flag it', () => {
    const document = buildSeoDocument('<h2></h2><h3>   </h3><h4>Real</h4>');

    expect(document.headings).toEqual([
      { level: 2, order: 0, text: '' },
      { level: 3, order: 1, text: '' },
      { level: 4, order: 2, text: 'Real' },
    ]);
  });

  it('reads image attributes in any order and with either quoting style', () => {
    const document = buildSeoDocument(
      "<img src='/a.png' alt='A cat'><img alt=\"\" src=\"/b.png\"><img src=/c.png>"
    );

    expect(document.images).toEqual([
      { alt: 'A cat', src: '/a.png' },
      { alt: '', src: '/b.png' },
      { alt: '', src: '/c.png' },
    ]);
  });

  it('does not mistake data-src for src', () => {
    // A bare word boundary would match here, because a hyphen is a non-word
    // character, and the audit would then report the lazy-loading placeholder.
    const document = buildSeoDocument('<img data-src="/lazy.png" src="/real.png" alt="Real">');

    expect(document.images).toEqual([{ alt: 'Real', src: '/real.png' }]);
  });

  it('reads an alt that contains a > without reporting it as missing', () => {
    // The truncating matcher cut this tag after `a `, so alt read as the empty
    // string and the audit raised a missing-alt failure the author could see was
    // untrue — while `b" src="x.png"` leaked into the word stream.
    const document = buildSeoDocument('<p>Start</p><img alt="a > b" src="/x.png"><p>End</p>');

    expect(document.images).toEqual([{ alt: 'a > b', src: '/x.png' }]);
    expect(document.words).toEqual(['start', 'end']);
  });

  it('keeps a heading and a link intact when an attribute contains a >', () => {
    const document = buildSeoDocument(
      '<h2 title="a > b">Why it matters</h2><a href="/shop" title="buy > now">Shop</a>'
    );

    expect(document.headings).toEqual([{ level: 2, order: 0, text: 'Why it matters' }]);
    expect(document.links).toEqual([{ external: false, href: '/shop', text: 'Shop' }]);
  });

  it('marks absolute and protocol-relative links as external and skips bare anchors', () => {
    const document = buildSeoDocument(
      '<a href="https://example.com">Example</a><a href="/local">Local</a>' +
        '<a href="//cdn.example.com/x">CDN</a><a name="jump">Anchor</a>'
    );

    expect(document.links).toEqual([
      { external: true, href: 'https://example.com', text: 'Example' },
      { external: false, href: '/local', text: 'Local' },
      { external: true, href: '//cdn.example.com/x', text: 'CDN' },
    ]);
  });
});

describe('buildSeoDocument with Tiptap input', () => {
  it('reads an already-parsed Tiptap document', () => {
    const document = buildSeoDocument(TIPTAP_DOC);

    expect(document.headings).toEqual([{ level: 1, order: 0, text: 'Cat Food' }]);
    expect(document.images).toEqual([{ alt: '', src: '/cat.png' }]);
    expect(document.links).toEqual([
      { external: true, href: 'https://shop.example.com', text: 'cat food' },
    ]);
    expect(document.text).toBe('Cat Food Buy cat food today.');
    expect(document.words).toEqual(['cat', 'food', 'buy', 'cat', 'food', 'today']);
  });

  it('reads the same document when it arrives JSON-stringified', () => {
    // This is the case that actually ships: a text block's html_content column
    // holds a stringified Tiptap doc whenever the content was authored in the
    // Notion-style editor, and raw HTML when it was imported.
    expect(buildSeoDocument(JSON.stringify(TIPTAP_DOC))).toEqual(buildSeoDocument(TIPTAP_DOC));
  });

  it('accepts a bare content array', () => {
    const document = buildSeoDocument(TIPTAP_DOC.content);

    expect(document.text).toBe('Cat Food Buy cat food today.');
  });

  it('separates block nodes so their words do not glue together', () => {
    const document = buildSeoDocument({
      content: [
        { content: [{ text: 'the end.', type: 'text' }], type: 'paragraph' },
        { content: [{ text: 'The next', type: 'text' }], type: 'paragraph' },
      ],
      type: 'doc',
    });

    expect(document.text).toBe('the end. The next');
  });

  it('does not separate adjacent text nodes inside one paragraph', () => {
    // Tiptap splits a styled run into its own text node, so joining fragments
    // with a space would turn a bolded "cat" plus "s" into "cat s".
    const document = buildSeoDocument({
      content: [
        {
          content: [
            { text: 'the ', type: 'text' },
            { marks: [{ type: 'bold' }], text: 'cat', type: 'text' },
            { text: 's tail', type: 'text' },
          ],
          type: 'paragraph',
        },
      ],
      type: 'doc',
    });

    expect(document.text).toBe('the cats tail');
    expect(document.words).toEqual(['the', 'cats', 'tail']);
  });

  it('merges a link whose label is split across several text nodes', () => {
    const document = buildSeoDocument({
      content: [
        {
          content: [
            { marks: [{ attrs: { href: '/a' }, type: 'link' }], text: 'Read ', type: 'text' },
            {
              marks: [{ attrs: { href: '/a' }, type: 'link' }, { type: 'bold' }],
              text: 'more',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
      ],
      type: 'doc',
    });

    expect(document.links).toEqual([{ external: false, href: '/a', text: 'Read more' }]);
  });

  it('keeps an empty heading and defaults a missing level to 1', () => {
    const document = buildSeoDocument({
      content: [
        { attrs: {}, content: [{ text: 'Untyped', type: 'text' }], type: 'heading' },
        { attrs: { level: 3 }, content: [], type: 'heading' },
      ],
      type: 'doc',
    });

    expect(document.headings).toEqual([
      { level: 1, order: 0, text: 'Untyped' },
      { level: 3, order: 1, text: '' },
    ]);
  });

  it('extracts a link nested inside a heading exactly once', () => {
    const document = buildSeoDocument({
      content: [
        {
          attrs: { level: 2 },
          content: [
            { text: 'See ', type: 'text' },
            { marks: [{ attrs: { href: '/x' }, type: 'link' }], text: 'this', type: 'text' },
          ],
          type: 'heading',
        },
      ],
      type: 'doc',
    });

    expect(document.headings).toEqual([{ level: 2, order: 0, text: 'See this' }]);
    expect(document.links).toEqual([{ external: false, href: '/x', text: 'this' }]);
  });
});

describe('getPhraseBlockBoundaries', () => {
  it('records where one block ends and the next begins, in HTML', () => {
    const document = buildSeoDocument('<p>our coffee</p><p>beans are good</p>');

    // The word count and the token stream are untouched: the boundary lives in a
    // side table, so nothing that reads `words` sees an extra entry.
    expect(document.words).toEqual(['our', 'coffee', 'beans', 'are', 'good']);
    expect([...getPhraseBlockBoundaries(document)]).toEqual([2]);
  });

  it('records the same boundaries for the Tiptap path', () => {
    const document = buildSeoDocument({
      content: [
        { content: [{ text: 'our coffee', type: 'text' }], type: 'paragraph' },
        { content: [{ text: 'beans are good', type: 'text' }], type: 'paragraph' },
      ],
      type: 'doc',
    });

    expect(document.words).toEqual(['our', 'coffee', 'beans', 'are', 'good']);
    expect([...getPhraseBlockBoundaries(document)]).toEqual([2]);
  });

  it('counts a run of nested container breaks as one boundary', () => {
    const document = buildSeoDocument('<div><ul><li>one</li></ul></div><p>two</p>');

    expect([...getPhraseBlockBoundaries(document)]).toEqual([1]);
  });

  it('records no boundary inside a single block', () => {
    const document = buildSeoDocument('<p>our <strong>coffee</strong> beans</p>');

    expect(document.words).toEqual(['our', 'coffee', 'beans']);
    expect([...getPhraseBlockBoundaries(document)]).toEqual([]);
  });

  it('leaves words exactly what tokenising the text would have produced', () => {
    // The invariant the boundary work had to preserve: no sentinel ever reaches
    // `words` or `text`, so the word count, the density denominator and the
    // first-100-words window are the same numbers they were before.
    for (const html of [
      '<h1>Cat Food</h1><p>Buy the best <em>cat</em>s food.</p><ul><li>one</li><li>two</li></ul>',
      '<p>the end.</p><p>The next</p>',
      '<p>only one block</p>',
    ]) {
      const document = buildSeoDocument(html);

      expect(document.words).toEqual(tokenizeWords(document.text));
      expect(document.text).toBe(stripHtmlToSeoText(html));
    }
  });

  it('reports no boundaries for a document it did not build', () => {
    // A hand-built or JSON-round-tripped document is absent from the side table
    // and must degrade to the flat behaviour rather than throwing.
    expect([...getPhraseBlockBoundaries(emptySeoDocument())]).toEqual([]);
    expect([
      ...getPhraseBlockBoundaries(
        JSON.parse(JSON.stringify(buildSeoDocument('<p>a</p><p>b</p>')))
      ),
    ]).toEqual([]);
  });
});

describe('buildSeoDocument fallbacks', () => {
  it('falls back to the HTML reader when a brace-leading string is not valid JSON', () => {
    const document = buildSeoDocument('{ not really json <p>hello there</p>');

    expect(document.words).toEqual(['not', 'really', 'json', 'hello', 'there']);
  });

  it('returns an empty document for anything that is not HTML or Tiptap', () => {
    const empty = emptySeoDocument();

    expect(buildSeoDocument(null)).toEqual(empty);
    expect(buildSeoDocument(undefined)).toEqual(empty);
    expect(buildSeoDocument(42)).toEqual(empty);
    expect(buildSeoDocument(true)).toEqual(empty);
    expect(buildSeoDocument('')).toEqual(empty);
    expect(buildSeoDocument('   ')).toEqual(empty);
    expect(buildSeoDocument({ unrelated: 'object' })).toEqual(empty);
  });

  it('hands back a fresh empty document each time so callers cannot poison a shared one', () => {
    const first = emptySeoDocument();
    first.words.push('polluted');

    expect(emptySeoDocument().words).toEqual([]);
  });
});
