export type VideoPlatform = 'youtube' | 'twitch' | 'vimeo' | 'twitter' | 'streamable' | 'reddit';

export interface VideoEmbedInfo {
  platform: VideoPlatform;
  embedUrl: string;
  originalUrl: string;
  /** For Twitter, we use the widget JS instead of iframe — this holds the tweet ID */
  tweetId?: string;
}

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi|mkv|m4v|ogv)$/i;

// --- YouTube ---
// Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
const YOUTUBE_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?[^#\s]*v=([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
];

function matchYouTube(url: string): VideoEmbedInfo | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return {
        platform: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${match[1]}?origin=${encodeURIComponent(location.origin)}`,
        originalUrl: url,
      };
    }
  }
  return null;
}

// --- Twitch ---
// Matches: twitch.tv/videos/ID, clips.twitch.tv/SLUG, twitch.tv/CHANNEL/clip/SLUG
const TWITCH_VIDEO = /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/videos\/(\d+)/;
const TWITCH_CLIP_SUBDOMAIN = /(?:https?:\/\/)?clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/;
const TWITCH_CLIP_PATH = /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/[^/]+\/clip\/([a-zA-Z0-9_-]+)/;

function matchTwitch(url: string): VideoEmbedInfo | null {
  const videoMatch = url.match(TWITCH_VIDEO);
  if (videoMatch?.[1]) {
    return {
      platform: 'twitch',
      embedUrl: `https://player.twitch.tv/?video=${videoMatch[1]}&parent=${location.hostname}&autoplay=false`,
      originalUrl: url,
    };
  }

  const clipMatch = url.match(TWITCH_CLIP_SUBDOMAIN) || url.match(TWITCH_CLIP_PATH);
  if (clipMatch?.[1]) {
    return {
      platform: 'twitch',
      embedUrl: `https://clips.twitch.tv/embed?clip=${clipMatch[1]}&parent=${location.hostname}&autoplay=false`,
      originalUrl: url,
    };
  }

  return null;
}

// --- Vimeo ---
// Matches: vimeo.com/ID
const VIMEO_PATTERN = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/;

function matchVimeo(url: string): VideoEmbedInfo | null {
  const match = url.match(VIMEO_PATTERN);
  if (match?.[1]) {
    return {
      platform: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${match[1]}?dnt=1`,
      originalUrl: url,
    };
  }
  return null;
}

// --- Twitter / X ---
// Matches: twitter.com/USER/status/ID, x.com/USER/status/ID
const TWITTER_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/;

function matchTwitter(url: string): VideoEmbedInfo | null {
  const match = url.match(TWITTER_PATTERN);
  if (match?.[1]) {
    return {
      platform: 'twitter',
      embedUrl: url, // Twitter uses widget JS, not iframe
      originalUrl: url,
      tweetId: match[1],
    };
  }
  return null;
}

// --- Streamable ---
// Matches: streamable.com/SLUG
const STREAMABLE_PATTERN = /(?:https?:\/\/)?(?:www\.)?streamable\.com\/([a-zA-Z0-9]+)/;

function matchStreamable(url: string): VideoEmbedInfo | null {
  const match = url.match(STREAMABLE_PATTERN);
  if (match?.[1]) {
    // Don't match the /e/ embed URL itself to avoid double-embedding
    if (url.includes('/e/')) return null;
    return {
      platform: 'streamable',
      embedUrl: `https://streamable.com/e/${match[1]}`,
      originalUrl: url,
    };
  }
  return null;
}

// --- Reddit ---
// Matches: reddit.com/r/SUBREDDIT/comments/ID/...
const REDDIT_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:old\.)?reddit\.com\/r\/[^/]+\/comments\/([a-zA-Z0-9]+)/;

function matchReddit(url: string): VideoEmbedInfo | null {
  const match = url.match(REDDIT_PATTERN);
  if (match?.[1]) {
    return {
      platform: 'reddit',
      embedUrl: url, // Reddit embeds are unreliable — we'll render a link card instead
      originalUrl: url,
    };
  }
  return null;
}

/**
 * Scans message text for known video platform URLs and returns embed descriptors.
 * Returns at most `limit` results (default 5).
 */
export function extractVideoEmbeds(text: string, limit = 5): VideoEmbedInfo[] {
  // Extract all URLs from text
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const urls = text.match(urlRegex) || [];
  const results: VideoEmbedInfo[] = [];
  const seen = new Set<string>();

  for (const url of urls) {
    if (results.length >= limit) break;

    // Try each platform matcher in priority order
    const matchers = [matchYouTube, matchTwitch, matchVimeo, matchTwitter, matchStreamable, matchReddit];
    for (const matcher of matchers) {
      const embed = matcher(url);
      if (embed && !seen.has(embed.embedUrl)) {
        seen.add(embed.embedUrl);
        results.push(embed);
        break;
      }
    }
  }

  return results;
}

/**
 * Returns true if a filename has a video file extension.
 */
export function isVideoFileUrl(fileName: string): boolean {
  return VIDEO_EXTENSIONS.test(fileName);
}

// ============================================================================
// oEmbed metadata fetching
// ============================================================================

export interface VideoEmbedMetadata {
  title?: string;
  author?: string;
  thumbnailUrl?: string;
}

// In-memory cache to avoid refetching for the same URL
const metadataCache = new Map<string, VideoEmbedMetadata>();

/**
 * Fetches oEmbed metadata (title, author, thumbnail) for supported platforms.
 * Results are cached in memory. Returns empty object for unsupported platforms.
 */
export async function fetchEmbedMetadata(embed: VideoEmbedInfo): Promise<VideoEmbedMetadata> {
  const cached = metadataCache.get(embed.originalUrl);
  if (cached) return cached;

  let oEmbedUrl: string | null = null;

  if (embed.platform === 'youtube') {
    oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(embed.originalUrl)}&format=json`;
  } else if (embed.platform === 'vimeo') {
    oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(embed.originalUrl)}`;
  }

  if (!oEmbedUrl) {
    // Twitch/Streamable/Reddit/Twitter: extract what we can from the URL
    const fallback = extractMetadataFromUrl(embed);
    metadataCache.set(embed.originalUrl, fallback);
    return fallback;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(oEmbedUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return {};

    const data = await res.json();
    const metadata: VideoEmbedMetadata = {
      title: data.title,
      author: data.author_name,
      thumbnailUrl: data.thumbnail_url,
    };

    metadataCache.set(embed.originalUrl, metadata);
    return metadata;
  } catch {
    return {};
  }
}

/** Extracts basic metadata from URL patterns when oEmbed isn't available */
function extractMetadataFromUrl(embed: VideoEmbedInfo): VideoEmbedMetadata {
  if (embed.platform === 'twitch') {
    // Extract channel name from twitch.tv/CHANNEL/clip/...
    const channelMatch = embed.originalUrl.match(/twitch\.tv\/([^/]+)/);
    if (channelMatch?.[1] && channelMatch[1] !== 'videos') {
      return { author: channelMatch[1] };
    }
  }
  return {};
}
