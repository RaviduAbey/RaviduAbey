import { Stack } from 'expo-router';
import { colors } from '@/src/ui/theme';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerTitle: '', headerShadowVisible: false, headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.accent }}>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}
