import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import api from '../../src/services/api';
import { SwipeToActivate } from '../../src/components/SwipeToActivate';

export default function Tools() {
  const [blockingEnabled, setBlockingEnabled] = useState(false);
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, domainsRes] = await Promise.all([
        api.get('/api/blocking/status'),
        api.get('/api/blocking/domains'),
      ]);

      setBlockingEnabled(statusRes.data.blocking_enabled);
      setBlockedDomains(domainsRes.data.domains);
    } catch (error) {
      console.error('Failed to load blocking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    try {
      await api.post('/api/blocking/enable', null, { params: { enabled: true } });
      setBlockingEnabled(true);
      Alert.alert(
        '🛡️ Recovery Mode Activated!',
        'Follow the setup guide below to complete DNS blocking on your device.'
      );
    } catch (error) {
      console.error('Failed to activate:', error);
      Alert.alert('Error', 'Failed to activate protection');
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate Protection?',
      'Are you sure? Gambling sites will be accessible again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/api/blocking/enable', null, { params: { enabled: false } });
              setBlockingEnabled(false);
            } catch (error) {
              console.error('Failed to deactivate:', error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tools</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recovery Tools</Text>
        <Text style={styles.headerSubtitle}>Block gambling sites & apps</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Swipe to Activate */}
        <View style={styles.activationSection}>
          <Text style={styles.sectionTitle}>Site Blocking</Text>
          {!blockingEnabled ? (
            <SwipeToActivate onActivate={handleActivate} isActive={blockingEnabled} />
          ) : (
            <View>
              <View style={styles.activeContainer}>
                <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
                <Text style={styles.activeText}>PROTECTION ACTIVE</Text>
                <Text style={styles.activeSubtext}>{blockedDomains.length} sites blocked</Text>
              </View>
              <TouchableOpacity style={styles.deactivateButton} onPress={handleDeactivate}>
                <Text style={styles.deactivateButtonText}>Deactivate Protection</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Setup Instructions */}
        {blockingEnabled && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="construct" size={24} color={colors.primary} />
              <Text style={styles.cardTitle}>Complete Setup</Text>
            </View>
            <Text style={styles.instructionText}>
              To complete blocking, configure DNS filtering on your device:
            </Text>

            <View style={styles.platformButtons}>
              <TouchableOpacity
                style={styles.platformButton}
                onPress={() => Linking.openURL('https://support.apple.com/guide/iphone/block-websites-iph53cf6de2/ios')}
              >
                <Ionicons name="logo-apple" size={28} color="#FFF" />
                <Text style={styles.platformButtonText}>iOS Setup Guide</Text>
                <Ionicons name="open-outline" size={18} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.platformButton}
                onPress={() => Linking.openURL('https://support.google.com/families/answer/7066725')}
              >
                <Ionicons name="logo-android" size={28} color="#FFF" />
                <Text style={styles.platformButtonText}>Android Setup Guide</Text>
                <Ionicons name="open-outline" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Blocked Sites */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="ban" size={24} color={colors.danger} />
            <Text style={styles.cardTitle}>Blocked Sites</Text>
          </View>
          <Text style={styles.blockedCount}>{blockedDomains.length} gambling sites blocked</Text>
          
          <View style={styles.domainGrid}>
            {blockedDomains.slice(0, 8).map((domain, index) => (
              <View key={index} style={styles.domainChip}>
                <Ionicons name="close-circle" size={14} color={colors.danger} />
                <Text style={styles.domainText}>{domain}</Text>
              </View>
            ))}
          </View>
          
          {blockedDomains.length > 8 && (
            <Text style={styles.moreText}>+ {blockedDomains.length - 8} more sites</Text>
          )}
        </View>

        {/* Emergency Support */}
        <View style={styles.emergencyCard}>
          <Ionicons name="call" size={40} color="#FFF" />
          <Text style={styles.emergencyTitle}>Crisis Support</Text>
          <Text style={styles.emergencyText}>National Problem Gambling Helpline</Text>
          <Text style={styles.emergencySubtext}>24/7 Confidential Support</Text>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={() => Linking.openURL('tel:1-800-522-4700')}
          >
            <Ionicons name="call" size={24} color="#FFF" />
            <Text style={styles.emergencyButtonText}>1-800-522-4700</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  activationSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  activeContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 12,
  },
  activeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 16,
    letterSpacing: 1,
  },
  activeSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  deactivateButton: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  deactivateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  platformButtons: {
    gap: 12,
  },
  platformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    gap: 12,
  },
  platformButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  blockedCount: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  domainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  domainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  domainText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  moreText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 12,
    fontStyle: 'italic',
  },
  emergencyCard: {
    backgroundColor: colors.danger,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 12,
  },
  emergencyText: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 8,
    textAlign: 'center',
  },
  emergencySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 20,
    gap: 12,
  },
  emergencyButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
