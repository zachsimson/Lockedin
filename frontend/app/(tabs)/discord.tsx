import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import { useState, useEffect } from 'react';
import api from '../../src/services/api';

export default function Discord() {
  const [discordLink, setDiscordLink] = useState('');

  useEffect(() => {
    loadDiscordLink();
  }, []);

  const loadDiscordLink = async () => {
    try {
      const response = await api.get('/api/settings/discord-link');
      setDiscordLink(response.data.discord_link);
    } catch (error) {
      console.error('Failed to load Discord link:', error);
    }
  };

  const openDiscord = () => {
    if (discordLink) {
      Linking.openURL(discordLink);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discord Community</Text>
        <Text style={styles.headerSubtitle}>Voice chat & live support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Discord Logo */}
        <View style={styles.logoContainer}>
          <Ionicons name="logo-discord" size={120} color="#5865F2" />
        </View>

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Why Join Discord?</Text>
          
          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Ionicons name="mic" size={24} color={colors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Voice Rooms</Text>
              <Text style={styles.benefitText}>Talk with others in real-time recovery sessions</Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Ionicons name="people" size={24} color={colors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Support Groups</Text>
              <Text style={styles.benefitText}>Join groups by recovery stage (0-30, 30-90, 90+ days)</Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Ionicons name="notifications" size={24} color={colors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Emergency Support</Text>
              <Text style={styles.benefitText}>Quick access when you need help immediately</Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Ionicons name="calendar" size={24} color={colors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Weekly Events</Text>
              <Text style={styles.benefitText}>Recovery challenges, Q&A sessions, motivation</Text>
            </View>
          </View>
        </View>

        {/* Community Rules */}
        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>Community Guidelines</Text>
          <View style={styles.rule}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={styles.ruleText}>Be respectful and supportive</Text>
          </View>
          <View style={styles.rule}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={styles.ruleText}>No gambling advice or betting tips</Text>
          </View>
          <View style={styles.rule}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={styles.ruleText}>Keep it recovery-focused</Text>
          </View>
          <View style={styles.rule}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={styles.ruleText}>Anonymity respected</Text>
          </View>
        </View>

        {/* Join Button */}
        <TouchableOpacity style={styles.joinButton} onPress={openDiscord}>
          <Ionicons name="logo-discord" size={32} color="#FFF" />
          <Text style={styles.joinButtonText}>Join Discord Server</Text>
          <Ionicons name="open-outline" size={24} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Discord is a third-party platform. Please follow their terms of service.
        </Text>
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
  logoContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  benefitsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  benefit: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  rulesCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rulesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  ruleText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5865F2',
    padding: 20,
    borderRadius: 16,
    gap: 12,
    marginBottom: 16,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  disclaimer: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
