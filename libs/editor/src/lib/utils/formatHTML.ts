// Lightweight HTML formatter focused on readability inside the Source modal.
// It avoids changing content inside <pre>, <code>, <script>, and <style> blocks.
// Note: This is a best‑effort formatter and won’t match Prettier’s fidelity,
// but keeps bundle size small and is safe for typical Tiptap content.

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr'
]);

const BLOCK_TAGS = new Set([
  'address','article','aside','blockquote','canvas','dd','div','dl','dt','fieldset','figcaption',
  'figure','footer','form','h1','h2','h3','h4','h5','h6','header','hr','li','main','nav','noscript',
  'ol','p','pre','section','table','tfoot','ul','video','thead','tbody','tr','th','td','colgroup'
]);

function getTagName(tag: string): string | null {
  const m = tag.match(/^<\/?\s*([a-zA-Z0-9:-]+)/);
  return m ? m[1].toLowerCase() : null;
}

function isOpeningTag(tag: string): boolean {
  return /^<\s*[^/!][^>]*>$/.test(tag);
}

function isClosingTag(tag: string): boolean {
  return /^<\s*\//.test(tag);
}

function isSelfClosing(tag: string): boolean {
  if (/\/\s*>$/.test(tag)) return true;
  const name = getTagName(tag);
  return name ? VOID_TAGS.has(name) : false;
}

function isComment(tag: string): boolean {
  return /^<\s*!/.test(tag);
}

export function formatHTML(input: string, indentSize = 2): string {
  if (!input) return '';

  // Normalize line endings and collapse trivial whitespace outside protected blocks
  const tokens = input
    .replace(/\r\n?/g, '\n')
    .split(/(<[^>]+>)/g)
    .filter(Boolean);

  const indentUnit = ' '.repeat(indentSize);
  let indent = 0;
  const out: string[] = [];
  let inProtectedBlock: null | 'pre' | 'code' | 'script' | 'style' = null;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (tok.startsWith('<')) {
      const name = getTagName(tok);

      // Handle protected blocks
      if (name && (name === 'pre' || name === 'code' || name === 'script' || name === 'style')) {
        if (isClosingTag(tok)) {
          // Close protected block
          inProtectedBlock = null;
        }
      }

      // Decrease indent before closing tags (except if already zero)
      if (isClosingTag(tok)) {
        if (indent > 0) indent -= 1;
      }

      // Choose whether to force newline: block tags and comments prefer new lines
      const forceNewLine = (name && BLOCK_TAGS.has(name)) || isComment(tok);

      const line = `${(forceNewLine ? indentUnit.repeat(indent) : '')}${tok.trim()}`;
      if (forceNewLine) {
        out.push(line);
      } else {
        // For inline contexts, attach to previous token if text, otherwise new line
        const prev = out.length ? out[out.length - 1] : '';
        if (prev && !prev.endsWith('\n')) {
          out[out.length - 1] = prev + tok.trim();
        } else {
          out.push(indentUnit.repeat(indent) + tok.trim());
        }
      }

      // Increase indent after opening non-self-closing block tags
      if (name && isOpeningTag(tok) && !isSelfClosing(tok) && BLOCK_TAGS.has(name)) {
        indent += 1;
        if (name === 'pre' || name === 'code' || name === 'script' || name === 'style') {
          inProtectedBlock = name as any;
        }
      }
    } else {
      // Text node
      if (inProtectedBlock) {
        // Preserve as-is inside protected blocks
        const lines = tok.split('\n');
        for (const l of lines) {
          out.push(l);
        }
      } else {
        // Collapse runs of whitespace but DO NOT trim, so spaces
        // around inline tags (e.g., "a <span>title</span>") are preserved.
        const collapsed = tok.replace(/\s+/g, ' ');
        if (collapsed.length > 0) {
          const prev = out.length ? out[out.length - 1] : '';
          if (prev && !prev.endsWith('\n')) {
            // Continue on same line, keep leading/trailing single spaces
            out[out.length - 1] = prev + collapsed;
          } else {
            // New line context: drop leading spaces for cleanliness
            const text = collapsed.replace(/^ +/, '');
            if (text) {
              out.push(indentUnit.repeat(indent) + text);
            }
          }
        }
      }
    }
  }

  // Join with newlines and clean multiple blank lines
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

export default formatHTML;
