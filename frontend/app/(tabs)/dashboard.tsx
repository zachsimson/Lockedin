import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { RecoveryStats } from '../../src/types';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const response = await api.get('/api/recovery/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const daysSober = stats?.days_sober || 0;
  const moneySaved = stats?.money_saved || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Welcome back, {user?.username}!</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Main Stats Card */}
        <View style={styles.mainCard}>
          <View style={styles.sobrietySection}>
            <Ionicons name="trophy" size={40} color="#FFD700" />
            <Text style={styles.sobrietyLabel}>Days Sober</Text>
            <Text style={styles.sobrietyNumber}>{daysSober}</Text>
            <Text style={styles.sobrietySubtext}>
              Keep going! You're doing great! 💪
            </Text>
          </View>
        </View>

        {/* Savings Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet" size={24} color="#4CAF50" />
            <Text style={styles.cardTitle}>Money Saved</Text>
          </View>
          <Text style={styles.savingsAmount}>${moneySaved.toFixed(2)}</Text>
          <Text style={styles.cardSubtext}>
            Based on ${stats?.gambling_weekly_amount || 0}/week spending
          </Text>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={28} color="#3498DB" />
            <Text style={styles.statNumber}>{Math.floor(daysSober / 7)}</Text>
            <Text style={styles.statLabel}>Weeks</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={28} color="#E74C3C" />
            <Text style={styles.statNumber}>{Math.floor(daysSober / 30)}</Text>
            <Text style={styles.statLabel}>Months</Text>
          </View>
        </View>

        {/* Encouragement Messages */}
        <View style={styles.encouragementCard}>
          <Text style={styles.encouragementTitle}>Remember</Text>
          <Text style={styles.encouragementText}>
            {daysSober === 0 && "Every journey begins with a single step. You've got this!"}
            {daysSober > 0 && daysSober < 7 && "One day at a time. You're stronger than you think!"}
            {daysSober >= 7 && daysSober < 30 && "A week strong! The hardest part is behind you!"}
            {daysSober >= 30 && "You're a champion! Keep inspiring others!"}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="people" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Join Community Chat</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  mainCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 32,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sobrietySection: {
    alignItems: 'center',
  },
  sobrietyLabel: {
    fontSize: 18,
    color: '#fff',
    marginTop: 12,
    fontWeight: '600',
  },
  sobrietyNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  sobrietySubtext: {
    fontSize: 16,
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 8,
  },
  savingsAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginVertical: 8,
  },
  cardSubtext: {
    fontSize: 14,
    color: '#95A5A6',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 4,
  },
  encouragementCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  encouragementTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 8,
  },
  encouragementText: {
    fontSize: 16,
    color: '#5D4037',
    lineHeight: 24,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
