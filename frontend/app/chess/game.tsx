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
  Image,
  PanResponder,
  Animated,
} from 'react-native';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import api from '../../src/services/api';
import { socketService } from '../../src/services/socket';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 32, 400);
const SQUARE_SIZE = BOARD_SIZE / 8;

// =============================================================================
// Chess piece images - Using PNG for better cross-platform compatibility
// =============================================================================
const PIECE_IMAGES: { [key: string]: string } = {
  // White pieces
  K: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png',
  Q: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png',
  R: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png',
  B: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png',
  N: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png',
  P: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png',
  // Black pieces
  k: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png',
  q: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png',
  r: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png',
  b: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png',
  n: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png',
  p: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png',
};

const BOARD_THEMES = {
  classic: { light: '#F0D9B5', dark: '#B58863', name: 'Classic' },
  dark: { light: '#4A4A4A', dark: '#2D2D2D', name: 'Dark' },
  green: { light: '#EEEED2', dark: '#769656', name: 'Tournament' },
};

type BoardTheme = 'classic' | 'dark' | 'green';

interface Move { from: string; to: string; san: string; }
interface GameState {
  game: any; white_player: any; black_player: any; moves: Move[];
  legal_moves: string[]; turn: string; your_color: string;
  is_your_turn: boolean; is_check: boolean; is_checkmate: boolean;
  is_stalemate: boolean; is_draw: boolean; fen: string;
}

