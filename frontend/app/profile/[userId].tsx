import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import api from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AVATAR_ICONS: { [key: string]: string } = {
  shield: 'shield-checkmark', phoenix: 'flame', mountain: 'triangle',
  star: 'star', diamond: 'diamond', lightning: 'flash',
  heart: 'heart', rocket: 'rocket', crown: 'trophy', anchor: 'fitness',
};

const AVATAR_COLORS: { [key: string]: string } = {
  shield: '#00F5A0', phoenix: '#FF6B6B', mountain: '#4ECDC4',
  star: '#FFE66D', diamond: '#A78BFA', lightning: '#F59E0B',
  heart: '#EC4899', rocket: '#3B82F6', crown: '#FBBF24', anchor: '#10B981',
};

interface Achievement {
  id: string; name: string; description: string; threshold_days: number; icon: string; unlocked_at?: string;
}

interface Profile {
  _id: string; username: string; avatar_id: string; profile_visibility_mode: string;
  profile_photo_url?: string; created_at: string; bio?: string;
  current_streak_days?: number; longest_streak_days?: number; total_resets?: number;
}

type FriendStatus = 'none' | 'friends' | 'pending_sent' | 'pending_received';

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [actionLoading, setActionLoading] = useState(false);

  const isOwnProfile = user?._id === userId;

  useEffect(() => { loadProfile(); }, [userId]);

  const loadProfile = async () => {
    try {
      const [profileRes, friendRes] = await Promise.all([
        api.get(`/api/profile/${userId}`),
        !isOwnProfile ? api.get(`/api/friends/status/${userId}`) : Promise.resolve({ data: { status: 'none' } }),
      ]);
      setProfile(profileRes.data.profile);
      setAchievements(profileRes.data.achievements || []);
      setAllAchievements(profileRes.data.all_achievements || []);
      setCurrentStreak(profileRes.data.current_streak_days || 0);
      setFriendStatus(friendRes.data.status === 'pending_outgoing' ? 'pending_sent' : 
                     friendRes.data.status === 'pending_incoming' ? 'pending_received' : 
                     friendRes.data.status as FriendStatus);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally { setLoading(false); }
  };

  const sendFriendRequest = async () => {
    setActionLoading(true);
    try {
      await api.post('/api/friends/request', { friend_id: userId });
      setFriendStatus('pending_sent');
      Alert.alert('Success', 'Friend request sent!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send request');
    } finally { setActionLoading(false); }
  };

  const acceptFriendRequest = async () => {
    setActionLoading(true);
    try {
      await api.post(`/api/friends/accept/${userId}`);
      setFriendStatus('friends');
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to accept');
    } finally { setActionLoading(false); }
  };

  const removeFriend = async () => {
    Alert.alert('Remove Friend', `Remove ${profile?.username} from friends?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try {
          await api.delete(`/api/friends/${userId}`);
          setFriendStatus('none');
        } catch (error) {
          console.error('Failed to remove friend:', error);
        } finally { setActionLoading(false); }
      }},
    ]);
  };

  const challengeToChess = () => {
    Alert.alert('Challenge', `Challenge ${profile?.username} to a chess game?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Challenge', onPress: async () => {
        try {
          const response = await api.post('/api/chess/create', { mode: 'friend', friend_id: userId });
          if (response.data.game) {
            router.push(`/chess/game?gameId=${response.data.game._id}`);
          }
        } catch (error: any) {
          Alert.alert('Error', error.response?.data?.detail || 'Failed to create game');
        }
      }},
    ]);
  };

  const renderFriendButton = () => {
    if (isOwnProfile) return null;
    
    if (actionLoading) {
      return (
        <View style={styles.friendButton}>
          <ActivityIndicator size="small" color="#000" />
        </View>
      );
    }

    switch (friendStatus) {
      case 'friends':
        return (
          <View style={styles.friendActions}>
            <Pressable style={styles.friendButtonActive} onPress={removeFriend}>
              <Ionicons name="checkmark-circle" size={18} color="#000" />
              <Text style={styles.friendButtonText}>Friends</Text>
            </Pressable>
            <Pressable style={styles.challengeButton} onPress={challengeToChess}>
              <Ionicons name="game-controller" size={18} color="#FFF" />
              <Text style={styles.challengeButtonText}>Challenge</Text>
            </Pressable>
          </View>
        );
      case 'pending_sent':
        return (
          <View style={styles.pendingButton}>
            <Ionicons name="time" size={18} color={colors.textMuted} />
            <Text style={styles.pendingButtonText}>Pending</Text>
          </View>
        );
      case 'pending_received':
        return (
          <Pressable style={styles.friendButton} onPress={acceptFriendRequest}>
            <Ionicons name="checkmark" size={18} color="#000" />
            <Text style={styles.friendButtonText}>Accept Request</Text>
          </Pressable>
        );
      default:
        return (
          <Pressable style={styles.friendButton} onPress={sendFriendRequest}>
            <Ionicons name="person-add" size={18} color="#000" />
            <Text style={styles.friendButtonText}>Add Friend</Text>
          </Pressable>
        );
    }
  };

  const formatJoinDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isAchievementUnlocked = (achievementId: string) => {
    return achievements.some(a => a.id === achievementId);
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
        </View>
      </View>
    );
  }

  const avatarId = profile.avatar_id || 'shield';
  const avatarIcon = AVATAR_ICONS[avatarId] || 'shield-checkmark';
  const avatarColor = AVATAR_COLORS[avatarId] || '#00F5A0';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={[styles.avatarLarge, { borderColor: avatarColor }]}>
            <Ionicons name={avatarIcon as any} size={64} color={avatarColor} />
          </View>
          <Text style={styles.username}>{profile.username}</Text>
          <Text style={styles.joinDate}>Member since {formatJoinDate(profile.created_at)}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          
          {/* Friend Button */}
          <View style={styles.friendButtonContainer}>
            {renderFriendButton()}
          </View>
        </View>

        <View style={styles.streakCard}>
          <View style={styles.streakMain}>
            <Text style={styles.streakNumber}>{currentStreak}</Text>
            <Text style={styles.streakLabel}>Days Clean</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakStats}>
            <View style={styles.streakStatItem}>
              <Text style={styles.streakStatNumber}>{profile.longest_streak_days || 0}</Text>
              <Text style={styles.streakStatLabel}>Longest</Text>
            </View>
            <View style={styles.streakStatItem}>
              <Text style={styles.streakStatNumber}>{profile.total_resets || 0}</Text>
              <Text style={styles.streakStatLabel}>Resets</Text>
            </View>
          </View>
        </View>

        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {allAchievements.map((achievement) => {
              const unlocked = isAchievementUnlocked(achievement.id);
              return (
                <View key={`achievement-${achievement.id}`} style={[styles.achievementItem, !unlocked && styles.achievementLocked]}>
                  <View style={[styles.achievementIcon, unlocked && styles.achievementIconUnlocked]}>
                    <Ionicons name={achievement.icon as any} size={28} color={unlocked ? colors.primary : colors.textMuted} />
                  </View>
                  <Text style={[styles.achievementName, !unlocked && styles.achievementNameLocked]}>
                    {achievement.name}
                  </Text>
                  <Text style={styles.achievementDesc}>
                    {unlocked ? '✓ Unlocked' : `${achievement.threshold_days} days`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: colors.textMuted },
  content: { padding: 20, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatarLarge: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: colors.cardBackground,
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, marginBottom: 16,
  },
  username: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  joinDate: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  bio: { fontSize: 14, color: colors.textSecondary, marginTop: 12, textAlign: 'center', paddingHorizontal: 20 },
  friendButtonContainer: { marginTop: 16 },
  friendButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 24,
  },
  friendButtonText: { color: '#000', fontWeight: '600', fontSize: 15 },
  friendButtonActive: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 24,
  },
  friendActions: { flexDirection: 'row', gap: 12 },
  challengeButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EC4899', paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 24,
  },
  challengeButtonText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  pendingButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 24, borderWidth: 1, borderColor: colors.border,
  },
  pendingButtonText: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
  streakCard: {
    backgroundColor: colors.cardBackground, borderRadius: 20, padding: 24,
    flexDirection: 'row', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: colors.border,
  },
  streakMain: { flex: 1, alignItems: 'center' },
  streakNumber: { fontSize: 48, fontWeight: 'bold', color: colors.primary },
  streakLabel: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  streakDivider: { width: 1, height: 60, backgroundColor: colors.border, marginHorizontal: 20 },
  streakStats: { flex: 1 },
  streakStatItem: { alignItems: 'center', marginBottom: 12 },
  streakStatNumber: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  streakStatLabel: { fontSize: 12, color: colors.textMuted },
  achievementsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 16 },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  achievementItem: {
    width: '47%', backgroundColor: colors.cardBackground, borderRadius: 16,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  achievementLocked: { opacity: 0.5 },
  achievementIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  achievementIconUnlocked: { backgroundColor: 'rgba(0, 245, 160, 0.2)' },
  achievementName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
  achievementNameLocked: { color: colors.textMuted },
  achievementDesc: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
