import { io, Socket } from 'socket.io-client';
import storage from './storage';

const SOCKET_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '/api';

// Available chat rooms
export const CHAT_ROOMS = [
  { id: 'general', name: 'General Support', icon: 'people', description: 'General recovery discussion' },
  { id: 'focus', name: 'Stay Focused', icon: 'eye', description: 'Help staying on track' },
  { id: 'distraction', name: 'Distraction Corner', icon: 'game-controller', description: 'Healthy distractions' },
  { id: 'chess', name: 'Chess Players', icon: 'trophy', description: 'Chess games & strategy' },
  { id: 'late-night', name: 'Late Night Support', icon: 'moon', description: 'For those hard nights' },
];

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private currentRoom: string | null = null;
  private connectionAttempted: boolean = false;
  private silentMode: boolean = true; // Never show errors to users

  async connect() {
    // Don't reconnect if already connected or connection failed
    if (this.socket?.connected) return;
    if (this.connectionAttempted && !this.socket?.connected) {
      // Already tried, don't spam connection attempts
      return;
    }

    const token = await storage.getItem('authToken');
    if (!token) {
      // No token, silently skip - not an error
      return;
    }

    this.connectionAttempted = true;

    try {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 3,
        timeout: 5000,
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        if (!this.silentMode) console.log('Socket connected');
        this.socket?.emit('authenticate', { token });
      });

      this.socket.on('authenticated', (data) => {
        if (!this.silentMode) console.log('Socket authenticated');
      });

      // SILENT error handling - never show to users
      this.socket.on('connect_error', (error) => {
        // Silently handle - app works fine without sockets
        if (!this.silentMode) console.log('Socket unavailable, using REST fallback');
      });

      this.socket.on('disconnect', () => {
        if (!this.silentMode) console.log('Socket disconnected');
      });

      // Group chat events
      this.socket.on('room_message', (data) => {
        const callbacks = this.listeners.get('room_message') || [];
        callbacks.forEach(cb => cb(data));
      });

      this.socket.on('room_users', (data) => {
        const callbacks = this.listeners.get('room_users') || [];
        callbacks.forEach(cb => cb(data));
      });

      this.socket.on('user_joined_room', (data) => {
        const callbacks = this.listeners.get('user_joined_room') || [];
        callbacks.forEach(cb => cb(data));
      });

      this.socket.on('user_left_room', (data) => {
        const callbacks = this.listeners.get('user_left_room') || [];
        callbacks.forEach(cb => cb(data));
      });

    } catch (error) {
      // Silently fail - app continues without sockets
      this.socket = null;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      this.currentRoom = null;
    }
    this.connectionAttempted = false;
  }

  // Group Chat Methods
  joinRoom(roomId: string) {
    if (!this.socket?.connected) return false;
    
    // Leave current room first
    if (this.currentRoom) {
      this.socket.emit('leave_room', { room_id: this.currentRoom });
    }
    
    this.currentRoom = roomId;
    this.socket.emit('join_room', { room_id: roomId });
    return true;
  }

  leaveRoom() {
    if (!this.socket?.connected || !this.currentRoom) return;
    this.socket.emit('leave_room', { room_id: this.currentRoom });
    this.currentRoom = null;
  }

  sendRoomMessage(message: string) {
    if (!this.socket?.connected || !this.currentRoom) return false;
    this.socket.emit('room_message', { 
      room_id: this.currentRoom, 
      message: message 
    });
    return true;
  }

  onRoomMessage(callback: (data: any) => void) {
    if (!this.listeners.has('room_message')) {
      this.listeners.set('room_message', []);
    }
    this.listeners.get('room_message')?.push(callback);
    
    return () => {
      const callbacks = this.listeners.get('room_message') || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }

  onRoomUsers(callback: (data: any) => void) {
    if (!this.listeners.has('room_users')) {
      this.listeners.set('room_users', []);
    }
    this.listeners.get('room_users')?.push(callback);
    
    return () => {
      const callbacks = this.listeners.get('room_users') || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }

  onUserJoinedRoom(callback: (data: any) => void) {
    if (!this.listeners.has('user_joined_room')) {
      this.listeners.set('user_joined_room', []);
    }
    this.listeners.get('user_joined_room')?.push(callback);
    
    return () => {
      const callbacks = this.listeners.get('user_joined_room') || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }

  // Legacy methods for existing chat
  joinCommunity() {
    if (!this.socket?.connected) return;
    this.socket.emit('join_community', {});
  }

  sendMessage(message: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('send_message', { message });
  }

  onNewMessage(callback: (data: any) => void) {
    if (!this.socket) return () => {};
    
    this.socket.on('new_message', callback);
    
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
    if (!this.socket?.connected) return;
    this.socket.emit('typing', {});
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getCurrentRoom(): string | null {
    return this.currentRoom;
  }
}

export const socketService = new SocketService();
