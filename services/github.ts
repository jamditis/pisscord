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

interface GitHubActor {
  login: string;
  avatar_url: string;
}

interface GitHubPushEvent {
  type: 'PushEvent';
  id: string;
  actor: GitHubActor;
  created_at: string;
  payload: {
    ref: string;
    size: number;
    commits: Array<{ message: string }>;
  };
}

interface GitHubIssuesEvent {
  type: 'IssuesEvent';
  id: string;
  actor: GitHubActor;
  created_at: string;
  payload: {
    action: string;
    issue: { title: string; number: number; html_url: string };
  };
}

interface GitHubReleaseEvent {
  type: 'ReleaseEvent';
  id: string;
  actor: GitHubActor;
  created_at: string;
}

type GitHubEvent = GitHubPushEvent | GitHubIssuesEvent | GitHubReleaseEvent | { type: string; id: string; actor: GitHubActor; created_at: string };

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
        
        const data: GitHubEvent[] = await response.json();

        const messages: Message[] = data.map((event): Message | null => {
            let content = '';
            let title = '';

            switch(event.type) {
                case 'PushEvent': {
                    const push = event as GitHubPushEvent;
                    title = `🔨 Pushed ${push.payload.size} commits to ${push.payload.ref.replace('refs/heads/', '')}`;
                    content = push.payload.commits.map(c => `- ${c.message}`).join('\n');
                    break;
                }
                case 'IssuesEvent': {
                    const issue = event as GitHubIssuesEvent;
                    title = `🐛 Issue ${issue.payload.action}: ${issue.payload.issue.title}`;
                    content = `[#${issue.payload.issue.number}](${issue.payload.issue.html_url})`;
                    break;
                }
                case 'ReleaseEvent':
                    return null;
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
                    type: 'image' as const,
                    name: 'avatar.png'
                },
                content: `**${title}**\n${content}`
            };
        }).filter((m): m is Message => m !== null);

        eventsCache = messages;
        lastEventsFetchTime = Date.now();
        return messages;
    } catch (error) {
        console.error("GitHub Events Error:", error);
        return [];
    }
};
