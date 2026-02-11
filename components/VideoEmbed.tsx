import React, { useEffect, useRef, useState } from 'react';
import { VideoEmbedInfo } from '../services/videoEmbed';

// Platform icons and labels
const PLATFORM_META: Record<string, { icon: string; label: string; color: string }> = {
  youtube: { icon: 'fab fa-youtube', label: 'YouTube', color: '#FF0000' },
  twitch: { icon: 'fab fa-twitch', label: 'Twitch', color: '#9146FF' },
  vimeo: { icon: 'fab fa-vimeo-v', label: 'Vimeo', color: '#1AB7EA' },
  twitter: { icon: 'fab fa-twitter', label: 'Twitter', color: '#1DA1F2' },
  streamable: { icon: 'fas fa-play-circle', label: 'Streamable', color: '#0F90FA' },
  reddit: { icon: 'fab fa-reddit-alien', label: 'Reddit', color: '#FF4500' },
};

// Declare global twttr type
declare global {
  interface Window {
    twttr?: {
      widgets: {
        createTweet: (tweetId: string, container: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLElement>;
      };
    };
  }
}

// Load Twitter widget script once
let twitterScriptLoaded = false;
function loadTwitterWidgetScript(): Promise<void> {
  if (twitterScriptLoaded || window.twttr) {
    twitterScriptLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.onload = () => {
      twitterScriptLoaded = true;
      resolve();
    };
    script.onerror = () => resolve(); // Fail silently
    document.head.appendChild(script);
  });
}

interface VideoEmbedProps {
  embed: VideoEmbedInfo;
}

export const VideoEmbed: React.FC<VideoEmbedProps> = ({ embed }) => {
  const tweetContainerRef = useRef<HTMLDivElement>(null);
  const meta = PLATFORM_META[embed.platform] || PLATFORM_META.streamable;

  // Twitter tweet embedding via widget JS
  useEffect(() => {
    if (embed.platform !== 'twitter' || !embed.tweetId || !tweetContainerRef.current) return;

    const container = tweetContainerRef.current;
    let cancelled = false;

    loadTwitterWidgetScript().then(() => {
      if (cancelled || !window.twttr || !container) return;
      // Clear previous children safely (no innerHTML)
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      window.twttr.widgets.createTweet(embed.tweetId!, container, {
        theme: 'dark',
        dnt: true,
        width: 480,
      });
    });

    return () => { cancelled = true; };
  }, [embed.tweetId, embed.platform]);

  // Reddit: link card fallback (no reliable embed)
  if (embed.platform === 'reddit') {
    return (
      <a
        href={embed.originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full max-w-lg mt-2 bg-discord-dark/60 rounded-lg border border-discord-dark hover:border-discord-muted/40 transition-colors overflow-hidden"
      >
        <div className="flex items-center p-3 gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${meta.color}20` }}
          >
            <i className={`${meta.icon} text-lg`} style={{ color: meta.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-discord-link font-medium truncate">
              {embed.originalUrl}
            </div>
            <div className="text-xs text-discord-muted mt-0.5">
              Open on Reddit
            </div>
          </div>
          <i className="fas fa-external-link-alt text-discord-muted text-xs shrink-0" />
        </div>
      </a>
    );
  }

  // Twitter: use widget JS
  if (embed.platform === 'twitter') {
    return (
      <div className="w-full max-w-lg mt-2">
        <div className="flex items-center gap-1.5 mb-1">
          <i className={`${meta.icon} text-xs`} style={{ color: meta.color }} />
          <span className="text-[10px] text-discord-muted font-medium">{meta.label}</span>
        </div>
        <div ref={tweetContainerRef} className="min-h-[100px]">
          {/* Tweet loads here via widget JS */}
          <div className="bg-discord-dark/60 rounded-lg p-4 border border-discord-dark animate-pulse">
            <div className="h-4 bg-discord-muted/20 rounded w-3/4 mb-2" />
            <div className="h-4 bg-discord-muted/20 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // Standard iframe embed (YouTube, Twitch, Vimeo, Streamable)
  const [iframeFailed, setIframeFailed] = useState(false);

  if (iframeFailed) {
    // Fallback link card when iframe fails (e.g. Capacitor WebView restrictions)
    return (
      <a
        href={embed.originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full max-w-lg mt-2 bg-discord-dark/60 rounded-lg border border-discord-dark hover:border-discord-muted/40 transition-colors overflow-hidden"
      >
        <div className="flex items-center p-3 gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${meta.color}20` }}
          >
            <i className={`${meta.icon} text-lg`} style={{ color: meta.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-discord-link font-medium truncate">
              {embed.originalUrl}
            </div>
            <div className="text-xs text-discord-muted mt-0.5">
              Watch on {meta.label}
            </div>
          </div>
          <i className="fas fa-external-link-alt text-discord-muted text-xs shrink-0" />
        </div>
      </a>
    );
  }

  return (
    <div className="w-full max-w-lg mt-2">
      <div className="flex items-center gap-1.5 mb-1">
        <i className={`${meta.icon} text-xs`} style={{ color: meta.color }} />
        <span className="text-[10px] text-discord-muted font-medium">{meta.label}</span>
      </div>
      <div className="relative aspect-video bg-discord-dark rounded-lg overflow-hidden border border-discord-dark">
        <iframe
          src={embed.embedUrl}
          className="absolute inset-0 w-full h-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
          allowFullScreen
          title={`${meta.label} embed`}
          onError={() => setIframeFailed(true)}
        />
      </div>
    </div>
  );
};
