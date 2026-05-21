import React from "react";
import type { VideoEmbedBlockContent } from '../../../lib/blocks/blockRegistry';
import type { VisualEditAttributes } from "../../../lib/visual-editing/types";

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

  // Convert YouTube URLs to embed format
  const getEmbedUrl = (url: string) => {
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(youtubeRegex);
    
    if (match) {
      const videoId = match[1];
      const params = new URLSearchParams();
      if (content.autoplay) params.set('autoplay', '1');
      if (!content.controls) params.set('controls', '0');
      
      return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    }
    
    return url; // Return original URL if not YouTube
  };

  return (
    <div className="my-4" {...visualEditAttributes}>
      {content.title && (
        <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
      )}
      <div className="relative aspect-video">
        <iframe
          src={getEmbedUrl(content.url)}
          title={content.title || "Video"}
          className="w-full h-full rounded-lg"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default VideoEmbedBlockRenderer;
