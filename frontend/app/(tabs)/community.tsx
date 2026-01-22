import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  FlatList,
  Image,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import api from '../../src/services/api';

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

// Premium Emoji System
const PREMIUM_EMOJIS = [
  { id: 'fire', emoji: '🔥', name: 'Streak Fire', gradient: ['#FF512F', '#F09819'] },
  { id: 'muscle', emoji: '💪', name: 'Strength', gradient: ['#11998E', '#38EF7D'] },
  { id: 'clap', emoji: '👏', name: 'Encouragement', gradient: ['#667EEA', '#764BA2'] },
  { id: 'heart', emoji: '❤️', name: 'Love', gradient: ['#E53935', '#E35D5B'] },
  { id: 'brain', emoji: '🧠', name: 'Mental', gradient: ['#A18CD1', '#FBC2EB'] },
];

interface CommunityActivity {
  _id: string;
  user_id: string;
  username: string;
  avatar_id: string;
  activity_type: string;
  activity_value: string;
  created_at: string;
  reactions?: { [key: string]: number };
}

interface ChatMessage {
  _id: string;
  user_id: string;
  username: string;
  avatar_id: string;
  content: string;
  created_at: string;
  reactions?: { [key: string]: number };
}

interface Media {
  id: string;
  title: string;
  description: string;
  source_type: string;
  video_url: string;
  thumbnail_url: string;
  duration: string;
}

interface SuggestedUser {
  _id: string;
  username: string;
  avatar_id: string;
  current_streak_days?: number;
}

