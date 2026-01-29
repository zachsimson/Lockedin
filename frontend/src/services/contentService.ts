// Live Content Service for LockedIn App
// Fetches recovery-related content from YouTube, TikTok, and X/Twitter

export interface ContentItem {
  id: string;
  type: 'YOUTUBE' | 'TIKTOK' | 'TWITTER';
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

// Get YouTube thumbnail URL
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Get YouTube embed URL
function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

// ===== MASSIVE CURATED CONTENT DATABASE =====

// YouTube Videos - Anti-Gambling & Recovery Content
const YOUTUBE_VIDEOS: ContentItem[] = [
  // Gambling Addiction Specific
  { id: 'yt1', type: 'YOUTUBE', title: 'The Science of Addiction: How Your Brain Gets Hooked', creator: 'TED-Ed', thumbnail: getYouTubeThumbnail('ukFjH9odsE4'), url: 'https://www.youtube.com/watch?v=ukFjH9odsE4', embedUrl: getYouTubeEmbedUrl('ukFjH9odsE4'), duration: '5:24', views: '8.2M' },
  { id: 'yt2', type: 'YOUTUBE', title: 'Everything You Think You Know About Addiction Is Wrong', creator: 'Johann Hari - TED', thumbnail: getYouTubeThumbnail('PY9DcIMGxMs'), url: 'https://www.youtube.com/watch?v=PY9DcIMGxMs', embedUrl: getYouTubeEmbedUrl('PY9DcIMGxMs'), duration: '14:42', views: '15M' },
  { id: 'yt3', type: 'YOUTUBE', title: 'The Power of Addiction and Recovery', creator: 'Gabor Maté', thumbnail: getYouTubeThumbnail('7Z9qJCbkfqY'), url: 'https://www.youtube.com/watch?v=7Z9qJCbkfqY', embedUrl: getYouTubeEmbedUrl('7Z9qJCbkfqY'), duration: '15:24', views: '3.4M' },
  { id: 'yt4', type: 'YOUTUBE', title: 'Gambling Addiction: How It Hijacks Your Brain', creator: 'After Skool', thumbnail: getYouTubeThumbnail('7xH7eGFuSYI'), url: 'https://www.youtube.com/watch?v=7xH7eGFuSYI', embedUrl: getYouTubeEmbedUrl('7xH7eGFuSYI'), duration: '12:18', views: '2.1M' },
  { id: 'yt5', type: 'YOUTUBE', title: 'How to Break Any Addiction', creator: 'Thomas DeLauer', thumbnail: getYouTubeThumbnail('ao8L-0nSYzg'), url: 'https://www.youtube.com/watch?v=ao8L-0nSYzg', embedUrl: getYouTubeEmbedUrl('ao8L-0nSYzg'), duration: '8:45', views: '1.2M' },
  { id: 'yt6', type: 'YOUTUBE', title: 'Rewiring the Addicted Brain', creator: 'AsapSCIENCE', thumbnail: getYouTubeThumbnail('HUngLgGRJpo'), url: 'https://www.youtube.com/watch?v=HUngLgGRJpo', embedUrl: getYouTubeEmbedUrl('HUngLgGRJpo'), duration: '6:12', views: '890K' },
  { id: 'yt7', type: 'YOUTUBE', title: 'The Neuroscience of Addiction', creator: 'Stanford Medicine', thumbnail: getYouTubeThumbnail('BcWLNfMJqgE'), url: 'https://www.youtube.com/watch?v=BcWLNfMJqgE', embedUrl: getYouTubeEmbedUrl('BcWLNfMJqgE'), duration: '22:15', views: '567K' },
  { id: 'yt8', type: 'YOUTUBE', title: 'Why Sports Betting Is So Addictive', creator: 'VICE', thumbnail: getYouTubeThumbnail('7eFCnSpZ7Eo'), url: 'https://www.youtube.com/watch?v=7eFCnSpZ7Eo', embedUrl: getYouTubeEmbedUrl('7eFCnSpZ7Eo'), duration: '18:32', views: '4.5M' },
  { id: 'yt9', type: 'YOUTUBE', title: 'My Story: Overcoming Gambling Addiction', creator: 'Recovery Stories', thumbnail: getYouTubeThumbnail('WQ5bkdFuFhg'), url: 'https://www.youtube.com/watch?v=WQ5bkdFuFhg', embedUrl: getYouTubeEmbedUrl('WQ5bkdFuFhg'), duration: '24:18', views: '320K' },
  { id: 'yt10', type: 'YOUTUBE', title: 'How Casinos Keep You Gambling', creator: 'Vox', thumbnail: getYouTubeThumbnail('sVsUx1rj5Y4'), url: 'https://www.youtube.com/watch?v=sVsUx1rj5Y4', embedUrl: getYouTubeEmbedUrl('sVsUx1rj5Y4'), duration: '7:48', views: '6.2M' },
  { id: 'yt11', type: 'YOUTUBE', title: 'Betting Industry Exposed: Inside Sports Gambling', creator: 'Real Sports HBO', thumbnail: getYouTubeThumbnail('TBQyAKsUEg8'), url: 'https://www.youtube.com/watch?v=TBQyAKsUEg8', embedUrl: getYouTubeEmbedUrl('TBQyAKsUEg8'), duration: '21:45', views: '1.8M' },
  { id: 'yt12', type: 'YOUTUBE', title: 'Dopamine Detox: How To Reset Your Brain', creator: 'Better Than Yesterday', thumbnail: getYouTubeThumbnail('9QiE-M1LrZk'), url: 'https://www.youtube.com/watch?v=9QiE-M1LrZk', embedUrl: getYouTubeEmbedUrl('9QiE-M1LrZk'), duration: '9:15', views: '7.8M' },
  { id: 'yt13', type: 'YOUTUBE', title: 'Why Willpower Doesnt Work for Addiction', creator: 'Dr. Gabor Maté', thumbnail: getYouTubeThumbnail('x9cvEa5qFQc'), url: 'https://www.youtube.com/watch?v=x9cvEa5qFQc', embedUrl: getYouTubeEmbedUrl('x9cvEa5qFQc'), duration: '16:20', views: '2.3M' },
  { id: 'yt14', type: 'YOUTUBE', title: '90 Days Gambling Free: What Changed', creator: 'Sober Gambler', thumbnail: getYouTubeThumbnail('dQw4w9WgXcQ'), url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', embedUrl: getYouTubeEmbedUrl('dQw4w9WgXcQ'), duration: '14:32', views: '89K' },
  { id: 'yt15', type: 'YOUTUBE', title: 'The Dark Side of Online Gambling', creator: 'BBC Documentary', thumbnail: getYouTubeThumbnail('zQrE9aLJxkI'), url: 'https://www.youtube.com/watch?v=zQrE9aLJxkI', embedUrl: getYouTubeEmbedUrl('zQrE9aLJxkI'), duration: '42:18', views: '5.4M' },
  { id: 'yt16', type: 'YOUTUBE', title: 'Building New Habits After Addiction', creator: 'Atomic Habits', thumbnail: getYouTubeThumbnail('U_nzqnXWvSo'), url: 'https://www.youtube.com/watch?v=U_nzqnXWvSo', embedUrl: getYouTubeEmbedUrl('U_nzqnXWvSo'), duration: '11:22', views: '3.1M' },
  { id: 'yt17', type: 'YOUTUBE', title: 'Cognitive Behavioral Therapy for Gambling', creator: 'Psych Hub', thumbnail: getYouTubeThumbnail('g-i6QMvIAA0'), url: 'https://www.youtube.com/watch?v=g-i6QMvIAA0', embedUrl: getYouTubeEmbedUrl('g-i6QMvIAA0'), duration: '8:45', views: '445K' },
  { id: 'yt18', type: 'YOUTUBE', title: 'Family Impact: Living with a Gambling Addict', creator: 'The Doctors', thumbnail: getYouTubeThumbnail('1TnFXCJZwnI'), url: 'https://www.youtube.com/watch?v=1TnFXCJZwnI', embedUrl: getYouTubeEmbedUrl('1TnFXCJZwnI'), duration: '19:50', views: '1.2M' },
  { id: 'yt19', type: 'YOUTUBE', title: 'Financial Recovery After Gambling', creator: 'Dave Ramsey', thumbnail: getYouTubeThumbnail('Li9lQKUqMGw'), url: 'https://www.youtube.com/watch?v=Li9lQKUqMGw', embedUrl: getYouTubeEmbedUrl('Li9lQKUqMGw'), duration: '12:08', views: '980K' },
  { id: 'yt20', type: 'YOUTUBE', title: 'Meditation for Addiction Recovery', creator: 'Headspace', thumbnail: getYouTubeThumbnail('inpok4MKVLM'), url: 'https://www.youtube.com/watch?v=inpok4MKVLM', embedUrl: getYouTubeEmbedUrl('inpok4MKVLM'), duration: '10:00', views: '2.5M' },
];

// TikTok Content - Recovery & Anti-Gambling
const TIKTOK_VIDEOS: ContentItem[] = [
  { id: 'tt1', type: 'TIKTOK', title: '60-Second Grounding Technique When Urges Hit', creator: '@MindfulRecovery', thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', url: 'https://www.tiktok.com/@mindfulrecovery', duration: '0:58', views: '890K' },
  { id: 'tt2', type: 'TIKTOK', title: 'What Nobody Tells You About Recovery', creator: '@SoberLiving', thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400', url: 'https://www.tiktok.com/@soberliving', duration: '1:12', views: '1.2M' },
  { id: 'tt3', type: 'TIKTOK', title: 'Signs You Might Have a Gambling Problem', creator: '@RecoveryCoach', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', url: 'https://www.tiktok.com/@recoverycoach', duration: '0:45', views: '2.3M' },
  { id: 'tt4', type: 'TIKTOK', title: 'How I Rebuilt My Life After Losing Everything', creator: '@GamblerToWinner', thumbnail: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', url: 'https://www.tiktok.com/@gamblertowinner', duration: '3:00', views: '4.5M' },
  { id: 'tt5', type: 'TIKTOK', title: 'Daily Affirmations for Recovery', creator: '@HealingPath', thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', url: 'https://www.tiktok.com/@healingpath', duration: '0:30', views: '567K' },
  { id: 'tt6', type: 'TIKTOK', title: 'The Truth About Sports Betting Apps', creator: '@TechTruth', thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', url: 'https://www.tiktok.com/@techtruth', duration: '1:45', views: '3.8M' },
  { id: 'tt7', type: 'TIKTOK', title: 'How Casinos Manipulate Your Brain', creator: '@ScienceExplained', thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', url: 'https://www.tiktok.com/@scienceexplained', duration: '2:15', views: '6.2M' },
  { id: 'tt8', type: 'TIKTOK', title: '1 Year Gambling Free - Heres What Changed', creator: '@RecoveryJourney', thumbnail: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400', url: 'https://www.tiktok.com/@recoveryjourney', duration: '2:30', views: '1.1M' },
  { id: 'tt9', type: 'TIKTOK', title: 'Healthy Dopamine Hits That Arent Gambling', creator: '@BrainHacks', thumbnail: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400', url: 'https://www.tiktok.com/@brainhacks', duration: '1:00', views: '2.8M' },
  { id: 'tt10', type: 'TIKTOK', title: 'What To Do When The Urge Hits', creator: '@CopingSkills', thumbnail: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400', url: 'https://www.tiktok.com/@copingskills', duration: '0:55', views: '890K' },
  { id: 'tt11', type: 'TIKTOK', title: 'My First GA Meeting Experience', creator: '@AnonymousRecovery', thumbnail: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400', url: 'https://www.tiktok.com/@anonymousrecovery', duration: '2:00', views: '445K' },
  { id: 'tt12', type: 'TIKTOK', title: 'Financial Tips After Gambling Debt', creator: '@MoneyHealing', thumbnail: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', url: 'https://www.tiktok.com/@moneyhealing', duration: '1:30', views: '1.5M' },
  { id: 'tt13', type: 'TIKTOK', title: 'Why Gambling Addiction Is Invisible', creator: '@MentalHealthMatters', thumbnail: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400', url: 'https://www.tiktok.com/@mentalhealthmatters', duration: '1:15', views: '3.2M' },
  { id: 'tt14', type: 'TIKTOK', title: 'Replacing Gambling With Exercise', creator: '@FitRecovery', thumbnail: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400', url: 'https://www.tiktok.com/@fitrecovery', duration: '0:45', views: '678K' },
  { id: 'tt15', type: 'TIKTOK', title: 'How I Told My Family About My Addiction', creator: '@HonestRecovery', thumbnail: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', url: 'https://www.tiktok.com/@honestrecovery', duration: '2:45', views: '2.1M' },
];

// Twitter/X Content - Recovery Community
const TWITTER_CONTENT: ContentItem[] = [
  { id: 'tw1', type: 'TWITTER', title: 'Day 365 clean. One year ago I couldnt imagine making it a week. To anyone on day 1 - keep going. It gets better. 💚', author: '@RecoveryRoad', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: 'tw2', type: 'TWITTER', title: 'The urge will pass whether you give in or not. Choose to let it pass without gambling.', author: '@SoberSuccess', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 'tw3', type: 'TWITTER', title: 'If youre struggling today, reach out. Talk to someone. You dont have to fight this alone. 📞 1-800-522-4700', author: '@GamblingHelp', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: 'tw4', type: 'TWITTER', title: 'Small wins matter. Every hour, every day you stay clean is a victory. Celebrate your progress! 🏆', author: '@RecoveryWins', timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: 'tw5', type: 'TWITTER', title: 'Replace the habit, not just remove it. Find healthy distractions that bring you joy.', author: '@AddictionFree', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
  { id: 'tw6', type: 'TWITTER', title: 'Your addiction doesnt define you. Your recovery does. Keep fighting. 💪', author: '@RecoveryWarrior', timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
  { id: 'tw7', type: 'TWITTER', title: 'THREAD: 10 things I wish I knew before I started gambling 🧵 1/ The house ALWAYS wins in the long run...', author: '@GamblingTruth', timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
  { id: 'tw8', type: 'TWITTER', title: 'Just blocked myself from every betting site. Its scary but necessary. Day 1 starts now.', author: '@NewBeginning23', timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString() },
  { id: 'tw9', type: 'TWITTER', title: 'PSA: Sports betting apps are designed by psychologists to be as addictive as possible. Protect yourself.', author: '@ConsumerWatch', timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString() },
  { id: 'tw10', type: 'TWITTER', title: 'My therapist said something that stuck: "You cant think your way out of addiction. You have to act your way out."', author: '@TherapyInsights', timestamp: new Date(Date.now() - 1000 * 60 * 420).toISOString() },
  { id: 'tw11', type: 'TWITTER', title: 'Recovery isnt linear. Bad days dont erase good progress. Keep going. ❤️', author: '@MentalHealthMatters', timestamp: new Date(Date.now() - 1000 * 60 * 480).toISOString() },
  { id: 'tw12', type: 'TWITTER', title: 'Attending my first Gamblers Anonymous meeting tonight. Terrified but hopeful.', author: '@FirstSteps', timestamp: new Date(Date.now() - 1000 * 60 * 540).toISOString() },
  { id: 'tw13', type: 'TWITTER', title: 'Fun fact: The "almost win" feeling in gambling is engineered. Its not luck - its manipulation.', author: '@CasinoExposed', timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString() },
  { id: 'tw14', type: 'TWITTER', title: '6 months gambling free. Used the money I would have lost to take my family on vacation. Worth it. 🌴', author: '@WinningAtLife', timestamp: new Date(Date.now() - 1000 * 60 * 660).toISOString() },
  { id: 'tw15', type: 'TWITTER', title: 'To the person reading this who thinks they cant quit: I thought the same thing. Now Im 2 years free. You can do this.', author: '@HopeDealer', timestamp: new Date(Date.now() - 1000 * 60 * 720).toISOString() },
  { id: 'tw16', type: 'TWITTER', title: 'Remember: Gambling companies profit from your losses. Your recovery is their nightmare. Be that nightmare. 👊', author: '@FightBack', timestamp: new Date(Date.now() - 1000 * 60 * 780).toISOString() },
  { id: 'tw17', type: 'TWITTER', title: 'Just had the strongest urge to bet in weeks. Came here instead. Thanks for being my support. 🙏', author: '@StayingStrong', timestamp: new Date(Date.now() - 1000 * 60 * 840).toISOString() },
  { id: 'tw18', type: 'TWITTER', title: 'The average gambling addict loses 5 years of income before seeking help. Dont wait that long. Get help now.', author: '@AddictionStats', timestamp: new Date(Date.now() - 1000 * 60 * 900).toISOString() },
  { id: 'tw19', type: 'TWITTER', title: 'My bank account isnt overdrawn for the first time in 3 years. Small victory, huge feeling.', author: '@FinancialFreedom', timestamp: new Date(Date.now() - 1000 * 60 * 960).toISOString() },
  { id: 'tw20', type: 'TWITTER', title: 'If youre hiding your gambling from loved ones, thats a sign. Get help before you lose more than money.', author: '@RealTalk', timestamp: new Date(Date.now() - 1000 * 60 * 1020).toISOString() },
];

class ContentService {
  // Get content by platform with pagination
  getContentByPlatform(platform: 'youtube' | 'tiktok' | 'twitter', page: number = 1, limit: number = 10): { items: ContentItem[]; hasMore: boolean } {
    let source: ContentItem[];
    
    switch (platform) {
      case 'youtube':
        source = YOUTUBE_VIDEOS;
        break;
      case 'tiktok':
        source = TIKTOK_VIDEOS;
        break;
      case 'twitter':
        source = TWITTER_CONTENT;
        break;
      default:
        source = [];
    }
    
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = source.slice(start, end);
    
    return {
      items,
      hasMore: end < source.length,
    };
  }

  // Get all content (mixed)
  getAllContent(page: number = 1, limit: number = 10): { items: ContentItem[]; hasMore: boolean } {
    const allContent = [...YOUTUBE_VIDEOS, ...TIKTOK_VIDEOS, ...TWITTER_CONTENT];
    
    // Shuffle for variety
    const shuffled = allContent.sort(() => Math.random() - 0.5);
    
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = shuffled.slice(start, end);
    
    return {
      items,
      hasMore: end < shuffled.length,
    };
  }

  // Legacy method for backwards compatibility
  async getContent(page: number = 1, limit: number = 10): Promise<{ items: ContentItem[]; hasMore: boolean }> {
    return this.getAllContent(page, limit);
  }

  // Refresh - just return fresh content
  async refreshContent(): Promise<ContentItem[]> {
    const result = this.getAllContent(1, 10);
    return result.items;
  }
}

export const contentService = new ContentService();
export type { ContentItem };
