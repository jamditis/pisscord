import { Message } from '../types';

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  author: {
    login: string;
    avatar_url: string;
  };
}

// Cache to prevent rate limiting
let releaseCache: Message[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const fetchGitHubReleases = async (): Promise<Message[]> => {
  if (releaseCache && Date.now() - lastFetchTime < CACHE_TTL) {
    return releaseCache;
  }

  try {
    const response = await fetch('https://api.github.com/repos/jamditis/pisscord/releases');
    if (!response.ok) throw new Error('Failed to fetch releases');
    
    const data: GitHubRelease[] = await response.json();
    
    const messages: Message[] = data.map(release => ({
      id: `gh-${release.id}`,
      sender: 'Pisscord Updates',
      timestamp: new Date(release.published_at).getTime(),
      isAi: false, // Render as normal user or special system? Let's use normal but maybe with a special avatar logic in ChatArea if possible, or just use the sender name.
      content: `# ${release.name} (${release.tag_name})\n\n${release.body}\n\n[View on GitHub](${release.html_url})`,
      // We can't easily set a custom avatar per message in the current type without `attachment` or profile lookup.
      // But we can use the `attachment` field to hack in an image if we wanted, or just rely on the name.
      // For now, let's just use text.
    }));

    releaseCache = messages;
    lastFetchTime = Date.now();
    return messages;
  } catch (error) {
    console.error("GitHub Fetch Error:", error);
    return [];
  }
};
