import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.7;

interface SwipeToActivateProps {
  onActivate: () => void;
  isActive: boolean;
}

export const SwipeToActivate: React.FC<SwipeToActivateProps> = ({
  onActivate,
  isActive,
}) => {
  const pan = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isActive,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx > 0 && gesture.dx < SWIPE_THRESHOLD) {
          pan.setValue(gesture.dx);
          opacity.setValue(1 - gesture.dx / SWIPE_THRESHOLD);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          // Activated!
          Animated.parallel([
            Animated.timing(pan, {
              toValue: SCREEN_WIDTH,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onActivate();
            pan.setValue(0);
            opacity.setValue(1);
          });
        } else {
          // Reset
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          Animated.spring(opacity, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (isActive) {
    return (
      <View style={styles.activeContainer}>
        <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
        <Text style={styles.activeText}>PROTECTION ACTIVE</Text>
        <Text style={styles.activeSubtext}>All gambling sites blocked</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.track,
          {
            opacity,
          },
        ]}
      >
        <Text style={styles.trackText}>SWIPE TO ACTIVATE PROTECTION</Text>
        <Ionicons name="arrow-forward" size={24} color={colors.textMuted} />
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.slider,
          {
            transform: [{ translateX: pan }],
          },
        ]}
      >
        <View style={styles.sliderContent}>
          <Ionicons name="shield" size={32} color="#FFF" />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 80,
    backgroundColor: colors.cardBackground,
    borderRadius: 40,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  track: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  trackText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  slider: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  sliderContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeContainer: {
    height: 80,
    backgroundColor: colors.surface,
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: 24,
  },
  activeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1,
  },
  activeSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    position: 'absolute',
    bottom: 12,
  },
});
