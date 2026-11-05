import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { routeFor } from '@/src/lib/routeFor';
import { SessionProvider, useSession } from '@/src/lib/session';
import { registerPush } from '@/src/push/registerPush';
import { colors } from '@/src/ui/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNav />
    </SessionProvider>
  );
}

const GROUP_FOR_TARGET = { auth: '(auth)', onboarding: 'onboarding', app: '(tabs)' } as const;
const HOME_FOR_TARGET = { auth: '/sign-in', onboarding: '/onboarding/about-you', app: '/' } as const;
// Screens outside the tab group that signed-in, onboarded people may visit.
const APP_SCREENS = new Set(['(tabs)', 'request', 'requests']);

function RootNav() {
  const { loading, session, onboarded } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const target = routeFor({ loading, hasSession: !!session, hasProfile: onboarded });
    if (!target) return;
    SplashScreen.hideAsync();
    const current = segments[0] ?? '(tabs)';
    const allowed = target === 'app' ? APP_SCREENS.has(current) : current === GROUP_FOR_TARGET[target];
    if (!allowed) router.replace(HOME_FOR_TARGET[target]);
  }, [loading, session, onboarded, segments, router]);

  // Register for push once the person is signed in and set up.
  const userId = session?.user.id;
  useEffect(() => {
    if (userId && onboarded) void registerPush(userId);
  }, [userId, onboarded]);

  // Tapping a notification opens the request it is about.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const requestId = response.notification.request.content.data?.requestId;
      if (typeof requestId === 'string') router.push(`/requests/${requestId}`);
    });
    return () => sub.remove();
  }, [router]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.accent,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="request/[type]" options={{ title: 'Get help' }} />
      <Stack.Screen name="requests/[id]" options={{ title: 'Request' }} />
    </Stack>
  );
}
