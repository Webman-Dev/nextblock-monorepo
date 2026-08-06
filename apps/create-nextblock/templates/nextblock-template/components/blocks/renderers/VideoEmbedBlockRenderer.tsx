import React from "react";
import type { VideoEmbedBlockContent } from '../../../lib/blocks/blockRegistry';
import type { VisualEditAttributes } from "../../../lib/visual-editing/types";
import YouTubeFacade from "../../media/YouTubeFacade";
import { parseYouTubeUrl } from "../../../lib/media/youtube";

interface VideoEmbedBlockRendererProps {
  content: VideoEmbedBlockContent;
  languageId: number;
  visualEditAttributes?: VisualEditAttributes;
}

const VideoEmbedBlockRenderer: React.FC<VideoEmbedBlockRendererProps> = ({
  content,
  languageId,
  visualEditAttributes,
}) => {
  void languageId;
  if (!content.url) {
    if (!visualEditAttributes) {
      return null;
    }

    return (
      <div
        className="my-4 p-4 border rounded text-center text-muted-foreground italic"
        {...visualEditAttributes}
      >
        (Video block: URL missing)
      </div>
    );
  }

  // parseYouTubeUrl handles watch?v=, youtu.be/, /shorts/, /live/ and a pasted
  // /embed/ URL alike -- the old regex matched only the first two and returned
  // anything else verbatim, so YouTube's own Share > Embed string slipped through
  // as a cookie-setting www.youtube.com frame.
  const parsed = parseYouTubeUrl(content.url);
  const embedParams = new URLSearchParams(parsed ? parsed.params.toString() : '');
  if (content.controls === false) embedParams.set('controls', '0');
  // content.autoplay is intentionally NOT applied on load: an autoplaying frame
  // boots the YouTube player during a Lighthouse run and re-creates the Cookie
  // issue. The facade autoplays after the user clicks, which is the same UX.

  return (
    <div className="my-4" {...visualEditAttributes}>
      {content.title && (
        <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
      )}
      <div className="relative aspect-video">
        {parsed ? (
          <YouTubeFacade
            videoId={parsed.videoId}
            title={content.title}
            query={embedParams.toString()}
            className="absolute inset-0 h-full w-full rounded-lg"
          />
        ) : (
          <iframe
            src={content.url}
            title={content.title || "Video"}
            className="w-full h-full rounded-lg"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
          />
        )}
      </div>
    </div>
  );
};

export default VideoEmbedBlockRenderer;
