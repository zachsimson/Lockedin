import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/theme';
import api from '../../src/services/api';
import { RecoveryStats } from '../../src/types';

// Premium gradient emoji configs
const PREMIUM_ICONS = {
  trophy: { icon: 'trophy', gradient: ['#FFD700', '#FFA500'], glow: '#FFD70050' },
  money: { icon: 'cash', gradient: ['#00F5A0', '#00D9F5'], glow: '#00F5A050' },
  reset: { icon: 'sync', gradient: ['#6366F1', '#8B5CF6'], glow: '#6366F150' },
  calendar: { icon: 'calendar', gradient: ['#3B82F6', '#06B6D4'], glow: '#3B82F650' },
  fire: { icon: 'flame', gradient: ['#FF512F', '#F09819'], glow: '#FF512F50' },
  star: { icon: 'star', gradient: ['#FFE66D', '#FF6B6B'], glow: '#FFE66D50' },
  shield: { icon: 'shield-checkmark', gradient: ['#00F5A0', '#10B981'], glow: '#00F5A050' },
  heart: { icon: 'heart', gradient: ['#EC4899', '#F43F5E'], glow: '#EC489950' },
  rocket: { icon: 'rocket', gradient: ['#3B82F6', '#8B5CF6'], glow: '#3B82F650' },
  crown: { icon: 'ribbon', gradient: ['#FBBF24', '#F59E0B'], glow: '#FBBF2450' },
};

// Milestone definitions with premium styling
const MILESTONES = [
  { days: 1, label: '1 Day', icon: 'footsteps', gradient: ['#22C55E', '#10B981'], unlockText: 'First Step!' },
  { days: 7, label: '1 Week', icon: 'calendar', gradient: ['#3B82F6', '#06B6D4'], unlockText: 'Week Warrior!' },
  { days: 14, label: '2 Weeks', icon: 'shield', gradient: ['#8B5CF6', '#A78BFA'], unlockText: 'Fortnight Fighter!' },
  { days: 30, label: '1 Month', icon: 'medal', gradient: ['#F59E0B', '#FBBF24'], unlockText: 'Monthly Master!' },
  { days: 60, label: '2 Months', icon: 'ribbon', gradient: ['#EC4899', '#F472B6'], unlockText: 'Double Down!' },
  { days: 90, label: '90 Days', icon: 'trophy', gradient: ['#FFD700', '#FFA500'], unlockText: 'Quarter Champion!' },
  { days: 180, label: '6 Months', icon: 'star', gradient: ['#FF6B6B', '#FF8E53'], unlockText: 'Half Year Hero!' },
  { days: 365, label: '1 Year', icon: 'diamond', gradient: ['#A78BFA', '#818CF8'], unlockText: 'Year of Freedom!' },
];

