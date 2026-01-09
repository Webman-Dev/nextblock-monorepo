import React from "react";
import { validateBlockContent, VideoEmbedBlockContent } from "@/lib/blocks/blockRegistry";

interface VideoEmbedBlockRendererProps {
  content: VideoEmbedBlockContent;
  languageId: number;
}

const VideoEmbedBlockRenderer: React.FC<VideoEmbedBlockRendererProps> = ({
  content,
  languageId,
}) => {
  void languageId;
  // Optional: Validate content against registry schema
  const validation = validateBlockContent("video_embed", content);
  if (!validation.isValid) {
    console.warn("Invalid video embed content:", validation.errors);
  }

  if (!content.url) {
    return null;
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
    <div className="my-4">
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
