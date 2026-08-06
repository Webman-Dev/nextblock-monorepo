'use client';

import React, { useState } from 'react';
import { buildNoCookieEmbedUrl, youTubePosterUrl } from '../../lib/media/youtube';

interface YouTubeFacadeProps {
  videoId: string;
  title?: string;
  /** Serialized extra player params (from parseYouTubeUrl). */
  query?: string;
  /** Classes for the clickable surface / injected iframe. Defaults to filling its parent. */
  className?: string;
}

const FILL = 'absolute inset-0 h-full w-full';

/**
 * Click-to-play YouTube facade: renders a poster + play button and loads no
 * youtube.com resource at all until the user clicks. This is what keeps the
 * Lighthouse `inspector-issues` audit green -- the nocookie host still writes
 * cookies from the player JS, so the only reliable fix is not booting the
 * player during the audit. See lib/media/youtube.ts.
 */
const YouTubeFacade: React.FC<YouTubeFacadeProps> = ({ videoId, title, query, className }) => {
  const [activated, setActivated] = useState(false);
  const [poster, setPoster] = useState(() => youTubePosterUrl(videoId, 'maxres'));
  const label = title || 'YouTube video';
  const surface = className || FILL;

  if (activated) {
    return (
      <iframe
        className={surface}
        src={buildNoCookieEmbedUrl(videoId, new URLSearchParams(query || ''), { autoplay: true })}
        title={label}
        allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      aria-label={`Play video: ${label}`}
      className={`${surface} group flex items-center justify-center overflow-hidden border-0 bg-black p-0`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onError={() => setPoster(youTubePosterUrl(videoId, 'hq'))}
        className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
      />
      <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition group-hover:scale-110 group-hover:bg-red-600">
        <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" aria-hidden="true" focusable="false">
          <path d="M8 5v14l11-7z" fill="currentColor" />
        </svg>
      </span>
    </button>
  );
};

export default YouTubeFacade;
