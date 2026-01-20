import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useState } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [relapseModalVisible, setRelapseModalVisible] = useState(false);
  const [relapseAmount, setRelapseAmount] = useState('');
  const [relapseNotes, setRelapseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  const handleReportRelapse = async () => {
    Alert.alert(
      'Report Relapse',
      'This will reset your sobriety timer. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Report',
          style: 'destructive',
          onPress: () => setRelapseModalVisible(true),
        },
      ]
    );
  };

  const submitRelapse = async () => {
    setSubmitting(true);
    try {
      const amount = parseFloat(relapseAmount) || 0;
      await api.post('/api/recovery/relapse', {
        amount,
        notes: relapseNotes,
      });

      Alert.alert(
        'Relapse Recorded',
        "Don't be discouraged. Recovery is a journey. Your sobriety timer has been reset, and we're here to support you."
      );

      setRelapseModalVisible(false);
      setRelapseAmount('');
      setRelapseNotes('');
      await refreshUser();
    } catch (error) {
      console.error('Failed to report relapse:', error);
      Alert.alert('Error', 'Failed to submit relapse report');
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#fff" />
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#fff" />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>

        {/* Recovery Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recovery</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleReportRelapse}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="warning" size={24} color="#E74C3C" />
              <Text style={styles.menuItemText}>Report Relapse</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="card" size={24} color="#4CAF50" />
              <Text style={styles.menuItemText}>Subscription</Text>
            </View>
            <Text style={styles.subscriptionStatus}>
              {user?.subscription_status || 'Free'}
            </Text>
          </View>
        </View>

        {/* Admin Section */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/admin/users')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="people" size={24} color="#3498DB" />
                <Text style={styles.menuItemText}>Manage Users</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/admin/settings')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="settings" size={24} color="#9B59B6" />
                <Text style={styles.menuItemText}>App Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
            </TouchableOpacity>
          </View>
        )}

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle" size={24} color="#34495E" />
              <Text style={styles.menuItemText}>Help & FAQ</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#E74C3C" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>

      {/* Relapse Modal */}
      <Modal
        visible={relapseModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRelapseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Relapse</Text>
            <Text style={styles.modalSubtitle}>
              We're here to support you. This information is confidential.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Amount Spent (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={relapseAmount}
                onChangeText={setRelapseAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What triggered the relapse?"
                value={relapseNotes}
                onChangeText={setRelapseNotes}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setRelapseModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={submitRelapse}
                disabled={submitting}
              >
                <Text style={styles.modalButtonTextSubmit}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  userCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  subscriptionStatus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E74C3C',
  },
  version: {
    textAlign: 'center',
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F8F9FA',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  modalButtonSubmit: {
    backgroundColor: '#E74C3C',
  },
  modalButtonTextSubmit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
