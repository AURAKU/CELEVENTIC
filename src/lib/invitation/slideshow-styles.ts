export type SlideshowStyleId =
  | "classic-slideshow"
  | "fade-carousel"
  | "swipe-story"
  | "polaroid-stack"
  | "luxury-frame"
  | "floating-memories"
  | "fullscreen-video"
  | "magazine-collage"
  | "split-media"
  | "timeline-gallery";

export const SLIDESHOW_STYLE_OPTIONS: { id: SlideshowStyleId; label: string; description: string }[] = [
  { id: "classic-slideshow", label: "Classic slideshow", description: "Crossfade between full-width slides" },
  { id: "fade-carousel", label: "Fade carousel", description: "Smooth fade with dot navigation" },
  { id: "swipe-story", label: "Swipe story", description: "Vertical story-style slides" },
  { id: "polaroid-stack", label: "Polaroid stack", description: "Rotated polaroid frames" },
  { id: "luxury-frame", label: "Luxury frame gallery", description: "Gold-framed portrait slides" },
  { id: "floating-memories", label: "Floating memories", description: "Parallax floating photo cards" },
  { id: "fullscreen-video", label: "Full-screen video", description: "Immersive video background reel" },
  { id: "magazine-collage", label: "Magazine collage", description: "Editorial mixed-size grid" },
  { id: "split-media", label: "Split image/video", description: "Side-by-side media layout" },
  { id: "timeline-gallery", label: "Timeline gallery", description: "Chronological photo strip" },
];

export interface SlideshowSettings {
  style: SlideshowStyleId;
  slideDurationSec: number;
  transition: "fade" | "slide" | "zoom" | "none";
  showCaptions: boolean;
  autoplay: boolean;
}

export const DEFAULT_SLIDESHOW_SETTINGS: SlideshowSettings = {
  style: "fade-carousel",
  slideDurationSec: 4,
  transition: "fade",
  showCaptions: true,
  autoplay: true,
};
