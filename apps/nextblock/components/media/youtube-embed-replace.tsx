import React from 'react';
import { Element, type HTMLReactParserOptions } from 'html-react-parser';
import YouTubeFacade from './YouTubeFacade';
import { parseYouTubeUrl } from '../../lib/media/youtube';

/**
 * html-react-parser `replace` helper: swaps any YouTube <iframe> for a
 * click-to-play facade (zero third-party requests on load) and forces
 * loading="lazy" on every other third-party frame.
 * Returns undefined to let the parser render the node normally.
 */
export function replaceYouTubeIframe(domNode: Element): React.ReactElement | undefined {
  if (domNode.name !== 'iframe' || !domNode.attribs) return undefined;
  const parsed = parseYouTubeUrl(domNode.attribs.src);
  if (!parsed) {
    if (!domNode.attribs.loading) domNode.attribs.loading = 'lazy';
    return undefined;
  }
  return (
    <YouTubeFacade
      videoId={parsed.videoId}
      title={domNode.attribs.title}
      query={parsed.params.toString()}
      className={domNode.attribs.class}
    />
  );
}

/** Minimal parser options for raw-HTML surfaces that only need embed safety. */
export const embedSafeParserOptions: HTMLReactParserOptions = {
  replace: (domNode) => (domNode instanceof Element ? replaceYouTubeIframe(domNode) : undefined),
};
