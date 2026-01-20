import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { socketService } from '../../src/services/socket';
import { Message } from '../../src/types';

export default function Community() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [discordLink, setDiscordLink] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
    setupSocket();

    return () => {
      // Cleanup socket listeners
    };
  }, []);

  const loadInitialData = async () => {
    try {
      // Load message history
      const messagesRes = await api.get('/api/chat/history');
      setMessages(messagesRes.data.messages);

      // Load Discord link
      const discordRes = await api.get('/api/settings/discord-link');
      setDiscordLink(discordRes.data.discord_link);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = () => {
    // Connect and join community
    socketService.connect().then(() => {
      socketService.joinCommunity();
    });

    // Listen for new messages
    socketService.onNewMessage((messageData) => {
      const newMessage: Message = {
        _id: messageData.message_id,
        user_id: messageData.user_id,
        username: messageData.username,
        message: messageData.message,
        timestamp: messageData.timestamp,
      };
      setMessages((prev) => [...prev, newMessage]);
    });
  };

  const handleSendMessage = () => {
    if (inputText.trim()) {
      socketService.sendMessage(inputText.trim());
      setInputText('');
    }
  };

  const openDiscord = () => {
    if (discordLink) {
      Linking.openURL(discordLink);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.user_id === user?._id;

    return (
      <View style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}>
        <View style={[styles.messageBubble, isOwn && styles.ownMessageBubble]}>
          {!isOwn && <Text style={styles.username}>{item.username}</Text>}
          <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
            {item.message}
          </Text>
          <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <Text style={styles.headerSubtitle}>Support each other 24/7</Text>
      </View>

      {/* Discord Button */}
      <TouchableOpacity style={styles.discordButton} onPress={openDiscord}>
        <Ionicons name="logo-discord" size={20} color="#5865F2" />
        <Text style={styles.discordButtonText}>Join Discord Community</Text>
        <Ionicons name="open-outline" size={16} color="#5865F2" />
      </TouchableOpacity>

      {/* Messages */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Loading messages...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#BDC3C7" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Be the first to say hello!</Text>
            </View>
          )
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 16,
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
  discordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#5865F2',
  },
  discordButtonText: {
    color: '#5865F2',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#7F8C8D',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 8,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ownMessageBubble: {
    backgroundColor: '#4CAF50',
  },
  username: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 11,
    color: '#95A5A6',
    marginTop: 4,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
