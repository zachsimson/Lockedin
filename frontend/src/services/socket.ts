import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  async connect() {
    if (this.socket?.connected) return;

    const token = await SecureStore.getItemAsync('authToken');
    if (!token) {
      console.log('No auth token found');
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.socket?.emit('authenticate', { token });
    });

    this.socket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  joinCommunity() {
    if (!this.socket) return;
    this.socket.emit('join_community', {});
  }

  sendMessage(message: string) {
    if (!this.socket) return;
    this.socket.emit('send_message', { message });
  }

  onNewMessage(callback: (data: any) => void) {
    if (!this.socket) return () => {};
    
    this.socket.on('new_message', callback);
    
    // Store listener for cleanup
    if (!this.listeners.has('new_message')) {
      this.listeners.set('new_message', []);
    }
    this.listeners.get('new_message')?.push(callback);

    return () => {
      this.socket?.off('new_message', callback);
    };
  }

  onUserJoined(callback: (data: any) => void) {
    if (!this.socket) return () => {};
    this.socket.on('user_joined', callback);
    return () => {
      this.socket?.off('user_joined', callback);
    };
  }

  emitTyping() {
    if (!this.socket) return;
    this.socket.emit('typing', {});
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
