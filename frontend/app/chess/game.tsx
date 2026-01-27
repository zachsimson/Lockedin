import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import api from '../../src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 32, 400);
const SQUARE_SIZE = BOARD_SIZE / 8;

// Chess piece Unicode characters
const PIECES: { [key: string]: string } = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
};

interface Move {
  from: string;
  to: string;
  san: string;
}

interface GameState {
  game: any;
  white_player: any;
  black_player: any;
  moves: Move[];
  legal_moves: string[];
  turn: string;
  your_color: string;
  is_your_turn: boolean;
  is_check: boolean;
  is_checkmate: boolean;
  is_stalemate: boolean;
  is_draw: boolean;
  fen: string;
}

export default function ChessGame() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const gameId = params.gameId as string;
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (gameId) {
      loadGame();
    }
  }, [gameId]);

  const loadGame = async () => {
    try {
      const response = await api.get(`/api/chess/game/${gameId}`);
      setGameState(response.data);
      
      // Load chat
      const chatRes = await api.get(`/api/chess/chat/${gameId}`);
      setChatMessages(chatRes.data.messages || []);
    } catch (error) {
      console.error('Failed to load game:', error);
      Alert.alert('Error', 'Failed to load game');
    } finally {
      setLoading(false);
    }
  };

  // Parse FEN to get board position
  const parseFEN = (fen: string): string[][] => {
    const board: string[][] = [];
    const rows = fen.split(' ')[0].split('/');
    
    for (const row of rows) {
      const boardRow: string[] = [];
      for (const char of row) {
        if (/\d/.test(char)) {
          // Empty squares
          for (let i = 0; i < parseInt(char); i++) {
            boardRow.push('');
          }
        } else {
          boardRow.push(char);
        }
      }
      board.push(boardRow);
    }
    
    return board;
  };

  const getSquareName = (row: number, col: number): string => {
    const files = 'abcdefgh';
    const ranks = '87654321';
    return files[col] + ranks[row];
  };

  const getSquareFromName = (name: string): { row: number; col: number } => {
    const files = 'abcdefgh';
    const ranks = '87654321';
    return {
      row: ranks.indexOf(name[1]),
      col: files.indexOf(name[0]),
    };
  };

  const handleSquarePress = async (row: number, col: number) => {
    if (!gameState || !gameState.is_your_turn) return;
    
    const squareName = getSquareName(row, col);
    const board = parseFEN(gameState.fen);
    const piece = board[row][col];
    
    // Check if clicking on own piece to select
    const isWhitePiece = piece && piece === piece.toUpperCase();
    const isBlackPiece = piece && piece === piece.toLowerCase();
    const isOwnPiece = (gameState.your_color === 'white' && isWhitePiece) || 
                       (gameState.your_color === 'black' && isBlackPiece);
    
    if (selectedSquare) {
      // Try to make a move
      const moveUci = selectedSquare + squareName;
      
      if (validMoves.some(m => m.startsWith(moveUci))) {
        // Check for promotion
        let promotion = null;
        const isPawn = board[getSquareFromName(selectedSquare).row][getSquareFromName(selectedSquare).col].toLowerCase() === 'p';
        const isLastRank = (gameState.your_color === 'white' && squareName[1] === '8') || 
                          (gameState.your_color === 'black' && squareName[1] === '1');
        
        if (isPawn && isLastRank) {
          // Default to queen promotion
          promotion = 'q';
        }
        
        await makeMove(selectedSquare, squareName, promotion);
        setSelectedSquare(null);
        setValidMoves([]);
      } else if (isOwnPiece) {
        // Select new piece
        setSelectedSquare(squareName);
        const moves = gameState.legal_moves.filter(m => m.startsWith(squareName));
        setValidMoves(moves);
      } else {
        // Deselect
        setSelectedSquare(null);
        setValidMoves([]);
      }
    } else if (isOwnPiece) {
      // Select piece
      setSelectedSquare(squareName);
      const moves = gameState.legal_moves.filter(m => m.startsWith(squareName));
      setValidMoves(moves);
    }
  };

  const makeMove = async (from: string, to: string, promotion: string | null) => {
    try {
      const response = await api.post('/api/chess/move', {
        game_id: gameId,
        from_square: from,
        to_square: to,
        promotion,
      });
      
      setLastMove({ from, to });
      
      // Reload game state
      await loadGame();
      
      if (response.data.game_result) {
        const resultMessage = response.data.winner_id === user?._id
          ? `You won by ${response.data.game_result}!`
          : `Game ended: ${response.data.game_result}`;
        Alert.alert('Game Over', resultMessage);
      }
    } catch (error: any) {
      Alert.alert('Invalid Move', error.response?.data?.detail || 'Could not make move');
    }
  };

  const handleResign = () => {
    Alert.alert(
      'Resign Game',
      'Are you sure you want to resign? This will count as a loss.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resign',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/api/chess/resign', { game_id: gameId });
              Alert.alert('Resigned', 'You have resigned the game.');
              router.back();
            } catch (error) {
              console.error('Failed to resign:', error);
            }
          },
        },
      ]
    );
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    try {
      await api.post(`/api/chess/chat/${gameId}`, { content: chatInput.trim() });
      setChatInput('');
      
      // Reload chat
      const chatRes = await api.get(`/api/chess/chat/${gameId}`);
      setChatMessages(chatRes.data.messages || []);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const renderBoard = () => {
    if (!gameState) return null;
    
    const board = parseFEN(gameState.fen);
    const isFlipped = gameState.your_color === 'black';
    
    return (
      <View style={styles.boardContainer}>
        <View style={styles.board}>
          {Array.from({ length: 8 }).map((_, rowIndex) => {
            const displayRow = isFlipped ? 7 - rowIndex : rowIndex;
            
            return (
              <View key={rowIndex} style={styles.row}>
                {Array.from({ length: 8 }).map((_, colIndex) => {
                  const displayCol = isFlipped ? 7 - colIndex : colIndex;
                  const squareName = getSquareName(displayRow, displayCol);
                  const piece = board[displayRow][displayCol];
                  const isLight = (displayRow + displayCol) % 2 === 0;
                  const isSelected = selectedSquare === squareName;
                  const isValidMove = validMoves.some(m => m.slice(2, 4) === squareName);
                  const isLastMoveSquare = lastMove && (lastMove.from === squareName || lastMove.to === squareName);
                  const isCheck = gameState.is_check && piece.toLowerCase() === 'k' && 
                    ((gameState.turn === 'white' && piece === 'K') || (gameState.turn === 'black' && piece === 'k'));
                  
                  return (
                    <Pressable
                      key={colIndex}
                      style={[
                        styles.square,
                        isLight ? styles.lightSquare : styles.darkSquare,
                        isSelected && styles.selectedSquare,
                        isLastMoveSquare && styles.lastMoveSquare,
                        isCheck && styles.checkSquare,
                      ]}
                      onPress={() => handleSquarePress(displayRow, displayCol)}
                    >
                      {piece && (
                        <Text style={[
                          styles.piece,
                          piece === piece.toUpperCase() ? styles.whitePiece : styles.blackPiece
                        ]}>
                          {PIECES[piece]}
                        </Text>
                      )}
                      {isValidMove && !piece && (
                        <View style={styles.validMoveIndicator} />
                      )}
                      {isValidMove && piece && (
                        <View style={styles.captureIndicator} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
        
        {/* File labels */}
        <View style={styles.fileLabels}>
          {(isFlipped ? 'hgfedcba' : 'abcdefgh').split('').map((file) => (
            <Text key={file} style={styles.label}>{file}</Text>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Game not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const opponent = gameState.your_color === 'white' ? gameState.black_player : gameState.white_player;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>CHESS</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerBtn} onPress={() => setShowChat(!showChat)}>
            <Ionicons name="chatbubbles" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Opponent Info */}
        <View style={styles.playerInfo}>
          <View style={styles.playerAvatar}>
            <Ionicons name="person" size={20} color={colors.primary} />
          </View>
          <Text style={styles.playerName}>{opponent?.username || 'Opponent'}</Text>
          <Text style={styles.playerColor}>
            ({gameState.your_color === 'white' ? 'Black' : 'White'})
          </Text>
        </View>

        {/* Chess Board */}
        {renderBoard()}

        {/* Your Info */}
        <View style={styles.playerInfo}>
          <View style={[styles.playerAvatar, styles.playerAvatarYou]}>
            <Ionicons name="person" size={20} color="#000" />
          </View>
          <Text style={styles.playerName}>{user?.username || 'You'}</Text>
          <Text style={styles.playerColor}>({gameState.your_color})</Text>
        </View>

        {/* Game Status */}
        <View style={styles.statusBar}>
          {gameState.game.status === 'active' ? (
            <Text style={[styles.statusText, gameState.is_your_turn && styles.yourTurn]}>
              {gameState.is_your_turn ? "Your turn" : "Opponent's turn"}
              {gameState.is_check && " • CHECK!"}
            </Text>
          ) : (
            <Text style={styles.statusText}>
              Game Over: {gameState.game.result}
              {gameState.game.winner_id === user?._id ? ' (You won!)' : gameState.game.winner_id ? ' (You lost)' : ' (Draw)'}
            </Text>
          )}
        </View>

        {/* Move History */}
        <View style={styles.movesContainer}>
          <Text style={styles.movesTitle}>Move History</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.movesList}>
            {gameState.moves?.map((move: any, index: number) => (
              <View key={index} style={styles.moveItem}>
                <Text style={styles.moveNumber}>{Math.floor(index / 2) + 1}.</Text>
                <Text style={styles.moveText}>{move.san}</Text>
              </View>
            ))}
            {(!gameState.moves || gameState.moves.length === 0) && (
              <Text style={styles.noMoves}>No moves yet</Text>
            )}
          </ScrollView>
        </View>

        {/* Actions */}
        {gameState.game.status === 'active' && (
          <View style={styles.actions}>
            <Pressable style={styles.resignButton} onPress={handleResign}>
              <Ionicons name="flag" size={18} color="#FFF" />
              <Text style={styles.resignText}>Resign</Text>
            </Pressable>
            <Pressable style={styles.refreshButton} onPress={loadGame}>
              <Ionicons name="refresh" size={18} color={colors.primary} />
              <Text style={styles.refreshText}>Refresh</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Chat Panel */}
      {showChat && (
        <View style={styles.chatPanel}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>In-Game Chat</Text>
            <Pressable onPress={() => setShowChat(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
          <FlatList
            data={chatMessages}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={[styles.chatMessage, item.user_id === user?._id && styles.myMessage]}>
                <Text style={styles.chatUsername}>{item.username}</Text>
                <Text style={styles.chatContent}>{item.content}</Text>
              </View>
            )}
            style={styles.chatList}
            contentContainerStyle={styles.chatListContent}
          />
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Send a message..."
              placeholderTextColor={colors.textMuted}
              value={chatInput}
              onChangeText={setChatInput}
            />
            <Pressable style={styles.sendButton} onPress={sendChatMessage}>
              <Ionicons name="send" size={18} color="#000" />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  backButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginHorizontal: 40,
  },
  backButtonText: {
    color: '#000',
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    padding: 8,
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerAvatarYou: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  playerColor: {
    fontSize: 14,
    color: colors.textMuted,
  },
  boardContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightSquare: {
    backgroundColor: '#E8D5B5',
  },
  darkSquare: {
    backgroundColor: '#B58863',
  },
  selectedSquare: {
    backgroundColor: '#F6F669',
  },
  lastMoveSquare: {
    backgroundColor: 'rgba(155, 199, 0, 0.4)',
  },
  checkSquare: {
    backgroundColor: '#FF6B6B',
  },
  piece: {
    fontSize: SQUARE_SIZE * 0.75,
  },
  whitePiece: {
    color: '#FFFFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  blackPiece: {
    color: '#000000',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  validMoveIndicator: {
    width: SQUARE_SIZE * 0.3,
    height: SQUARE_SIZE * 0.3,
    borderRadius: SQUARE_SIZE * 0.15,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  captureIndicator: {
    position: 'absolute',
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderRadius: SQUARE_SIZE / 2,
    borderWidth: 4,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  fileLabels: {
    flexDirection: 'row',
    width: BOARD_SIZE,
    justifyContent: 'space-around',
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    width: SQUARE_SIZE,
    textAlign: 'center',
  },
  statusBar: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 12,
    width: '100%',
  },
  statusText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  yourTurn: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  movesContainer: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  movesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 10,
  },
  movesList: {
    flexDirection: 'row',
  },
  moveItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  moveNumber: {
    fontSize: 12,
    color: colors.textMuted,
    marginRight: 4,
  },
  moveText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  noMoves: {
    fontSize: 14,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  resignButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  resignText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  refreshButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  refreshText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  // Chat Panel
  chatPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    padding: 12,
  },
  chatMessage: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  chatUsername: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  chatContent: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
