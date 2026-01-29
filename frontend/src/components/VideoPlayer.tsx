import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoPlayerProps {
  visible: boolean;
  videoUrl: string;
  embedUrl?: string;
  title: string;
  onClose: () => void;
}

export function VideoPlayer({ visible, videoUrl, embedUrl, title, onClose }: VideoPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Determine the embed URL
  const getEmbedUrl = (): string => {
    if (embedUrl) return embedUrl;
    
    // Extract YouTube video ID and create embed URL
    const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
    }
    
    // For TikTok (limited support)
    if (videoUrl.includes('tiktok.com')) {
      // TikTok embeds are limited, we'll show a message
      return '';
    }
    
    return videoUrl;
  };

  const finalEmbedUrl = getEmbedUrl();

  // HTML wrapper for better video experience
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          background: #0D0D0F; 
          display: flex; 
          justify-content: center; 
          align-items: center;
          min-height: 100vh;
        }
        iframe { 
          width: 100%; 
          height: 100vh;
          border: none;
        }
      </style>
    </head>
    <body>
      <iframe 
        src="${finalEmbedUrl}" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </body>
    </html>
  `;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Video Content */}
        <View style={styles.videoContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          )}

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color={colors.danger} />
              <Text style={styles.errorTitle}>Unable to load video</Text>
              <Text style={styles.errorText}>
                This video may not be available for in-app playback.
              </Text>
              <Pressable
                style={styles.openExternalButton}
                onPress={() => {
                  onClose();
                  // Open in external browser
                  if (Platform.OS === 'web') {
                    window.open(videoUrl, '_blank');
                  }
                }}
              >
                <Ionicons name="open-outline" size={18} color="#000" />
                <Text style={styles.openExternalText}>Open in Browser</Text>
              </Pressable>
            </View>
          ) : finalEmbedUrl ? (
            <WebView
              source={{ html: htmlContent }}
              style={styles.webview}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
            />
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="videocam-off" size={48} color={colors.textMuted} />
              <Text style={styles.errorTitle}>External Content</Text>
              <Text style={styles.errorText}>
                This video is only available on the original platform.
              </Text>
              <Pressable
                style={styles.openExternalButton}
                onPress={() => {
                  onClose();
                  if (Platform.OS === 'web') {
                    window.open(videoUrl, '_blank');
                  }
                }}
              >
                <Ionicons name="open-outline" size={18} color="#000" />
                <Text style={styles.openExternalText}>Open in Browser</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  placeholder: {
    width: 40,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  openExternalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  openExternalText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
});

export default VideoPlayer;
