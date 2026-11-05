import { Stack } from 'expo-router';
import { DraftProvider } from '@/src/onboarding/draft';
import { strings } from '@/src/strings';
import { colors } from '@/src/ui/theme';

export default function OnboardingLayout() {
  return (
    <DraftProvider>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.accent,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="about-you" options={{ title: strings.onboarding.step(1) }} />
        <Stack.Screen name="trip" options={{ title: strings.onboarding.step(2) }} />
        <Stack.Screen name="licence" options={{ title: strings.onboarding.step(3) }} />
      </Stack>
    </DraftProvider>
  );
}
