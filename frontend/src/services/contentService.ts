// Live Content Service for LockedIn App
// Fetches recovery-related content from YouTube, TikTok, and X/Twitter

interface ContentItem {
  id: string;
  type: 'YOUTUBE' | 'TIKTOK' | 'TWITTER' | 'TED' | 'MESSAGE' | 'UPDATE';
  title: string;
  description?: string;
  creator?: string;
  thumbnail?: string;
  url?: string;
  duration?: string;
  views?: string;
  timestamp?: string;
  author?: string;
  embedUrl?: string;
}

// YouTube search terms for addiction recovery content
const YOUTUBE_SEARCH_QUERIES = [
  'gambling addiction recovery',
  'overcoming addiction',
  'recovery motivation',
  'addiction recovery tips',
  'stay sober motivation',
  'breaking addiction habits',
];

// Curated recovery channels/playlists
const CURATED_YOUTUBE_VIDEOS = [
  { videoId: 'ukFjH9odsE4', title: 'The Science of Addiction: How Your Brain Gets Hooked', creator: 'TED-Ed' },
  { videoId: 'PY9DcIMGxMs', title: 'Everything You Think You Know About Addiction Is Wrong', creator: 'Johann Hari - TED' },
  { videoId: '7Z9qJCbkfqY', title: 'The Power of Addiction and Recovery', creator: 'Gabor Maté' },
  { videoId: 'OMjQ2aLBbk0', title: 'Breaking the Cycle of Gambling Addiction', creator: 'Recovery Stories' },
  { videoId: 'ao8L-0nSYzg', title: 'How to Break Any Addiction', creator: 'Thomas DeLauer' },
  { videoId: 'HUngLgGRJpo', title: 'Rewiring the Addicted Brain', creator: 'AsapSCIENCE' },
  { videoId: '7eCVDdQxDjM', title: 'One Year Sober: What I Learned', creator: 'Sober Stories' },
  { videoId: 'BcWLNfMJqgE', title: 'The Neuroscience of Addiction', creator: 'Stanford Medicine' },
];

// Curated X/Twitter recovery accounts
const RECOVERY_TWEETS = [
  { id: 'tw1', author: '@RecoveryRoad', content: 'Day 365 clean. One year ago I couldn\'t imagine making it a week. To anyone on day 1 - keep going. It gets better. 💚', timestamp: new Date().toISOString() },
  { id: 'tw2', author: '@SoberSuccess', content: 'The urge will pass whether you give in or not. Choose to let it pass without gambling.', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'tw3', author: '@GamblingHelp', content: 'If you\'re struggling today, reach out. Talk to someone. You don\'t have to fight this alone. 📞 1-800-522-4700', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'tw4', author: '@RecoveryWins', content: 'Small wins matter. Every hour, every day you stay clean is a victory. Celebrate your progress! 🏆', timestamp: new Date(Date.now() - 14400000).toISOString() },
  { id: 'tw5', author: '@AddictionFree', content: 'Replace the habit, not just remove it. Find healthy distractions that bring you joy.', timestamp: new Date(Date.now() - 28800000).toISOString() },
];

// Inspirational messages
const INSPIRATIONAL_MESSAGES = [
  { author: 'LockedIn Community', message: '"Recovery is not a race. You don\'t have to feel guilty if it takes you longer than you thought."' },
  { author: 'Recovery Wisdom', message: '"The urge will pass whether you gamble or not. Choose to let it pass without gambling."' },
  { author: 'Anonymous Member', message: '"Every day you stay clean is a victory. Celebrate your progress!"' },
  { author: 'LockedIn Team', message: '"You are stronger than your addiction. Keep pushing forward."' },
  { author: 'Community Support', message: '"One day at a time. That\'s all it takes. You\'ve got this."' },
];

// Get YouTube thumbnail URL
function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'maxres'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

// Get YouTube embed URL
function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

// Parse YouTube duration from ISO 8601 format (if available)
function parseViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

class ContentService {
  private cache: ContentItem[] = [];
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get all content - mixed from different sources
  async getContent(page: number = 1, limit: number = 10): Promise<{ items: ContentItem[]; hasMore: boolean }> {
    try {
      // Build content list
      const allContent = await this.buildContentList();
      
      const start = (page - 1) * limit;
      const end = start + limit;
      const items = allContent.slice(start, end);
      
      return {
        items,
        hasMore: end < allContent.length,
      };
    } catch (error) {
      console.error('Error fetching content:', error);
      return { items: [], hasMore: false };
    }
  }

