import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import api from '../../src/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Avatar icon mapping
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

interface Achievement {
  id: string;
  name: string;
  description: string;
  threshold_days: number;
  icon: string;
  unlocked_at?: string;
}

interface Profile {
  _id: string;
  username: string;
  avatar_id: string;
  profile_visibility_mode: string;
  profile_photo_url?: string;
  created_at: string;
  bio?: string;
  current_streak_days?: number;
  longest_streak_days?: number;
  total_resets?: number;
}

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const response = await api.get(`/api/profile/${userId}`);
      setProfile(response.data.profile);
      setAchievements(response.data.achievements || []);
      setAllAchievements(response.data.all_achievements || []);
      setCurrentStreak(response.data.current_streak_days || 0);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
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
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarLarge, { borderColor: avatarColor }]}>
            <Ionicons name={avatarIcon as any} size={64} color={avatarColor} />
          </View>
          <Text style={styles.username}>{profile.username}</Text>
          <Text style={styles.joinDate}>Member since {formatJoinDate(profile.created_at)}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        {/* Streak Display */}
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

        {/* Achievements */}
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {allAchievements.map((achievement) => {
              const unlocked = isAchievementUnlocked(achievement.id);
              return (
                <View 
                  key={achievement.id} 
                  style={[styles.achievementItem, !unlocked && styles.achievementLocked]}
                >
                  <View style={[styles.achievementIcon, unlocked && styles.achievementIconUnlocked]}>
                    <Ionicons 
                      name={achievement.icon as any} 
                      size={28} 
                      color={unlocked ? colors.primary : colors.textMuted} 
                    />
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    marginBottom: 16,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  joinDate: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  streakCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  streakMain: {
    flex: 1,
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
  },
  streakLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  streakDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  streakStats: {
    gap: 16,
  },
  streakStatItem: {
    alignItems: 'center',
  },
  streakStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  streakStatLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  achievementsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementItem: {
    width: '30%',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementIconUnlocked: {
    backgroundColor: `${colors.primary}20`,
  },
  achievementName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  achievementNameLocked: {
    color: colors.textMuted,
  },
  achievementDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
});
