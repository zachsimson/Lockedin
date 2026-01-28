import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Linking, BackHandler, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { colors } from '../theme';

// List of gambling-related domain patterns to block
const GAMBLING_PATTERNS = [
  'bet365', 'draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet',
  'barstool', 'bovada', 'betonline', 'mybookie', 'stake.com', 'rollbit',
  'roobet', 'gambling', 'casino', 'poker', 'slots', 'betting', 'sportsbook',
  'wager', 'parlay', 'odds', 'blackjack', 'roulette', 'baccarat',
];

interface BlockerContextType {
  isBlocking: boolean;
  blockedDomains: string[];
  enableBlocking: () => Promise<void>;
  disableBlocking: () => Promise<void>;
  checkIfBlocked: (url: string) => boolean;
  showBlockedScreen: boolean;
  dismissBlockedScreen: () => void;
  attemptedUrl: string | null;
}

const BlockerContext = createContext<BlockerContextType | undefined>(undefined);

const STORAGE_KEY = '@lockedin_blocking_enabled';

export function BlockerProvider({ children }: { children: ReactNode }) {
  const [isBlocking, setIsBlocking] = useState(false);
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [showBlockedScreen, setShowBlockedScreen] = useState(false);
  const [attemptedUrl, setAttemptedUrl] = useState<string | null>(null);

  // Load blocking status on mount
  useEffect(() => {
    loadBlockingStatus();
    loadBlockedDomains();
  }, []);

  // Handle back button when blocking screen is shown
  useEffect(() => {
    if (showBlockedScreen) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Prevent going back to blocked content
        return true;
      });
      return () => backHandler.remove();
    }
  }, [showBlockedScreen]);

  const loadBlockingStatus = async () => {
    try {
      const [stored, apiStatus] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        api.get('/api/vpn/status').catch(() => null),
      ]);
      
      // Check both local storage and API status
      const localEnabled = stored === 'true';
      const apiEnabled = apiStatus?.data?.recovery_mode_enabled || false;
      
      setIsBlocking(localEnabled || apiEnabled);
    } catch (error) {
      console.error('Failed to load blocking status:', error);
    }
  };

  const loadBlockedDomains = async () => {
    try {
      const response = await api.get('/api/blocking/domains');
      setBlockedDomains(response.data.domains || []);
    } catch (error) {
      // Use default patterns if API fails
      setBlockedDomains(GAMBLING_PATTERNS);
    }
  };

  const enableBlocking = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      setIsBlocking(true);
    } catch (error) {
      console.error('Failed to enable blocking:', error);
    }
  };

  const disableBlocking = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'false');
      setIsBlocking(false);
    } catch (error) {
      console.error('Failed to disable blocking:', error);
    }
  };

  const checkIfBlocked = useCallback((url: string): boolean => {
    if (!isBlocking) return false;
    
    const lowerUrl = url.toLowerCase();
    
    // Check against blocked domains from API
    for (const domain of blockedDomains) {
      if (lowerUrl.includes(domain.toLowerCase())) {
        setAttemptedUrl(url);
        setShowBlockedScreen(true);
        return true;
      }
    }
    
    // Check against gambling patterns
    for (const pattern of GAMBLING_PATTERNS) {
      if (lowerUrl.includes(pattern)) {
        setAttemptedUrl(url);
        setShowBlockedScreen(true);
        return true;
      }
    }
    
    return false;
  }, [isBlocking, blockedDomains]);

  const dismissBlockedScreen = () => {
    setShowBlockedScreen(false);
    setAttemptedUrl(null);
  };

  // Custom Linking interceptor
  useEffect(() => {
    const originalOpenURL = Linking.openURL.bind(Linking);
    
    // @ts-ignore - Monkey-patching for blocking
    Linking.openURL = async (url: string) => {
      if (checkIfBlocked(url)) {
        console.log('BLOCKED:', url);
        return;
      }
      return originalOpenURL(url);
    };

    return () => {
      Linking.openURL = originalOpenURL;
    };
  }, [checkIfBlocked]);

  return (
    <BlockerContext.Provider
      value={{
        isBlocking,
        blockedDomains,
        enableBlocking,
        disableBlocking,
        checkIfBlocked,
        showBlockedScreen,
        dismissBlockedScreen,
        attemptedUrl,
      }}
    >
      {children}
      
      {/* Full-Screen Blocking Modal */}
      <Modal
        visible={showBlockedScreen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => {
          // Prevent closing via back button
        }}
      >
        <View style={styles.blockedContainer}>
          <View style={styles.blockedContent}>
            <View style={styles.blockedIconContainer}>
              <Ionicons name="shield" size={80} color={colors.primary} />
              <View style={styles.blockedBadge}>
                <Ionicons name="close" size={24} color="#FFF" />
              </View>
            </View>
            
            <Text style={styles.blockedTitle}>SITE BLOCKED</Text>
            <Text style={styles.blockedSubtitle}>Recovery Mode is Active</Text>
            
            <View style={styles.blockedMessageBox}>
              <Ionicons name="lock-closed" size={20} color={colors.textMuted} />
              <Text style={styles.blockedMessage}>
                This gambling site has been blocked to support your recovery journey.
              </Text>
            </View>
            
            {attemptedUrl && (
              <View style={styles.blockedUrlBox}>
                <Text style={styles.blockedUrlLabel}>Blocked URL:</Text>
                <Text style={styles.blockedUrl} numberOfLines={2}>
                  {attemptedUrl}
                </Text>
              </View>
            )}
            
            <View style={styles.blockedActions}>
              <Pressable 
                style={styles.blockedPrimaryButton}
                onPress={dismissBlockedScreen}
              >
                <Text style={styles.blockedPrimaryText}>GO BACK TO SAFETY</Text>
              </Pressable>
              
              <Text style={styles.blockedHelpText}>
                Need help? Call the crisis hotline:
              </Text>
              <Pressable 
                style={styles.blockedSecondaryButton}
                onPress={() => {
                  dismissBlockedScreen();
                  Linking.openURL('tel:1-800-522-4700');
                }}
              >
                <Ionicons name="call" size={18} color={colors.primary} />
                <Text style={styles.blockedSecondaryText}>1-800-522-4700</Text>
              </Pressable>
            </View>
            
            <Text style={styles.blockedFooter}>
              Recovery Mode protects you from gambling temptation.{'\n'}
              Stay strong. You've got this! 💚
            </Text>
          </View>
        </View>
      </Modal>
    </BlockerContext.Provider>
  );
}

export function useBlocker() {
  const context = useContext(BlockerContext);
  if (context === undefined) {
    throw new Error('useBlocker must be used within a BlockerProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  blockedContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  blockedContent: {
    alignItems: 'center',
    maxWidth: 360,
  },
  blockedIconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  blockedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  blockedSubtitle: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 24,
  },
  blockedMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockedMessage: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  blockedUrlBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    width: '100%',
  },
  blockedUrlLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  blockedUrl: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  blockedActions: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  blockedPrimaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  blockedPrimaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1,
  },
  blockedHelpText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  blockedSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  blockedSecondaryText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  blockedFooter: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
