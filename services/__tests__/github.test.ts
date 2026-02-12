import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Module-level cache means we need to re-import between some tests
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('github service', () => {
  let fetchGitHubReleases: typeof import('../github').fetchGitHubReleases;
  let fetchGitHubEvents: typeof import('../github').fetchGitHubEvents;

  beforeEach(async () => {
    vi.resetModules();
    mockFetch.mockReset();
    // Fresh import to reset module-level cache
    const mod = await import('../github');
    fetchGitHubReleases = mod.fetchGitHubReleases;
    fetchGitHubEvents = mod.fetchGitHubEvents;
  });

  describe('fetchGitHubReleases', () => {
    it('fetches and transforms releases into Message format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 101,
            tag_name: 'v2.1.0',
            name: 'Pisscord v2.1.0',
            body: 'Stabilization release',
            published_at: '2026-02-11T00:00:00Z',
            html_url: 'https://github.com/jamditis/pisscord/releases/tag/v2.1.0',
            author: { login: 'jamditis', avatar_url: 'https://example.com/avatar.png' },
          },
        ],
      });

      const messages = await fetchGitHubReleases();
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('gh-101');
      expect(messages[0].sender).toBe('Pisscord Updates');
      expect(messages[0].content).toContain('Pisscord v2.1.0');
      expect(messages[0].content).toContain('v2.1.0');
      expect(messages[0].content).toContain('Stabilization release');
      expect(messages[0].isAi).toBe(false);
    });

    it('returns empty array on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
      const messages = await fetchGitHubReleases();
      expect(messages).toEqual([]);
    });

    it('returns empty array on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const messages = await fetchGitHubReleases();
      expect(messages).toEqual([]);
    });

    it('caches results for 10 minutes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: 101,
            tag_name: 'v2.1.0',
            name: 'v2.1.0',
            body: 'test',
            published_at: '2026-02-11T00:00:00Z',
            html_url: 'https://example.com',
            author: { login: 'test', avatar_url: '' },
          },
        ],
      });

      await fetchGitHubReleases(); // first call
      await fetchGitHubReleases(); // second call — should use cache

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchGitHubEvents', () => {
    it('transforms PushEvent into message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            type: 'PushEvent',
            id: 'evt-1',
            actor: { login: 'jamditis', avatar_url: 'https://example.com/avatar.png' },
            created_at: '2026-02-11T12:00:00Z',
            payload: {
              ref: 'refs/heads/master',
              size: 2,
              commits: [
                { message: 'Fix auth bug' },
                { message: 'Update tests' },
              ],
            },
          },
        ],
      });

      const messages = await fetchGitHubEvents();
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('gh-evt-evt-1');
      expect(messages[0].sender).toBe('jamditis');
      expect(messages[0].content).toContain('Pushed 2 commits');
      expect(messages[0].content).toContain('master');
      expect(messages[0].content).toContain('Fix auth bug');
      expect(messages[0].content).toContain('Update tests');
    });

    it('transforms IssuesEvent into message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            type: 'IssuesEvent',
            id: 'evt-2',
            actor: { login: 'contributor', avatar_url: 'https://example.com/a.png' },
            created_at: '2026-02-11T10:00:00Z',
            payload: {
              action: 'opened',
              issue: { title: 'Voice not working', number: 42, html_url: 'https://github.com/jamditis/pisscord/issues/42' },
            },
          },
        ],
      });

      const messages = await fetchGitHubEvents();
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain('Issue opened');
      expect(messages[0].content).toContain('Voice not working');
      expect(messages[0].content).toContain('#42');
    });

    it('filters out ReleaseEvent and unknown event types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            type: 'ReleaseEvent',
            id: 'evt-3',
            actor: { login: 'test', avatar_url: '' },
            created_at: '2026-02-11T00:00:00Z',
          },
          {
            type: 'WatchEvent',
            id: 'evt-4',
            actor: { login: 'star-user', avatar_url: '' },
            created_at: '2026-02-11T00:00:00Z',
          },
        ],
      });

      const messages = await fetchGitHubEvents();
      expect(messages).toHaveLength(0);
    });

    it('returns empty array on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      const messages = await fetchGitHubEvents();
      expect(messages).toEqual([]);
    });

    it('returns empty array on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const messages = await fetchGitHubEvents();
      expect(messages).toEqual([]);
    });

    it('caches results for 10 minutes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            type: 'PushEvent',
            id: 'evt-1',
            actor: { login: 'test', avatar_url: '' },
            created_at: '2026-02-11T00:00:00Z',
            payload: { ref: 'refs/heads/main', size: 1, commits: [{ message: 'test' }] },
          },
        ],
      });

      await fetchGitHubEvents();
      await fetchGitHubEvents();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('includes attachment with avatar URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            type: 'PushEvent',
            id: 'evt-5',
            actor: { login: 'dev', avatar_url: 'https://avatars.githubusercontent.com/u/123' },
            created_at: '2026-02-11T00:00:00Z',
            payload: { ref: 'refs/heads/main', size: 1, commits: [{ message: 'commit' }] },
          },
        ],
      });

      const messages = await fetchGitHubEvents();
      expect(messages[0].attachment).toBeDefined();
      expect(messages[0].attachment?.type).toBe('image');
      expect(messages[0].attachment?.url).toBe('https://avatars.githubusercontent.com/u/123');
    });
  });
});
