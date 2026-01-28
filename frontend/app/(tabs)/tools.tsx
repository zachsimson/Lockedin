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
import { colors } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

// Content source icons and colors
const SOURCE_CONFIG: { [key: string]: { icon: string; color: string; label: string } } = {
  YOUTUBE: { icon: 'play-circle', color: '#FF0000', label: 'YouTube' },
  TIKTOK: { icon: 'musical-notes', color: '#010101', label: 'TikTok' },
  TWITTER: { icon: 'chatbubble-ellipses', color: '#1DA1F2', label: 'Twitter' },
  TED: { icon: 'mic', color: '#E62B1E', label: 'TED Talk' },
  ARTICLE: { icon: 'document-text', color: '#6366F1', label: 'Article' },
  PODCAST: { icon: 'headset', color: '#8B5CF6', label: 'Podcast' },
};

// Mock content for Learn Feed (would be server-driven in production)
const MOCK_LEARN_CONTENT = [
  {
    _id: '1',
    source_type: 'YOUTUBE',
    title: 'The Science of Addiction: How Your Brain Gets Hooked',
    creator_name: 'TED-Ed',
    thumbnail_url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800',
    video_url: 'https://www.youtube.com/watch?v=example1',
    duration: '12:34',
    views: '2.1M',
    created_at: new Date().toISOString(),
  },
  {
    _id: '2',
    source_type: 'TED',
    title: 'Everything You Think You Know About Addiction is Wrong',
    creator_name: 'Johann Hari',
    thumbnail_url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800',
    video_url: 'https://www.ted.com/talks/example',
    duration: '14:42',
    views: '15M',
    created_at: new Date().toISOString(),
  },
  {
    _id: '3',
    source_type: 'TWITTER',
    title: '"Recovery is not about being perfect. It\'s about getting up one more time than you fall." — Shared by @RecoveryCoach',
    creator_name: '@RecoveryCoach',
    content_type: 'text',
    created_at: new Date().toISOString(),
  },
  {
    _id: '4',
    source_type: 'TIKTOK',
    title: '60-Second Grounding Technique When Urges Hit',
    creator_name: '@MindfulRecovery',
    thumbnail_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    video_url: 'https://www.tiktok.com/@example',
    duration: '0:58',
    views: '890K',
    created_at: new Date().toISOString(),
  },
  {
    _id: '5',
    source_type: 'YOUTUBE',
    title: 'How I Quit Gambling After 15 Years - My Story',
    creator_name: 'Real Recovery Stories',
    thumbnail_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
    video_url: 'https://www.youtube.com/watch?v=example2',
    duration: '18:22',
    views: '456K',
    created_at: new Date().toISOString(),
  },
  {
    _id: '6',
    source_type: 'ARTICLE',
    title: '10 Healthy Habits That Replace Gambling Urges',
    creator_name: 'Recovery Blog',
    thumbnail_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    content_type: 'article',
    read_time: '5 min read',
    created_at: new Date().toISOString(),
  },
  {
    _id: '7',
    source_type: 'PODCAST',
    title: 'Episode 47: Building a Support System in Recovery',
    creator_name: 'Recovery Podcast',
    thumbnail_url: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800',
    duration: '45:00',
    created_at: new Date().toISOString(),
  },
  {
    _id: '8',
    source_type: 'TWITTER',
    title: '"Day 365. One year clean. If you\'re on day 1, keep going. I was once where you are." — @GamblerNoMore',
    creator_name: '@GamblerNoMore',
    content_type: 'text',
    created_at: new Date().toISOString(),
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

type ToolSection = 'lock' | 'feed' | 'learn' | 'chat' | 'connect';

export default function Tools() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [activeSection, setActiveSection] = useState<ToolSection>('lock');
  
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
  const [learnContent, setLearnContent] = useState<any[]>(MOCK_LEARN_CONTENT);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [learnFilter, setLearnFilter] = useState<string>('all');
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const chatListRef = useRef<FlatList>(null);

  const loadData = async () => {
    try {
      const [statusRes, domainsRes, activityRes, mediaRes, chatRes, suggestedRes] = await Promise.all([
        api.get('/api/vpn/status').catch(() => ({ data: {} })),
        api.get('/api/blocking/domains').catch(() => ({ data: { domains: [] } })),
        api.get('/api/community/activity?limit=30').catch(() => ({ data: { activities: [] } })),
        api.get('/api/media').catch(() => ({ data: { media: [] } })),
        api.get('/api/community/chat?limit=50').catch(() => ({ data: { messages: [] } })),
        api.get('/api/community/suggested?limit=12').catch(() => ({ data: { users: [] } })),
      ]);

      setVpnStatus(statusRes.data);
      setBlockedDomains(domainsRes.data.domains || []);
      setActivities(activityRes.data.activities || []);
      
      // Merge server media with mock content
      const serverMedia = mediaRes.data.media || [];
      if (serverMedia.length > 0) {
        setLearnContent([...serverMedia, ...MOCK_LEARN_CONTENT]);
      }
      
      setChatMessages(chatRes.data.messages || []);
      setSuggestedUsers(suggestedRes.data.users || []);
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

  // VPN Handlers
  const handleEnableRecoveryMode = async () => {
    try {
      await api.post('/api/vpn/enable', { lock_duration: selectedDuration });
      setShowEnableModal(false);
      await loadData();
      Alert.alert('🛡️ Recovery Mode Activated!', `Protection is now active. Stay strong!`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to enable Recovery Mode');
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
      Alert.alert('Request Submitted', '24-hour cooldown has started.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit unlock request');
    }
  };

  const handleDisableVPN = async () => {
    Alert.alert('Disable Recovery Mode?', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disable',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/api/vpn/disable');
            await loadData();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to disable');
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
      chatListRef.current?.scrollToEnd();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send message');
    }
  };

  // Friend request
  const sendFriendRequest = async (userId: string) => {
    try {
      await api.post('/api/friends/request', { receiver_id: userId });
      Alert.alert('Request Sent', 'Friend request sent!');
      setSuggestedUsers(prev => prev.filter(u => u._id !== userId));
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send request');
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
  const isPendingApproval = vpnStatus?.unlock_requested && !vpnStatus?.unlock_approved;

  // Filter learn content
  const filteredLearnContent = learnFilter === 'all' 
    ? learnContent 
    : learnContent.filter(item => item.source_type === learnFilter);

  // Load more content (infinite scroll simulation)
  const loadMoreContent = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    // Simulate loading more content
    setTimeout(() => {
      setLoadingMore(false);
    }, 1000);
  };

  // Lock Section
  const renderLockSection = () => (
    <ScrollView
      contentContainerStyle={styles.sectionContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.statusCard, isEnabled && styles.statusCardActive]}>
        <LinearGradient
          colors={isEnabled ? ['#00F5A020', '#00F5A005'] : ['transparent', 'transparent']}
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
    </ScrollView>
  );

  // Feed Section
  const renderFeedSection = () => (
    <FlatList
      data={activities}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.feedList}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <Pressable 
          style={styles.feedCard}
          onPress={() => router.push(`/profile/${item.user_id}`)}
        >
          <View style={[styles.feedAvatar, { borderColor: AVATAR_COLORS[item.avatar_id] || colors.primary }]}>
            <Ionicons 
              name={(AVATAR_ICONS[item.avatar_id] || 'person') as any} 
              size={18} 
              color={AVATAR_COLORS[item.avatar_id] || colors.primary} 
            />
          </View>
          <View style={styles.feedContent}>
            <Text style={styles.feedUsername}>{item.username}</Text>
            <Text style={styles.feedAction}>{item.activity_description || item.activity_type}</Text>
            <Text style={styles.feedTime}>{getTimeAgo(item.created_at)}</Text>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="pulse-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No activity yet</Text>
          <Text style={styles.emptySubtext}>Check back later for community updates</Text>
        </View>
      }
    />
  );

  // Learn Section (REBUILT)
  const renderLearnSection = () => (
    <View style={styles.learnContainer}>
      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {[
          { id: 'all', label: 'All', icon: 'apps' },
          { id: 'YOUTUBE', label: 'YouTube', icon: 'logo-youtube' },
          { id: 'TIKTOK', label: 'TikTok', icon: 'musical-notes' },
          { id: 'TED', label: 'TED', icon: 'mic' },
          { id: 'TWITTER', label: 'Twitter', icon: 'logo-twitter' },
          { id: 'ARTICLE', label: 'Articles', icon: 'document-text' },
        ].map((filter) => (
          <Pressable
            key={filter.id}
            style={[styles.filterChip, learnFilter === filter.id && styles.filterChipActive]}
            onPress={() => setLearnFilter(filter.id)}
          >
            <Ionicons 
              name={filter.icon as any} 
              size={14} 
              color={learnFilter === filter.id ? '#000' : colors.textMuted} 
            />
            <Text style={[styles.filterLabel, learnFilter === filter.id && styles.filterLabelActive]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content Feed */}
      <FlatList
        data={filteredLearnContent}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.learnList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMoreContent}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => {
          const source = SOURCE_CONFIG[item.source_type] || SOURCE_CONFIG.ARTICLE;
          const isTextContent = item.content_type === 'text';
          
          if (isTextContent) {
            // Twitter-style text card
            return (
              <View style={styles.textCard}>
                <View style={styles.textCardHeader}>
                  <View style={[styles.sourceIconSmall, { backgroundColor: source.color }]}>
                    <Ionicons name={source.icon as any} size={12} color="#FFF" />
                  </View>
                  <Text style={styles.textCardCreator}>{item.creator_name}</Text>
                </View>
                <Text style={styles.textCardContent}>{item.title}</Text>
                <Text style={styles.textCardTime}>{getTimeAgo(item.created_at)}</Text>
              </View>
            );
          }
          
          // Video/Media card
          return (
            <Pressable 
              style={styles.learnCard}
              onPress={() => item.video_url && Linking.openURL(item.video_url)}
            >
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: item.thumbnail_url || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800' }}
                  style={styles.thumbnail}
                />
                <View style={styles.thumbnailOverlay}>
                  <View style={styles.playIcon}>
                    <Ionicons name="play" size={24} color="#FFF" />
                  </View>
                </View>
                {item.duration && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{item.duration}</Text>
                  </View>
                )}
              </View>
              <View style={styles.learnCardInfo}>
                <View style={styles.learnCardHeader}>
                  <View style={[styles.sourceIcon, { backgroundColor: source.color }]}>
                    <Ionicons name={source.icon as any} size={14} color="#FFF" />
                  </View>
                  <Text style={styles.sourceLabel}>{source.label}</Text>
                  {item.views && <Text style={styles.viewCount}>{item.views} views</Text>}
                </View>
                <Text style={styles.learnTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.creatorName}>{item.creator_name}</Text>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="videocam-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No content found</Text>
          </View>
        }
      />
    </View>
  );

  // Chat Section
  const renderChatSection = () => (
    <KeyboardAvoidingView 
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={120}
    >
      <View style={styles.chatHeader}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={styles.chatTitle}>Community Chat</Text>
      </View>
      
      <FlatList
        ref={chatListRef}
        data={chatMessages}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.chatList}
        renderItem={({ item }) => (
          <Pressable 
            style={[styles.chatMessage, item.user_id === user?._id && styles.myMessage]}
            onPress={() => router.push(`/profile/${item.user_id}`)}
          >
            <View style={[styles.chatAvatar, { borderColor: AVATAR_COLORS[item.avatar_id] || colors.primary }]}>
              <Ionicons 
                name={(AVATAR_ICONS[item.avatar_id] || 'person') as any} 
                size={12} 
                color={AVATAR_COLORS[item.avatar_id] || colors.primary} 
              />
            </View>
            <View style={[styles.chatBubble, item.user_id === user?._id && styles.myBubble]}>
              <Text style={styles.chatUsername}>{item.username}</Text>
              <Text style={styles.chatText}>{item.content}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />
      
      <View style={styles.chatInputContainer}>
        <TextInput
          style={styles.chatInput}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          value={chatInput}
          onChangeText={setChatInput}
          onSubmitEditing={sendChatMessage}
        />
        <Pressable style={styles.sendButton} onPress={sendChatMessage}>
          <Ionicons name="send" size={18} color="#000" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );

  // Connect Section
  const renderConnectSection = () => (
    <ScrollView
      contentContainerStyle={styles.connectContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.connectTitle}>Suggested Connections</Text>
      <Text style={styles.connectSubtitle}>People on a similar journey</Text>
      
      <View style={styles.usersGrid}>
        {suggestedUsers.map((usr) => (
          <Pressable 
            key={usr._id} 
            style={styles.userCard}
            onPress={() => router.push(`/profile/${usr._id}`)}
          >
            <View style={[styles.userAvatar, { borderColor: AVATAR_COLORS[usr.avatar_id] || colors.primary }]}>
              <Ionicons 
                name={(AVATAR_ICONS[usr.avatar_id] || 'person') as any} 
                size={22} 
                color={AVATAR_COLORS[usr.avatar_id] || colors.primary} 
              />
            </View>
            <Text style={styles.userName} numberOfLines={1}>{usr.username}</Text>
            {usr.days_clean !== undefined && (
              <Text style={styles.userStreak}>{usr.days_clean}d clean</Text>
            )}
            <Pressable 
              style={styles.addButton}
              onPress={(e) => { e.stopPropagation(); sendFriendRequest(usr._id); }}
            >
              <Ionicons name="person-add" size={14} color="#000" />
            </Pressable>
          </Pressable>
        ))}
      </View>

      {suggestedUsers.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No suggestions right now</Text>
          <Text style={styles.emptySubtext}>Check back later for new connections</Text>
        </View>
      )}
    </ScrollView>
  );

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

      {/* Section Tabs */}
      <View style={styles.tabBar}>
        {[
          { id: 'lock', icon: 'shield', label: 'Lock' },
          { id: 'feed', icon: 'pulse', label: 'Feed' },
          { id: 'learn', icon: 'play-circle', label: 'Learn' },
          { id: 'chat', icon: 'chatbubbles', label: 'Chat' },
          { id: 'connect', icon: 'people', label: 'Connect' },
        ].map((tab) => (
          <Pressable
            key={tab.id}
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

      {/* Content */}
      {activeSection === 'lock' && renderLockSection()}
      {activeSection === 'feed' && renderFeedSection()}
      {activeSection === 'learn' && renderLearnSection()}
      {activeSection === 'chat' && renderChatSection()}
      {activeSection === 'connect' && renderConnectSection()}

      {/* Enable Modal */}
      <Modal visible={showEnableModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enable Protection</Text>
            <Text style={styles.modalSubtitle}>Choose your lock duration</Text>
            <ScrollView style={styles.durationList}>
              {LOCK_DURATIONS.map((duration) => (
                <Pressable
                  key={duration.value}
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
            <Text style={styles.warningText}>
              ⚠️ 24-hour cooldown will start after submission
            </Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.cardBackground,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 3,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabIconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.primary,
  },
  sectionContent: {
    padding: 16,
  },
  // Lock Section
  statusCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusCardActive: {
    borderColor: colors.primary,
  },
  statusGradient: {
    padding: 24,
    alignItems: 'center',
  },
  statusIcon: {
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  statusTitleActive: {
    color: colors.primary,
  },
  lockDuration: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  cooldownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}15`,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  cooldownLabel: {
    fontSize: 12,
    color: colors.warning,
  },
  cooldownTimer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.warning,
  },
  blockedCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 12,
  },
  activateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  activateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  activateButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1,
  },
  actionButtons: {
    gap: 10,
    marginBottom: 16,
  },
  requestUnlockButton: {
    backgroundColor: colors.cardBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestUnlockText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  disableButton: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  disableButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
  emergencyCard: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emergencyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  emergencyText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFF',
  },
  // Feed Section
  feedList: {
    padding: 16,
  },
  feedCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'flex-start',
    gap: 12,
  },
  feedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  feedContent: {
    flex: 1,
  },
  feedUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  feedAction: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  feedTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  // Learn Section
  learnContainer: {
    flex: 1,
  },
  filterBar: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterLabelActive: {
    color: '#000',
  },
  learnList: {
    padding: 16,
  },
  learnCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  learnCardInfo: {
    padding: 14,
  },
  learnCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sourceIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceIconSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  viewCount: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  learnTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  creatorName: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
  },
  textCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#1DA1F2',
  },
  textCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  textCardCreator: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  textCardContent: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  textCardTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 10,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  // Chat Section
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chatList: {
    padding: 12,
    paddingBottom: 80,
  },
  chatMessage: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  myMessage: {
    flexDirection: 'row-reverse',
  },
  chatAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  chatBubble: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 10,
    maxWidth: '75%',
  },
  myBubble: {
    backgroundColor: colors.primary,
  },
  chatUsername: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  chatText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Connect Section
  connectContent: {
    padding: 16,
  },
  connectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  connectSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
  usersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  userCard: {
    width: (SCREEN_WIDTH - 52) / 3,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 8,
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  userStreak: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  addButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  // Empty States
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  durationList: {
    marginBottom: 16,
    maxHeight: 240,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 12,
    marginBottom: 8,
  },
  durationOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  durationRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationRadioSelected: {
    borderColor: colors.primary,
  },
  durationRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  durationInfo: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  durationDesc: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  reasonInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  warningText: {
    fontSize: 11,
    color: colors.warning,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
});
