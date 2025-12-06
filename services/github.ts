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
let eventsCache: Message[] | null = null;
let lastFetchTime = 0;
let lastEventsFetchTime = 0;
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
      isAi: false, 
      content: `# ${release.name} (${release.tag_name})\n\n${release.body}\n\n[View on GitHub](${release.html_url})`,
    }));

    releaseCache = messages;
    lastFetchTime = Date.now();
    return messages;
  } catch (error) {
    console.error("GitHub Fetch Error:", error);
    return [];
  }
};

export const fetchGitHubEvents = async (): Promise<Message[]> => {
    if (eventsCache && Date.now() - lastEventsFetchTime < CACHE_TTL) {
        return eventsCache;
    }

    try {
        // Fetch Events (Push, Issues, etc.)
        const response = await fetch('https://api.github.com/repos/jamditis/pisscord/events');
        if (!response.ok) throw new Error('Failed to fetch events');
        
        const data: any[] = await response.json();
        
        const messages: Message[] = data.map(event => {
            let content = '';
            let title = '';
            
            switch(event.type) {
                case 'PushEvent':
                    title = `🔨 Pushed ${event.payload.size} commits to ${event.payload.ref.replace('refs/heads/', '')}`;
                    content = event.payload.commits.map((c: any) => `- ${c.message}`).join('\n');
                    break;
                case 'IssuesEvent':
                    title = `🐛 Issue ${event.payload.action}: ${event.payload.issue.title}`;
                    content = `[#${event.payload.issue.number}](${event.payload.issue.html_url})`;
                    break;
                case 'ReleaseEvent':
                    return null; // Handled by releases fetcher
                default:
                    return null;
            }

            if (!content && !title) return null;

            return {
                id: `gh-evt-${event.id}`,
                sender: event.actor.login,
                timestamp: new Date(event.created_at).getTime(),
                isAi: false,
                attachment: {
                    url: event.actor.avatar_url,
                    type: 'image',
                    name: 'avatar.png'
                }, // Hack: Use attachment to show avatar if we update ChatArea to use it? 
                   // Or just trust the name. 
                   // Actually, ChatArea uses 'sender' to find profile. 
                   // We can set sender to "GitHub: user"
                content: `**${title}**\n${content}`
            } as Message;
        }).filter(Boolean) as Message[];

        eventsCache = messages;
        lastEventsFetchTime = Date.now();
        return messages;
    } catch (error) {
        console.error("GitHub Events Error:", error);
        return [];
    }
};