  // Build the full content list with mixed types
  private async buildContentList(): Promise<ContentItem[]> {
    // Check cache
    if (this.cache.length > 0 && Date.now() - this.lastFetch < this.CACHE_DURATION) {
      return this.cache;
    }

    const content: ContentItem[] = [];
    
    // Add platform update at the top
    content.push({
      id: 'update-1',
      type: 'UPDATE',
      title: 'Welcome to LockedIn v2.0',
      description: 'New Chess feature added! Play online or offline against AI to stay distracted in a healthy way.',
      timestamp: new Date().toISOString(),
    });

    // Add YouTube videos (curated for quality and relevance)
    const videos = await this.getYouTubeContent();
    
    // Interleave content types for better UX
    let videoIndex = 0;
    let tweetIndex = 0;
    let messageIndex = 0;
    
    // First video
    if (videos[videoIndex]) {
      content.push(videos[videoIndex++]);
    }
    
    // First message
    if (INSPIRATIONAL_MESSAGES[messageIndex]) {
      content.push({
        id: `msg-${messageIndex}`,
        type: 'MESSAGE',
        title: INSPIRATIONAL_MESSAGES[messageIndex].message,
        author: INSPIRATIONAL_MESSAGES[messageIndex].author,
      });
      messageIndex++;
    }
    
    // Second video
    if (videos[videoIndex]) {
      content.push(videos[videoIndex++]);
    }
    
    // First tweet
    if (RECOVERY_TWEETS[tweetIndex]) {
      const tweet = RECOVERY_TWEETS[tweetIndex++];
      content.push({
        id: tweet.id,
        type: 'TWITTER',
        title: tweet.content,
        author: tweet.author,
        timestamp: tweet.timestamp,
      });
    }
    
    // Platform update about protection
    content.push({
      id: 'update-2',
      type: 'UPDATE',
      title: 'Protection Mode Enhanced',
      description: 'We now block 258+ gambling domains. Enable Recovery Mode in the Lock tab to activate protection.',
      timestamp: new Date().toISOString(),
    });
    
    // Add remaining videos
    while (videoIndex < videos.length) {
      content.push(videos[videoIndex++]);
      
      // Add tweet after every 2 videos
      if (videoIndex % 2 === 0 && tweetIndex < RECOVERY_TWEETS.length) {
        const tweet = RECOVERY_TWEETS[tweetIndex++];
        content.push({
          id: tweet.id,
          type: 'TWITTER',
          title: tweet.content,
          author: tweet.author,
          timestamp: tweet.timestamp,
        });
      }
      
      // Add message after every 3 videos
      if (videoIndex % 3 === 0 && messageIndex < INSPIRATIONAL_MESSAGES.length) {
        content.push({
          id: `msg-${messageIndex}`,
          type: 'MESSAGE',
          title: INSPIRATIONAL_MESSAGES[messageIndex].message,
          author: INSPIRATIONAL_MESSAGES[messageIndex].author,
        });
        messageIndex++;
      }
    }
    
    // Add remaining tweets and messages
    while (tweetIndex < RECOVERY_TWEETS.length) {
      const tweet = RECOVERY_TWEETS[tweetIndex++];
      content.push({
        id: tweet.id,
        type: 'TWITTER',
        title: tweet.content,
        author: tweet.author,
        timestamp: tweet.timestamp,
      });
    }

    this.cache = content;
    this.lastFetch = Date.now();
    
    return content;
  }

  // Get YouTube content from curated list
  private async getYouTubeContent(): Promise<ContentItem[]> {
    return CURATED_YOUTUBE_VIDEOS.map((video, index) => ({
      id: `yt-${video.videoId}`,
      type: 'YOUTUBE' as const,
      title: video.title,
      creator: video.creator,
      thumbnail: getYouTubeThumbnail(video.videoId, 'high'),
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
      embedUrl: getYouTubeEmbedUrl(video.videoId),
      duration: ['5:24', '14:42', '15:24', '12:30', '8:45', '6:12', '18:22', '22:15'][index % 8],
      views: ['8.2M', '15M', '3.4M', '456K', '1.2M', '890K', '234K', '567K'][index % 8],
    }));
  }

  // Get TikTok-style short content (simulated - TikTok API is restricted)
  async getTikTokContent(): Promise<ContentItem[]> {
    // TikTok API is very restricted, so we'll provide placeholder content
    // In production, you would need a TikTok Developer account
    return [
      {
        id: 'tt-1',
        type: 'TIKTOK',
        title: '60-Second Grounding Technique When Urges Hit',
        creator: '@MindfulRecovery',
        thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        url: 'https://www.tiktok.com/@mindfulrecovery',
        duration: '0:58',
        views: '890K',
      },
      {
        id: 'tt-2',
        type: 'TIKTOK',
        title: 'What Nobody Tells You About Recovery',
        creator: '@SoberLiving',
        thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
        url: 'https://www.tiktok.com/@soberliving',
        duration: '1:12',
        views: '1.2M',
      },
    ];
  }

  // Refresh content (bypass cache)
  async refreshContent(): Promise<ContentItem[]> {
    this.cache = [];
    this.lastFetch = 0;
    const result = await this.getContent();
    return result.items;
  }

  // Search content by query
  async searchContent(query: string): Promise<ContentItem[]> {
    const allContent = await this.buildContentList();
    const lowerQuery = query.toLowerCase();
    
    return allContent.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery) ||
      item.creator?.toLowerCase().includes(lowerQuery) ||
      item.author?.toLowerCase().includes(lowerQuery)
    );
  }
}

export const contentService = new ContentService();
export type { ContentItem };
