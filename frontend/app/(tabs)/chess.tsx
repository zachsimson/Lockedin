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
  Dimensions,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import api from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 64, 320);
const SQUARE_SIZE = BOARD_SIZE / 8;

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

// Chess piece Unicode characters
const PIECES: { [key: string]: string } = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
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
  game_state: string;
}

type ChessSection = 'play' | 'active' | 'leaderboard' | 'settings';

export default function ChessTab() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [activeSection, setActiveSection] = useState<ChessSection>('play');
  const [myStats, setMyStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [queuing, setQueuing] = useState(false);
  const [queueMode, setQueueMode] = useState<string | null>(null);
  
  // Settings state
  const [boardTheme, setBoardTheme] = useState<'classic' | 'dark' | 'green'>('classic');
  const [pieceStyle, setPieceStyle] = useState<'standard' | 'modern'>('standard');

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

  const startGame = async (mode: string, botDifficulty?: string) => {
    if (mode === 'bot') {
      // Start bot game - create a game against AI
      try {
        const response = await api.post('/api/chess/create', { 
          mode: 'casual',
          is_bot: true,
          bot_difficulty: botDifficulty || 'medium'
        });
        
        if (response.data.game) {
          router.push(`/chess/game?gameId=${response.data.game._id}`);
        }
      } catch (error: any) {
        // If bot not supported yet, inform user
        Alert.alert(
          'Practice Mode',
          'Bot games coming soon! For now, try Quick Match to play against other users.',
          [{ text: 'OK' }]
        );
      }
      return;
    }
    
    setQueuing(true);
    setQueueMode(mode);
    
    try {
      const response = await api.post('/api/chess/create', { mode });
      
      if (response.data.status === 'matched') {
        router.push(`/chess/game?gameId=${response.data.game._id}`);
      } else if (response.data.status === 'queued') {
        Alert.alert(
          'Searching for Opponent',
          'Looking for a match. You can wait or cancel.',
          [
            { text: 'Cancel', style: 'cancel', onPress: leaveQueue },
            { text: 'Keep Waiting', onPress: () => pollForMatch() },
          ]
        );
      } else if (response.data.game) {
        router.push(`/chess/game?gameId=${response.data.game._id}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to start game');
    } finally {
      setQueuing(false);
      setQueueMode(null);
    }
  };

  const pollForMatch = async () => {
    let attempts = 0;
    const maxAttempts = 30;
    
    const poll = async () => {
      attempts++;
      try {
        const activeRes = await api.get('/api/chess/active-games');
        const newGames = activeRes.data.games || [];
        
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

  const getBoardColors = () => {
    switch (boardTheme) {
      case 'dark': return { light: '#4A4A4A', dark: '#2D2D2D' };
      case 'green': return { light: '#EEEED2', dark: '#769656' };
      default: return { light: '#E8D5B5', dark: '#B58863' };
    }
  };

  // Mini board preview for active games
  const renderMiniBoard = (fen: string) => {
    const boardColors = getBoardColors();
    const rows = fen.split(' ')[0].split('/');
    const board: string[][] = [];
    
    for (const row of rows) {
      const boardRow: string[] = [];
      for (const char of row) {
        if (/\d/.test(char)) {
          for (let i = 0; i < parseInt(char); i++) boardRow.push('');
        } else {
          boardRow.push(char);
        }
      }
      board.push(boardRow);
    }
    
    return (
      <View style={styles.miniBoard}>
        {board.map((row, i) => (
          <View key={i} style={styles.miniBoardRow}>
            {row.map((piece, j) => (
              <View 
                key={j} 
                style={[
                  styles.miniSquare,
                  { backgroundColor: (i + j) % 2 === 0 ? boardColors.light : boardColors.dark }
                ]}
              >
                {piece && (
                  <Text style={[
                    styles.miniPiece,
                    piece === piece.toUpperCase() ? styles.whitePiece : styles.blackPiece
                  ]}>
                    {PIECES[piece]}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderPlaySection = () => (
    <ScrollView 
      contentContainerStyle={styles.playContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Stats Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>YOUR RATING</Text>
        <Text style={styles.ratingNumber}>{myStats?.rating || 1000}</Text>
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

      <Text style={styles.sectionTitle}>QUICK PLAY</Text>
      
      {/* Quick Play - Instant Match */}
      <Pressable 
        style={[styles.gameMode, styles.quickPlayMode]}
        onPress={() => startGame('quick')}
        disabled={queuing}
      >
        <View style={styles.gameModeIcon}>
          <Ionicons name="flash" size={28} color={colors.primary} />
        </View>
        <View style={styles.gameModeInfo}>
          <Text style={styles.gameModeTitle}>Quick Play</Text>
          <Text style={styles.gameModeDesc}>Instant match, best available opponent</Text>
        </View>
        {queuing && queueMode === 'quick' ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
        )}
      </Pressable>

      <Text style={styles.sectionTitle}>GAME MODES</Text>

      {/* Play a Friend */}
      <Pressable 
        style={styles.gameMode}
        onPress={() => Alert.alert('Play a Friend', 'Select a friend from your friends list to challenge them!', [
          { text: 'View Friends', onPress: () => router.push('/profile/edit') },
          { text: 'Cancel', style: 'cancel' }
        ])}
      >
        <View style={styles.gameModeIcon}>
          <Ionicons name="people" size={28} color="#EC4899" />
        </View>
        <View style={styles.gameModeInfo}>
          <Text style={styles.gameModeTitle}>Play a Friend</Text>
          <Text style={styles.gameModeDesc}>Challenge someone from your friends list</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
      </Pressable>

      {/* Ranked Match */}
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
          <Text style={styles.gameModeDesc}>Compete for rating points & leaderboard</Text>
        </View>
        {queuing && queueMode === 'ranked' ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
        )}
      </Pressable>

      {/* Practice vs Bot */}
      <Pressable 
        style={styles.gameMode}
        onPress={() => {
          Alert.alert(
            'Practice Mode',
            'Choose difficulty:',
            [
              { text: 'Easy', onPress: () => router.push('/chess/bot?difficulty=easy') },
              { text: 'Medium', onPress: () => router.push('/chess/bot?difficulty=medium') },
              { text: 'Hard', onPress: () => router.push('/chess/bot?difficulty=hard') },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }}
      >
        <View style={styles.gameModeIcon}>
          <Ionicons name="hardware-chip" size={28} color="#A78BFA" />
        </View>
        <View style={styles.gameModeInfo}>
          <Text style={styles.gameModeTitle}>Practice vs Bot</Text>
          <Text style={styles.gameModeDesc}>Play against AI (does not affect rating)</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
      </Pressable>
    </ScrollView>
  );

  const renderActiveGamesSection = () => (
    <FlatList
      data={activeGames}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <Pressable 
          style={styles.activeGameCard}
          onPress={() => router.push(`/chess/game?gameId=${item._id}`)}
        >
          <View style={styles.gameCardContent}>
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
            {item.game_state && renderMiniBoard(item.game_state)}
          </View>
          <View style={styles.gameCardFooter}>
            <Text style={styles.colorBadge}>Playing as {item.your_color}</Text>
            <Text style={styles.modeBadge}>{item.mode}</Text>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="game-controller-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No active games</Text>
          <Text style={styles.emptySubtext}>Start a new game to play!</Text>
          <Pressable style={styles.emptyButton} onPress={() => setActiveSection('play')}>
            <Text style={styles.emptyButtonText}>Start Playing</Text>
          </Pressable>
        </View>
      }
    />
  );

  const renderLeaderboardSection = () => (
    <FlatList
      data={leaderboard}
      keyExtractor={(item, index) => `${item.user_id}-${index}`}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={styles.leaderboardHeader}>
          <Text style={styles.leaderboardTitle}>♛ Top Players</Text>
          <Text style={styles.leaderboardSubtitle}>Ranked by ELO rating</Text>
        </View>
      }
      renderItem={({ item }) => {
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
          <Text style={styles.emptySubtext}>Play ranked games to get on the leaderboard!</Text>
        </View>
      }
    />
  );

  const renderSettingsSection = () => (
    <ScrollView contentContainerStyle={styles.settingsContent}>
      <Text style={styles.sectionTitle}>BOARD THEME</Text>
      <View style={styles.themeOptions}>
        {[
          { id: 'classic', name: 'Classic', colors: ['#E8D5B5', '#B58863'] },
          { id: 'dark', name: 'Dark', colors: ['#4A4A4A', '#2D2D2D'] },
          { id: 'green', name: 'Tournament', colors: ['#EEEED2', '#769656'] },
        ].map((theme) => (
          <Pressable
            key={theme.id}
            style={[styles.themeOption, boardTheme === theme.id && styles.themeOptionSelected]}
            onPress={() => setBoardTheme(theme.id as any)}
          >
            <View style={styles.themePreview}>
              <View style={[styles.themeSquare, { backgroundColor: theme.colors[0] }]} />
              <View style={[styles.themeSquare, { backgroundColor: theme.colors[1] }]} />
              <View style={[styles.themeSquare, { backgroundColor: theme.colors[1] }]} />
              <View style={[styles.themeSquare, { backgroundColor: theme.colors[0] }]} />
            </View>
            <Text style={styles.themeName}>{theme.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>PIECE STYLE</Text>
      <View style={styles.pieceOptions}>
        {[
          { id: 'standard', name: 'Standard', preview: '♔♕♖' },
          { id: 'modern', name: 'Modern', preview: '♚♛♜' },
        ].map((style) => (
          <Pressable
            key={style.id}
            style={[styles.pieceOption, pieceStyle === style.id && styles.pieceOptionSelected]}
            onPress={() => setPieceStyle(style.id as any)}
          >
            <Text style={styles.piecePreview}>{style.preview}</Text>
            <Text style={styles.pieceName}>{style.name}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color={colors.primary} />
        <Text style={styles.infoText}>
          Your preferences are saved automatically and will apply to all your games.
        </Text>
      </View>
    </ScrollView>
  );

  if (loading && !myStats) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>♟️ CHESS</Text>
          <Text style={styles.headerSubtitle}>A healthy distraction</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>♟️ CHESS</Text>
        <Text style={styles.headerSubtitle}>A healthy distraction</Text>
      </View>

      {/* Section Tabs */}
      <View style={styles.tabBar}>
        {[
          { id: 'play', icon: 'game-controller', label: 'Play' },
          { id: 'active', icon: 'hourglass', label: 'Active', badge: activeGames.length },
          { id: 'leaderboard', icon: 'trophy', label: 'Ranks' },
          { id: 'settings', icon: 'settings', label: 'Settings' },
        ].map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeSection === tab.id && styles.tabActive]}
            onPress={() => setActiveSection(tab.id as ChessSection)}
          >
            <View style={styles.tabIconWrapper}>
              <Ionicons 
                name={tab.icon as any} 
                size={20} 
                color={activeSection === tab.id ? colors.primary : colors.textMuted} 
              />
            </View>
            <Text style={[styles.tabLabel, activeSection === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {tab.badge !== undefined && tab.badge > 0 && (
              <View style={styles.tabBadgeAbsolute}>
                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {activeSection === 'play' && renderPlaySection()}
      {activeSection === 'active' && renderActiveGamesSection()}
      {activeSection === 'leaderboard' && renderLeaderboardSection()}
      {activeSection === 'settings' && renderSettingsSection()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    position: 'relative',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabIconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: colors.primary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeAbsolute: {
    position: 'absolute',
    top: 6,
    right: 10,
    backgroundColor: colors.primary,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  tabLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.primary,
  },
  // Play Section
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
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
  quickPlayMode: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  rankedMode: {
    borderColor: '#FBBF24',
    borderWidth: 1,
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
  activeGameCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gameCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
  miniBoard: {
    width: 64,
    height: 64,
    borderRadius: 4,
    overflow: 'hidden',
  },
  miniBoardRow: {
    flexDirection: 'row',
  },
  miniSquare: {
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPiece: {
    fontSize: 6,
  },
  whitePiece: {
    color: '#FFFFFF',
  },
  blackPiece: {
    color: '#000000',
  },
  gameCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  colorBadge: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  modeBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  // Leaderboard
  leaderboardHeader: {
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  leaderboardSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
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
  // Settings
  settingsContent: {
    padding: 16,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  themeOption: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  themeOptionSelected: {
    borderColor: colors.primary,
  },
  themePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  themeSquare: {
    width: 20,
    height: 20,
  },
  themeName: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  pieceOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  pieceOption: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  pieceOptionSelected: {
    borderColor: colors.primary,
  },
  piecePreview: {
    fontSize: 24,
    marginBottom: 8,
  },
  pieceName: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
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
  emptyButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});
