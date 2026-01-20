import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import api from '../../src/services/api';
import { RecoveryStats } from '../../src/types';

export default function Tracker() {
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalResets, setTotalResets] = useState(0);

  const loadStats = async () => {
    try {
      const response = await api.get('/api/recovery/stats');
      setStats(response.data);
      
      // In a real app, these would come from backend
      // For now, simulate longest streak and resets
      setLongestStreak(Math.max(response.data.days_sober, longestStreak));
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Update timer every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, []);

  const calculateTimeSince = () => {
    if (!stats?.sobriety_start_date) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const start = new Date(stats.sobriety_start_date);
    const diff = currentTime.getTime() - start.getTime();

    // Prevent negative values
    if (diff < 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Timer',
      'This will reset your timer and record a relapse. The community is here to support you. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/api/recovery/relapse', {
                amount: 0,
                notes: 'Manual timer reset',
              });
              setTotalResets(totalResets + 1);
              await loadStats();
              Alert.alert(
                '💪 Keep Going',
                "Resets happen. What matters is that you're here, trying. You've got this!"
              );
            } catch (error) {
              console.error('Failed to reset:', error);
              Alert.alert('Error', 'Failed to reset timer');
            }
          },
        },
      ]
    );
  };

  const time = calculateTimeSince();
  const moneySaved = stats?.money_saved || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Time Saved</Text>
        <Text style={styles.headerSubtitle}>Lock In.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Live Timer */}
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>TIME CLEAN</Text>
          
          <View style={styles.timerGrid}>
            <View style={styles.timerBox}>
              <Text style={styles.timerNumber}>{time.days}</Text>
              <Text style={styles.timerUnit}>DAYS</Text>
            </View>
            <Text style={styles.timerDivider}>:</Text>
            <View style={styles.timerBox}>
              <Text style={styles.timerNumber}>{time.hours.toString().padStart(2, '0')}</Text>
              <Text style={styles.timerUnit}>HOURS</Text>
            </View>
            <Text style={styles.timerDivider}>:</Text>
            <View style={styles.timerBox}>
              <Text style={styles.timerNumber}>{time.minutes.toString().padStart(2, '0')}</Text>
              <Text style={styles.timerUnit}>MIN</Text>
            </View>
            <Text style={styles.timerDivider}>:</Text>
            <View style={styles.timerBox}>
              <Text style={styles.timerNumber}>{time.seconds.toString().padStart(2, '0')}</Text>
              <Text style={styles.timerUnit}>SEC</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Ionicons name="refresh" size={20} color="#FFF" />
            <Text style={styles.resetButtonText}>Reset Timer</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={32} color={colors.gold} />
            <Text style={styles.statNumber}>{longestStreak}</Text>
            <Text style={styles.statLabel}>Longest Streak</Text>
            <Text style={styles.statSubtext}>days</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="cash" size={32} color={colors.primary} />
            <Text style={styles.statNumber}>${moneySaved.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Money Not Gambled</Text>
            <Text style={styles.statSubtext}>estimated</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="sync" size={32} color={colors.textSecondary} />
            <Text style={styles.statNumber}>{totalResets}</Text>
            <Text style={styles.statLabel}>Resets</Text>
            <Text style={styles.statSubtext}>no shame</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="calendar" size={32} color={colors.info} />
            <Text style={styles.statNumber}>{Math.floor(time.days / 7)}</Text>
            <Text style={styles.statLabel}>Weeks Clean</Text>
            <Text style={styles.statSubtext}>counting up</Text>
          </View>
        </View>

        {/* Milestones */}
        <View style={styles.milestonesCard}>
          <Text style={styles.milestonesTitle}>Milestones</Text>
          <View style={styles.milestonesList}>
            <View style={[styles.milestone, time.days >= 1 && styles.milestoneComplete]}>
              <Ionicons
                name={time.days >= 1 ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={time.days >= 1 ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.milestoneText, time.days >= 1 && styles.milestoneTextComplete]}>
                1 Day
              </Text>
            </View>
            <View style={[styles.milestone, time.days >= 7 && styles.milestoneComplete]}>
              <Ionicons
                name={time.days >= 7 ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={time.days >= 7 ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.milestoneText, time.days >= 7 && styles.milestoneTextComplete]}>
                1 Week
              </Text>
            </View>
            <View style={[styles.milestone, time.days >= 30 && styles.milestoneComplete]}>
              <Ionicons
                name={time.days >= 30 ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={time.days >= 30 ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.milestoneText, time.days >= 30 && styles.milestoneTextComplete]}>
                1 Month
              </Text>
            </View>
            <View style={[styles.milestone, time.days >= 90 && styles.milestoneComplete]}>
              <Ionicons
                name={time.days >= 90 ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={time.days >= 90 ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.milestoneText, time.days >= 90 && styles.milestoneTextComplete]}>
                90 Days
              </Text>
            </View>
            <View style={[styles.milestone, time.days >= 365 && styles.milestoneComplete]}>
              <Ionicons
                name={time.days >= 365 ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={time.days >= 365 ? colors.gold : colors.textMuted}
              />
              <Text style={[styles.milestoneText, time.days >= 365 && styles.milestoneTextComplete]}>
                1 Year 🏆
              </Text>
            </View>
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
    backgroundColor: colors.cardBackground,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  timerCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: 20,
  },
  timerGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  timerBox: {
    alignItems: 'center',
    minWidth: 60,
  },
  timerNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary,
  },
  timerUnit: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  timerDivider: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.textMuted,
    marginHorizontal: 4,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 12,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  statSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  milestonesCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  milestonesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  milestonesList: {
    gap: 12,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  milestoneComplete: {
    backgroundColor: `${colors.primary}15`,
  },
  milestoneText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  milestoneTextComplete: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
