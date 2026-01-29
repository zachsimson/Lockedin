import { Slot } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { BlockerProvider } from '../src/context/BlockerContext';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <BlockerProvider>
          <StatusBar style="auto" />
          <Slot />
        </BlockerProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
