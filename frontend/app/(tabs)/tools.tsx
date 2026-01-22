import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Linking, TextInput, Modal, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import api from '../../src/services/api';

interface VPNStatus {
  recovery_mode_enabled: boolean;
  lock_duration: string | null;
  lock_started_at: string | null;
  lock_expires_at: string | null;
  unlock_requested: boolean;
  unlock_requested_at: string | null;
  unlock_request_reason: string | null;
  unlock_approved: boolean;
  unlock_approved_at: string | null;
  unlock_effective_at: string | null;
  cooldown_remaining_seconds: number | null;
  can_disable: boolean;
}

const LOCK_DURATIONS = [
  { value: '24h', label: '24 Hours', description: 'Quick reset protection' },
  { value: '72h', label: '3 Days', description: 'Weekend coverage' },
  { value: '7d', label: '1 Week', description: 'Weekly commitment' },
  { value: '30d', label: '30 Days', description: 'Monthly protection' },
  { value: 'permanent', label: 'Permanent', description: 'Maximum commitment' },
];

export default function Tools() {
  const [vpnStatus, setVpnStatus] = useState<VPNStatus | null>(null);
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('24h');
  const [unlockReason, setUnlockReason] = useState('');
  const [cooldownTime, setCooldownTime] = useState('');

  const loadData = async () => {
    try {
      const [statusRes, domainsRes] = await Promise.all([
        api.get('/api/vpn/status'),
        api.get('/api/blocking/domains'),
      ]);

      setVpnStatus(statusRes.data);
      setBlockedDomains(domainsRes.data.domains);
    } catch (error) {
      console.error('Failed to load VPN data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update cooldown timer every second
  useEffect(() => {
    if (vpnStatus?.cooldown_remaining_seconds && vpnStatus.cooldown_remaining_seconds > 0) {
      const interval = setInterval(() => {
        setVpnStatus(prev => {
          if (!prev || !prev.cooldown_remaining_seconds) return prev;
          const newSeconds = prev.cooldown_remaining_seconds - 1;
          if (newSeconds <= 0) {
            // Reload status when cooldown expires
            loadData();
            return { ...prev, cooldown_remaining_seconds: 0, can_disable: true };
          }
          return { ...prev, cooldown_remaining_seconds: newSeconds };
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [vpnStatus?.cooldown_remaining_seconds]);

  // Format cooldown time
  useEffect(() => {
    if (vpnStatus?.cooldown_remaining_seconds && vpnStatus.cooldown_remaining_seconds > 0) {
      const hours = Math.floor(vpnStatus.cooldown_remaining_seconds / 3600);
      const minutes = Math.floor((vpnStatus.cooldown_remaining_seconds % 3600) / 60);
      const seconds = vpnStatus.cooldown_remaining_seconds % 60;
      setCooldownTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    } else {
      setCooldownTime('');
    }
  }, [vpnStatus?.cooldown_remaining_seconds]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleEnableRecoveryMode = async () => {
    try {
      await api.post('/api/vpn/enable', { lock_duration: selectedDuration });
      setShowEnableModal(false);
      await loadData();
      Alert.alert(
        '🛡️ Recovery Mode Activated!',
        `Protection is now active for ${LOCK_DURATIONS.find(d => d.value === selectedDuration)?.label}. Stay strong!`
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to enable Recovery Mode');
    }
  };

  const handleRequestUnlock = async () => {
    if (unlockReason.length < 10) {
      Alert.alert('Error', 'Please provide a reason (at least 10 characters)');
      return;
    }

    try {
      await api.post('/api/vpn/request-unlock', { reason: unlockReason });
      setShowUnlockModal(false);
      setUnlockReason('');
      await loadData();
      Alert.alert(
        'Request Submitted',
        'Your unlock request has been submitted. An admin will review it shortly.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit unlock request');
    }
  };

  const handleDisableVPN = async () => {
    Alert.alert(
      'Disable Recovery Mode?',
      'Are you sure you want to disable protection? Gambling sites will become accessible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/api/vpn/disable');
              await loadData();
              Alert.alert('Recovery Mode Disabled', 'Protection has been turned off.');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to disable Recovery Mode');
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
          <Text style={styles.headerTitle}>Lock</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const isEnabled = vpnStatus?.recovery_mode_enabled || false;
  const isInCooldown = vpnStatus?.unlock_approved && !vpnStatus?.can_disable;
  const isPendingApproval = vpnStatus?.unlock_requested && !vpnStatus?.unlock_approved;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RECOVERY MODE</Text>
        <Text style={styles.headerSubtitle}>Lock out gambling. Lock in discipline.</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Main Status Card */}
        <View style={[styles.statusCard, isEnabled && styles.statusCardActive]}>
          <View style={styles.statusIcon}>
            <Ionicons 
              name={isEnabled ? "shield-checkmark" : "shield-outline"} 
              size={64} 
              color={isEnabled ? colors.primary : colors.textMuted} 
            />
          </View>
          
          <Text style={[styles.statusTitle, isEnabled && styles.statusTitleActive]}>
            {isEnabled ? 'PROTECTION ACTIVE' : 'PROTECTION OFF'}
          </Text>
          
          {isEnabled && vpnStatus?.lock_duration && (
            <Text style={styles.lockDuration}>
              Lock: {LOCK_DURATIONS.find(d => d.value === vpnStatus.lock_duration)?.label || vpnStatus.lock_duration}
            </Text>
          )}

          {/* Cooldown Timer */}
          {isInCooldown && cooldownTime && (
            <View style={styles.cooldownContainer}>
              <Ionicons name="time" size={24} color={colors.warning} />
              <Text style={styles.cooldownLabel}>Unlock approved. Changes take effect in:</Text>
              <Text style={styles.cooldownTimer}>{cooldownTime}</Text>
              <Text style={styles.cooldownNote}>VPN remains active during cooldown</Text>
            </View>
          )}

          {/* Pending Approval */}
          {isPendingApproval && (
            <View style={styles.pendingContainer}>
              <Ionicons name="hourglass" size={24} color={colors.warning} />
              <Text style={styles.pendingText}>Unlock request pending admin approval</Text>
            </View>
          )}

          <Text style={styles.blockedCount}>
            {blockedDomains.length} gambling sites blocked
          </Text>
        </View>

        {/* Action Button */}
        {!isEnabled ? (
          <Pressable 
            style={({ pressed }) => [styles.activateButton, pressed && styles.buttonPressed]}
            onPress={() => setShowEnableModal(true)}
          >
            <Ionicons name="lock-closed" size={24} color="#000" />
            <Text style={styles.activateButtonText}>ACTIVATE RECOVERY MODE</Text>
          </Pressable>
        ) : (
          <View style={styles.actionButtons}>
            {!vpnStatus?.unlock_requested && !vpnStatus?.unlock_approved && (
              <Pressable 
                style={({ pressed }) => [styles.requestUnlockButton, pressed && styles.buttonPressed]}
                onPress={() => setShowUnlockModal(true)}
              >
                <Ionicons name="key" size={20} color={colors.textPrimary} />
                <Text style={styles.requestUnlockText}>Request Unlock</Text>
              </Pressable>
            )}
            
            {vpnStatus?.can_disable && (
              <Pressable 
                style={({ pressed }) => [styles.disableButton, pressed && styles.buttonPressed]}
                onPress={handleDisableVPN}
              >
                <Ionicons name="shield-half" size={20} color={colors.danger} />
                <Text style={styles.disableButtonText}>Disable Protection</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* How It Works */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={styles.cardTitle}>How Cooldown Works</Text>
          </View>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>1</Text>
              <Text style={styles.infoText}>Enable Recovery Mode with your chosen lock duration</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>2</Text>
              <Text style={styles.infoText}>To disable, submit an unlock request with reason</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>3</Text>
              <Text style={styles.infoText}>Admin reviews and approves your request</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>4</Text>
              <Text style={styles.infoText}>24-hour mandatory cooldown begins after approval</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>5</Text>
              <Text style={styles.infoText}>Protection can only be disabled after cooldown</Text>
            </View>
          </View>
        </View>

        {/* Blocked Sites Preview */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="ban" size={24} color={colors.danger} />
            <Text style={styles.cardTitle}>Blocked Sites</Text>
          </View>
          
          <View style={styles.domainGrid}>
            {blockedDomains.slice(0, 6).map((domain, index) => (
              <View key={index} style={styles.domainChip}>
                <Ionicons name="close-circle" size={14} color={colors.danger} />
                <Text style={styles.domainText}>{domain}</Text>
              </View>
            ))}
          </View>
          
          {blockedDomains.length > 6 && (
            <Text style={styles.moreText}>+ {blockedDomains.length - 6} more sites</Text>
          )}
        </View>

        {/* Emergency Support */}
        <Pressable 
          style={styles.emergencyCard}
          onPress={() => Linking.openURL('tel:1-800-522-4700')}
        >
          <Ionicons name="call" size={32} color="#FFF" />
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Crisis Support</Text>
            <Text style={styles.emergencyText}>1-800-522-4700</Text>
            <Text style={styles.emergencySubtext}>24/7 Confidential Helpline</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </ScrollView>

      {/* Enable Modal */}
      <Modal visible={showEnableModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enable Recovery Mode</Text>
            <Text style={styles.modalSubtitle}>Choose your lock duration</Text>
            
            <View style={styles.durationList}>
              {LOCK_DURATIONS.map((duration) => (
                <Pressable
                  key={duration.value}
                  style={[
                    styles.durationOption,
                    selectedDuration === duration.value && styles.durationOptionSelected
                  ]}
                  onPress={() => setSelectedDuration(duration.value)}
                >
                  <View style={styles.durationRadio}>
                    {selectedDuration === duration.value && (
                      <View style={styles.durationRadioInner} />
                    )}
                  </View>
                  <View style={styles.durationInfo}>
                    <Text style={styles.durationLabel}>{duration.label}</Text>
                    <Text style={styles.durationDesc}>{duration.description}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <Pressable 
                style={styles.modalCancelButton}
                onPress={() => setShowEnableModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={styles.modalConfirmButton}
                onPress={handleEnableRecoveryMode}
              >
                <Text style={styles.modalConfirmText}>Activate</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unlock Request Modal */}
      <Modal visible={showUnlockModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Unlock</Text>
            <Text style={styles.modalSubtitle}>
              Please explain why you need to disable protection. An admin will review your request.
            </Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter your reason (min 10 characters)..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={unlockReason}
              onChangeText={setUnlockReason}
            />
            
            <Text style={styles.warningText}>
              ⚠️ After approval, there will be a mandatory 24-hour cooldown before you can disable protection.
            </Text>
            
            <View style={styles.modalButtons}>
              <Pressable 
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowUnlockModal(false);
                  setUnlockReason('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={styles.modalConfirmButton}
                onPress={handleRequestUnlock}
              >
                <Text style={styles.modalConfirmText}>Submit Request</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 14,
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
  statusCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  statusCardActive: {
    borderColor: colors.primary,
  },
  statusIcon: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  statusTitleActive: {
    color: colors.primary,
  },
  lockDuration: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  cooldownContainer: {
    backgroundColor: `${colors.warning}20`,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
  },
  cooldownLabel: {
    fontSize: 14,
    color: colors.warning,
    marginTop: 8,
    textAlign: 'center',
  },
  cooldownTimer: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.warning,
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  cooldownNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  pendingContainer: {
    backgroundColor: `${colors.warning}20`,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingText: {
    fontSize: 14,
    color: colors.warning,
    flex: 1,
  },
  blockedCount: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 16,
  },
  activateButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 12,
    marginBottom: 24,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  activateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 24,
  },
  requestUnlockButton: {
    backgroundColor: colors.cardBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestUnlockText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  disableButton: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  disableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
  infoCard: {
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
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: 12,
    color: colors.textSecondary,
  },
  moreText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 12,
  },
  emergencyCard: {
    backgroundColor: colors.danger,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  emergencyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  emergencySubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  durationList: {
    gap: 12,
    marginBottom: 24,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 16,
  },
  durationOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  durationRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  durationInfo: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  durationDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  reasonInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: colors.warning,
    marginBottom: 24,
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
