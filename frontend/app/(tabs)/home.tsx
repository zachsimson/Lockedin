import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import api from '../../src/services/api';
import { RecoveryStats } from '../../src/types';

// Avatar icon and color mapping
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

const ACTIVITY_ICONS: { [key: string]: { icon: string; color: string } } = {
  CHECK_IN: { icon: 'checkmark-circle', color: colors.primary },
  RESET: { icon: 'refresh-circle', color: colors.warning },
  STREAK_MILESTONE: { icon: 'trophy', color: colors.gold },
  ACHIEVEMENT_UNLOCKED: { icon: 'medal', color: '#A78BFA' },
};

interface CommunityActivity {
  _id: string;
  user_id: string;
  username: string;
  avatar_id: string;
  activity_type: string;
  activity_value: string;
  created_at: string;
}

const MOTIVATIONAL_QUOTES = [
  "Every day clean is a win. Keep going! 💪",
  "You're stronger than your urges.",
  "One day at a time. You've got this!",
  "Your future self will thank you.",
  "Recovery isn't about perfection, it's about progress.",
  "The best bet you can make is on yourself.",
];

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [quote] = useState(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

  const loadData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.get('/api/recovery/stats'),
        api.get('/api/community/activity?limit=20'),
      ]);
      setStats(statsRes.data);
      setActivities(activityRes.data.activities || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleCheckIn = async (slipped: boolean) => {
    if (slipped) {
      Alert.alert(
        'Relapse Reported',
        'No shame here. Recovery is a journey. The community is here to support you.',
        [
          {
            text: 'OK',
            onPress: async () => {
              try {
                await api.post('/api/recovery/relapse', {
                  amount: 0,
                  notes: 'Daily check-in relapse',
                });
                setCheckedInToday(true);
                await loadData();
              } catch (error) {
                console.error('Failed to report relapse:', error);
              }
            },
          },
        ]
      );
    } else {
      try {
        await api.post('/api/community/check-in');
        setCheckedInToday(true);
        Alert.alert('Nice!', 'Another clean day in the books! 🎉');
        await loadData();
      } catch (error) {
        console.error('Failed to check in:', error);
        setCheckedInToday(true);
        Alert.alert('Nice!', 'Another clean day in the books! 🎉');
      }
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getActivityMessage = (activity: CommunityActivity) => {
    switch (activity.activity_type) {
      case 'CHECK_IN':
        return `checked in clean — ${activity.activity_value}`;
      case 'RESET':
        return 'reset their counter — stay strong 💪';
      case 'STREAK_MILESTONE':
        return `hit a ${activity.activity_value} milestone! 🎉`;
      case 'ACHIEVEMENT_UNLOCKED':
        return `unlocked "${activity.activity_value}" 🏆`;
      default:
        return activity.activity_value || 'activity';
    }
  };

  const navigateToProfile = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const daysSober = stats?.days_sober || 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Welcome Back</Text>
          <Text style={styles.headerSubtitle}>{user?.username}</Text>
        </View>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={28} color={colors.gold} />
          <Text style={styles.streakNumber}>{daysSober}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Days Clean Banner */}
        <View style={styles.mainCard}>
          <Text style={styles.daysLabel}>DAYS CLEAN</Text>
          <Text style={styles.daysNumber}>{daysSober}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (daysSober / 90) * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {daysSober < 7 && 'First week - Stay strong!'}
            {daysSober >= 7 && daysSober < 30 && `${7 - (daysSober % 7)} days to next milestone`}
            {daysSober >= 30 && daysSober < 90 && `${30 - (daysSober % 30)} days to next month`}
            {daysSober >= 90 && 'Champion status! 🏆'}
          </Text>
        </View>

        {/* Motivational Quote */}
        <View style={styles.quoteCard}>
          <Ionicons name="sparkles" size={20} color={colors.gold} />
          <Text style={styles.quoteText}>{quote}</Text>
        </View>

        {/* Daily Check-In */}
        {!checkedInToday && (
          <View style={styles.checkInCard}>
            <Text style={styles.checkInTitle}>Daily Check-In</Text>
            <Text style={styles.checkInSubtitle}>How did today go?</Text>
            <View style={styles.checkInButtons}>
              <Pressable
                style={({ pressed }) => [styles.checkInButton, styles.checkInSuccess, pressed && styles.buttonPressed]}
                onPress={() => handleCheckIn(false)}
              >
                <Ionicons name="checkmark-circle" size={32} color="#FFF" />
                <Text style={styles.checkInButtonText}>CHECK IN CLEAN</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.checkInButton, styles.checkInSlipped, pressed && styles.buttonPressed]}
                onPress={() => handleCheckIn(true)}
              >
                <Ionicons name="refresh-circle" size={32} color="#FFF" />
                <Text style={styles.checkInButtonText}>I SLIPPED</Text>
              </Pressable>
            </View>
          </View>
        )}

        {checkedInToday && (
          <View style={styles.checkedInCard}>
            <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
            <Text style={styles.checkedInText}>Checked in for today! ✅</Text>
          </View>
        )}

        {/* Community Activity Feed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Community Activity</Text>
          <Text style={styles.sectionSubtitle}>Live updates from the community</Text>
        </View>

        <View style={styles.activityCard}>
          {activities.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Ionicons name="people" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>No activity yet. Be the first to check in!</Text>
            </View>
          ) : (
            activities.slice(0, 10).map((activity, index) => {
              const avatarId = activity.avatar_id || 'shield';
              const avatarIcon = AVATAR_ICONS[avatarId] || 'shield-checkmark';
              const avatarColor = AVATAR_COLORS[avatarId] || '#00F5A0';
              const activityStyle = ACTIVITY_ICONS[activity.activity_type] || { icon: 'ellipse', color: colors.textMuted };
              
              return (
                <Pressable
                  key={activity._id || index}
                  style={({ pressed }) => [
                    styles.activityItem,
                    index === activities.slice(0, 10).length - 1 && styles.activityItemLast,
                    pressed && styles.activityItemPressed
                  ]}
                  onPress={() => navigateToProfile(activity.user_id)}
                >
                  {/* Avatar */}
                  <View style={[styles.avatar, { borderColor: avatarColor }]}>
                    <Ionicons name={avatarIcon as any} size={20} color={avatarColor} />
                  </View>
                  
                  {/* Content */}
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>
                      <Text style={styles.activityUser}>{activity.username}</Text>
                      {' '}{getActivityMessage(activity)}
                    </Text>
                    <Text style={styles.activityTime}>{formatTimeAgo(activity.created_at)}</Text>
                  </View>
                  
                  {/* Activity Type Icon */}
                  <View style={[styles.activityTypeIcon, { backgroundColor: `${activityStyle.color}20` }]}>
                    <Ionicons name={activityStyle.icon as any} size={16} color={activityStyle.color} />
                  </View>
                </Pressable>
              );
            })
          )}
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
    backgroundColor: colors.cardBackground,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gold,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  mainCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  daysLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.6)',
    letterSpacing: 2,
  },
  daysNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#000',
    marginVertical: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.7)',
    marginTop: 8,
  },
  quoteCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quoteText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  checkInCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkInTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  checkInSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  checkInButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  checkInButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  checkInSuccess: {
    backgroundColor: colors.primary,
  },
  checkInSlipped: {
    backgroundColor: colors.danger,
  },
  checkInButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  checkedInCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  checkedInText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 12,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  activityCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyActivity: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityItemLast: {
    borderBottomWidth: 0,
  },
  activityItemPressed: {
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  activityTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
