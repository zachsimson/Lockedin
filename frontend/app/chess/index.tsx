import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import api from '../../src/services/api';

// Avatar mappings (same as community)
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

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_id: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

interface ActiveGame {
  _id: string;
  opponent: any;
  your_color: string;
  is_your_turn: boolean;
  mode: string;
}

export default function ChessLobby() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'play' | 'active' | 'leaderboard' | 'history'>('play');
  const [myStats, setMyStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [queuing, setQueuing] = useState(false);
  const [queueMode, setQueueMode] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, leaderboardRes, activeRes, historyRes] = await Promise.all([
        api.get('/api/chess/stats'),
        api.get('/api/chess/leaderboard?type=rating&limit=20'),
        api.get('/api/chess/active-games'),
        api.get('/api/chess/history?limit=10'),
      ]);
      
      setMyStats(statsRes.data.stats);
      setLeaderboard(leaderboardRes.data.leaderboard || []);
      setActiveGames(activeRes.data.games || []);
      setGameHistory(historyRes.data.games || []);
    } catch (error) {
      console.error('Failed to load chess data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const startGame = async (mode: string) => {
    setQueuing(true);
    setQueueMode(mode);
    
    try {
      const response = await api.post('/api/chess/create', { mode });
      
      if (response.data.status === 'matched') {
        // Game found immediately!
        router.push(`/chess/game?gameId=${response.data.game._id}`);
      } else if (response.data.status === 'queued') {
        // Waiting for opponent
        Alert.alert(
          'Searching...',
          'Looking for an opponent. You can wait or cancel.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => leaveQueue(),
            },
            {
              text: 'Keep Waiting',
              onPress: () => pollForMatch(response.data.queue_id),
            },
          ]
        );
      } else if (response.data.game) {
        // Friend game created
        router.push(`/chess/game?gameId=${response.data.game._id}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to start game');
    } finally {
      setQueuing(false);
      setQueueMode(null);
    }
  };

  const pollForMatch = async (queueId: string) => {
    // Simple polling - in production, use WebSockets
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    const poll = async () => {
      attempts++;
      try {
        const activeRes = await api.get('/api/chess/active-games');
        const newGames = activeRes.data.games || [];
        
        // Check if we have a new game
        if (newGames.length > activeGames.length) {
          const newGame = newGames[0];
          router.push(`/chess/game?gameId=${newGame._id}`);
          return;
        }
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          leaveQueue();
          Alert.alert('No Match', 'Could not find an opponent. Try again later.');
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    };
    
    poll();
  };

  const leaveQueue = async () => {
    try {
      await api.delete('/api/chess/queue');
    } catch (error) {
      console.error('Failed to leave queue:', error);
    }
    setQueuing(false);
    setQueueMode(null);
  };

  const renderPlayTab = () => (
    <ScrollView contentContainerStyle={styles.playContent}>
      {/* My Stats Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>YOUR RATING</Text>
        <Text style={styles.ratingNumber}>{myStats?.rating || 1200}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{myStats?.wins || 0}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{myStats?.losses || 0}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{myStats?.draws || 0}</Text>
            <Text style={styles.statLabel}>Draws</Text>
          </View>
        </View>
      </View>

      {/* Game Modes */}
      <Text style={styles.sectionTitle}>START A GAME</Text>
      
      <Pressable 
        style={[styles.gameMode, styles.rankedMode]}
        onPress={() => startGame('ranked')}
        disabled={queuing}
      >
        <View style={styles.gameModeIcon}>
          <Ionicons name="trophy" size={28} color="#FBBF24" />
        </View>
        <View style={styles.gameModeInfo}>
          <Text style={styles.gameModeTitle}>Ranked Match</Text>
          <Text style={styles.gameModeDesc}>Compete for rating points</Text>
        </View>
        {queuing && queueMode === 'ranked' ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
        )}
      </Pressable>

      <Pressable 
        style={styles.gameMode}
        onPress={() => startGame('quick')}
        disabled={queuing}
      >
        <View style={styles.gameModeIcon}>
          <Ionicons name="flash" size={28} color={colors.primary} />
        </View>
        <View style={styles.gameModeInfo}>
          <Text style={styles.gameModeTitle}>Quick Match</Text>
          <Text style={styles.gameModeDesc}>Fast matchmaking, no rating</Text>
        </View>
        {queuing && queueMode === 'quick' ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
        )}
      </Pressable>

      <Pressable 
        style={styles.gameMode}
        onPress={() => startGame('casual')}
        disabled={queuing}
      >
        <View style={styles.gameModeIcon}>
          <Ionicons name="cafe" size={28} color="#A78BFA" />
        </View>
        <View style={styles.gameModeInfo}>
          <Text style={styles.gameModeTitle}>Casual Match</Text>
          <Text style={styles.gameModeDesc}>Relaxed play, wider skill range</Text>
        </View>
        {queuing && queueMode === 'casual' ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
        )}
      </Pressable>

      <Pressable 
        style={[styles.gameMode, styles.friendMode]}
        onPress={() => Alert.alert('Coming Soon', 'Friend matches coming soon!')}
      >
        <View style={styles.gameModeIcon}>
          <Ionicons name="people" size={28} color="#EC4899" />
        </View>
        <View style={styles.gameModeInfo}>
          <Text style={styles.gameModeTitle}>Challenge Friend</Text>
          <Text style={styles.gameModeDesc}>Play against a friend</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
      </Pressable>
    </ScrollView>
  );

  const renderActiveGamesTab = () => (
    <FlatList
      data={activeGames}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <Pressable 
          style={styles.gameCard}
          onPress={() => router.push(`/chess/game?gameId=${item._id}`)}
        >
          <View style={styles.gameCardLeft}>
            <View style={[styles.opponentAvatar, { borderColor: AVATAR_COLORS[item.opponent?.avatar_id] || colors.primary }]}>
              <Ionicons 
                name={(AVATAR_ICONS[item.opponent?.avatar_id] || 'person') as any} 
                size={20} 
                color={AVATAR_COLORS[item.opponent?.avatar_id] || colors.primary} 
              />
            </View>
            <View>
              <Text style={styles.opponentName}>{item.opponent?.username || 'Opponent'}</Text>
              <Text style={styles.gameStatus}>
                {item.is_your_turn ? '🟢 Your turn' : '⏳ Waiting...'}
              </Text>
            </View>
          </View>
          <View style={styles.gameCardRight}>
            <Text style={styles.colorBadge}>{item.your_color}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="game-controller-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No active games</Text>
          <Text style={styles.emptySubtext}>Start a new game to play!</Text>
        </View>
      }
    />
  );

  const renderLeaderboardTab = () => (
    <FlatList
      data={leaderboard}
      keyExtractor={(item, index) => `${item.user_id}-${index}`}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={styles.leaderboardHeader}>
          <Text style={styles.leaderboardTitle}>Top Players</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const isMe = item.user_id === user?._id;
        const rankColors: { [key: number]: string } = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
        
        return (
          <Pressable 
            style={[styles.leaderboardItem, isMe && styles.leaderboardItemMe]}
            onPress={() => router.push(`/profile/${item.user_id}`)}
          >
            <View style={[styles.rankBadge, { backgroundColor: rankColors[item.rank] || colors.surface }]}>
              <Text style={[styles.rankText, item.rank <= 3 && styles.topRankText]}>
                {item.rank}
              </Text>
            </View>
            <View style={[styles.lbAvatar, { borderColor: AVATAR_COLORS[item.avatar_id] || colors.primary }]}>
              <Ionicons 
                name={(AVATAR_ICONS[item.avatar_id] || 'person') as any} 
                size={18} 
                color={AVATAR_COLORS[item.avatar_id] || colors.primary} 
              />
            </View>
            <View style={styles.lbInfo}>
              <Text style={styles.lbUsername}>{item.username}{isMe ? ' (You)' : ''}</Text>
              <Text style={styles.lbRecord}>{item.wins}W - {item.losses}L - {item.draws}D</Text>
            </View>
            <Text style={styles.lbRating}>{item.rating}</Text>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No rankings yet</Text>
          <Text style={styles.emptySubtext}>Play games to get ranked!</Text>
        </View>
      }
    />
  );

  const renderHistoryTab = () => (
    <FlatList
      data={gameHistory}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <View style={styles.historyCard}>
          <View style={styles.historyLeft}>
            <Text style={styles.historyOpponent}>vs {item.opponent?.username || 'Unknown'}</Text>
            <Text style={styles.historyDetails}>
              {item.your_color} • {item.mode} • {item.result}
            </Text>
          </View>
          <View style={[
            styles.resultBadge,
            item.result_for_you === 'win' && styles.winBadge,
            item.result_for_you === 'loss' && styles.lossBadge,
            item.result_for_you === 'draw' && styles.drawBadge,
          ]}>
            <Text style={styles.resultText}>
              {item.result_for_you === 'win' ? 'WIN' : item.result_for_you === 'loss' ? 'LOSS' : 'DRAW'}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No games played</Text>
          <Text style={styles.emptySubtext}>Your match history will appear here</Text>
        </View>
      }
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>♟️ CHESS</Text>
        <Text style={styles.headerSubtitle}>A healthy distraction</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { id: 'play', icon: 'game-controller', label: 'Play' },
          { id: 'active', icon: 'hourglass', label: 'Active' },
          { id: 'leaderboard', icon: 'trophy', label: 'Ranks' },
          { id: 'history', icon: 'time', label: 'History' },
        ].map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={20} 
              color={activeTab === tab.id ? colors.primary : colors.textMuted} 
            />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {activeTab === 'play' && renderPlayTab()}
          {activeTab === 'active' && renderActiveGamesTab()}
          {activeTab === 'leaderboard' && renderLeaderboardTab()}
          {activeTab === 'history' && renderHistoryTab()}
        </>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Play Tab
  playContent: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  gameMode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankedMode: {
    borderColor: '#FBBF24',
    borderWidth: 1.5,
  },
  friendMode: {
    opacity: 0.7,
  },
  gameModeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  gameModeInfo: {
    flex: 1,
  },
  gameModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  gameModeDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Active Games
  listContent: {
    padding: 16,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gameCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  opponentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  opponentName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  gameStatus: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  gameCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'capitalize',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  // Leaderboard
  leaderboardHeader: {
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leaderboardItemMe: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  topRankText: {
    color: '#000',
  },
  lbAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: 12,
  },
  lbInfo: {
    flex: 1,
  },
  lbUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  lbRecord: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  lbRating: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  // History
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyLeft: {
    flex: 1,
  },
  historyOpponent: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  historyDetails: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  resultBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  winBadge: {
    backgroundColor: '#22C55E',
  },
  lossBadge: {
    backgroundColor: '#EF4444',
  },
  drawBadge: {
    backgroundColor: '#F59E0B',
  },
  resultText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
  },
  // Empty State
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
  },
});
