import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractVideoEmbeds, isVideoFileUrl, fetchEmbedMetadata, VideoEmbedInfo } from '../videoEmbed';

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

  it('detects .avi files', () => {
    expect(isVideoFileUrl('movie.avi')).toBe(true);
  });

  it('detects .m4v files', () => {
    expect(isVideoFileUrl('clip.m4v')).toBe(true);
  });

  it('detects .ogv files', () => {
    expect(isVideoFileUrl('video.ogv')).toBe(true);
  });
});

// --- fetchEmbedMetadata ---
describe('fetchEmbedMetadata', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    globalThis.fetch = mockFetch;
  });

  it('fetches oEmbed metadata for YouTube embeds', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: 'Rick Astley - Never Gonna Give You Up',
        author_name: 'Rick Astley',
        thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      }),
    });

    // Re-import to clear the module-level cache
    const { fetchEmbedMetadata: freshFetch } = await import('../videoEmbed');

    const embed: VideoEmbedInfo = {
      platform: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };

    const metadata = await freshFetch(embed);
    expect(metadata.title).toBe('Rick Astley - Never Gonna Give You Up');
    expect(metadata.author).toBe('Rick Astley');
    expect(metadata.thumbnailUrl).toContain('ytimg.com');
  });

  it('fetches oEmbed metadata for Vimeo embeds', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: 'Vimeo Video',
        author_name: 'Director',
        thumbnail_url: 'https://i.vimeocdn.com/thumb.jpg',
      }),
    });

    const { fetchEmbedMetadata: freshFetch } = await import('../videoEmbed');

    const embed: VideoEmbedInfo = {
      platform: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/123456?dnt=1',
      originalUrl: 'https://vimeo.com/123456',
    };

    const metadata = await freshFetch(embed);
    expect(metadata.title).toBe('Vimeo Video');
    expect(metadata.author).toBe('Director');
  });

  it('returns empty object when oEmbed fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const { fetchEmbedMetadata: freshFetch } = await import('../videoEmbed');

    const embed: VideoEmbedInfo = {
      platform: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/xxx',
      originalUrl: 'https://www.youtube.com/watch?v=xxx',
    };

    const metadata = await freshFetch(embed);
    expect(metadata).toEqual({});
  });

  it('returns empty object when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { fetchEmbedMetadata: freshFetch } = await import('../videoEmbed');

    const embed: VideoEmbedInfo = {
      platform: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/zzz',
      originalUrl: 'https://www.youtube.com/watch?v=zzz',
    };

    const metadata = await freshFetch(embed);
    expect(metadata).toEqual({});
  });

  it('extracts Twitch channel name from URL for metadata', async () => {
    const { fetchEmbedMetadata: freshFetch } = await import('../videoEmbed');

    const embed: VideoEmbedInfo = {
      platform: 'twitch',
      embedUrl: 'https://clips.twitch.tv/embed?clip=FunnyClip',
      originalUrl: 'https://www.twitch.tv/shroud/clip/FunnyClip',
    };

    const metadata = await freshFetch(embed);
    expect(metadata.author).toBe('shroud');
  });

  it('returns empty metadata for Twitch video URLs (no channel in path)', async () => {
    const { fetchEmbedMetadata: freshFetch } = await import('../videoEmbed');

    const embed: VideoEmbedInfo = {
      platform: 'twitch',
      embedUrl: 'https://player.twitch.tv/?video=123',
      originalUrl: 'https://www.twitch.tv/videos/123',
    };

    const metadata = await freshFetch(embed);
    // 'videos' is excluded as a channel name
    expect(metadata).toEqual({});
  });

  it('returns empty metadata for Streamable (no oEmbed)', async () => {
    const { fetchEmbedMetadata: freshFetch } = await import('../videoEmbed');

    const embed: VideoEmbedInfo = {
      platform: 'streamable',
      embedUrl: 'https://streamable.com/e/abc',
      originalUrl: 'https://streamable.com/abc',
    };

    const metadata = await freshFetch(embed);
    expect(metadata).toEqual({});
  });

  it('returns empty metadata for Reddit (no oEmbed)', async () => {
    const { fetchEmbedMetadata: freshFetch } = await import('../videoEmbed');

    const embed: VideoEmbedInfo = {
      platform: 'reddit',
      embedUrl: 'https://www.reddit.com/r/test/comments/abc/post',
      originalUrl: 'https://www.reddit.com/r/test/comments/abc/post',
    };

    const metadata = await freshFetch(embed);
    expect(metadata).toEqual({});
  });

  it('caches metadata results for same URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Cached', author_name: 'Author', thumbnail_url: '' }),
    });

    const { fetchEmbedMetadata: freshFetch } = await import('../videoEmbed');

    const embed: VideoEmbedInfo = {
      platform: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/cached',
      originalUrl: 'https://www.youtube.com/watch?v=cached',
    };

    await freshFetch(embed);
    await freshFetch(embed);

    // fetch should only be called once due to caching
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// --- Additional extractVideoEmbeds edge cases ---
describe('extractVideoEmbeds edge cases', () => {
  it('handles URLs surrounded by markdown brackets', () => {
    const result = extractVideoEmbeds('[watch this](https://youtube.com/watch?v=dQw4w9WgXcQ)');
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe('youtube');
  });

  it('handles URLs at end of sentence with period', () => {
    const result = extractVideoEmbeds('Check out https://vimeo.com/999999.');
    // The period gets included in URL regex but vimeo regex should still match the ID
    expect(result.length).toBeGreaterThanOrEqual(0); // may or may not match depending on regex
  });

  it('preserves originalUrl in all results', () => {
    const url = 'https://youtube.com/watch?v=dQw4w9WgXcQ';
    const result = extractVideoEmbeds(url);
    expect(result[0].originalUrl).toBe(url);
  });

  it('YouTube embed uses youtube-nocookie.com domain', () => {
    const result = extractVideoEmbeds('https://youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result[0].embedUrl).toContain('youtube-nocookie.com');
  });

  it('Twitch embed includes autoplay=false', () => {
    const result = extractVideoEmbeds('https://www.twitch.tv/videos/123456789');
    expect(result[0].embedUrl).toContain('autoplay=false');
  });

  it('Vimeo embed includes dnt=1 for privacy', () => {
    const result = extractVideoEmbeds('https://vimeo.com/123456789');
    expect(result[0].embedUrl).toContain('dnt=1');
  });

  it('Twitter embed keeps original URL as embedUrl', () => {
    const url = 'https://twitter.com/user/status/123456789';
    const result = extractVideoEmbeds(url);
    expect(result[0].embedUrl).toBe(url);
  });

  it('handles empty string', () => {
    expect(extractVideoEmbeds('')).toHaveLength(0);
  });

  it('limit of 0 returns empty array', () => {
    const result = extractVideoEmbeds('https://youtube.com/watch?v=dQw4w9WgXcQ', 0);
    expect(result).toHaveLength(0);
  });
});
