import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import api from '../../src/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AvatarData {
  id: string;
  icon: string;
  color: string;
  category: string;
}

interface Categories {
  [key: string]: AvatarData[];
}

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<Categories>({});
  const [selectedAvatar, setSelectedAvatar] = useState('shield');
  const [bio, setBio] = useState('');
  const [activeCategory, setActiveCategory] = useState('classic');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileRes, avatarsRes] = await Promise.all([
        api.get('/api/profile'),
        api.get('/api/avatars'),
      ]);
      
      setProfile(profileRes.data.profile);
      setSelectedAvatar(profileRes.data.profile.avatar_id || 'shield');
      setBio(profileRes.data.profile.bio || '');
      setCategories(avatarsRes.data.categories || {});
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/api/profile', {
        avatar_id: selectedAvatar,
        bio: bio.trim(),
      });
      
      Alert.alert('Success', 'Profile updated!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const categoryLabels: { [key: string]: string } = {
    classic: 'Classic',
    abstract: 'Abstract',
    nature: 'Nature',
    strength: 'Strength',
    minimal: 'Minimal',
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Current Avatar Preview */}
        <View style={styles.previewSection}>
          <View style={[styles.avatarPreview, { borderColor: categories[activeCategory]?.find(a => a.id === selectedAvatar)?.color || colors.primary }]}>
            <Ionicons 
              name={categories[activeCategory]?.find(a => a.id === selectedAvatar)?.icon as any || 'shield-checkmark'} 
              size={64} 
              color={categories[activeCategory]?.find(a => a.id === selectedAvatar)?.color || colors.primary} 
            />
          </View>
          <Text style={styles.previewLabel}>Your Avatar</Text>
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BIO</Text>
          <TextInput
            style={styles.bioInput}
            placeholder="Tell us about yourself (max 150 chars)"
            placeholderTextColor={colors.textMuted}
            value={bio}
            onChangeText={(text) => setBio(text.slice(0, 150))}
            multiline
            maxLength={150}
          />
          <Text style={styles.charCount}>{bio.length}/150</Text>
        </View>

        {/* Avatar Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CHOOSE AVATAR</Text>
          <Text style={styles.sectionSubtitle}>30+ unique styles</Text>
          
          {/* Category Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
            {Object.keys(categories).map((cat) => (
              <Pressable
                key={cat}
                style={[styles.categoryTab, activeCategory === cat && styles.categoryTabActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryTabText, activeCategory === cat && styles.categoryTabTextActive]}>
                  {categoryLabels[cat] || cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Avatar Grid */}
          <View style={styles.avatarGrid}>
            {categories[activeCategory]?.map((avatar) => (
              <Pressable
                key={avatar.id}
                style={[
                  styles.avatarOption,
                  selectedAvatar === avatar.id && styles.avatarOptionSelected,
                  { borderColor: selectedAvatar === avatar.id ? avatar.color : 'transparent' }
                ]}
                onPress={() => setSelectedAvatar(avatar.id)}
              >
                <View style={[styles.avatarIcon, { backgroundColor: `${avatar.color}20` }]}>
                  <Ionicons name={avatar.icon as any} size={28} color={avatar.color} />
                </View>
                {selectedAvatar === avatar.id && (
                  <View style={[styles.selectedBadge, { backgroundColor: avatar.color }]}>
                    <Ionicons name="checkmark" size={12} color="#000" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Profile Visibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRIVACY</Text>
          <View style={styles.privacyCard}>
            <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>Anonymous Mode Active</Text>
              <Text style={styles.privacyText}>Your real identity is always protected. Only your chosen avatar and username are visible.</Text>
            </View>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  previewLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 12,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: 12,
  },
  bioInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 8,
  },
  categoryTabs: {
    marginBottom: 16,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  categoryTabTextActive: {
    color: '#000',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarOption: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarOptionSelected: {
    backgroundColor: colors.surface,
  },
  avatarIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
