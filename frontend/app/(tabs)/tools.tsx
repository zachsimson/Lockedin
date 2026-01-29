import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  TextInput,
  Modal,
  RefreshControl,
  FlatList,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { colors } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useBlocker } from '../../src/context/BlockerContext';
import { socketService } from '../../src/services/socket';
import api from '../../src/services/api';
import { contentService, ContentItem } from '../../src/services/contentService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Avatar mappings
const AVATAR_ICONS: { [key: string]: string } = {
  shield: 'shield-checkmark', phoenix: 'flame', mountain: 'triangle', star: 'star',
  diamond: 'diamond', lightning: 'flash', heart: 'heart', rocket: 'rocket',
  crown: 'trophy', anchor: 'fitness',
};

const AVATAR_COLORS: { [key: string]: string } = {
  shield: '#00F5A0', phoenix: '#FF6B6B', mountain: '#4ECDC4', star: '#FFE66D',
  diamond: '#A78BFA', lightning: '#F59E0B', heart: '#EC4899', rocket: '#3B82F6',
  crown: '#FBBF24', anchor: '#10B981',
};

// Content source config
const SOURCE_CONFIG: { [key: string]: { icon: string; color: string; label: string } } = {
  YOUTUBE: { icon: 'play-circle', color: '#FF0000', label: 'YouTube' },
  TIKTOK: { icon: 'musical-notes', color: '#010101', label: 'TikTok' },
  TWITTER: { icon: 'chatbubble-ellipses', color: '#1DA1F2', label: 'Twitter/X' },
  TED: { icon: 'mic', color: '#E62B1E', label: 'TED Talk' },
  ARTICLE: { icon: 'document-text', color: '#6366F1', label: 'Article' },
  PODCAST: { icon: 'headset', color: '#8B5CF6', label: 'Podcast' },
  UPDATE: { icon: 'megaphone', color: '#00F5A0', label: 'Update' },
  MESSAGE: { icon: 'heart', color: '#EC4899', label: 'Message' },
};

// Curated Learn Content - Premium, intentional content
const LEARN_CONTENT = [
  {
    id: 'update-1',
    type: 'UPDATE',
    title: 'Welcome to LockedIn v2.0',
    description: 'New Chess feature added! Play online or offline against AI to stay distracted in a healthy way.',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'video-1',
    type: 'YOUTUBE',
    title: 'The Science of Addiction: How Your Brain Gets Hooked',
    creator: 'TED-Ed',
    thumbnail: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800',
    url: 'https://www.youtube.com/watch?v=ukFjH9odsE4',
    duration: '5:24',
    views: '8.2M',
  },
  {
    id: 'message-1',
    type: 'MESSAGE',
    title: '"Recovery is not a race. You don\'t have to feel guilty if it takes you longer than you thought."',
    author: 'LockedIn Community',
  },
  {
    id: 'video-2',
    type: 'TED',
    title: 'Everything You Think You Know About Addiction is Wrong',
    creator: 'Johann Hari',
    thumbnail: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800',
    url: 'https://www.ted.com/talks/johann_hari_everything_you_think_you_know_about_addiction_is_wrong',
    duration: '14:42',
    views: '15M',
  },
  {
    id: 'twitter-1',
    type: 'TWITTER',
    title: 'Day 365 clean. One year ago I couldn\'t imagine making it a week. To anyone on day 1 - keep going. It gets better.',
    author: '@RecoveryStories',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'video-3',
    type: 'YOUTUBE',
    title: 'How I Quit Gambling After 15 Years - My Full Story',
    creator: 'Real Recovery Stories',
    thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
    url: 'https://www.youtube.com/watch?v=example',
    duration: '18:22',
    views: '456K',
  },
  {
    id: 'update-2',
    type: 'UPDATE',
    title: 'Protection Mode Enhanced',
    description: 'We now block 258+ gambling domains. Enable Recovery Mode in the Lock tab to activate protection.',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'video-4',
    type: 'TIKTOK',
    title: '60-Second Grounding Technique When Urges Hit',
    creator: '@MindfulRecovery',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    url: 'https://www.tiktok.com/@mindfulrecovery',
    duration: '0:58',
    views: '890K',
  },
  {
    id: 'message-2',
    type: 'MESSAGE',
    title: '"The urge will pass whether you gamble or not. Choose to let it pass without gambling."',
    author: 'Recovery Wisdom',
  },
  {
    id: 'twitter-2',
    type: 'TWITTER',
    title: 'If you\'re struggling today, reach out. Talk to someone. You don\'t have to fight this alone. 💚',
    author: '@GamblingHelp',
    timestamp: new Date().toISOString(),
  },
];

interface VPNStatus {
  recovery_mode_enabled: boolean;
  lock_duration: string | null;
  cooldown_remaining_seconds: number | null;
  can_disable: boolean;
  unlock_requested: boolean;
  unlock_approved: boolean;
}

const LOCK_DURATIONS = [
  { value: '24h', label: '24 Hours', description: 'Quick reset protection' },
  { value: '72h', label: '3 Days', description: 'Weekend coverage' },
  { value: '7d', label: '1 Week', description: 'Weekly commitment' },
  { value: '30d', label: '30 Days', description: 'Monthly protection' },
  { value: 'permanent', label: 'Permanent', description: 'Maximum commitment' },
];

// Reordered tabs: Lock, Learn, Chat, DMs (replaced Feed)
type ToolSection = 'lock' | 'learn' | 'chat' | 'dms';
type LearnSubSection = 'youtube' | 'tiktok' | 'twitter';

