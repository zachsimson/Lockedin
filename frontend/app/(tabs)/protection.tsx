import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Linking, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';

export default function Protection() {
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

  const toggleBlocking = async (value: boolean) => {
    try {
      await api.post('/api/blocking/enable', null, {
        params: { enabled: value },
      });
      setBlockingEnabled(value);

      if (value) {
        Alert.alert(
          'Protection Enabled',
          'Follow the instructions below to complete the setup.'
        );
      }
    } catch (error) {
      console.error('Failed to toggle blocking:', error);
      Alert.alert('Error', 'Failed to update blocking status');
    }
  };

  const openGuide = (platform: 'ios' | 'android') => {
    const guides = {
      ios: 'https://support.apple.com/guide/iphone/block-websites-iph53cf6de2/ios',
      android: 'https://support.google.com/families/answer/7066725',
    };
    Linking.openURL(guides[platform]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Protection</Text>
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
        <Text style={styles.headerTitle}>Protection</Text>
        <Text style={styles.headerSubtitle}>Block gambling sites on your device</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons
              name={blockingEnabled ? 'shield-checkmark' : 'shield-outline'}
              size={48}
              color={blockingEnabled ? '#4CAF50' : '#95A5A6'}
            />
            <Text style={styles.statusTitle}>
              {blockingEnabled ? 'Protection Active' : 'Protection Inactive'}
            </Text>
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Enable Content Blocking</Text>
            <Switch
              value={blockingEnabled}
              onValueChange={toggleBlocking}
              trackColor={{ false: '#D0D0D0', true: '#81C784' }}
              thumbColor={blockingEnabled ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Setup Instructions */}
        {blockingEnabled && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle" size={24} color="#3498DB" />
              <Text style={styles.cardTitle}>Setup Instructions</Text>
            </View>
            <Text style={styles.instructionText}>
              To complete the setup, configure DNS-based blocking on your device:
            </Text>

            <View style={styles.platformButtons}>
              <TouchableOpacity
                style={styles.platformButton}
                onPress={() => openGuide('ios')}
              >
                <Ionicons name="logo-apple" size={24} color="#000" />
                <Text style={styles.platformButtonText}>iOS Guide</Text>
                <Ionicons name="open-outline" size={16} color="#000" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.platformButton}
                onPress={() => openGuide('android')}
              >
                <Ionicons name="logo-android" size={24} color="#3DDC84" />
                <Text style={styles.platformButtonText}>Android Guide</Text>
                <Ionicons name="open-outline" size={16} color="#3DDC84" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Blocked Sites */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="ban" size={24} color="#E74C3C" />
            <Text style={styles.cardTitle}>Blocked Sites ({blockedDomains.length})</Text>
          </View>
          <Text style={styles.cardSubtext}>
            These gambling and casino websites are blocked when protection is enabled:
          </Text>

          <View style={styles.domainsList}>
            {blockedDomains.slice(0, 10).map((domain, index) => (
              <View key={index} style={styles.domainItem}>
                <Ionicons name="close-circle" size={16} color="#E74C3C" />
                <Text style={styles.domainText}>{domain}</Text>
              </View>
            ))}
            {blockedDomains.length > 10 && (
              <Text style={styles.moreDomainsText}>
                ...and {blockedDomains.length - 10} more
              </Text>
            )}
          </View>
        </View>

        {/* Emergency Support */}
        <View style={styles.emergencyCard}>
          <Ionicons name="call" size={32} color="#fff" />
          <Text style={styles.emergencyTitle}>Need Immediate Help?</Text>
          <Text style={styles.emergencyText}>
            National Problem Gambling Helpline
          </Text>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={() => Linking.openURL('tel:1-800-522-4700')}
          >
            <Text style={styles.emergencyButtonText}>1-800-522-4700</Text>
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    paddingBottom: 20,
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
    color: '#7F8C8D',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 8,
  },
  cardSubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 16,
    lineHeight: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#2C3E50',
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
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    gap: 8,
  },
  platformButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  domainsList: {
    gap: 8,
  },
  domainItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  domainText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  moreDomainsText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emergencyCard: {
    backgroundColor: '#E74C3C',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  emergencyText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  emergencyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
