import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/theme';
import api from '../../src/services/api';
import { RecoveryStats } from '../../src/types';

// Premium Streak Icon Component
const PremiumStreakIcon = ({ size = 32, animated = true }: { size?: number; animated?: boolean }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (animated) {
      // Subtle pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.5,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }
  }, [animated]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <View style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}>
        {/* Glow layer */}
        <Animated.View style={{
          position: 'absolute',
          width: size + 8,
          height: size + 8,
          borderRadius: (size + 8) / 2,
          backgroundColor: '#FF6B35',
          opacity: glowAnim,
          shadowColor: '#FF6B35',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 12,
        }} />
        {/* Main icon with gradient effect */}
        <LinearGradient
          colors={['#FFD93D', '#FF6B35', '#FF4444']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="flame" size={size * 0.6} color="#FFFFFF" />
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

// Avatar icon and color mapping (expanded)
const AVATAR_ICONS: { [key: string]: string } = {
  shield: 'shield-checkmark', phoenix: 'flame', mountain: 'triangle', star: 'star',
  diamond: 'diamond', lightning: 'flash', heart: 'heart', rocket: 'rocket',
  crown: 'trophy', anchor: 'fitness', prism: 'prism', nucleus: 'nuclear',
  cube: 'cube', sphere: 'ellipse', grid: 'grid', layers: 'layers',
  leaf: 'leaf', moon: 'moon', sunny: 'sunny', water: 'water',
  planet: 'planet', snow: 'snow', barbell: 'barbell', pulse: 'pulse',
  body: 'body', walk: 'walk', bicycle: 'bicycle', square: 'square',
  circle: 'ellipse', hexagon: 'hexagon', infinite: 'infinite', ribbon: 'ribbon', eye: 'eye',
};

const AVATAR_COLORS: { [key: string]: string } = {
  shield: '#00F5A0', phoenix: '#FF6B6B', mountain: '#4ECDC4', star: '#FFE66D',
  diamond: '#A78BFA', lightning: '#F59E0B', heart: '#EC4899', rocket: '#3B82F6',
  crown: '#FBBF24', anchor: '#10B981', prism: '#8B5CF6', nucleus: '#06B6D4',
  cube: '#F97316', sphere: '#EF4444', grid: '#22C55E', layers: '#6366F1',
  leaf: '#22C55E', moon: '#94A3B8', sunny: '#FBBF24', water: '#0EA5E9',
  planet: '#8B5CF6', snow: '#E0F2FE', barbell: '#DC2626', pulse: '#00F5A0',
  body: '#F97316', walk: '#10B981', bicycle: '#3B82F6', square: '#64748B',
  circle: '#A855F7', hexagon: '#14B8A6', infinite: '#F472B6', ribbon: '#EC4899', eye: '#6366F1',
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

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyQuote, setDailyQuote] = useState('LOCKED IN. NO EXCEPTIONS.');
  
  // Animation for quote
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    try {
      const [statsRes, activityRes, quoteRes] = await Promise.all([
        api.get('/api/recovery/stats'),
        api.get('/api/community/activity?limit=20'),
        api.get('/api/daily-quote').catch(() => ({ data: { quote: 'LOCKED IN. NO EXCEPTIONS.' } })),
      ]);
      setStats(statsRes.data);
      setActivities(activityRes.data.activities || []);
      setDailyQuote(quoteRes.data.quote || 'LOCKED IN. NO EXCEPTIONS.');
      
      // Animate quote
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
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
        'Reset Counter',
        'No shame here. Recovery is a journey. The community supports you.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                await api.post('/api/recovery/relapse', { amount: 0, notes: 'Daily check-in' });
                setCheckedInToday(true);
                await loadData();
              } catch (error) {
                console.error('Failed:', error);
              }
            },
          },
        ]
      );
    } else {
      try {
        await api.post('/api/community/check-in');
        setCheckedInToday(true);
        Alert.alert('🔥 LOCKED IN!', 'Another day in the bank!');
        await loadData();
      } catch (error) {
        console.error('Failed:', error);
        setCheckedInToday(true);
        Alert.alert('🔥 LOCKED IN!', 'Another day in the bank!');
      }
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

  const navigateToProfile = (userId: string) => router.push(`/profile/${userId}`);
  const navigateToEditProfile = () => router.push('/profile/edit');

  const daysSober = stats?.days_sober || 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Welcome Back</Text>
          <Pressable style={styles.usernameRow} onPress={navigateToEditProfile}>
            <Text style={styles.headerSubtitle}>{user?.username}</Text>
            <View style={styles.editIcon}>
              <Ionicons name="pencil" size={14} color={colors.textMuted} />
            </View>
          </Pressable>
        </View>
        <View style={styles.streakBadge}>
          <PremiumStreakIcon size={36} animated={true} />
          <Text style={styles.streakNumber}>{daysSober}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Days Clean Card */}
        <View style={styles.mainCard}>
          <Text style={styles.daysLabel}>DAYS CLEAN</Text>
          <Text style={styles.daysNumber}>{daysSober}</Text>
          
          {/* Premium Quote */}
          <Animated.View style={[styles.quoteContainer, { opacity: fadeAnim }]}>
            <Text style={styles.premiumQuote}>{dailyQuote}</Text>
          </Animated.View>
          
          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (daysSober / 90) * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {daysSober < 7 ? 'First week — stay locked in!' :
             daysSober < 30 ? `${7 - (daysSober % 7)} days to next milestone` :
             daysSober < 90 ? `${30 - (daysSober % 30)} days to next month` :
             'CHAMPION STATUS 🏆'}
          </Text>
        </View>

        {/* Daily Check-In */}
        {!checkedInToday ? (
          <View style={styles.checkInCard}>
            <Text style={styles.checkInTitle}>Daily Check-In</Text>
            <View style={styles.checkInButtons}>
              <Pressable
                style={({ pressed }) => [styles.checkInButton, styles.checkInSuccess, pressed && styles.buttonPressed]}
                onPress={() => handleCheckIn(false)}
              >
                <Ionicons name="checkmark-circle" size={28} color="#000" />
                <Text style={styles.checkInButtonText}>LOCKED IN</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.checkInButton, styles.checkInSlipped, pressed && styles.buttonPressed]}
                onPress={() => handleCheckIn(true)}
              >
                <Ionicons name="refresh-circle" size={28} color="#FFF" />
                <Text style={[styles.checkInButtonText, { color: '#FFF' }]}>RESET</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.checkedInCard}>
            <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
            <Text style={styles.checkedInText}>CHECKED IN TODAY ✓</Text>
          </View>
        )}

        {/* Community Activity - Premium Card Layout */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Community Activity</Text>
          <Text style={styles.sectionSubtitle}>Your recovery community is thriving</Text>
        </View>

        {activities.length === 0 ? (
          <View style={styles.emptyActivityCard}>
            <View style={styles.emptyActivityIcon}>
              <Ionicons name="people" size={36} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyActivityTitle}>No activity yet</Text>
            <Text style={styles.emptyActivitySubtitle}>Be the first to check in today!</Text>
          </View>
        ) : (
          <View style={styles.activityGrid}>
            {activities.slice(0, 6).map((activity, index) => {
              const avatarIcon = AVATAR_ICONS[activity.avatar_id] || 'shield-checkmark';
              const avatarColor = AVATAR_COLORS[activity.avatar_id] || '#00F5A0';
              const activityStyle = ACTIVITY_ICONS[activity.activity_type] || { icon: 'ellipse', color: colors.textMuted };
              const isOnline = Math.random() > 0.4; // Simulated online status
              
              return (
                <Pressable
                  key={`activity-card-${activity._id || index}`}
                  style={styles.activityCardNew}
                  onPress={() => navigateToProfile(activity.user_id)}
                >
                  {/* Status indicator */}
                  <View style={[styles.onlineIndicator, { backgroundColor: isOnline ? '#22C55E' : colors.textMuted }]} />
                  
                  {/* Avatar */}
                  <View style={[styles.avatarNew, { borderColor: avatarColor, backgroundColor: `${avatarColor}15` }]}>
                    <Ionicons name={avatarIcon as any} size={22} color={avatarColor} />
                  </View>
                  
                  {/* User Info */}
                  <Text style={styles.activityUserNew} numberOfLines={1}>{activity.username}</Text>
                  
                  {/* Activity Badge */}
                  <View style={[styles.activityBadge, { backgroundColor: `${activityStyle.color}20` }]}>
                    <Ionicons name={activityStyle.icon as any} size={12} color={activityStyle.color} />
                    <Text style={[styles.activityBadgeText, { color: activityStyle.color }]}>
                      {activity.activity_type === 'CHECK_IN' ? 'Checked In' :
                       activity.activity_type === 'RESET' ? 'Reset' :
                       activity.activity_type === 'STREAK_MILESTONE' ? activity.activity_value :
                       'Achievement'}
                    </Text>
                  </View>
                  
                  {/* Time */}
                  <Text style={styles.activityTimeNew}>{formatTimeAgo(activity.created_at)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.cardBackground,
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: {},
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary },
  usernameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  headerSubtitle: { fontSize: 16, color: colors.textSecondary },
  editIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 8,
  },
  streakNumber: { fontSize: 24, fontWeight: 'bold', color: colors.gold },
  content: { padding: 16, paddingBottom: 32 },
  mainCard: {
    backgroundColor: colors.primary, borderRadius: 24,
    padding: 32, alignItems: 'center', marginBottom: 16,
  },
  daysLabel: { fontSize: 14, fontWeight: '700', color: 'rgba(0,0,0,0.5)', letterSpacing: 3 },
  daysNumber: { fontSize: 80, fontWeight: 'bold', color: '#000', marginVertical: 4 },
  quoteContainer: { marginTop: 8, marginBottom: 16 },
  premiumQuote: {
    fontSize: 12, fontWeight: '700', color: 'rgba(0,0,0,0.6)',
    letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center',
  },
  progressBar: {
    width: '100%', height: 6, backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#000', borderRadius: 3 },
  progressText: { fontSize: 12, color: 'rgba(0,0,0,0.6)', marginTop: 8 },
  checkInCard: {
    backgroundColor: colors.cardBackground, borderRadius: 16,
    padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border,
  },
  checkInTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  checkInButtons: { flexDirection: 'row', gap: 12 },
  checkInButton: {
    flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', gap: 8,
  },
  checkInSuccess: { backgroundColor: colors.primary },
  checkInSlipped: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  checkInButtonText: { fontSize: 13, fontWeight: 'bold', color: '#000', letterSpacing: 1 },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  checkedInCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 24, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', justifyContent: 'center', gap: 12,
  },
  checkedInText: { fontSize: 16, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  sectionSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  // NEW: Premium Activity Grid
  activityGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  activityCardNew: {
    width: '47%', backgroundColor: colors.cardBackground, borderRadius: 16,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    position: 'relative', minHeight: 140,
  },
  onlineIndicator: {
    position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4,
  },
  avatarNew: {
    width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, marginBottom: 10,
  },
  activityUserNew: {
    fontSize: 14, fontWeight: '600', color: colors.textPrimary,
    textAlign: 'center', marginBottom: 8,
  },
  activityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  activityBadgeText: { fontSize: 11, fontWeight: '600' },
  activityTimeNew: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  emptyActivityCard: {
    backgroundColor: colors.cardBackground, borderRadius: 20, padding: 40,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  emptyActivityIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyActivityTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  emptyActivitySubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});