export default function Tools() {
  const { user } = useAuth();
  const router = useRouter();
  const { isBlocking, enableBlocking, disableBlocking, checkIfBlocked, blockedDomains: globalBlockedDomains } = useBlocker();
  
  const [activeSection, setActiveSection] = useState<ToolSection>('lock');
  const [learnSubSection, setLearnSubSection] = useState<LearnSubSection>('youtube');
  
  // VPN/Lock state
  const [vpnStatus, setVpnStatus] = useState<VPNStatus | null>(null);
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('24h');
  const [unlockReason, setUnlockReason] = useState('');
  const [cooldownTime, setCooldownTime] = useState('');
  
  // Community state
  const [activities, setActivities] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  
  // DM state
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedDmFriend, setSelectedDmFriend] = useState<any | null>(null);
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [dmInput, setDmInput] = useState('');
  
  // Live Content state
  const [liveContent, setLiveContent] = useState<ContentItem[]>([]);
  const [contentPage, setContentPage] = useState(1);
  const [hasMoreContent, setHasMoreContent] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ContentItem | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const chatListRef = useRef<FlatList>(null);
  const dmListRef = useRef<FlatList>(null);

  // Load live content
  const loadLiveContent = async (page: number = 1, refresh: boolean = false) => {
    if (loadingContent && !refresh) return;
    
    setLoadingContent(true);
    try {
      const result = await contentService.getContent(page, 10);
      
      if (refresh) {
        setLiveContent(result.items);
      } else {
        setLiveContent(prev => [...prev, ...result.items]);
      }
      setHasMoreContent(result.hasMore);
      setContentPage(page);
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  // Load more content (infinite scroll)
  const loadMoreContent = () => {
    if (!loadingContent && hasMoreContent) {
      loadLiveContent(contentPage + 1);
    }
  };

  const loadData = async () => {
    try {
      const results = await Promise.allSettled([
        api.get('/api/vpn/status'),
        api.get('/api/blocking/domains'),
        api.get('/api/community/activity?limit=30'),
        api.get('/api/community/chat?limit=50'),
        api.get('/api/community/suggested?limit=12'),
        api.get('/api/friends'),
      ]);

      if (results[0].status === 'fulfilled') setVpnStatus(results[0].value.data);
      if (results[1].status === 'fulfilled') setBlockedDomains(results[1].value.data.domains || []);
      if (results[2].status === 'fulfilled') setActivities(results[2].value.data.activities || []);
      if (results[3].status === 'fulfilled') setChatMessages(results[3].value.data.messages || []);
      if (results[4].status === 'fulfilled') setSuggestedUsers(results[4].value.data.users || []);
      if (results[5].status === 'fulfilled') setFriends(results[5].value.data.friends || []);
      
      // Also load live content
      await loadLiveContent(1, true);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (vpnStatus?.cooldown_remaining_seconds && vpnStatus.cooldown_remaining_seconds > 0) {
      const interval = setInterval(() => {
        setVpnStatus(prev => {
          if (!prev || !prev.cooldown_remaining_seconds) return prev;
          const newSeconds = prev.cooldown_remaining_seconds - 1;
          if (newSeconds <= 0) {
            loadData();
            return { ...prev, cooldown_remaining_seconds: 0, can_disable: true };
          }
          return { ...prev, cooldown_remaining_seconds: newSeconds };
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [vpnStatus?.cooldown_remaining_seconds]);

  useEffect(() => {
    if (vpnStatus?.cooldown_remaining_seconds && vpnStatus.cooldown_remaining_seconds > 0) {
      const hours = Math.floor(vpnStatus.cooldown_remaining_seconds / 3600);
      const minutes = Math.floor((vpnStatus.cooldown_remaining_seconds % 3600) / 60);
      const seconds = vpnStatus.cooldown_remaining_seconds % 60;
      setCooldownTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    } else {
      setCooldownTime('');
    }
  }, [vpnStatus?.cooldown_remaining_seconds]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // VPN Handlers - Now with device-level blocking integration
  const handleEnableRecoveryMode = async () => {
    try {
      await api.post('/api/vpn/enable', { lock_duration: selectedDuration });
      await enableBlocking(); // Enable device-level blocking
      setShowEnableModal(false);
      await loadData();
      Alert.alert('🛡️ Protection Active', 'Recovery Mode is now enabled with device-level blocking. Stay strong!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to enable');
    }
  };

  const handleRequestUnlock = async () => {
    if (unlockReason.length < 10) {
      Alert.alert('Error', 'Please provide a reason (at least 10 characters)');
      return;
    }
    try {
      await api.post('/api/vpn/request-unlock', { reason: unlockReason });
      setShowUnlockModal(false);
      setUnlockReason('');
      await loadData();
      Alert.alert('Submitted', '24-hour cooldown started.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit');
    }
  };

  const handleDisableVPN = async () => {
    Alert.alert('Disable Protection?', 'Are you sure? This will disable device-level blocking.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disable',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/api/vpn/disable');
            await disableBlocking(); // Disable device-level blocking
            await loadData();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed');
          }
        },
      },
    ]);
  };

  // Chat handler
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    try {
      await api.post('/api/community/chat', { content: chatInput.trim() });
      setChatInput('');
      const chatRes = await api.get('/api/community/chat?limit=50');
      setChatMessages(chatRes.data.messages || []);
      setTimeout(() => chatListRef.current?.scrollToEnd(), 100);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send');
    }
  };

  // Friend request
  const sendFriendRequest = async (userId: string) => {
    try {
      await api.post('/api/friends/request', { receiver_id: userId });
      Alert.alert('Sent', 'Friend request sent!');
      setSuggestedUsers(prev => prev.filter(u => u._id !== userId));
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed');
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const isEnabled = vpnStatus?.recovery_mode_enabled || false;
  const isInCooldown = vpnStatus?.unlock_approved && !vpnStatus?.can_disable;

  // Lock Section
  const renderLockSection = () => (
    <ScrollView
      contentContainerStyle={styles.sectionContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.statusCard, isEnabled && styles.statusCardActive]}>
        <LinearGradient
          colors={isEnabled ? ['#00F5A015', '#00F5A005'] : ['transparent', 'transparent']}
          style={styles.statusGradient}
        >
          <View style={styles.statusIcon}>
            <Ionicons 
              name={isEnabled ? "shield-checkmark" : "shield-outline"} 
              size={56} 
              color={isEnabled ? colors.primary : colors.textMuted} 
            />
          </View>
          <Text style={[styles.statusTitle, isEnabled && styles.statusTitleActive]}>
            {isEnabled ? 'PROTECTION ACTIVE' : 'PROTECTION OFF'}
          </Text>
          {isEnabled && vpnStatus?.lock_duration && (
            <Text style={styles.lockDuration}>
              {LOCK_DURATIONS.find(d => d.value === vpnStatus.lock_duration)?.label || vpnStatus.lock_duration}
            </Text>
          )}
          {isInCooldown && cooldownTime && (
            <View style={styles.cooldownContainer}>
              <Ionicons name="time" size={20} color={colors.warning} />
              <Text style={styles.cooldownLabel}>Unlock in:</Text>
              <Text style={styles.cooldownTimer}>{cooldownTime}</Text>
            </View>
          )}
          <Text style={styles.blockedCount}>{blockedDomains.length} sites blocked</Text>
        </LinearGradient>
      </View>

      {!isEnabled ? (
        <Pressable style={styles.activateButton} onPress={() => setShowEnableModal(true)}>
          <LinearGradient
            colors={[colors.primary, '#00D98B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.activateGradient}
          >
            <Ionicons name="lock-closed" size={22} color="#000" />
            <Text style={styles.activateButtonText}>ACTIVATE PROTECTION</Text>
          </LinearGradient>
        </Pressable>
      ) : (
        <View style={styles.actionButtons}>
          {!vpnStatus?.unlock_requested && !vpnStatus?.unlock_approved && (
            <Pressable style={styles.requestUnlockButton} onPress={() => setShowUnlockModal(true)}>
              <Ionicons name="key" size={18} color={colors.textPrimary} />
              <Text style={styles.requestUnlockText}>Request Unlock</Text>
            </Pressable>
          )}
          {vpnStatus?.can_disable && (
            <Pressable style={styles.disableButton} onPress={handleDisableVPN}>
              <Text style={styles.disableButtonText}>Disable Protection</Text>
            </Pressable>
          )}
        </View>
      )}

      <Pressable 
        style={styles.emergencyCard}
        onPress={() => Linking.openURL('tel:1-800-522-4700')}
      >
        <View style={styles.emergencyIcon}>
          <Ionicons name="call" size={24} color="#FFF" />
        </View>
        <View style={styles.emergencyContent}>
          <Text style={styles.emergencyTitle}>Crisis Hotline</Text>
          <Text style={styles.emergencyText}>1-800-522-4700</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
      </Pressable>

      {/* How LockedIn Blocking Works */}
      <View style={styles.vpnInstructionsCard}>
        <View style={styles.vpnInstructionsHeader}>
          <Ionicons name="shield" size={24} color={colors.primary} />
          <Text style={styles.vpnInstructionsTitle}>How LockedIn Protection Works</Text>
        </View>
        
        {/* What's Active */}
        <View style={styles.protectionStatus}>
          <View style={[styles.protectionIndicator, isEnabled && styles.protectionActive]}>
            <Ionicons name={isEnabled ? "checkmark-circle" : "ellipse-outline"} size={20} color={isEnabled ? "#000" : colors.textMuted} />
          </View>
          <View style={styles.protectionInfo}>
            <Text style={styles.protectionLabel}>In-App Blocking</Text>
            <Text style={styles.protectionDesc}>
              {isEnabled ? "Active - All gambling links blocked within LockedIn" : "Not active - Enable above"}
            </Text>
          </View>
        </View>

        <View style={styles.vpnDivider} />
        
        <Text style={styles.vpnSectionTitle}>📱 Full Device Protection (Manual Setup)</Text>
        <Text style={styles.vpnSectionDesc}>
          To block gambling sites in Safari, Chrome, and other browsers, configure your device's DNS:
        </Text>

        <View style={styles.vpnInstructionBox}>
          <Text style={styles.vpnInstructionPlatform}>iPhone / iOS</Text>
          <Text style={styles.vpnInstructionSteps}>
            1. Open Settings → Wi-Fi{'\n'}
            2. Tap ⓘ next to your network{'\n'}
            3. Tap "Configure DNS" → "Manual"{'\n'}
            4. Delete existing servers{'\n'}
            5. Add: <Text style={styles.dnsHighlight}>94.140.14.15</Text>{'\n'}
            6. Add: <Text style={styles.dnsHighlight}>94.140.15.16</Text>{'\n'}
            7. Tap "Save"
          </Text>
        </View>

        <View style={styles.vpnInstructionBox}>
          <Text style={styles.vpnInstructionPlatform}>Android</Text>
          <Text style={styles.vpnInstructionSteps}>
            1. Open Settings → Network & Internet{'\n'}
            2. Tap "Private DNS"{'\n'}
            3. Select "Private DNS provider hostname"{'\n'}
            4. Enter: <Text style={styles.dnsHighlight}>family.adguard-dns.com</Text>{'\n'}
            5. Tap "Save"
          </Text>
        </View>

        <View style={styles.vpnNote}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={styles.vpnNoteText}>
            These DNS servers (AdGuard Family) block gambling, adult content, and malware. This works system-wide - in all apps and browsers.
          </Text>
        </View>

        <View style={styles.blockedCountCard}>
          <Ionicons name="ban" size={24} color="#DC2626" />
          <View style={styles.blockedCountInfo}>
            <Text style={styles.blockedCountNumber}>{blockedDomains.length}+</Text>
            <Text style={styles.blockedCountLabel}>Gambling sites in our blocklist</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // Learn Section - With Sub-tabs for YouTube, TikTok, Twitter/X
  const openVideoPlayer = (item: ContentItem) => {
    if (item.url || item.embedUrl) {
      if (Platform.OS === 'web') {
        if (item.url) window.open(item.url, '_blank');
      } else {
        setSelectedVideo(item);
        setShowVideoPlayer(true);
      }
    }
  };

  // Load content for specific platform
  const loadPlatformContent = useCallback((platform: LearnSubSection, page: number = 1, refresh: boolean = false) => {
    const result = contentService.getContentByPlatform(platform, page, 10);
    if (refresh) {
      setLiveContent(result.items);
    } else {
      setLiveContent(prev => [...prev, ...result.items]);
    }
    setHasMoreContent(result.hasMore);
    setContentPage(page);
  }, []);

  // Effect to reload content when sub-section changes
  useEffect(() => {
    loadPlatformContent(learnSubSection, 1, true);
  }, [learnSubSection, loadPlatformContent]);

  const renderLearnSection = () => (
    <View style={{ flex: 1 }}>
      {/* Sub-tabs for YouTube, TikTok, Twitter */}
      <View style={styles.learnSubTabs}>
        {[
          { id: 'youtube', icon: 'logo-youtube', label: 'YouTube', color: '#FF0000' },
          { id: 'tiktok', icon: 'musical-notes', label: 'TikTok', color: '#000000' },
          { id: 'twitter', icon: 'chatbubble-ellipses', label: 'Twitter/X', color: '#1DA1F2' },
        ].map((tab) => (
          <Pressable
            key={`learn-sub-${tab.id}`}
            style={[styles.learnSubTab, learnSubSection === tab.id && styles.learnSubTabActive]}
            onPress={() => setLearnSubSection(tab.id as LearnSubSection)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={16} 
              color={learnSubSection === tab.id ? tab.color : colors.textMuted} 
            />
            <Text style={[
              styles.learnSubTabText, 
              learnSubSection === tab.id && { color: tab.color, fontWeight: '600' }
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content List */}
      <FlatList
        data={liveContent}
        keyExtractor={(item) => `learn-${item.id}`}
        contentContainerStyle={styles.learnList}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              setRefreshing(true);
              loadPlatformContent(learnSubSection, 1, true);
              setRefreshing(false);
            }} 
          />
        }
        onEndReached={() => {
          if (hasMoreContent) {
            loadPlatformContent(learnSubSection, contentPage + 1, false);
          }
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => {
          const config = SOURCE_CONFIG[item.type] || { icon: 'play', color: colors.primary, label: 'Video' };
          
          // Twitter/X Tweet Card
          if (item.type === 'TWITTER') {
            return (
              <View style={styles.twitterCard} key={`learn-${item.id}`}>
                <View style={styles.twitterHeader}>
                  <View style={[styles.sourceIconSmall, { backgroundColor: '#1DA1F2' }]}>
                    <Ionicons name="chatbubble-ellipses" size={12} color="#FFF" />
                  </View>
                  <Text style={styles.twitterAuthor}>{item.author}</Text>
                </View>
                <Text style={styles.twitterText}>{item.title}</Text>
                <Text style={styles.twitterTime}>{getTimeAgo(item.timestamp || new Date().toISOString())}</Text>
              </View>
            );
          }
          
          // Video Card (YouTube, TikTok)
          return (
            <Pressable 
              style={styles.videoCard}
              key={`learn-${item.id}`}
              onPress={() => openVideoPlayer(item)}
            >
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <View style={styles.thumbnailOverlay}>
                  <View style={styles.playIcon}>
                    <Ionicons name="play" size={28} color="#FFF" />
                  </View>
                </View>
                {item.duration && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{item.duration}</Text>
                  </View>
                )}
                <View style={[styles.sourceBadge, { backgroundColor: config.color }]}>
                  <Ionicons name={config.icon as any} size={10} color="#FFF" />
                  <Text style={styles.sourceBadgeText}>{config.label}</Text>
                </View>
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.videoMeta}>
                  <Text style={styles.creatorName}>{item.creator}</Text>
                  {item.views && <Text style={styles.viewCount}>{item.views} views</Text>}
                </View>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          loadingContent ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingMoreText}>Loading more content...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.emptyText}>Loading content...</Text>
          </View>
        }
      />
      
      {/* In-App Video Player Modal */}
      {showVideoPlayer && selectedVideo && (
        <Modal
          visible={showVideoPlayer}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowVideoPlayer(false)}
        >
          <View style={styles.videoPlayerContainer}>
            <View style={styles.videoPlayerHeader}>
              <Pressable 
                style={styles.videoPlayerClose} 
                onPress={() => setShowVideoPlayer(false)}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
              <Text style={styles.videoPlayerTitle} numberOfLines={1}>
                {selectedVideo.title}
              </Text>
              <Pressable 
                style={styles.videoPlayerExternal}
                onPress={() => {
                  setShowVideoPlayer(false);
                  if (selectedVideo.url) Linking.openURL(selectedVideo.url);
                }}
              >
                <Ionicons name="open-outline" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            
            {Platform.OS === 'web' ? (
              <View style={[styles.videoPlayerWebview, { overflow: 'hidden' }]}>
                <div 
                  style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
                  dangerouslySetInnerHTML={{
                    __html: `<iframe 
                      src="${selectedVideo.embedUrl || `https://www.youtube.com/embed/${selectedVideo.url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}?autoplay=1&rel=0&modestbranding=1`}"
                      style="width: 100%; height: 100%; border: none;"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowfullscreen
                    ></iframe>`
                  }}
                />
              </View>
            ) : (
              <WebView
                source={{
                  html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { background: #0D0D0F; display: flex; justify-content: center; align-items: center; min-height: 100vh; } iframe { width: 100%; height: 100vh; border: none; }</style></head><body><iframe src="${selectedVideo.embedUrl || `https://www.youtube.com/embed/${selectedVideo.url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}?autoplay=1&rel=0&modestbranding=1`}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></body></html>`
                }}
                style={styles.videoPlayerWebview}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
              />
            )}
          </View>
        </Modal>
      )}
    </View>
  );
            return (
              <View style={styles.messageCard} key={`learn-${item.id}`}>
                <Ionicons name="heart" size={24} color="#EC4899" style={styles.messageIcon} />
                <Text style={styles.messageText}>{item.title}</Text>
                <Text style={styles.messageAuthor}>— {item.author}</Text>
              </View>
            );
          }
          
          // Twitter/X Card
          if (item.type === 'TWITTER') {
            return (
              <View style={styles.twitterCard} key={`learn-${item.id}`}>
                <View style={styles.twitterHeader}>
                  <View style={[styles.sourceIconSmall, { backgroundColor: config.color }]}>
                    <Ionicons name={config.icon as any} size={12} color="#FFF" />
                  </View>
                  <Text style={styles.twitterAuthor}>{item.author}</Text>
                </View>
                <Text style={styles.twitterText}>{item.title}</Text>
                <Text style={styles.twitterTime}>{getTimeAgo(item.timestamp || new Date().toISOString())}</Text>
              </View>
            );
          }
          
          // Video Card (YouTube, TED, TikTok) - Now opens in-app player
          return (
            <Pressable 
              style={styles.videoCard}
              key={`learn-${item.id}`}
              onPress={() => openVideoPlayer(item)}
            >
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <View style={styles.thumbnailOverlay}>
                  <View style={styles.playIcon}>
                    <Ionicons name="play" size={28} color="#FFF" />
                  </View>
                </View>
                {item.duration && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{item.duration}</Text>
                  </View>
                )}
                <View style={[styles.sourceBadge, { backgroundColor: config.color }]}>
                  <Ionicons name={config.icon as any} size={10} color="#FFF" />
                  <Text style={styles.sourceBadgeText}>{config.label}</Text>
                </View>
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.videoMeta}>
                  <Text style={styles.creatorName}>{item.creator}</Text>
                  {item.views && <Text style={styles.viewCount}>{item.views} views</Text>}
                </View>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          loadingContent ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingMoreText}>Loading more content...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loadingContent ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyText}>Loading live content...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="videocam-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No content available</Text>
            </View>
          )
        }
      />
      
      {/* In-App Video Player Modal */}
      {showVideoPlayer && selectedVideo && (
        <Modal
          visible={showVideoPlayer}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowVideoPlayer(false)}
        >
          <View style={styles.videoPlayerContainer}>
            {/* Header */}
            <View style={styles.videoPlayerHeader}>
              <Pressable 
                style={styles.videoPlayerClose} 
                onPress={() => setShowVideoPlayer(false)}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
              <Text style={styles.videoPlayerTitle} numberOfLines={1}>
                {selectedVideo.title}
              </Text>
              <Pressable 
                style={styles.videoPlayerExternal}
                onPress={() => {
                  setShowVideoPlayer(false);
                  if (selectedVideo.url) {
                    Linking.openURL(selectedVideo.url);
                  }
                }}
              >
                <Ionicons name="open-outline" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            
            {/* Video Player - Web uses iframe, native uses WebView */}
            {Platform.OS === 'web' ? (
              <View style={[styles.videoPlayerWebview, { overflow: 'hidden' }]}>
                <div 
                  style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
                  dangerouslySetInnerHTML={{
                    __html: `<iframe 
                      src="${selectedVideo.embedUrl || `https://www.youtube.com/embed/${selectedVideo.url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}?autoplay=1&rel=0&modestbranding=1`}"
                      style="width: 100%; height: 100%; border: none;"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowfullscreen
                    ></iframe>`
                  }}
                />
              </View>
            ) : (
              <WebView
                source={{
                  html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
                      <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { background: #0D0D0F; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                        iframe { width: 100%; height: 100vh; border: none; }
                      </style>
                    </head>
                    <body>
                      <iframe 
                        src="${selectedVideo.embedUrl || `https://www.youtube.com/embed/${selectedVideo.url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}?autoplay=1&rel=0&modestbranding=1`}" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen
                      ></iframe>
                    </body>
                    </html>
                  `
                }}
                style={styles.videoPlayerWebview}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
              />
            )}
          </View>
        </Modal>
      )}
    </>
  );

  // Chat Section - Group Chat Rooms
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [roomMessages, setRoomMessages] = useState<any[]>([]);
  const [roomUsers, setRoomUsers] = useState<string[]>([]);
  
  const ROOM_INFO = [
    { id: 'general', name: 'General Support', icon: 'people', color: '#00F5A0' },
    { id: 'focus', name: 'Stay Focused', icon: 'eye', color: '#3B82F6' },
    { id: 'distraction', name: 'Distraction Corner', icon: 'game-controller', color: '#EC4899' },
    { id: 'chess', name: 'Chess Players', icon: 'trophy', color: '#F59E0B' },
    { id: 'late-night', name: 'Late Night Support', icon: 'moon', color: '#A78BFA' },
  ];

  const joinChatRoom = async (roomId: string) => {
    setSelectedRoom(roomId);
    socketService.joinRoom(roomId);
    
    // Load room messages
    try {
      const response = await api.get(`/api/chat/room/${roomId}?limit=50`);
      setRoomMessages(response.data.messages || []);
    } catch (error) {
      console.log('Failed to load room messages');
    }
  };

  const leaveChatRoom = () => {
    socketService.leaveRoom();
    setSelectedRoom(null);
    setRoomMessages([]);
    setRoomUsers([]);
  };

  const sendRoomMessage = () => {
    if (!chatInput.trim() || !selectedRoom) return;
    socketService.sendRoomMessage(chatInput.trim());
    setChatInput('');
  };

  // Socket listeners for room
  useEffect(() => {
    if (!selectedRoom) return;
    
    const unsubMessage = socketService.onRoomMessage((data: any) => {
      if (data.room_id === selectedRoom) {
        setRoomMessages(prev => [...prev, data]);
      }
    });
    
    const unsubUsers = socketService.onRoomUsers((data: any) => {
      if (data.room_id === selectedRoom) {
        setRoomUsers(data.users || []);
      }
    });
    
    return () => {
      unsubMessage();
      unsubUsers();
    };
  }, [selectedRoom]);

  const renderChatSection = () => {
    // Show room selection if no room selected
    if (!selectedRoom) {
      return (
        <ScrollView contentContainerStyle={styles.chatRoomList}>
          <Text style={styles.chatRoomTitle}>Group Chat Rooms</Text>
          <Text style={styles.chatRoomSubtitle}>Anonymous support communities</Text>
          
          {ROOM_INFO.map((room) => (
            <Pressable
              key={`room-${room.id}`}
              style={styles.chatRoomCard}
              onPress={() => joinChatRoom(room.id)}
            >
              <View style={[styles.chatRoomIcon, { backgroundColor: `${room.color}20` }]}>
                <Ionicons name={room.icon as any} size={24} color={room.color} />
              </View>
              <View style={styles.chatRoomInfo}>
                <Text style={styles.chatRoomName}>{room.name}</Text>
                <Text style={styles.chatRoomDesc}>Tap to join</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          ))}
          
          <View style={styles.chatRoomNote}>
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
            <Text style={styles.chatRoomNoteText}>All chats are anonymous. Be kind and supportive.</Text>
          </View>
        </ScrollView>
      );
    }

    // Show active chat room
    const currentRoom = ROOM_INFO.find(r => r.id === selectedRoom);
    
    return (
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={120}
      >
        {/* Room Header */}
        <View style={styles.chatHeader}>
          <Pressable style={styles.backToRooms} onPress={leaveChatRoom}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.chatHeaderCenter}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.chatTitle}>{currentRoom?.name || 'Chat'}</Text>
          </View>
          {roomUsers.length > 0 && (
            <Text style={styles.userCount}>{roomUsers.length} online</Text>
          )}
        </View>
        
        {/* Messages */}
        <FlatList
          ref={chatListRef}
          data={roomMessages}
          keyExtractor={(item, index) => `room-msg-${item._id || item.message_id || index}`}
          contentContainerStyle={styles.chatList}
          renderItem={({ item }) => (
            <View style={[styles.chatMessage, item.user_id === user?._id && styles.myMessage]}>
              <View style={[styles.chatAvatar, { borderColor: currentRoom?.color || colors.primary }]}>
                <Ionicons name="person" size={12} color={currentRoom?.color || colors.primary} />
              </View>
              <View style={[styles.chatBubble, item.user_id === user?._id && styles.myBubble]}>
                <Text style={[styles.chatUsername, item.user_id === user?._id && styles.myUsername]}>
                  {item.username || 'Anonymous'}
                </Text>
                <Text style={[styles.chatText, item.user_id === user?._id && styles.myText]}>
                  {item.message || item.content}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          }
        />
        
        {/* Input */}
        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={chatInput}
            onChangeText={setChatInput}
            onSubmitEditing={sendRoomMessage}
          />
          <Pressable style={styles.sendButton} onPress={sendRoomMessage}>
            <Ionicons name="send" size={18} color="#000" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // Connect Section
  // DMs Section - Direct Messages with Friends
  const renderDMsSection = () => {
    const AVATAR_ICONS_LOCAL: { [key: string]: string } = {
      shield: 'shield-checkmark', phoenix: 'flame', mountain: 'triangle', star: 'star',
      diamond: 'diamond', lightning: 'flash', heart: 'heart', rocket: 'rocket',
      crown: 'trophy', anchor: 'fitness',
    };
    const AVATAR_COLORS_LOCAL: { [key: string]: string } = {
      shield: '#00F5A0', phoenix: '#FF6B6B', mountain: '#4ECDC4', star: '#FFE66D',
      diamond: '#A78BFA', lightning: '#F59E0B', heart: '#EC4899', rocket: '#3B82F6',
      crown: '#FBBF24', anchor: '#10B981',
    };
    
    // If a friend is selected, show the DM conversation
    if (selectedDmFriend) {
      return (
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
          {/* DM Header */}
          <View style={styles.dmHeader}>
            <Pressable style={styles.backToRooms} onPress={() => setSelectedDmFriend(null)}>
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </Pressable>
            <View style={[styles.dmFriendAvatar, { borderColor: AVATAR_COLORS_LOCAL[selectedDmFriend.avatar_id] || colors.primary }]}>
              <Ionicons 
                name={(AVATAR_ICONS_LOCAL[selectedDmFriend.avatar_id] || 'person') as any} 
                size={16} 
                color={AVATAR_COLORS_LOCAL[selectedDmFriend.avatar_id] || colors.primary} 
              />
            </View>
            <View style={styles.chatHeaderCenter}>
              <Text style={styles.chatRoomName}>{selectedDmFriend.username}</Text>
              <Text style={styles.userCount}>Direct Message</Text>
            </View>
          </View>
          
          {/* DM Messages */}
          <FlatList
            ref={dmListRef}
            data={dmMessages}
            keyExtractor={(item, idx) => `dm-${item._id || idx}`}
            contentContainerStyle={styles.chatList}
            inverted
            ListEmptyComponent={
              <View style={[styles.emptyState, { transform: [{ scaleY: -1 }] }]}>
                <Ionicons name="chatbubble-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>Say hello to {selectedDmFriend.username}!</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.sender_id === user?._id;
              return (
                <View style={[styles.chatMessage, isMe && styles.myMessage]}>
                  <Text style={styles.chatMessageText}>{item.content}</Text>
                  <Text style={styles.chatMessageTime}>{getTimeAgo(item.created_at)}</Text>
                </View>
              );
            }}
          />
          
          {/* DM Input */}
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatMessageInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              value={dmInput}
              onChangeText={setDmInput}
            />
            <Pressable 
              style={styles.sendButton}
              onPress={async () => {
                if (!dmInput.trim()) return;
                try {
                  await api.post(`/api/dm/send/${selectedDmFriend._id}`, { content: dmInput.trim() });
                  setDmInput('');
                  // Refresh DMs
                  const res = await api.get(`/api/dm/conversation/${selectedDmFriend._id}`);
                  setDmMessages(res.data.messages || []);
                } catch (error) {
                  console.error('Failed to send DM:', error);
                }
              }}
            >
              <Ionicons name="send" size={20} color="#000" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      );
    }
    
    // Show friends list for DMs
    return (
      <ScrollView contentContainerStyle={styles.dmList}>
        <Text style={styles.chatRoomTitle}>Direct Messages</Text>
        <Text style={styles.chatRoomSubtitle}>Chat privately with friends</Text>
        
        {friends.length > 0 ? (
          friends.map((friend) => (
            <Pressable 
              key={`dm-friend-${friend._id}`}
              style={styles.chatRoomCard}
              onPress={async () => {
                setSelectedDmFriend(friend);
                try {
                  const res = await api.get(`/api/dm/conversation/${friend._id}`);
                  setDmMessages(res.data.messages || []);
                } catch (error) {
                  console.error('Failed to load DMs:', error);
                  setDmMessages([]);
                }
              }}
            >
              <View style={[styles.chatRoomIcon, { backgroundColor: `${AVATAR_COLORS_LOCAL[friend.avatar_id]}20` }]}>
                <Ionicons 
                  name={(AVATAR_ICONS_LOCAL[friend.avatar_id] || 'person') as any} 
                  size={24} 
                  color={AVATAR_COLORS_LOCAL[friend.avatar_id] || colors.primary} 
                />
              </View>
              <View style={styles.chatRoomInfo}>
                <Text style={styles.chatRoomName}>{friend.username}</Text>
                <Text style={styles.chatRoomDesc}>Tap to chat</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>Add friends from the community to DM them</Text>
          </View>
        )}
        
        <View style={styles.chatRoomNote}>
          <Ionicons name="information-circle" size={18} color={colors.textSecondary} />
          <Text style={styles.chatRoomNoteText}>
            Add friends from user profiles to start direct messaging
          </Text>
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TOOLS</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TOOLS</Text>
        <Text style={styles.headerSubtitle}>Recovery resources & community</Text>
      </View>

      {/* Tabs: Lock, Learn, Chat, DMs */}
      <View style={styles.tabBar}>
        {[
          { id: 'lock', icon: 'shield', label: 'Lock' },
          { id: 'learn', icon: 'play-circle', label: 'Learn' },
          { id: 'chat', icon: 'chatbubbles', label: 'Chat' },
          { id: 'dms', icon: 'mail', label: 'DMs' },
        ].map((tab) => (
          <Pressable
            key={`tools-tab-${tab.id}`}
            style={[styles.tab, activeSection === tab.id && styles.tabActive]}
            onPress={() => setActiveSection(tab.id as ToolSection)}
          >
            <View style={styles.tabIconWrapper}>
              <Ionicons 
                name={tab.icon as any} 
                size={18} 
                color={activeSection === tab.id ? colors.primary : colors.textMuted} 
              />
            </View>
            <Text style={[styles.tabLabel, activeSection === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeSection === 'lock' && renderLockSection()}
      {activeSection === 'learn' && renderLearnSection()}
      {activeSection === 'chat' && renderChatSection()}
      {activeSection === 'dms' && renderDMsSection()}

      {/* Enable Modal */}
      <Modal visible={showEnableModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enable Protection</Text>
            <Text style={styles.modalSubtitle}>Choose your lock duration</Text>
            <ScrollView style={styles.durationList}>
              {LOCK_DURATIONS.map((duration, index) => (
                <Pressable
                  key={`duration-${duration.value}-${index}`}
                  style={[styles.durationOption, selectedDuration === duration.value && styles.durationOptionSelected]}
                  onPress={() => setSelectedDuration(duration.value)}
                >
                  <View style={[styles.durationRadio, selectedDuration === duration.value && styles.durationRadioSelected]}>
                    {selectedDuration === duration.value && <View style={styles.durationRadioInner} />}
                  </View>
                  <View style={styles.durationInfo}>
                    <Text style={styles.durationLabel}>{duration.label}</Text>
                    <Text style={styles.durationDesc}>{duration.description}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelButton} onPress={() => setShowEnableModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmButton} onPress={handleEnableRecoveryMode}>
                <Text style={styles.modalConfirmText}>Activate</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unlock Modal */}
      <Modal visible={showUnlockModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Unlock</Text>
            <Text style={styles.modalSubtitle}>Please explain why you need to disable protection.</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter your reason..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={unlockReason}
              onChangeText={setUnlockReason}
            />
            <Text style={styles.warningText}>⚠️ 24-hour cooldown will start after submission</Text>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelButton} onPress={() => { setShowUnlockModal(false); setUnlockReason(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmButton} onPress={handleRequestUnlock}>
                <Text style={styles.modalConfirmText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.cardBackground,
    paddingTop: 50, paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, letterSpacing: 2 },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.cardBackground,
    borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 4,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 3 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabIconWrapper: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  tabLabelActive: { color: colors.primary },
  sectionContent: { padding: 16 },
  // Lock Section
  statusCard: {
    backgroundColor: colors.cardBackground, borderRadius: 16, overflow: 'hidden',
    marginBottom: 16, borderWidth: 1, borderColor: colors.border,
  },
  statusCardActive: { borderColor: colors.primary },
  statusGradient: { padding: 24, alignItems: 'center' },
  statusIcon: { marginBottom: 12 },
  statusTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textMuted, letterSpacing: 1 },
  statusTitleActive: { color: colors.primary },
  lockDuration: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  cooldownContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.warning}15`,
    borderRadius: 8, padding: 10, marginTop: 12, gap: 8,
  },
  cooldownLabel: { fontSize: 12, color: colors.warning },
  cooldownTimer: { fontSize: 16, fontWeight: 'bold', color: colors.warning },
  blockedCount: { fontSize: 12, color: colors.textMuted, marginTop: 12 },
  activateButton: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  activateGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10,
  },
  activateButtonText: { fontSize: 15, fontWeight: 'bold', color: '#000', letterSpacing: 1 },
  actionButtons: { gap: 10, marginBottom: 16 },
  requestUnlockButton: {
    backgroundColor: colors.cardBackground, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', padding: 14, borderRadius: 10, gap: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  requestUnlockText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  disableButton: {
    backgroundColor: colors.surface, padding: 14, borderRadius: 10,
    alignItems: 'center', borderWidth: 1, borderColor: colors.danger,
  },
  disableButtonText: { fontSize: 14, fontWeight: '600', color: colors.danger },
  emergencyCard: {
    backgroundColor: colors.danger, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  emergencyIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  emergencyContent: { flex: 1 },
  emergencyTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  emergencyText: { fontSize: 17, fontWeight: 'bold', color: '#FFF' },
  // VPN Instructions Styles
  vpnInstructionsCard: {
    backgroundColor: colors.cardBackground, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.border, marginTop: 16,
  },
  vpnInstructionsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20,
  },
  vpnInstructionsTitle: {
    fontSize: 16, fontWeight: '600', color: colors.textPrimary,
  },
  vpnStep: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16,
  },
  vpnStepNumber: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  vpnStepNumberText: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  vpnStepContent: { flex: 1 },
  vpnStepTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  vpnStepDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  vpnInstructionBox: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 14, marginBottom: 12, marginLeft: 40,
  },
  vpnInstructionPlatform: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  vpnInstructionText: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  vpnNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: `${colors.primary}15`, borderRadius: 10, padding: 14, marginTop: 12,
  },
  vpnNoteText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  // Protection Status
  protectionStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 10, padding: 14, marginBottom: 16,
  },
  protectionIndicator: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardBackground,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.border,
  },
  protectionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  protectionInfo: { flex: 1 },
  protectionLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  protectionDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  vpnDivider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  vpnSectionTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  vpnSectionDesc: { fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 18 },
  vpnInstructionSteps: { fontSize: 13, color: colors.textSecondary, lineHeight: 22 },
  dnsHighlight: { fontWeight: 'bold', color: colors.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  blockedCountCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(220, 38, 38, 0.1)', borderRadius: 12, padding: 16, marginTop: 16,
    borderWidth: 1, borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  blockedCountInfo: { flex: 1 },
  blockedCountNumber: { fontSize: 24, fontWeight: 'bold', color: '#DC2626' },
  blockedCountLabel: { fontSize: 12, color: colors.textMuted },
  // Learn Section
  learnList: { padding: 16, gap: 16 },
  updateCard: {
    backgroundColor: `${colors.primary}10`, borderRadius: 12, padding: 16,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  updateHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  updateLabel: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  updateTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  updateDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  messageCard: {
    backgroundColor: colors.cardBackground, borderRadius: 12, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  messageIcon: { marginBottom: 12 },
  messageText: {
    fontSize: 16, color: colors.textPrimary, textAlign: 'center',
    fontStyle: 'italic', lineHeight: 24,
  },
  messageAuthor: { fontSize: 12, color: colors.textMuted, marginTop: 12 },
  twitterCard: {
    backgroundColor: colors.cardBackground, borderRadius: 12, padding: 16,
    borderLeftWidth: 3, borderLeftColor: '#1DA1F2',
  },
  twitterHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  twitterAuthor: { fontSize: 13, fontWeight: '600', color: '#1DA1F2' },
  twitterText: { fontSize: 15, color: colors.textPrimary, lineHeight: 22 },
  twitterTime: { fontSize: 11, color: colors.textMuted, marginTop: 10 },
  videoCard: {
    backgroundColor: colors.cardBackground, borderRadius: 12, overflow: 'hidden',
  },
  thumbnailContainer: { position: 'relative', width: '100%', height: 180 },
  thumbnail: { width: '100%', height: '100%', backgroundColor: colors.surface },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  playIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  durationText: { fontSize: 11, fontWeight: '600', color: '#FFF' },
  sourceBadge: {
    position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, gap: 4,
  },
  sourceBadgeText: { fontSize: 10, fontWeight: '600', color: '#FFF' },
  sourceIconSmall: {
    width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  videoInfo: { padding: 14 },
  videoTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, lineHeight: 20 },
  videoMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  creatorName: { fontSize: 13, color: colors.textMuted },
  viewCount: { fontSize: 12, color: colors.textMuted },
  // Chat Section
  chatContainer: { flex: 1 },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground,
    padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.danger,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveText: { fontSize: 10, fontWeight: 'bold', color: '#FFF' },
  chatTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  chatSubtitle: { fontSize: 11, color: colors.textMuted, marginLeft: 'auto' },
  chatList: { padding: 12, paddingBottom: 80 },
  chatMessage: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  myMessage: { flexDirection: 'row-reverse' },
  chatAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5,
  },
  chatBubble: {
    backgroundColor: colors.cardBackground, borderRadius: 12, padding: 10, maxWidth: '75%',
  },
  myBubble: { backgroundColor: colors.primary },
  chatUsername: { fontSize: 10, fontWeight: '600', color: colors.primary, marginBottom: 2 },
  myUsername: { color: 'rgba(0,0,0,0.6)' },
  chatText: { fontSize: 14, color: colors.textPrimary },
  myText: { color: '#000' },
  chatInputContainer: {
    flexDirection: 'row', padding: 12, backgroundColor: colors.cardBackground,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 10,
  },
  chatInput: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.textPrimary,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  // DM Section
  dmList: { padding: 16 },
  dmHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground,
    padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  dmFriendAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
  },
  chatMessageInput: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.textPrimary,
  },
  chatMessageText: { fontSize: 14, color: colors.textPrimary },
  chatMessageTime: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  // Connect Section
  connectContent: { padding: 16 },
  connectTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  connectSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  usersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  userCard: {
    width: (SCREEN_WIDTH - 52) / 3, backgroundColor: colors.cardBackground,
    borderRadius: 12, padding: 12, alignItems: 'center',
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, marginBottom: 8,
  },
  userName: { fontSize: 12, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  userStreak: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  addButton: {
    marginTop: 8, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  // Feed Section
  feedList: { padding: 16 },
  feedHeader: { marginBottom: 16 },
  feedHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  feedHeaderSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  feedCard: {
    flexDirection: 'row', backgroundColor: colors.cardBackground, borderRadius: 12,
    padding: 14, marginBottom: 10, alignItems: 'center', gap: 12,
  },
  feedAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
  },
  feedContent: { flex: 1 },
  feedText: { fontSize: 14, color: colors.textSecondary },
  feedUsername: { fontWeight: '600', color: colors.textPrimary },
  feedTime: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  // Video Player Styles
  videoPlayerContainer: { flex: 1, backgroundColor: colors.background },
  videoPlayerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  videoPlayerClose: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  videoPlayerTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginHorizontal: 12 },
  videoPlayerExternal: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  videoPlayerWebview: { flex: 1, backgroundColor: '#000' },
  loadingMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 10 },
  loadingMoreText: { fontSize: 13, color: colors.textMuted },
  // Group Chat Room Selection
  chatRoomList: { padding: 16 },
  chatRoomTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  chatRoomSubtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 20 },
  chatRoomCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground,
    borderRadius: 14, padding: 16, marginBottom: 12, gap: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  chatRoomIcon: {
    width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center',
  },
  chatRoomInfo: { flex: 1 },
  chatRoomName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  chatRoomDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  chatRoomNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${colors.primary}10`,
    borderRadius: 10, padding: 14, marginTop: 12,
  },
  chatRoomNoteText: { flex: 1, fontSize: 13, color: colors.textSecondary },
  backToRooms: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  chatHeaderCenter: { flex: 1, marginLeft: 8 },
  userCount: { fontSize: 12, color: colors.textMuted },
  // Empty States
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  emptySubtext: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.cardBackground, borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, maxHeight: '75%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
  durationList: { marginBottom: 16, maxHeight: 240 },
  durationOption: {
    flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surface,
    borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent', gap: 12, marginBottom: 8,
  },
  durationOptionSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  durationRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  durationRadioSelected: { borderColor: colors.primary },
  durationRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  durationInfo: { flex: 1 },
  durationLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  durationDesc: { fontSize: 11, color: colors.textSecondary },
  reasonInput: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 12, fontSize: 14,
    color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top', marginBottom: 10,
  },
  warningText: { fontSize: 11, color: colors.warning, marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalCancelButton: {
    flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: colors.surface,
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  modalConfirmButton: {
    flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: colors.primary,
  },
  modalConfirmText: { fontSize: 14, fontWeight: 'bold', color: '#000' },
});
