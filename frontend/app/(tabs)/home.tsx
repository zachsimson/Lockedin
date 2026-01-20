import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import api from '../../src/services/api';
import { RecoveryStats } from '../../src/types';

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
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [quote] = useState(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

  const loadStats = async () => {
    try {
      const response = await api.get('/api/recovery/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, []);

  const handleCheckIn = (slipped: boolean) => {
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
                await loadStats();
              } catch (error) {
                console.error('Failed to report relapse:', error);
              }
            },
          },
        ]
      );
    } else {
      setCheckedInToday(true);
      Alert.alert('Nice!', 'Another clean day in the books! 🎉');
    }
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
              <TouchableOpacity
                style={[styles.checkInButton, styles.checkInSuccess]}
                onPress={() => handleCheckIn(false)}
              >
                <Ionicons name="checkmark-circle" size={32} color="#FFF" />
                <Text style={styles.checkInButtonText}>I stayed clean!</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.checkInButton, styles.checkInSlipped]}
                onPress={() => handleCheckIn(true)}
              >
                <Ionicons name="refresh-circle" size={32} color="#FFF" />
                <Text style={styles.checkInButtonText}>I slipped</Text>
              </TouchableOpacity>
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
        </View>

        <View style={styles.activityCard}>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="trophy" size={20} color={colors.gold} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityUser}>Mike</Text> hit 14 days clean!
              </Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="heart" size={20} color={colors.danger} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityUser}>Sarah</Text> reset today — encouraged by 12 people
              </Text>
              <Text style={styles.activityTime}>5 hours ago</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="star" size={20} color={colors.primary} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityUser}>John</Text> reached 30 days! 🎉
              </Text>
              <Text style={styles.activityTime}>1 day ago</Text>
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
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
  },
  daysNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFF',
    marginVertical: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
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
    padding: 20,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
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
  activityCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  activityUser: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  activityTime: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