export default function Community() {
  const { user } = useAuth();
  const router = useRouter();
  const chatListRef = useRef<FlatList>(null);
  
  const [activeSection, setActiveSection] = useState<'feed' | 'media' | 'chat' | 'friends'>('feed');
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [mediaContent, setMediaContent] = useState<Media[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [activityRes, mediaRes, suggestionsRes] = await Promise.all([
        api.get('/api/community/activity?limit=30'),
        api.get('/api/media'),
        api.get('/api/community/suggested?limit=8'),
      ]);
      
      setActivities(activityRes.data.activities || []);
      setMediaContent(mediaRes.data.media || []);
      setSuggestions(suggestionsRes.data.suggestions || []);
    } catch (error) {
      console.error('Failed to load community data:', error);
    }
  };

  const loadChatMessages = async () => {
    try {
      const response = await api.get('/api/chat/messages?limit=50');
      setChatMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  useEffect(() => {
    if (activeSection === 'chat') {
      loadChatMessages();
    }
  }, [activeSection]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    if (activeSection === 'chat') {
      await loadChatMessages();
    }
    setRefreshing(false);
  }, [activeSection]);

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    try {
      await api.post('/api/chat/messages', { content: chatInput.trim() });
      setChatInput('');
      await loadChatMessages();
      chatListRef.current?.scrollToEnd();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const addReaction = async (targetId: string, targetType: string, emojiId: string) => {
    try {
      await api.post('/api/reactions', {
        emoji_id: emojiId,
        target_type: targetType,
        target_id: targetId,
      });
      setShowReactionPicker(null);
      
      // Refresh data
      if (targetType === 'activity') {
        const res = await api.get('/api/community/activity?limit=30');
        setActivities(res.data.activities || []);
      } else {
        await loadChatMessages();
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      await api.post('/api/friends/request', { receiver_id: userId });
      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s._id !== userId));
    } catch (error: any) {
      console.error('Failed to send friend request:', error);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const getActivityMessage = (activity: CommunityActivity) => {
    switch (activity.activity_type) {
      case 'CHECK_IN': return `checked in — ${activity.activity_value}`;
      case 'RESET': return 'reset their counter 💪';
      case 'STREAK_MILESTONE': return `hit ${activity.activity_value}! 🎉`;
      case 'ACHIEVEMENT_UNLOCKED': return `unlocked "${activity.activity_value}" 🏆`;
      default: return activity.activity_value;
    }
  };

  const renderActivityItem = ({ item }: { item: CommunityActivity }) => {
    const avatarIcon = AVATAR_ICONS[item.avatar_id] || 'shield-checkmark';
    const avatarColor = AVATAR_COLORS[item.avatar_id] || '#00F5A0';
    
    return (
      <Pressable 
        style={styles.activityItem}
        onPress={() => router.push(`/profile/${item.user_id}`)}
      >
        <View style={[styles.avatar, { borderColor: avatarColor }]}>
          <Ionicons name={avatarIcon as any} size={18} color={avatarColor} />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityText}>
            <Text style={styles.activityUser}>{item.username}</Text>
            {' '}{getActivityMessage(item)}
          </Text>
          <View style={styles.activityMeta}>
            <Text style={styles.activityTime}>{formatTimeAgo(item.created_at)}</Text>
            <Pressable 
              style={styles.reactionButton}
              onPress={() => setShowReactionPicker(item._id)}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderChatMessage = ({ item }: { item: ChatMessage }) => {
    const avatarIcon = AVATAR_ICONS[item.avatar_id] || 'shield-checkmark';
    const avatarColor = AVATAR_COLORS[item.avatar_id] || '#00F5A0';
    const isMe = item.user_id === user?._id;
    
    return (
      <View style={[styles.chatMessage, isMe && styles.chatMessageMe]}>
        {!isMe && (
          <Pressable onPress={() => router.push(`/profile/${item.user_id}`)}>
            <View style={[styles.chatAvatar, { borderColor: avatarColor }]}>
              <Ionicons name={avatarIcon as any} size={14} color={avatarColor} />
            </View>
          </Pressable>
        )}
        <View style={[styles.chatBubble, isMe && styles.chatBubbleMe]}>
          {!isMe && <Text style={styles.chatUsername}>{item.username}</Text>}
          <Text style={[styles.chatText, isMe && styles.chatTextMe]}>{item.content}</Text>
          <Text style={styles.chatTime}>{formatTimeAgo(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  const renderMediaItem = ({ item, index }: { item: Media; index: number }) => (
    <Pressable 
      style={styles.mediaCardVertical}
      onPress={() => Linking.openURL(item.video_url)}
    >
      <Image source={{ uri: item.thumbnail_url }} style={styles.mediaThumbnailVertical} />
      <View style={styles.mediaOverlayVertical}>
        {/* Play Button */}
        <View style={styles.playButtonVertical}>
          <Ionicons name="play" size={48} color="#FFF" />
        </View>
        
        {/* Right Side Actions */}
        <View style={styles.mediaActions}>
          <Pressable style={styles.mediaActionButton}>
            <Ionicons name="heart-outline" size={28} color="#FFF" />
            <Text style={styles.mediaActionText}>Like</Text>
          </Pressable>
          <Pressable style={styles.mediaActionButton}>
            <Ionicons name="chatbubble-outline" size={26} color="#FFF" />
            <Text style={styles.mediaActionText}>Comment</Text>
          </Pressable>
          <Pressable style={styles.mediaActionButton}>
            <Ionicons name="share-outline" size={28} color="#FFF" />
            <Text style={styles.mediaActionText}>Share</Text>
          </Pressable>
        </View>
        
        {/* Bottom Info */}
        <View style={styles.mediaInfoVertical}>
          <View style={styles.mediaSourceBadge}>
            <Ionicons 
              name={item.source_type === 'TED' ? 'mic' : item.source_type === 'STORY' ? 'heart' : 'logo-youtube'} 
              size={14} 
              color="#FFF" 
            />
            <Text style={styles.mediaSourceText}>{item.source_type}</Text>
          </View>
          <Text style={styles.mediaTitleVertical} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.mediaDescVertical} numberOfLines={2}>{item.description}</Text>
          <View style={styles.mediaDurationBadge}>
            <Ionicons name="time-outline" size={12} color="#FFF" />
            <Text style={styles.mediaDurationText}>{item.duration}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  const renderSuggestion = ({ item }: { item: SuggestedUser }) => {
    const avatarIcon = AVATAR_ICONS[item.avatar_id] || 'shield-checkmark';
    const avatarColor = AVATAR_COLORS[item.avatar_id] || '#00F5A0';
    
    return (
      <View style={styles.suggestionCard}>
        <Pressable onPress={() => router.push(`/profile/${item._id}`)}>
          <View style={[styles.suggestionAvatar, { borderColor: avatarColor }]}>
            <Ionicons name={avatarIcon as any} size={24} color={avatarColor} />
          </View>
        </Pressable>
        <Text style={styles.suggestionName}>{item.username}</Text>
        <Pressable 
          style={styles.addFriendButton}
          onPress={() => sendFriendRequest(item._id)}
        >
          <Ionicons name="person-add" size={16} color="#000" />
          <Text style={styles.addFriendText}>Add</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COMMUNITY</Text>
        <Text style={styles.headerSubtitle}>Connect. Support. Recover.</Text>
      </View>

      {/* Section Tabs */}
      <View style={styles.tabBar}>
        {[
          { id: 'feed', icon: 'pulse', label: 'Feed' },
          { id: 'media', icon: 'play-circle', label: 'Learn' },
          { id: 'chat', icon: 'chatbubbles', label: 'Chat' },
          { id: 'friends', icon: 'people', label: 'Connect' },
        ].map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeSection === tab.id && styles.tabActive]}
            onPress={() => setActiveSection(tab.id as any)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={20} 
              color={activeSection === tab.id ? colors.primary : colors.textMuted} 
            />
            <Text style={[styles.tabLabel, activeSection === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {activeSection === 'feed' && (
        <FlatList
          data={activities}
          renderItem={renderActivityItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="pulse" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No activity yet</Text>
              <Text style={styles.emptySubtext}>Check in to start the feed!</Text>
            </View>
          }
        />
      )}

      {activeSection === 'media' && (
        <FlatList
          data={mediaContent}
          renderItem={renderMediaItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={styles.mediaListVertical}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="play-circle" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No videos yet</Text>
              <Text style={styles.emptySubtext}>Inspirational content coming soon!</Text>
            </View>
          }
        />
      )}

      {activeSection === 'chat' && (
        <View style={styles.chatContainer}>
          <FlatList
            ref={chatListRef}
            data={chatMessages}
            renderItem={renderChatMessage}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.chatList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>24/7 Live Chat</Text>
                <Text style={styles.emptySubtext}>Be the first to say hello!</Text>
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
              multiline
              maxLength={500}
            />
            <Pressable 
              style={[styles.sendButton, !chatInput.trim() && styles.sendButtonDisabled]}
              onPress={sendChatMessage}
              disabled={!chatInput.trim()}
            >
              <Ionicons name="send" size={20} color={chatInput.trim() ? '#000' : colors.textMuted} />
            </Pressable>
          </View>
        </View>
      )}

      {activeSection === 'friends' && (
        <ScrollView 
          contentContainerStyle={styles.friendsContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.sectionTitle}>Suggested Connections</Text>
          <Text style={styles.sectionSubtitle}>People on the same journey</Text>
          
          <View style={styles.suggestionsGrid}>
            {suggestions.map((s) => renderSuggestion({ item: s }))}
          </View>
          
          {suggestions.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No suggestions yet</Text>
              <Text style={styles.emptySubtext}>More users will appear as the community grows</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Reaction Picker Modal */}
      <Modal visible={!!showReactionPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowReactionPicker(null)}>
          <View style={styles.reactionPicker}>
            <Text style={styles.reactionPickerTitle}>React</Text>
            <View style={styles.emojiRow}>
              {PREMIUM_EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji.id}
                  style={styles.emojiButton}
                  onPress={() => addReaction(showReactionPicker!, 'activity', emoji.id)}
                >
                  <Text style={styles.emojiText}>{emoji.emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.cardBackground,
    paddingTop: 60,
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.primary,
  },
  listContent: {
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  activityUser: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  reactionButton: {
    padding: 4,
  },
  // Chat styles
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
    alignItems: 'flex-end',
  },
  chatMessageMe: {
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
    marginRight: 8,
  },
  chatBubble: {
    maxWidth: '75%',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  chatBubbleMe: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  chatUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  chatText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  chatTextMe: {
    color: '#000',
  },
  chatTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
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
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface,
  },
  // Media styles
  mediaContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  mediaList: {
    gap: 12,
  },
  mediaCard: {
    width: 240,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaThumbnail: {
    width: '100%',
    height: 135,
    backgroundColor: colors.surface,
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    height: 135,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaDuration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '500',
  },
  mediaInfo: {
    padding: 12,
  },
  mediaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  mediaSource: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  sourceText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  // Vertical TikTok-style Media Styles
  mediaListVertical: {
    flexGrow: 1,
  },
  mediaCardVertical: {
    height: 600,
    backgroundColor: '#000',
    marginBottom: 2,
  },
  mediaThumbnailVertical: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mediaOverlayVertical: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButtonVertical: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    marginLeft: -35,
    marginTop: -35,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaActions: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    alignItems: 'center',
    gap: 20,
  },
  mediaActionButton: {
    alignItems: 'center',
    gap: 4,
  },
  mediaActionText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '500',
  },
  mediaInfoVertical: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 70,
  },
  mediaSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 10,
  },
  mediaSourceText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  mediaTitleVertical: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mediaDescVertical: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    marginBottom: 10,
  },
  mediaDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mediaDurationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  // Friends styles
  friendsContent: {
    padding: 16,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  suggestionCard: {
    width: '47%',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 10,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  addFriendButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    gap: 6,
  },
  addFriendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPicker: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  reactionPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 16,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
});
