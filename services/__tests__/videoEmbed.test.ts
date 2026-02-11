import { describe, it, expect } from 'vitest';
import { extractVideoEmbeds, isVideoFileUrl } from '../videoEmbed';

describe('extractVideoEmbeds', () => {
  // --- YouTube ---
  describe('YouTube', () => {
    it('matches standard watch URL', () => {
      const result = extractVideoEmbeds('check this out https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('youtube');
      expect(result[0].embedUrl).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('matches youtu.be short URL', () => {
      const result = extractVideoEmbeds('https://youtu.be/dQw4w9WgXcQ');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('youtube');
      expect(result[0].embedUrl).toContain('dQw4w9WgXcQ');
    });

    it('matches YouTube Shorts URL', () => {
      const result = extractVideoEmbeds('https://www.youtube.com/shorts/abcdefghijk');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('youtube');
      expect(result[0].embedUrl).toContain('abcdefghijk');
    });

    it('matches YouTube embed URL', () => {
      const result = extractVideoEmbeds('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('youtube');
    });

    it('handles watch URL with extra params', () => {
      const result = extractVideoEmbeds('https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=PLx');
      expect(result).toHaveLength(1);
      expect(result[0].embedUrl).toContain('dQw4w9WgXcQ');
    });
  });

  // --- Twitch ---
  describe('Twitch', () => {
    it('matches Twitch video URL', () => {
      const result = extractVideoEmbeds('https://www.twitch.tv/videos/123456789');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('twitch');
      expect(result[0].embedUrl).toContain('video=123456789');
    });

    it('matches clips.twitch.tv URL', () => {
      const result = extractVideoEmbeds('https://clips.twitch.tv/FunnyClipName-abc123');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('twitch');
      expect(result[0].embedUrl).toContain('clip=FunnyClipName-abc123');
    });

    it('matches twitch.tv/channel/clip/ URL', () => {
      const result = extractVideoEmbeds('https://www.twitch.tv/streamer/clip/CoolClip-xyz');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('twitch');
      expect(result[0].embedUrl).toContain('clip=CoolClip-xyz');
    });
  });

  // --- Vimeo ---
  describe('Vimeo', () => {
    it('matches Vimeo URL', () => {
      const result = extractVideoEmbeds('https://vimeo.com/123456789');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('vimeo');
      expect(result[0].embedUrl).toBe('https://player.vimeo.com/video/123456789?dnt=1');
    });

    it('matches www.vimeo.com URL', () => {
      const result = extractVideoEmbeds('https://www.vimeo.com/987654321');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('vimeo');
    });
  });

  // --- Twitter / X ---
  describe('Twitter / X', () => {
    it('matches twitter.com status URL', () => {
      const result = extractVideoEmbeds('https://twitter.com/user/status/1234567890123456789');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('twitter');
      expect(result[0].tweetId).toBe('1234567890123456789');
    });

    it('matches x.com status URL', () => {
      const result = extractVideoEmbeds('https://x.com/elonmusk/status/9876543210987654321');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('twitter');
      expect(result[0].tweetId).toBe('9876543210987654321');
    });
  });

  // --- Streamable ---
  describe('Streamable', () => {
    it('matches streamable.com URL', () => {
      const result = extractVideoEmbeds('https://streamable.com/abc123');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('streamable');
      expect(result[0].embedUrl).toBe('https://streamable.com/e/abc123');
    });

    it('does not double-embed /e/ URLs', () => {
      const result = extractVideoEmbeds('https://streamable.com/e/abc123');
      expect(result).toHaveLength(0);
    });
  });

  // --- Reddit ---
  describe('Reddit', () => {
    it('matches reddit post URL', () => {
      const result = extractVideoEmbeds('https://www.reddit.com/r/programming/comments/abc123/cool_post/');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('reddit');
    });

    it('matches old.reddit.com URL', () => {
      const result = extractVideoEmbeds('https://old.reddit.com/r/test/comments/xyz789/some_post');
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('reddit');
    });
  });

  // --- General behavior ---
  describe('general', () => {
    it('returns empty array for plain text', () => {
      expect(extractVideoEmbeds('hello world no links here')).toHaveLength(0);
    });

    it('returns empty for non-video URLs', () => {
      expect(extractVideoEmbeds('https://google.com')).toHaveLength(0);
    });

    it('extracts multiple embeds from one message', () => {
      const text = `check these:
        https://youtube.com/watch?v=dQw4w9WgXcQ
        https://vimeo.com/123456
        https://streamable.com/abc`;
      const result = extractVideoEmbeds(text);
      expect(result).toHaveLength(3);
      expect(result.map(r => r.platform)).toEqual(['youtube', 'vimeo', 'streamable']);
    });

    it('respects the limit parameter', () => {
      const text = `
        https://youtube.com/watch?v=aaaaaaaaaa1
        https://youtube.com/watch?v=aaaaaaaaaa2
        https://youtube.com/watch?v=aaaaaaaaaa3
      `;
      const result = extractVideoEmbeds(text, 2);
      expect(result).toHaveLength(2);
    });

    it('deduplicates identical embed URLs', () => {
      const text = `
        https://youtube.com/watch?v=dQw4w9WgXcQ
        https://www.youtube.com/watch?v=dQw4w9WgXcQ
      `;
      const result = extractVideoEmbeds(text);
      expect(result).toHaveLength(1);
    });
  });
});

describe('isVideoFileUrl', () => {
  it('detects .mp4 files', () => {
    expect(isVideoFileUrl('video.mp4')).toBe(true);
  });

  it('detects .webm files', () => {
    expect(isVideoFileUrl('clip.webm')).toBe(true);
  });

  it('detects .mov files', () => {
    expect(isVideoFileUrl('recording.MOV')).toBe(true);
  });

  it('detects .mkv files', () => {
    expect(isVideoFileUrl('movie.mkv')).toBe(true);
  });

  it('rejects non-video extensions', () => {
    expect(isVideoFileUrl('photo.png')).toBe(false);
    expect(isVideoFileUrl('document.pdf')).toBe(false);
    expect(isVideoFileUrl('song.mp3')).toBe(false);
  });

  it('rejects files without extension', () => {
    expect(isVideoFileUrl('noextension')).toBe(false);
  });
});
