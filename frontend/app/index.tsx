import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();

  // Use Redirect component instead of useRouter for initial navigation
  if (!loading && user) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          <Text style={styles.logoText}>LockedIn</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={48} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Lock out gambling.</Text>
          <Text style={styles.heroTitle}>Lock in discipline.</Text>
          <Text style={styles.heroSubtitle}>The recovery app that actually works</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={styles.featureText}>Block 250+ gambling sites</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="time" size={20} color={colors.primary} />
            <Text style={styles.featureText}>24-hour unlock cooldown</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={styles.featureText}>Anonymous community support</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="stats-chart" size={20} color={colors.primary} />
            <Text style={styles.featureText}>Track money saved</Text>
          </View>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          onPress={() => router.push('/auth/register')}
        >
          <Text style={styles.primaryButtonText}>GET STARTED FREE</Text>
          <Ionicons name="arrow-forward" size={20} color="#000" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.secondaryButtonText}>I Have an Account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  header: {
    paddingVertical: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  features: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureText: {
    fontSize: 15,
    color: colors.textSecondary,
    flex: 1,
  },
  buttonContainer: {
    gap: 12,
    paddingBottom: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    gap: 10,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
});
