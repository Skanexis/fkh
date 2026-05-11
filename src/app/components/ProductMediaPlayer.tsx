import { useEffect, useRef, useState } from "react";
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { ProductMedia } from "../data/products";

interface ProductMediaPlayerProps {
  media: ProductMedia;
  title: string;
}

export function ProductMediaPlayer({ media, title }: ProductMediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [media.url]);

  async function togglePlay() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      await video.play();
      setIsPlaying(true);
      return;
    }

    video.pause();
    setIsPlaying(false);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  async function requestFullscreen() {
    const video = videoRef.current;
    if (!video?.requestFullscreen) return;
    await video.requestFullscreen();
  }

  function seek(value: string) {
    const video = videoRef.current;
    if (!video) return;
    const nextTime = Number(value);
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <div className="absolute inset-0 bg-black">
      <video
        ref={videoRef}
        src={media.url}
        poster={media.thumbnailUrl ?? undefined}
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        onClick={() => void togglePlay()}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => setIsPlaying(false)}
      />

      <button
        type="button"
        onClick={() => void togglePlay()}
        aria-label={isPlaying ? "Pause video" : "Play video"}
        className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{
          width: 62,
          height: 62,
          background: "rgba(11,11,12,0.68)",
          border: "1px solid rgba(255,77,109,0.5)",
          boxShadow: "0 18px 45px rgba(0,0,0,0.5)",
          backdropFilter: "blur(12px)",
        }}
      >
        {isPlaying ? <Pause size={24} color="#FF4D6D" fill="#FF4D6D" /> : <Play size={26} color="#FF4D6D" fill="#FF4D6D" />}
      </button>

      <div
        className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-10"
        style={{ background: "linear-gradient(to top, rgba(11,11,12,0.95), rgba(11,11,12,0))" }}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p style={{ color: "#FFFFFF", fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title}
            </p>
            <p style={{ color: "#A0A0A0", fontSize: 11 }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute video" : "Mute video"}
              className="rounded-full p-2"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              {isMuted ? <VolumeX size={16} color="#FFFFFF" /> : <Volume2 size={16} color="#FFFFFF" />}
            </button>
            <button
              type="button"
              onClick={() => void requestFullscreen()}
              aria-label="Fullscreen video"
              className="rounded-full p-2"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <Maximize2 size={16} color="#FFFFFF" />
            </button>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || currentTime)}
          onChange={(event) => seek(event.target.value)}
          aria-label="Video progress"
          className="w-full"
          style={{ accentColor: "#FF4D6D" }}
        />
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
