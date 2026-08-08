export type ToolKind = "file" | "youtube";

export interface ToolOption {
  key: string;
  label: string;
  type: "number" | "select" | "range" | "text";
  default?: string | number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  choices?: { value: string; label: string }[];
}

export interface ToolConfig {
  slug: string;
  name: string;
  tagline: string;
  icon: string;
  category: string;
  accent: string;
  kind: ToolKind;
  accepts: string;
  hint: string;
  options: ToolOption[];
}

export const TOOLS: ToolConfig[] = [
  {
    slug: "video-cutter",
    name: "Video Cutter",
    tagline: "Trim any video to a short clip with precise start time and duration.",
    icon: "✂",
    category: "Editing",
    accent: "#ff8fa3",
    kind: "file",
    accepts: "video/*",
    hint: "MP4, WebM, MOV, MKV",
    options: [
      { key: "start", label: "Start time", type: "number", default: 0, min: 0, step: 1, suffix: "sec" },
      { key: "duration", label: "Clip length", type: "number", default: 10, min: 1, max: 3600, step: 1, suffix: "sec" },
    ],
  },
  {
    slug: "video-crop",
    name: "Video Crop",
    tagline: "Crop out unwanted areas — sides, watermarks, or empty margins.",
    icon: "⌗",
    category: "Editing",
    accent: "#7c5cff",
    kind: "file",
    accepts: "video/*",
    hint: "MP4, WebM, MOV, MKV",
    options: [
      { key: "width", label: "Width", type: "range", default: 80, min: 10, max: 100, step: 5, suffix: "%" },
      { key: "height", label: "Height", type: "range", default: 80, min: 10, max: 100, step: 5, suffix: "%" },
      { key: "x", label: "Offset X", type: "range", default: 10, min: 0, max: 90, step: 5, suffix: "%" },
      { key: "y", label: "Offset Y", type: "range", default: 10, min: 0, max: 90, step: 5, suffix: "%" },
    ],
  },
  {
    slug: "video-compressor",
    name: "Video Compressor",
    tagline: "Shrink video file size for sharing while keeping good quality.",
    icon: "◧",
    category: "Editing",
    accent: "#ffb454",
    kind: "file",
    accepts: "video/*",
    hint: "MP4, WebM, MOV, MKV",
    options: [
      { key: "resolution", label: "Output resolution", type: "select", default: "Keep", choices: [
        { value: "Keep", label: "Keep original" },
        { value: "1080", label: "1080p" },
        { value: "720", label: "720p" },
        { value: "480", label: "480p" },
      ] },
      { key: "crf", label: "Quality", type: "range", default: 28, min: 18, max: 40, step: 1, suffix: "CRF" },
    ],
  },
  {
    slug: "mp3-converter",
    name: "MP3 Converter",
    tagline: "Extract audio from any video and save it as MP3.",
    icon: "♪",
    category: "Audio",
    accent: "#4cc9f0",
    kind: "file",
    accepts: "video/*,audio/*",
    hint: "MP4, WebM, MOV, MKV, MP3, WAV, M4A",
    options: [
      { key: "bitrate", label: "Audio quality", type: "select", default: "192", choices: [
        { value: "128", label: "128 kbps" },
        { value: "192", label: "192 kbps" },
        { value: "256", label: "256 kbps" },
        { value: "320", label: "320 kbps" },
      ] },
    ],
  },
  {
    slug: "audio-balancer",
    name: "Audio Balancer",
    tagline: "Normalize loudness to a consistent level for playback everywhere.",
    icon: "≡",
    category: "Audio",
    accent: "#3ddc97",
    kind: "file",
    accepts: "video/*,audio/*",
    hint: "MP4, MP3, WAV, M4A",
    options: [
      { key: "loudness", label: "Target loudness", type: "select", default: "-16", choices: [
        { value: "-14", label: "-14 LUFS (streaming)" },
        { value: "-16", label: "-16 LUFS (broadcast)" },
        { value: "-23", label: "-23 LUFS (EBU standard)" },
      ] },
    ],
  },
  {
    slug: "youtube-downloader",
    name: "YouTube Downloader",
    tagline: "Download any YouTube video as MP4 or audio as MP3.",
    icon: "⤓",
    category: "Download",
    accent: "#ff5d5d",
    kind: "youtube",
    accepts: "",
    hint: "Paste a YouTube link below",
    options: [
      { key: "format", label: "Output format", type: "select", default: "video", choices: [
        { value: "video", label: "Video (MP4)" },
        { value: "audio", label: "Audio (MP3)" },
      ] },
      { key: "quality", label: "Quality", type: "select", default: "720", choices: [
        { value: "1080", label: "1080p" },
        { value: "720", label: "720p" },
        { value: "480", label: "480p" },
      ] },
    ],
  },
  {
    slug: "thumbnail-generator",
    name: "Thumbnail Generator",
    tagline: "Extract evenly-spaced preview frames from any video as high-quality thumbnails.",
    icon: "🖼",
    category: "Editing",
    accent: "#5eead4",
    kind: "file",
    accepts: "video/*",
    hint: "MP4, WebM, MOV, MKV",
    options: [
      { key: "count", label: "Number of thumbnails", type: "range", default: 4, min: 1, max: 6, step: 1 },
      { key: "width", label: "Image width", type: "select", default: "640", choices: [
        { value: "480", label: "480px" },
        { value: "640", label: "640px" },
        { value: "1280", label: "1280px" },
      ] },
    ],
  },
  {
    slug: "subtitle-remover",
    name: "Subtitle Remover",
    tagline: "Cover burned-in subtitles with a clean overlay box.",
    icon: "▬",
    category: "Editing",
    accent: "#9a82ff",
    kind: "file",
    accepts: "video/*",
    hint: "MP4, WebM, MOV, MKV",
    options: [
      { key: "position", label: "Subtitle position", type: "select", default: "bottom", choices: [
        { value: "bottom", label: "Bottom" },
        { value: "top", label: "Top" },
      ] },
      { key: "area", label: "Cover area", type: "range", default: 15, min: 5, max: 40, step: 1, suffix: "%" },
    ],
  },
  {
    slug: "speech-enhancer",
    name: "Speech Enhancer",
    tagline: "Reduce background noise and sharpen voice clarity.",
    icon: "◉",
    category: "Audio",
    accent: "#ff7ec8",
    kind: "file",
    accepts: "video/*,audio/*",
    hint: "MP4, MP3, WAV, M4A",
    options: [
      { key: "strength", label: "Enhancement strength", type: "select", default: "normal", choices: [
        { value: "mild", label: "Mild — light denoise" },
        { value: "normal", label: "Normal — balanced" },
        { value: "strong", label: "Strong — heavy denoise" },
      ] },
    ],
  },
  {
    slug: "voice-changer",
    name: "Voice Changer",
    tagline: "Shift voice pitch in exact musical semitones — chipmunk to demon.",
    icon: "♬",
    category: "Audio",
    accent: "#00d4ff",
    kind: "file",
    accepts: "video/*,audio/*",
    hint: "MP4, MP3, WAV, M4A",
    options: [
      { key: "preset", label: "Voice preset", type: "select", default: "none", choices: [
        { value: "none", label: "Custom pitch" },
        { value: "chipmunk", label: "Chipmunk (+12 st)" },
        { value: "baby", label: "Baby (+7 st)" },
        { value: "normal", label: "Normal (0 st)" },
        { value: "deep", label: "Deep (-5 st)" },
        { value: "demon", label: "Demon (-12 st)" },
      ] },
      { key: "semitones", label: "Pitch shift", type: "range", default: 0, min: -12, max: 12, step: 1, suffix: "st" },
    ],
  },
];

export function getTool(slug: string): ToolConfig | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}
