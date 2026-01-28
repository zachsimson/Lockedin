import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
// @ts-ignore
import { Chess } from 'chess.js';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 32, 380);
const SQUARE_SIZE = BOARD_SIZE / 8;

// UNIFIED PREMIUM CHESS PIECE SYSTEM
const PIECE_CHARS: { [key: string]: string } = {
  K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const BOARD_THEMES = {
  classic: { light: '#F0D9B5', dark: '#B58863', name: 'Classic' },
  dark: { light: '#4A4A4A', dark: '#2D2D2D', name: 'Dark' },
  green: { light: '#EEEED2', dark: '#769656', name: 'Tournament' },
};

const PIECE_VALUES: { [key: string]: number } = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };

// Timer constants - 10 minutes per player
const INITIAL_TIME = 10 * 60; // 10 minutes in seconds

type Difficulty = 'easy' | 'medium' | 'hard';
type BoardTheme = 'classic' | 'dark' | 'green';

export default function BotGame() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const difficulty = (params.difficulty as Difficulty) || 'medium';
  const boardTheme = (params.theme as BoardTheme) || 'classic';
  
  const [game, setGame] = useState<Chess | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<string>('');
  const [playerColor] = useState<'w' | 'b'>('w');
  const [thinking, setThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  
  // Timer state - 10 minutes per player
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME);
  const [blackTime, setBlackTime] = useState(INITIAL_TIME);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getBoardColors = useCallback(() => BOARD_THEMES[boardTheme] || BOARD_THEMES.classic, [boardTheme]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize game
  useEffect(() => {
    const newGame = new Chess();
    setGame(newGame);
  }, []);

  // Timer effect - runs every second
  useEffect(() => {
    if (!game || gameOver) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const currentTurn = game.turn();
      
      if (currentTurn === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            // White (player) ran out of time - Bot wins
            setGameOver(true);
            setResult('Bot wins on time!');
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            // Black (bot) ran out of time - Player wins
            setGameOver(true);
            setResult('You win on time!');
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game?.turn(), gameOver]);

  // Bot makes move after player
  useEffect(() => {
    if (!game || gameOver || game.turn() === playerColor) return;
    const timeout = setTimeout(() => makeBotMove(), 500);
    return () => clearTimeout(timeout);
  }, [game?.fen(), gameOver]);

  // Check game over conditions
  useEffect(() => {
    if (!game) return;
    if (game.isGameOver()) {
      setGameOver(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (game.isCheckmate()) {
        const winner = game.turn() === 'w' ? 'Black' : 'White';
        setResult(winner === 'White' ? 'You won by checkmate!' : 'Bot won by checkmate');
      } else if (game.isStalemate()) {
        setResult('Draw by stalemate');
      } else if (game.isDraw()) {
        setResult('Draw');
      }
    }
  }, [game?.fen()]);

  const evaluateBoard = useCallback((chess: Chess): number => {
    let score = 0;
    const board = chess.board();
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          const value = PIECE_VALUES[piece.type] || 0;
          score += piece.color === 'b' ? value : -value;
        }
      }
    }
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    centerSquares.forEach(sq => {
      const piece = chess.get(sq);
      if (piece) score += piece.color === 'b' ? 0.3 : -0.3;
    });
    return score;
  }, []);

  const minimax = useCallback((chess: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean): number => {
    if (depth === 0 || chess.isGameOver()) return evaluateBoard(chess);
    const moves = chess.moves();
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        chess.move(move);
        const evalScore = minimax(chess, depth - 1, alpha, beta, false);
        chess.undo();
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        chess.move(move);
        const evalScore = minimax(chess, depth - 1, alpha, beta, true);
        chess.undo();
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }, [evaluateBoard]);

  const makeBotMove = useCallback(() => {
    if (!game || game.isGameOver()) return;
    setThinking(true);
    setTimeout(() => {
      const moves = game.moves();
      if (moves.length === 0) { setThinking(false); return; }
      let selectedMove: string;
      if (difficulty === 'easy') {
        selectedMove = moves[Math.floor(Math.random() * moves.length)];
      } else if (difficulty === 'medium') {
        let bestMove = moves[0], bestValue = -Infinity;
        const testGame = new Chess(game.fen());
        for (const move of moves) {
          testGame.move(move);
          const value = minimax(testGame, 1, -Infinity, Infinity, false);
          testGame.undo();
          if (value > bestValue) { bestValue = value; bestMove = move; }
        }
        selectedMove = bestMove;
      } else {
        let bestMove = moves[0], bestValue = -Infinity;
        const testGame = new Chess(game.fen());
        for (const move of moves) {
          testGame.move(move);
          const value = minimax(testGame, 2, -Infinity, Infinity, false);
          testGame.undo();
          if (value > bestValue) { bestValue = value; bestMove = move; }
        }
        selectedMove = bestMove;
      }
      const moveResult = game.move(selectedMove);
      if (moveResult) {
        setLastMove({ from: moveResult.from, to: moveResult.to });
        setMoveHistory(prev => [...prev, moveResult.san]);
        setGame(new Chess(game.fen()));
      }
      setThinking(false);
    }, 300);
  }, [game, difficulty, minimax]);

  const handleSquarePress = useCallback((row: number, col: number) => {
    if (!game || gameOver || game.turn() !== playerColor || thinking) return;
    const files = 'abcdefgh';
    const ranks = '87654321';
    const squareName = files[col] + ranks[row];
    const piece = game.get(squareName);
    if (selectedSquare) {
      const moves = game.moves({ square: selectedSquare, verbose: true });
      const targetMove = moves.find(m => m.to === squareName);
      if (targetMove) {
        let promotion = undefined;
        if (targetMove.flags.includes('p')) promotion = 'q';
        const moveResult = game.move({ from: selectedSquare, to: squareName, promotion });
        if (moveResult) {
          setLastMove({ from: selectedSquare, to: squareName });
          setMoveHistory(prev => [...prev, moveResult.san]);
          setGame(new Chess(game.fen()));
        }
        setSelectedSquare(null);
        setValidMoves([]);
      } else if (piece && piece.color === playerColor) {
        setSelectedSquare(squareName);
        const pieceMoves = game.moves({ square: squareName, verbose: true });
        setValidMoves(pieceMoves.map(m => m.to));
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    } else if (piece && piece.color === playerColor) {
      setSelectedSquare(squareName);
      const pieceMoves = game.moves({ square: squareName, verbose: true });
      setValidMoves(pieceMoves.map(m => m.to));
    }
  }, [game, gameOver, playerColor, selectedSquare, thinking]);

  const resetGame = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setGameOver(false);
    setResult('');
    setMoveHistory([]);
    setWhiteTime(INITIAL_TIME);
    setBlackTime(INITIAL_TIME);
  }, []);

  const renderPiece = (piece: { type: string; color: 'w' | 'b' } | null) => {
    if (!piece) return null;
    const char = PIECE_CHARS[piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase()];
    const isWhite = piece.color === 'w';
    return (
      <View style={styles.pieceContainer}>
        <Text style={[styles.piece, isWhite ? styles.whitePiece : styles.blackPiece]}>{char}</Text>
      </View>
    );
  };

  const renderBoard = useMemo(() => {
    if (!game) return null;
    const board = game.board();
    const boardColors = getBoardColors();
    return (
      <View style={[styles.board, { borderColor: boardColors.dark }]}>
        {board.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((piece, colIndex) => {
              const files = 'abcdefgh';
              const ranks = '87654321';
              const squareName = files[colIndex] + ranks[rowIndex];
              const isLight = (rowIndex + colIndex) % 2 === 0;
              const isSelected = selectedSquare === squareName;
              const isValidMove = validMoves.includes(squareName);
              const isLastMoveSquare = lastMove && (lastMove.from === squareName || lastMove.to === squareName);
              const isCheck = game.isCheck() && piece?.type === 'k' && piece?.color === game.turn();
              let squareColor = isLight ? boardColors.light : boardColors.dark;
              if (isSelected) squareColor = '#F6F669';
              else if (isLastMoveSquare) squareColor = 'rgba(155, 199, 0, 0.5)';
              else if (isCheck) squareColor = '#FF6B6B';
              return (
                <Pressable
                  key={`square-${rowIndex}-${colIndex}`}
                  style={[styles.square, { backgroundColor: squareColor }]}
                  onPress={() => handleSquarePress(rowIndex, colIndex)}
                >
                  {renderPiece(piece)}
                  {isValidMove && !piece && <View style={styles.validMoveIndicator} />}
                  {isValidMove && piece && <View style={styles.captureIndicator} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  }, [game?.fen(), selectedSquare, validMoves, lastMove, handleSquarePress, getBoardColors]);

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const isWhiteTurn = game.turn() === 'w';
  const isLowTimeWhite = whiteTime < 60;
  const isLowTimeBlack = blackTime < 60;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>PRACTICE MODE</Text>
          <Text style={styles.headerSubtitle}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Bot • 10 min
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-offline" size={14} color={colors.textMuted} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Bot Timer - BLACK */}
        <View style={[styles.timerContainer, !isWhiteTurn && styles.timerActive, isLowTimeBlack && styles.timerLow]}>
          <View style={styles.timerInfo}>
            <View style={styles.botAvatar}>
              <Ionicons name="hardware-chip" size={20} color="#A78BFA" />
            </View>
            <Text style={styles.timerPlayerName}>
              {difficulty === 'easy' ? 'Rookie Bot' : difficulty === 'medium' ? 'Challenger Bot' : 'Master Bot'}
            </Text>
            {thinking && <Text style={styles.thinkingLabel}>Thinking...</Text>}
          </View>
          <View style={[styles.timerDisplay, !isWhiteTurn && styles.timerDisplayActive, isLowTimeBlack && styles.timerDisplayLow]}>
            <Ionicons name="time" size={16} color={isLowTimeBlack ? '#FFF' : colors.textMuted} />
            <Text style={[styles.timerText, !isWhiteTurn && styles.timerTextActive, isLowTimeBlack && styles.timerTextLow]}>
              {formatTime(blackTime)}
            </Text>
          </View>
        </View>

        {/* Chess Board */}
        <View style={styles.boardContainer}>{renderBoard}</View>

        {/* Player Timer - WHITE */}
        <View style={[styles.timerContainer, isWhiteTurn && styles.timerActive, isLowTimeWhite && styles.timerLow]}>
          <View style={styles.timerInfo}>
            <View style={[styles.botAvatar, styles.playerAvatar]}>
              <Ionicons name="person" size={20} color="#000" />
            </View>
            <Text style={styles.timerPlayerName}>{user?.username || 'You'} (White)</Text>
          </View>
          <View style={[styles.timerDisplay, isWhiteTurn && styles.timerDisplayActive, isLowTimeWhite && styles.timerDisplayLow]}>
            <Ionicons name="time" size={16} color={isLowTimeWhite ? '#FFF' : colors.textMuted} />
            <Text style={[styles.timerText, isWhiteTurn && styles.timerTextActive, isLowTimeWhite && styles.timerTextLow]}>
              {formatTime(whiteTime)}
            </Text>
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusBar}>
          {gameOver ? (
            <Text style={styles.statusText}>{result}</Text>
          ) : (
            <Text style={[styles.statusText, game.turn() === playerColor && styles.yourTurn]}>
              {game.turn() === playerColor ? "Your turn" : "Bot's turn"}
              {game.isCheck() && " • CHECK!"}
            </Text>
          )}
        </View>

        {/* Move History */}
        <View style={styles.movesContainer}>
          <Text style={styles.movesTitle}>Moves</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.movesList}>
            {moveHistory.map((move, index) => (
              <View key={`move-${index}`} style={styles.moveItem}>
                <Text style={styles.moveNumber}>{Math.floor(index / 2) + 1}.</Text>
                <Text style={styles.moveText}>{move}</Text>
              </View>
            ))}
            {moveHistory.length === 0 && <Text style={styles.noMoves}>No moves yet</Text>}
          </ScrollView>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.resetButton} onPress={resetGame}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
            <Text style={styles.resetText}>New Game</Text>
          </Pressable>
          <Pressable style={styles.exitButton} onPress={() => router.back()}>
            <Ionicons name="exit" size={18} color={colors.textMuted} />
            <Text style={styles.exitText}>Exit</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingText: { color: colors.textPrimary, fontSize: 16, textAlign: 'center', marginTop: 100 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 8 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, letterSpacing: 1 },
  headerSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  headerRight: { width: 60, alignItems: 'flex-end' },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4,
  },
  offlineText: { fontSize: 10, color: colors.textMuted },
  content: { padding: 16, alignItems: 'center' },
  // Timer styles
  timerContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.cardBackground, borderRadius: 12, padding: 12,
    width: '100%', marginVertical: 4, borderWidth: 2, borderColor: 'transparent',
  },
  timerActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  timerLow: { borderColor: '#DC2626', backgroundColor: 'rgba(220, 38, 38, 0.1)' },
  timerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  botAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    borderWidth: 2, borderColor: '#A78BFA', justifyContent: 'center', alignItems: 'center',
  },
  playerAvatar: { backgroundColor: colors.primary, borderColor: colors.primary },
  timerPlayerName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  thinkingLabel: { fontSize: 11, color: '#A78BFA', fontWeight: '600' },
  timerDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  timerDisplayActive: { backgroundColor: colors.primary },
  timerDisplayLow: { backgroundColor: '#DC2626' },
  timerText: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  timerTextActive: { color: '#000' },
  timerTextLow: { color: '#FFF' },
  boardContainer: { alignItems: 'center', marginVertical: 8 },
  board: { width: BOARD_SIZE, height: BOARD_SIZE, borderWidth: 3, borderRadius: 4, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  square: { width: SQUARE_SIZE, height: SQUARE_SIZE, justifyContent: 'center', alignItems: 'center' },
  pieceContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  piece: { fontSize: SQUARE_SIZE * 0.8, textAlign: 'center' },
  // WHITE PIECES - Warm ivory/pearl, fully solid with dark outline for visibility
  whitePiece: {
    color: '#FFFEF5',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  // BLACK PIECES - Graphite/obsidian, fully solid with light outline for visibility
  blackPiece: {
    color: '#1A1A1A',
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1,
  },
  validMoveIndicator: {
    width: SQUARE_SIZE * 0.3, height: SQUARE_SIZE * 0.3,
    borderRadius: SQUARE_SIZE * 0.15, backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  captureIndicator: {
    position: 'absolute', width: SQUARE_SIZE, height: SQUARE_SIZE,
    borderRadius: SQUARE_SIZE / 2, borderWidth: 4, borderColor: 'rgba(0, 0, 0, 0.25)',
  },
  statusBar: {
    backgroundColor: colors.cardBackground, paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 8, marginVertical: 8, width: '100%',
  },
  statusText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  yourTurn: { color: colors.primary, fontWeight: 'bold' },
  movesContainer: {
    width: '100%', backgroundColor: colors.cardBackground,
    borderRadius: 12, padding: 16, marginBottom: 16,
  },
  movesTitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 10 },
  movesList: { flexDirection: 'row' },
  moveItem: {
    flexDirection: 'row', backgroundColor: colors.surface,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, marginRight: 8,
  },
  moveNumber: { fontSize: 12, color: colors.textMuted, marginRight: 4 },
  moveText: { fontSize: 12, color: colors.textPrimary, fontWeight: '500' },
  noMoves: { fontSize: 13, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 16 },
  resetButton: {
    flex: 1, flexDirection: 'row', backgroundColor: colors.surface,
    paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    gap: 8, borderWidth: 1, borderColor: colors.primary,
  },
  resetText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  exitButton: {
    flex: 1, flexDirection: 'row', backgroundColor: colors.surface,
    paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  exitText: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
});
