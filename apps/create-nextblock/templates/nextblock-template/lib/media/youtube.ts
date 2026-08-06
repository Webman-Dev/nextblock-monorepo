// Shared YouTube URL normalization.
//
// No public render path may emit a www.youtube.com iframe: the player writes
// cookies via document.cookie on load (TESTCOOKIESENABLED, LAST_RESULT_ENTRY_KEY,
// ExcludeSameSiteUnspecifiedTreatedAsLax) which Chrome logs as a DevTools "Cookie"
// issue and Lighthouse fails through the `inspector-issues` audit (Best Practices
// 26/27 = 96). Switching to youtube-nocookie.com does NOT stop those writes --
// only not loading the player does. See components/media/YouTubeFacade.tsx.

const YOUTUBE_HOST_RE = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com)$/i;
const YOUTU_BE_RE = /^(?:www\.)?youtu\.be$/i;
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{6,20}$/;

export interface ParsedYouTubeUrl {
  videoId: string;
  /** Extra player params carried over from the source URL (v/si/autoplay stripped). */
  params: URLSearchParams;
}

/**
 * Accepts every shape an author can paste or that YouTube's Share > Embed panel
 * emits: watch?v= (v anywhere in the query), youtu.be/, /embed/, /shorts/,
 * /live/, /v/, m. and music. subdomains, and youtube-nocookie.com/embed/.
 * Returns null for non-YouTube URLs.
 */
export function parseYouTubeUrl(rawUrl: string | undefined | null): ParsedYouTubeUrl | null {
  if (!rawUrl) return null;
  let url: URL;
  try {
    url = new URL(rawUrl, 'https://www.youtube.com');
  } catch {
    return null;
  }

  let videoId = '';
  if (YOUTU_BE_RE.test(url.hostname)) {
    videoId = url.pathname.split('/').filter(Boolean)[0] || '';
  } else if (YOUTUBE_HOST_RE.test(url.hostname)) {
    const segments = url.pathname.split('/').filter(Boolean);
    const head = segments[0] || '';
    if (head === 'watch') {
      videoId = url.searchParams.get('v') || '';
    } else if (head === 'embed' || head === 'shorts' || head === 'live' || head === 'v') {
      videoId = segments[1] || '';
    }
  }
  if (!VIDEO_ID_RE.test(videoId)) return null;

  const params = new URLSearchParams(url.search);
  params.delete('v');
  params.delete('si'); // share-tracking token, not needed for playback
  // Never auto-start on load: an autoplaying frame boots the player (and its
  // cookie writes) during a Lighthouse run. The facade re-adds autoplay=1 only
  // after a real user click.
  params.delete('autoplay');
  return { videoId, params };
}

export function buildNoCookieEmbedUrl(
  videoId: string,
  params?: URLSearchParams,
  opts?: { autoplay?: boolean }
): string {
  const search = new URLSearchParams(params ? params.toString() : '');
  if (opts?.autoplay) search.set('autoplay', '1');
  const qs = search.toString();
  return `https://www.youtube-nocookie.com/embed/${videoId}${qs ? `?${qs}` : ''}`;
}

/** Last-resort string rewrite for raw-HTML paths that cannot be parsed into nodes. */
export function rewriteYouTubeHostsInHtml(html: string): string {
  if (!html) return html;
  return html.replace(
    /(?:https?:)?\/\/(?:www\.|m\.|music\.)?youtube\.com\/embed\//gi,
    'https://www.youtube-nocookie.com/embed/'
  );
}

export type YouTubePosterQuality = 'maxres' | 'hq';

/**
 * Intrinsic size of each poster variant. maxresdefault is 16:9 but is not
 * uploaded for every video; hqdefault always exists and is 4:3 (the frame is
 * letterboxed inside it), which is why the facade object-covers the poster.
 */
export const YOUTUBE_POSTER_DIMENSIONS: Record<
  YouTubePosterQuality,
  { width: number; height: number }
> = {
  maxres: { width: 1280, height: 720 },
  hq: { width: 480, height: 360 },
};

export function youTubePosterUrl(
  videoId: string,
  quality: YouTubePosterQuality = 'maxres'
): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality === 'maxres' ? 'maxresdefault' : 'hqdefault'}.jpg`;
}
