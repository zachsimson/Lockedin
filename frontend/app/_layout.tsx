import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { BlockerProvider } from '../src/context/BlockerContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <BlockerProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </BlockerProvider>
    </AuthProvider>
  );
}