export default function Tracker() {
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalResets, setTotalResets] = useState(0);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for timer
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/api/recovery/stats');
      setStats(response.data);
      setLongestStreak(Math.max(response.data.days_sober, longestStreak));
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, []);

  const calculateTimeSince = () => {
    if (!stats?.sobriety_start_date) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const start = new Date(stats.sobriety_start_date);
    const diff = Math.max(0, currentTime.getTime() - start.getTime());
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Counter',
      'No shame here. Recovery is a journey. The community supports you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/api/recovery/relapse', { amount: 0, notes: 'Manual reset' });
              setTotalResets(totalResets + 1);
              await loadStats();
              Alert.alert('💪 KEEP GOING', "What matters is you're here, trying.");
            } catch (error) {
              Alert.alert('Error', 'Failed to reset timer');
            }
          },
        },
      ]
    );
  };

  const time = calculateTimeSince();
  const moneySaved = stats?.money_saved || 0;

  // Calculate progress to next milestone
  const nextMilestone = MILESTONES.find(m => m.days > time.days) || MILESTONES[MILESTONES.length - 1];
  const prevMilestone = [...MILESTONES].reverse().find(m => m.days <= time.days) || { days: 0 };
  const progressPercent = prevMilestone.days === nextMilestone.days 
    ? 100 
    : ((time.days - prevMilestone.days) / (nextMilestone.days - prevMilestone.days)) * 100;

  const renderPremiumIcon = (config: typeof PREMIUM_ICONS.trophy, size: number = 32) => (
    <View style={[styles.premiumIconContainer, { width: size + 16, height: size + 16 }]}>
      <LinearGradient
        colors={config.gradient as [string, string]}
        style={[styles.premiumIconGradient, { borderRadius: (size + 16) / 2 }]}
      >
        <Ionicons name={config.icon as any} size={size} color="#FFF" />
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TIME SAVED</Text>
        <Text style={styles.headerSubtitle}>Every second counts.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Premium Timer Card */}
        <Animated.View style={[styles.timerCard, { transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient
            colors={['#00F5A0', '#00D9F5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.timerGradientBorder}
          >
            <View style={styles.timerInner}>
              <Text style={styles.timerLabel}>TIME CLEAN</Text>
              
              <View style={styles.timerGrid}>
                <View style={styles.timerBox}>
                  <Text style={styles.timerNumber}>{time.days}</Text>
                  <Text style={styles.timerUnit}>DAYS</Text>
                </View>
                <Text style={styles.timerDivider}>:</Text>
                <View style={styles.timerBox}>
                  <Text style={styles.timerNumber}>{time.hours.toString().padStart(2, '0')}</Text>
                  <Text style={styles.timerUnit}>HRS</Text>
                </View>
                <Text style={styles.timerDivider}>:</Text>
                <View style={styles.timerBox}>
                  <Text style={styles.timerNumber}>{time.minutes.toString().padStart(2, '0')}</Text>
                  <Text style={styles.timerUnit}>MIN</Text>
                </View>
                <Text style={styles.timerDivider}>:</Text>
                <View style={styles.timerBox}>
                  <Text style={styles.timerNumberSmall}>{time.seconds.toString().padStart(2, '0')}</Text>
                  <Text style={styles.timerUnit}>SEC</Text>
                </View>
              </View>

              {/* Progress to next milestone */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={nextMilestone.gradient as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${Math.min(100, progressPercent)}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {nextMilestone.days - time.days} days to {nextMilestone.label}
                </Text>
              </View>

              <Pressable 
                style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
                onPress={handleReset}
              >
                <Ionicons name="refresh" size={18} color="#FFF" />
                <Text style={styles.resetButtonText}>RESET TIMER</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Premium Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            {renderPremiumIcon(PREMIUM_ICONS.trophy, 28)}
            <Text style={styles.statNumber}>{longestStreak}</Text>
            <Text style={styles.statLabel}>BEST STREAK</Text>
          </View>

          <View style={styles.statCard}>
            {renderPremiumIcon(PREMIUM_ICONS.money, 28)}
            <Text style={styles.statNumber}>${moneySaved.toFixed(0)}</Text>
            <Text style={styles.statLabel}>MONEY SAVED</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            {renderPremiumIcon(PREMIUM_ICONS.reset, 28)}
            <Text style={styles.statNumber}>{totalResets}</Text>
            <Text style={styles.statLabel}>RESETS</Text>
          </View>

          <View style={styles.statCard}>
            {renderPremiumIcon(PREMIUM_ICONS.calendar, 28)}
            <Text style={styles.statNumber}>{Math.floor(time.days / 7)}</Text>
            <Text style={styles.statLabel}>WEEKS CLEAN</Text>
          </View>
        </View>

        {/* Premium Milestones */}
        <View style={styles.milestonesCard}>
          <View style={styles.milestonesHeader}>
            <Ionicons name="flag" size={20} color={colors.primary} />
            <Text style={styles.milestonesTitle}>MILESTONES</Text>
          </View>
          
          <View style={styles.milestonesList}>
            {MILESTONES.map((milestone, index) => {
              const isComplete = time.days >= milestone.days;
              const isNext = !isComplete && (index === 0 || time.days >= MILESTONES[index - 1].days);
              
              return (
                <View 
                  key={milestone.days}
                  style={[
                    styles.milestone,
                    isComplete && styles.milestoneComplete,
                    isNext && styles.milestoneNext,
                  ]}
                >
                  <View style={styles.milestoneIconContainer}>
                    {isComplete ? (
                      <LinearGradient
                        colors={milestone.gradient as [string, string]}
                        style={styles.milestoneIconGradient}
                      >
                        <Ionicons name={milestone.icon as any} size={20} color="#FFF" />
                      </LinearGradient>
                    ) : (
                      <View style={styles.milestoneIconLocked}>
                        <Ionicons name={milestone.icon as any} size={20} color={colors.textMuted} />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.milestoneInfo}>
                    <Text style={[styles.milestoneLabel, isComplete && styles.milestoneLabelComplete]}>
                      {milestone.label}
                    </Text>
                    {isComplete && (
                      <Text style={styles.milestoneUnlock}>{milestone.unlockText}</Text>
                    )}
                    {isNext && (
                      <Text style={styles.milestoneProgress}>
                        {milestone.days - time.days} days away
                      </Text>
                    )}
                  </View>
                  
                  {isComplete && (
                    <View style={styles.milestoneCheck}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Motivational Footer */}
        <View style={styles.footerCard}>
          <LinearGradient
            colors={['#6366F120', '#8B5CF620']}
            style={styles.footerGradient}
          >
            <Ionicons name="sparkles" size={24} color="#A78BFA" />
            <Text style={styles.footerText}>
              Every second you don't gamble is a win.{'\n'}Keep building your streak.
            </Text>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.cardBackground,
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, letterSpacing: 2 },
  headerSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  content: { padding: 16, paddingBottom: 32 },
  
  // Timer Card
  timerCard: { marginBottom: 16 },
  timerGradientBorder: { borderRadius: 24, padding: 2 },
  timerInner: {
    backgroundColor: colors.cardBackground,
    borderRadius: 22, padding: 24, alignItems: 'center',
  },
  timerLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 3, marginBottom: 16 },
  timerGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  timerBox: { alignItems: 'center', minWidth: 50 },
  timerNumber: { fontSize: 40, fontWeight: 'bold', color: colors.primary },
  timerNumberSmall: { fontSize: 32, fontWeight: 'bold', color: colors.primary },
  timerUnit: { fontSize: 10, color: colors.textMuted, marginTop: 4, letterSpacing: 1 },
  timerDivider: { fontSize: 32, fontWeight: 'bold', color: colors.textMuted, marginHorizontal: 4 },
  progressContainer: { width: '100%', marginBottom: 20 },
  progressBar: { height: 6, backgroundColor: colors.surface, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  resetButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 12, gap: 8, borderWidth: 1, borderColor: colors.border,
  },
  resetButtonPressed: { opacity: 0.7 },
  resetButtonText: { fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  
  // Stats Grid
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: colors.cardBackground, borderRadius: 16,
    padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  premiumIconContainer: { marginBottom: 8 },
  premiumIconGradient: {
    width: '100%', height: '100%',
    justifyContent: 'center', alignItems: 'center',
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary, marginTop: 8 },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 6, letterSpacing: 1, fontWeight: '600' },
  
  // Milestones
  milestonesCard: {
    backgroundColor: colors.cardBackground, borderRadius: 20,
    padding: 20, marginTop: 4, borderWidth: 1, borderColor: colors.border,
  },
  milestonesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  milestonesTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, letterSpacing: 1 },
  milestonesList: { gap: 10 },
  milestone: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 14, backgroundColor: colors.surface,
  },
  milestoneComplete: { backgroundColor: `${colors.primary}10`, borderWidth: 1, borderColor: `${colors.primary}30` },
  milestoneNext: { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  milestoneIconContainer: { marginRight: 14 },
  milestoneIconGradient: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  milestoneIconLocked: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  milestoneInfo: { flex: 1 },
  milestoneLabel: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },
  milestoneLabelComplete: { color: colors.textPrimary, fontWeight: '600' },
  milestoneUnlock: { fontSize: 12, color: colors.primary, marginTop: 2 },
  milestoneProgress: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  milestoneCheck: { marginLeft: 8 },
  
  // Footer
  footerCard: { marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  footerGradient: {
    padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  footerText: { flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
});
