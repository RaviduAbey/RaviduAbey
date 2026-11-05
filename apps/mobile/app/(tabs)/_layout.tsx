import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { colors } from '@/src/ui/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.fg },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My trip',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'checklist', android: 'checklist', web: 'checklist' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'tray.full', android: 'inbox', web: 'inbox' }} tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
