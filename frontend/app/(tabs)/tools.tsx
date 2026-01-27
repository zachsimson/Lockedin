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
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Avatar mappings
const AVATAR_ICONS: { [key: string]: string } = {
  shield: 'shield-checkmark',
  phoenix: 'flame',
  mountain: 'triangle',
  star: 'star',
  diamond: 'diamond',
  lightning: 'flash',
  heart: 'heart',
  rocket: 'rocket',
  crown: 'trophy',
  anchor: 'fitness',
};

const AVATAR_COLORS: { [key: string]: string } = {
  shield: '#00F5A0',
  phoenix: '#FF6B6B',
  mountain: '#4ECDC4',
  star: '#FFE66D',
  diamond: '#A78BFA',
  lightning: '#F59E0B',
  heart: '#EC4899',
  rocket: '#3B82F6',
  crown: '#FBBF24',
  anchor: '#10B981',
};

interface VPNStatus {
  recovery_mode_enabled: boolean;
  lock_duration: string | null;
  lock_started_at: string | null;
  lock_expires_at: string | null;
  unlock_requested: boolean;
  unlock_requested_at: string | null;
  unlock_request_reason: string | null;
  unlock_approved: boolean;
  unlock_approved_at: string | null;
  unlock_effective_at: string | null;
  cooldown_remaining_seconds: number | null;
  can_disable: boolean;
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
  const [mediaContent, setMediaContent] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  
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
      setMediaContent(mediaRes.data.media || []);
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
      Alert.alert('Request Submitted', 'Your unlock request has been submitted.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit unlock request');
    }
  };

  const handleDisableVPN = async () => {
    Alert.alert(
      'Disable Recovery Mode?',
      'Are you sure you want to disable protection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/api/vpn/disable');
              await loadData();
              Alert.alert('Recovery Mode Disabled', 'Protection has been turned off.');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to disable');
            }
          },
        },
      ]
    );
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

  // Lock Section (Recovery Mode)
  const renderLockSection = () => (
    <ScrollView
      contentContainerStyle={styles.sectionContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.statusCard, isEnabled && styles.statusCardActive]}>
        <View style={styles.statusIcon}>
          <Ionicons 
            name={isEnabled ? "shield-checkmark" : "shield-outline"} 
            size={64} 
            color={isEnabled ? colors.primary : colors.textMuted} 
          />
        </View>
        <Text style={[styles.statusTitle, isEnabled && styles.statusTitleActive]}>
          {isEnabled ? 'PROTECTION ACTIVE' : 'PROTECTION OFF'}
        </Text>
        {isEnabled && vpnStatus?.lock_duration && (
          <Text style={styles.lockDuration}>
            Lock: {LOCK_DURATIONS.find(d => d.value === vpnStatus.lock_duration)?.label || vpnStatus.lock_duration}
          </Text>
        )}
        {isInCooldown && cooldownTime && (
          <View style={styles.cooldownContainer}>
            <Ionicons name="time" size={24} color={colors.warning} />
            <Text style={styles.cooldownLabel}>Unlock approved. Changes in:</Text>
            <Text style={styles.cooldownTimer}>{cooldownTime}</Text>
          </View>
        )}
        {isPendingApproval && (
          <View style={styles.pendingContainer}>
            <Ionicons name="hourglass" size={24} color={colors.warning} />
            <Text style={styles.pendingText}>Unlock request pending approval</Text>
          </View>
        )}
        <Text style={styles.blockedCount}>{blockedDomains.length} gambling sites blocked</Text>
      </View>

      {!isEnabled ? (
        <Pressable style={styles.activateButton} onPress={() => setShowEnableModal(true)}>
          <Ionicons name="lock-closed" size={24} color="#000" />
          <Text style={styles.activateButtonText}>ACTIVATE RECOVERY MODE</Text>
        </Pressable>
      ) : (
        <View style={styles.actionButtons}>
          {!vpnStatus?.unlock_requested && !vpnStatus?.unlock_approved && (
            <Pressable style={styles.requestUnlockButton} onPress={() => setShowUnlockModal(true)}>
              <Ionicons name="key" size={20} color={colors.textPrimary} />
              <Text style={styles.requestUnlockText}>Request Unlock</Text>
            </Pressable>
          )}
          {vpnStatus?.can_disable && (
            <Pressable style={styles.disableButton} onPress={handleDisableVPN}>
              <Ionicons name="shield-half" size={20} color={colors.danger} />
              <Text style={styles.disableButtonText}>Disable Protection</Text>
            </Pressable>
          )}
        </View>
      )}

      <Pressable 
        style={styles.emergencyCard}
        onPress={() => Linking.openURL('tel:1-800-522-4700')}
      >
        <Ionicons name="call" size={28} color="#FFF" />
        <View style={styles.emergencyContent}>
          <Text style={styles.emergencyTitle}>Crisis Support</Text>
          <Text style={styles.emergencyText}>1-800-522-4700</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
      </Pressable>
    </ScrollView>
  );

  // Feed Section (Community Activity)
  const renderFeedSection = () => (
    <FlatList
      data={activities}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <Pressable 
          style={styles.activityItem}
          onPress={() => router.push(`/profile/${item.user_id}`)}
        >
          <View style={[styles.avatar, { borderColor: AVATAR_COLORS[item.avatar_id] || colors.primary }]}>
            <Ionicons 
              name={(AVATAR_ICONS[item.avatar_id] || 'person') as any} 
              size={18} 
              color={AVATAR_COLORS[item.avatar_id] || colors.primary} 
            />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              <Text style={styles.activityUsername}>{item.username}</Text>
              {' '}{item.activity_description || item.activity_type}
            </Text>
            <Text style={styles.activityTime}>{getTimeAgo(item.created_at)}</Text>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="pulse-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No activity yet</Text>
        </View>
      }
    />
  );

  // Learn Section (TikTok-style Videos)
  const renderLearnSection = () => (
    <FlatList
      data={mediaContent}
      keyExtractor={(item) => item._id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={SCREEN_HEIGHT - 200}
      decelerationRate="fast"
      onMomentumScrollEnd={(e) => {
        const index = Math.floor(e.nativeEvent.contentOffset.y / (SCREEN_HEIGHT - 200));
        setCurrentVideoIndex(index);
      }}
      renderItem={({ item, index }) => (
        <View style={styles.videoCard}>
          <Image
            source={{ uri: item.thumbnail_url || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800' }}
            style={styles.videoThumbnail}
          />
          <View style={styles.videoOverlay}>
            <Pressable 
              style={styles.playButton}
              onPress={() => item.video_url && Linking.openURL(item.video_url)}
            >
              <Ionicons name="play" size={40} color="#FFF" />
            </Pressable>
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.videoSource}>{item.source || 'Video'}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="videocam-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No videos available</Text>
        </View>
      }
    />
  );

  // Chat Section (24/7 Public Chat)
  const renderChatSection = () => (
    <KeyboardAvoidingView 
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={120}
    >
      <FlatList
        ref={chatListRef}
        data={chatMessages}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.chatList}
        inverted={false}
        renderItem={({ item }) => (
          <Pressable 
            style={[styles.chatMessage, item.user_id === user?._id && styles.myMessage]}
            onPress={() => router.push(`/profile/${item.user_id}`)}
          >
            <View style={[styles.chatAvatar, { borderColor: AVATAR_COLORS[item.avatar_id] || colors.primary }]}>
              <Ionicons 
                name={(AVATAR_ICONS[item.avatar_id] || 'person') as any} 
                size={14} 
                color={AVATAR_COLORS[item.avatar_id] || colors.primary} 
              />
            </View>
            <View style={styles.chatBubble}>
              <Text style={styles.chatUsername}>{item.username}</Text>
              <Text style={styles.chatText}>{item.content}</Text>
              <Text style={styles.chatTime}>{getTimeAgo(item.created_at)}</Text>
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
          placeholder="Say something..."
          placeholderTextColor={colors.textMuted}
          value={chatInput}
          onChangeText={setChatInput}
          onSubmitEditing={sendChatMessage}
        />
        <Pressable style={styles.sendButton} onPress={sendChatMessage}>
          <Ionicons name="send" size={20} color="#000" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );

  // Connect Section (Friends)
  const renderConnectSection = () => (
    <ScrollView
      contentContainerStyle={styles.sectionContent}
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
                size={24} 
                color={AVATAR_COLORS[usr.avatar_id] || colors.primary} 
              />
            </View>
            <Text style={styles.userName} numberOfLines={1}>{usr.username}</Text>
            {usr.days_clean !== undefined && (
              <Text style={styles.userStreak}>{usr.days_clean}d streak</Text>
            )}
            <Pressable 
              style={styles.addButton}
              onPress={() => sendFriendRequest(usr._id)}
            >
              <Ionicons name="person-add" size={16} color="#000" />
            </Pressable>
          </Pressable>
        ))}
      </View>

      {suggestedUsers.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No suggestions right now</Text>
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
          <Text style={styles.loadingText}>Loading...</Text>
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
            <Ionicons 
              name={tab.icon as any} 
              size={18} 
              color={activeSection === tab.id ? colors.primary : colors.textMuted} 
            />
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
            <Text style={styles.modalTitle}>Enable Recovery Mode</Text>
            <Text style={styles.modalSubtitle}>Choose your lock duration</Text>
            <ScrollView style={styles.durationList}>
              {LOCK_DURATIONS.map((duration) => (
                <Pressable
                  key={duration.value}
                  style={[styles.durationOption, selectedDuration === duration.value && styles.durationOptionSelected]}
                  onPress={() => setSelectedDuration(duration.value)}
                >
                  <View style={styles.durationRadio}>
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
              placeholder="Enter your reason (min 10 characters)..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={unlockReason}
              onChangeText={setUnlockReason}
            />
            <Text style={styles.warningText}>
              ⚠️ There will be a 24-hour cooldown before you can disable protection.
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 2,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.primary,
  },
  sectionContent: {
    padding: 16,
  },
  listContent: {
    padding: 16,
  },
  // Lock Section
  statusCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  statusCardActive: {
    borderColor: colors.primary,
  },
  statusIcon: {
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
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
    marginTop: 6,
  },
  cooldownContainer: {
    backgroundColor: `${colors.warning}20`,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
    width: '100%',
  },
  cooldownLabel: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 4,
  },
  cooldownTimer: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.warning,
    marginTop: 4,
  },
  pendingContainer: {
    backgroundColor: `${colors.warning}20`,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingText: {
    fontSize: 13,
    color: colors.warning,
    flex: 1,
  },
  blockedCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 12,
  },
  activateButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  activateButtonText: {
    fontSize: 16,
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
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestUnlockText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  disableButton: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  disableButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
  emergencyCard: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  emergencyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  // Feed Section
  activityItem: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activityUsername: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  // Learn Section
  videoCard: {
    height: SCREEN_HEIGHT - 200,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
  },
  videoThumbnail: {
    width: '100%',
    height: '70%',
    backgroundColor: colors.surface,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    height: '70%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  videoSource: {
    fontSize: 13,
    color: colors.textMuted,
  },
  // Chat Section
  chatContainer: {
    flex: 1,
  },
  chatList: {
    padding: 16,
    paddingBottom: 80,
  },
  chatMessage: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  myMessage: {
    flexDirection: 'row-reverse',
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  chatBubble: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 10,
    maxWidth: '75%',
  },
  chatUsername: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  chatText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  chatTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Connect Section
  connectTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  connectSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
  },
  usersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  userCard: {
    width: (SCREEN_WIDTH - 56) / 3,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 8,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  userStreak: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  addButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  // Empty States
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  durationList: {
    marginBottom: 20,
    maxHeight: 280,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
    marginBottom: 10,
  },
  durationOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  durationRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  durationInfo: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  durationDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reasonInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    color: colors.warning,
    marginBottom: 20,
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
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
  },
});
