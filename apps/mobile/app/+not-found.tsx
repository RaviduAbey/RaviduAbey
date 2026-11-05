import { Link, Stack } from 'expo-router';
import { Body, Screen, Title } from '@/src/ui/components';

export default function NotFoundScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Title>This screen doesn't exist.</Title>
      <Link href="/"><Body>Go to my trip</Body></Link>
    </Screen>
  );
}