export default function ChessGame() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const gameId = params.gameId as string;
  const boardTheme = (params.theme as BoardTheme) || 'classic';
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  
  // Timer state (10 minutes = 600 seconds per player)
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Drag state for drag-to-move
  const [draggingPiece, setDraggingPiece] = useState<{
    piece: string;
    fromSquare: string;
    fromRow: number;
    fromCol: number;
  } | null>(null);
  const dragPosition = useRef(new Animated.ValueXY()).current;
  const boardRef = useRef<View>(null);
  const [boardLayout, setBoardLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer effect
  useEffect(() => {
    if (!gameState || gameState.game.status !== 'active') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      if (gameState.turn === 'white') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            // Time out - white loses
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            // Time out - black loses
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.turn, gameState?.game.status]);

  const getBoardColors = useCallback(() => {
    return BOARD_THEMES[boardTheme] || BOARD_THEMES.classic;
  }, [boardTheme]);

  // Setup socket connection for real-time updates
  useEffect(() => {
    if (!user?._id || !gameId) return;

    // Connect socket if not connected
    socketService.connect(user._id);

    // Listen for opponent's moves
    const handleChessMove = (data: any) => {
      if (data.game_id === gameId) {
        console.log('Received chess move:', data);
        loadGame(); // Reload game state
      }
    };

    // Listen for chess chat messages
    const handleChessChat = (data: any) => {
      if (data.game_id === gameId) {
        setChatMessages(prev => [...prev, data]);
      }
    };

    // Listen for game resignation
    const handleResignation = (data: any) => {
      if (data.game_id === gameId) {
        Alert.alert('Game Over', 'Your opponent resigned. You win!');
        loadGame();
      }
    };

    // Subscribe to events
    socketService.on(`chess_move_${user._id}`, handleChessMove);
    socketService.on(`chess_chat_${user._id}`, handleChessChat);
    socketService.on(`chess_resign_${user._id}`, handleResignation);

    return () => {
      // Cleanup listeners
      socketService.off(`chess_move_${user._id}`, handleChessMove);
      socketService.off(`chess_chat_${user._id}`, handleChessChat);
      socketService.off(`chess_resign_${user._id}`, handleResignation);
    };
  }, [user?._id, gameId]);

  useEffect(() => { if (gameId) loadGame(); }, [gameId]);

  const loadGame = async () => {
    try {
      const response = await api.get(`/api/chess/game/${gameId}`);
      setGameState(response.data);
      const chatRes = await api.get(`/api/chess/chat/${gameId}`);
      setChatMessages(chatRes.data.messages || []);
    } catch (error) {
      console.error('Failed to load game:', error);
      Alert.alert('Error', 'Failed to load game');
    } finally { setLoading(false); }
  };

  const parseFEN = (fen: string): string[][] => {
    const board: string[][] = [];
    const rows = fen.split(' ')[0].split('/');
    for (const row of rows) {
      const boardRow: string[] = [];
      for (const char of row) {
        if (/\d/.test(char)) {
          for (let i = 0; i < parseInt(char); i++) boardRow.push('');
        } else boardRow.push(char);
      }
      board.push(boardRow);
    }
    return board;
  };

  const getSquareName = (row: number, col: number): string => {
    const files = 'abcdefgh', ranks = '87654321';
    return files[col] + ranks[row];
  };

  const getSquareFromName = (name: string): { row: number; col: number } => {
    const files = 'abcdefgh', ranks = '87654321';
    return { row: ranks.indexOf(name[1]), col: files.indexOf(name[0]) };
  };

  const handleSquarePress = async (row: number, col: number) => {
    if (!gameState || !gameState.is_your_turn) return;
    const squareName = getSquareName(row, col);
    const board = parseFEN(gameState.fen);
    const piece = board[row][col];
    const isWhitePiece = piece && piece === piece.toUpperCase();
    const isBlackPiece = piece && piece === piece.toLowerCase();
    const isOwnPiece = (gameState.your_color === 'white' && isWhitePiece) || 
                       (gameState.your_color === 'black' && isBlackPiece);
    
    if (selectedSquare) {
      const moveUci = selectedSquare + squareName;
      if (validMoves.some(m => m.startsWith(moveUci))) {
        let promotion = null;
        const isPawn = board[getSquareFromName(selectedSquare).row][getSquareFromName(selectedSquare).col].toLowerCase() === 'p';
        const isLastRank = (gameState.your_color === 'white' && squareName[1] === '8') || 
                          (gameState.your_color === 'black' && squareName[1] === '1');
        if (isPawn && isLastRank) promotion = 'q';
        await makeMove(selectedSquare, squareName, promotion);
        setSelectedSquare(null); setValidMoves([]);
      } else if (isOwnPiece) {
        setSelectedSquare(squareName);
        setValidMoves(gameState.legal_moves.filter(m => m.startsWith(squareName)));
      } else { setSelectedSquare(null); setValidMoves([]); }
    } else if (isOwnPiece) {
      setSelectedSquare(squareName);
      setValidMoves(gameState.legal_moves.filter(m => m.startsWith(squareName)));
    }
  };

  const makeMove = async (from: string, to: string, promotion: string | null) => {
    if (!gameState) return;
    
    try {
      const response = await api.post('/api/chess/move', {
        game_id: gameId, from_square: from, to_square: to, promotion,
      });
      
      // Update state with response data (no full reload needed)
      if (response.data) {
        setGameState(prev => prev ? {
          ...prev,
          fen: response.data.fen || prev.fen,
          turn: response.data.turn || (prev.turn === 'white' ? 'black' : 'white'),
          is_your_turn: !prev.is_your_turn,
          is_check: response.data.is_check || false,
          legal_moves: response.data.legal_moves || [],
          move_history: response.data.move_history || prev.move_history,
          game: { ...prev.game, status: response.data.game_result ? 'completed' : 'active' }
        } : null);
        
        setLastMove({ from, to });
        setSelectedSquare(null);
        setValidMoves([]);
        
        if (response.data.game_result) {
          const resultMessage = response.data.winner_id === user?._id
            ? `You won by ${response.data.game_result}!` : `Game ended: ${response.data.game_result}`;
          Alert.alert('Game Over', resultMessage);
        }
      }
    } catch (error: any) {
      Alert.alert('Invalid Move', error.response?.data?.detail || 'Could not make move');
    }
  };

  const handleResign = () => {
    Alert.alert('Resign Game', 'Are you sure? This counts as a loss.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resign', style: 'destructive', onPress: async () => {
        try {
          await api.post('/api/chess/resign', { game_id: gameId });
          Alert.alert('Resigned', 'You resigned the game.');
          router.back();
        } catch (error) { console.error('Failed to resign:', error); }
      }},
    ]);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    try {
      await api.post(`/api/chess/chat/${gameId}`, { content: chatInput.trim() });
      setChatInput('');
      const chatRes = await api.get(`/api/chess/chat/${gameId}`);
      setChatMessages(chatRes.data.messages || []);
    } catch (error) { console.error('Failed to send message:', error); }
  };

  // UNIFIED PREMIUM PIECE RENDERER
  const renderPiece = (pieceChar: string, isDragging: boolean = false) => {
    if (!pieceChar) return null;
    const imageUrl = PIECE_IMAGES[pieceChar];
    if (!imageUrl) return null;
    return (
      <View style={[styles.pieceContainer, isDragging && styles.pieceContainerDragging]}>
        <Image 
          source={{ uri: imageUrl }} 
          style={[styles.pieceImage, isDragging && styles.pieceImageDragging]}
          resizeMode="contain"
        />
      </View>
    );
  };

  // Handle drag start
  const handleDragStart = (piece: string, squareName: string, row: number, col: number, isFlipped: boolean) => {
    if (!gameState?.is_your_turn) return;
    
    const isWhitePiece = piece === piece.toUpperCase();
    const isBlackPiece = piece === piece.toLowerCase();
    const isOwnPiece = (gameState.your_color === 'white' && isWhitePiece) || 
                       (gameState.your_color === 'black' && isBlackPiece);
    
    if (!isOwnPiece) return;
    
    setDraggingPiece({ piece, fromSquare: squareName, fromRow: row, fromCol: col });
    setSelectedSquare(squareName);
    setValidMoves(gameState.legal_moves.filter(m => m.startsWith(squareName)));
    
    // Calculate initial position
    const displayCol = isFlipped ? 7 - col : col;
    const displayRow = isFlipped ? 7 - row : row;
    dragPosition.setValue({ 
      x: displayCol * SQUARE_SIZE, 
      y: displayRow * SQUARE_SIZE 
    });
  };

  // Handle drag move
  const handleDragMove = (gestureState: any) => {
    if (!draggingPiece) return;
    dragPosition.setValue({
      x: gestureState.moveX - boardLayout.x - SQUARE_SIZE / 2,
      y: gestureState.moveY - boardLayout.y - SQUARE_SIZE / 2,
    });
  };

  // Handle drag end
  const handleDragEnd = async (gestureState: any, isFlipped: boolean) => {
    if (!draggingPiece || !gameState) {
      setDraggingPiece(null);
      return;
    }
    
    // Calculate target square from drop position
    const relativeX = gestureState.moveX - boardLayout.x;
    const relativeY = gestureState.moveY - boardLayout.y;
    
    let targetCol = Math.floor(relativeX / SQUARE_SIZE);
    let targetRow = Math.floor(relativeY / SQUARE_SIZE);
    
    // Clamp to board bounds
    targetCol = Math.max(0, Math.min(7, targetCol));
    targetRow = Math.max(0, Math.min(7, targetRow));
    
    // Adjust for flipped board
    if (isFlipped) {
      targetCol = 7 - targetCol;
      targetRow = 7 - targetRow;
    }
    
    const targetSquare = getSquareName(targetRow, targetCol);
    const moveUci = draggingPiece.fromSquare + targetSquare;
    
    // Check if valid move
    if (validMoves.some(m => m.startsWith(moveUci))) {
      // Check for pawn promotion
      let promotion = null;
      const isPawn = draggingPiece.piece.toLowerCase() === 'p';
      const isLastRank = (gameState.your_color === 'white' && targetSquare[1] === '8') || 
                        (gameState.your_color === 'black' && targetSquare[1] === '1');
      if (isPawn && isLastRank) promotion = 'q';
      
      await makeMove(draggingPiece.fromSquare, targetSquare, promotion);
    }
    
    setDraggingPiece(null);
    setSelectedSquare(null);
    setValidMoves([]);
  };

  // Create pan responder for drag
  const createPanResponder = (piece: string, squareName: string, row: number, col: number, isFlipped: boolean) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        handleDragStart(piece, squareName, row, col, isFlipped);
      },
      onPanResponderMove: (_, gestureState) => {
        handleDragMove(gestureState);
      },
      onPanResponderRelease: (_, gestureState) => {
        handleDragEnd(gestureState, isFlipped);
      },
      onPanResponderTerminate: () => {
        setDraggingPiece(null);
      },
    });
  };

  const renderBoard = () => {
    if (!gameState) return null;
    const board = parseFEN(gameState.fen);
    const isFlipped = gameState.your_color === 'black';
    const boardColors = getBoardColors();
    
    return (
      <View style={styles.boardContainer}>
        <View 
          ref={boardRef}
          style={[styles.board, { borderColor: boardColors.dark }]}
          onLayout={(event) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            boardRef.current?.measureInWindow((px, py) => {
              setBoardLayout({ x: px, y: py, width, height });
            });
          }}
        >
          {Array.from({ length: 8 }).map((_, rowIndex) => {
            const displayRow = isFlipped ? 7 - rowIndex : rowIndex;
            return (
              <View key={`row-${rowIndex}`} style={styles.row}>
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
                  const isDraggingThisPiece = draggingPiece?.fromSquare === squareName;
                  
                  let squareColor = isLight ? boardColors.light : boardColors.dark;
                  if (isSelected) squareColor = '#F6F669';
                  else if (isLastMoveSquare) squareColor = 'rgba(155, 199, 0, 0.4)';
                  else if (isCheck) squareColor = '#FF6B6B';
                  
                  // Check if this is player's piece for drag
                  const isWhitePiece = piece && piece === piece.toUpperCase();
                  const isBlackPiece = piece && piece === piece.toLowerCase();
                  const isOwnPiece = piece && gameState.is_your_turn && (
                    (gameState.your_color === 'white' && isWhitePiece) || 
                    (gameState.your_color === 'black' && isBlackPiece)
                  );
                  
                  const panResponder = isOwnPiece 
                    ? createPanResponder(piece, squareName, displayRow, displayCol, isFlipped)
                    : null;
                  
                  return (
                    <View
                      key={`square-${rowIndex}-${colIndex}`}
                      style={[styles.square, { backgroundColor: squareColor }]}
                      {...(panResponder?.panHandlers)}
                    >
                      <Pressable
                        style={styles.squarePressable}
                        onPress={() => handleSquarePress(displayRow, displayCol)}
                      >
                        {piece && !isDraggingThisPiece && renderPiece(piece)}
                        {isValidMove && !piece && <View style={styles.validMoveIndicator} />}
                        {isValidMove && piece && !isDraggingThisPiece && <View style={styles.captureIndicator} />}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            );
          })}
          
          {/* Dragging piece overlay */}
          {draggingPiece && (
            <Animated.View 
              style={[
                styles.draggingPiece,
                {
                  transform: dragPosition.getTranslateTransform(),
                }
              ]}
              pointerEvents="none"
            >
              {renderPiece(draggingPiece.piece, true)}
            </Animated.View>
          )}
        </View>
        <View style={styles.fileLabels}>
          {(isFlipped ? 'hgfedcba' : 'abcdefgh').split('').map((file, i) => (
            <Text key={`file-${i}`} style={styles.label}>{file}</Text>
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
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>CHESS</Text>
        <Pressable style={styles.headerBtn} onPress={() => setShowChat(!showChat)}>
          <Ionicons name="chatbubbles" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Opponent Info with Timer */}
        <View style={styles.playerRow}>
          <View style={styles.playerInfo}>
            <View style={styles.playerAvatar}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.playerName}>{opponent?.username || 'Opponent'}</Text>
              <Text style={styles.playerColor}>({gameState.your_color === 'white' ? 'Black' : 'White'})</Text>
            </View>
          </View>
          <View style={[
            styles.timerBox, 
            gameState.turn !== gameState.your_color && gameState.game.status === 'active' && styles.timerBoxActive
          ]}>
            <Ionicons name="time-outline" size={16} color={gameState.turn !== gameState.your_color ? '#FFF' : colors.textMuted} />
            <Text style={[
              styles.timerText,
              gameState.turn !== gameState.your_color && gameState.game.status === 'active' && styles.timerTextActive
            ]}>
              {formatTime(gameState.your_color === 'white' ? blackTime : whiteTime)}
            </Text>
          </View>
        </View>

        {renderBoard()}

        {/* Your Info with Timer */}
        <View style={styles.playerRow}>
          <View style={styles.playerInfo}>
            <View style={[styles.playerAvatar, styles.playerAvatarYou]}>
              <Ionicons name="person" size={20} color="#000" />
            </View>
            <View>
              <Text style={styles.playerName}>{user?.username || 'You'}</Text>
              <Text style={styles.playerColor}>({gameState.your_color})</Text>
            </View>
          </View>
          <View style={[
            styles.timerBox, 
            gameState.turn === gameState.your_color && gameState.game.status === 'active' && styles.timerBoxActive
          ]}>
            <Ionicons name="time-outline" size={16} color={gameState.turn === gameState.your_color ? '#FFF' : colors.textMuted} />
            <Text style={[
              styles.timerText,
              gameState.turn === gameState.your_color && gameState.game.status === 'active' && styles.timerTextActive
            ]}>
              {formatTime(gameState.your_color === 'white' ? whiteTime : blackTime)}
            </Text>
          </View>
        </View>

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

        <View style={styles.movesContainer}>
          <Text style={styles.movesTitle}>Move History</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.movesList}>
            {gameState.moves?.map((move: any, index: number) => (
              <View key={`move-${index}`} style={styles.moveItem}>
                <Text style={styles.moveNumber}>{Math.floor(index / 2) + 1}.</Text>
                <Text style={styles.moveText}>{move.san}</Text>
              </View>
            ))}
            {(!gameState.moves || gameState.moves.length === 0) && (
              <Text style={styles.noMoves}>No moves yet</Text>
            )}
          </ScrollView>
        </View>

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
            keyExtractor={(item, idx) => `chat-${item._id || idx}`}
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
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 16, fontSize: 16 },
  errorText: { color: colors.textPrimary, fontSize: 18, textAlign: 'center', marginTop: 100 },
  backButton: { backgroundColor: colors.primary, padding: 16, borderRadius: 8, marginTop: 20, marginHorizontal: 40 },
  backButtonText: { color: '#000', fontWeight: '600', textAlign: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, letterSpacing: 2 },
  headerBtn: { padding: 8 },
  content: { padding: 16, alignItems: 'center' },
  playerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  playerAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    borderWidth: 2, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  playerAvatarYou: { backgroundColor: colors.primary, borderColor: colors.primary },
  playerName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  playerColor: { fontSize: 14, color: colors.textMuted },
  boardContainer: { alignItems: 'center', marginVertical: 8 },
  board: { width: BOARD_SIZE, height: BOARD_SIZE, borderWidth: 3, borderRadius: 4, overflow: 'hidden', position: 'relative' },
  row: { flexDirection: 'row' },
  square: { width: SQUARE_SIZE, height: SQUARE_SIZE, justifyContent: 'center', alignItems: 'center' },
  squarePressable: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  pieceContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  pieceContainerDragging: { opacity: 1 },
  pieceImage: { width: SQUARE_SIZE * 0.85, height: SQUARE_SIZE * 0.85 },
  pieceImageDragging: { width: SQUARE_SIZE * 1.1, height: SQUARE_SIZE * 1.1 },
  draggingPiece: {
    position: 'absolute', width: SQUARE_SIZE, height: SQUARE_SIZE,
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  validMoveIndicator: {
    width: SQUARE_SIZE * 0.3, height: SQUARE_SIZE * 0.3,
    borderRadius: SQUARE_SIZE * 0.15, backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  captureIndicator: {
    position: 'absolute', width: SQUARE_SIZE, height: SQUARE_SIZE,
    borderRadius: SQUARE_SIZE / 2, borderWidth: 4, borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  fileLabels: { flexDirection: 'row', width: BOARD_SIZE, justifyContent: 'space-around', marginTop: 4 },
  label: { fontSize: 12, color: colors.textMuted, width: SQUARE_SIZE, textAlign: 'center' },
  statusBar: {
    backgroundColor: colors.cardBackground, paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 8, marginVertical: 12, width: '100%',
  },
  statusText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  yourTurn: { color: colors.primary, fontWeight: 'bold' },
  movesContainer: { width: '100%', backgroundColor: colors.cardBackground, borderRadius: 12, padding: 16, marginBottom: 16 },
  movesTitle: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 10 },
  movesList: { flexDirection: 'row' },
  moveItem: { flexDirection: 'row', backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, marginRight: 8 },
  moveNumber: { fontSize: 12, color: colors.textMuted, marginRight: 4 },
  moveText: { fontSize: 12, color: colors.textPrimary, fontWeight: '500' },
  noMoves: { fontSize: 14, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  resignButton: {
    flex: 1, flexDirection: 'row', backgroundColor: '#DC2626',
    paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  resignText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  refreshButton: {
    flex: 1, flexDirection: 'row', backgroundColor: colors.surface,
    paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    gap: 8, borderWidth: 1, borderColor: colors.primary,
  },
  refreshText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  chatPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
    backgroundColor: colors.cardBackground, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  chatHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  chatTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  chatList: { flex: 1 },
  chatListContent: { padding: 12 },
  chatMessage: { backgroundColor: colors.surface, padding: 10, borderRadius: 8, marginBottom: 8, maxWidth: '80%' },
  myMessage: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  chatUsername: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  chatContent: { fontSize: 14, color: colors.textPrimary },
  chatInputContainer: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  chatInput: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.textPrimary,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
});
