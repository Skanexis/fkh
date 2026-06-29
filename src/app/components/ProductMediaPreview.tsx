import { useEffect, useState } from "react";
import { PlayCircle, Video } from "lucide-react";
import { ProductMedia } from "../data/products";

interface ProductMediaPreviewProps {
  media: ProductMedia;
  title: string;
  className?: string;
  iconSize?: number;
  showTypeBadge?: boolean;
  onImageError?: (url: string) => void;
}

export function ProductMediaPreview({
  media,
  title,
  className = "",
  iconSize = 28,
  showTypeBadge = true,
  onImageError,
}: ProductMediaPreviewProps) {
  const [posterFailed, setPosterFailed] = useState(false);
  const poster = media.type === "video" ? media.thumbnailUrl || undefined : undefined;

  useEffect(() => {
    setPosterFailed(false);
  }, [media.url, poster]);

  if (media.type === "image") {
    return (
      <img
        src={media.thumbnailUrl || media.url}
        alt={media.alt ?? title}
        className={className}
        onError={() => onImageError?.(media.url)}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {poster && !posterFailed ? (
        <img
          src={poster}
          alt={media.alt ?? title}
          className="h-full w-full object-cover"
          onError={() => {
            setPosterFailed(true);
            onImageError?.(poster);
          }}
        />
      ) : (
        <video
          src={videoPreviewSrc(media.url)}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
          aria-label={title}
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.02), rgba(0,0,0,0.45))" }}
      />
      <div
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{
          width: iconSize * 1.8,
          height: iconSize * 1.8,
          background: "rgba(11,11,12,0.62)",
          border: "1px solid rgba(255,77,109,0.48)",
          backdropFilter: "blur(10px)",
        }}
      >
        <PlayCircle size={iconSize} color="#FF4D6D" strokeWidth={1.8} />
      </div>
      {showTypeBadge && (
        <div
          className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{
            background: "rgba(11,11,12,0.76)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#FFFFFF",
            fontSize: 9,
            fontWeight: 800,
          }}
        >
          <Video size={11} color="#FF4D6D" />
          VIDEO
        </div>
      )}
    </div>
  );
}

function videoPreviewSrc(url: string) {
  return url.includes("#") ? url : `${url}#t=0.1`;
}
