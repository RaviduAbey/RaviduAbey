import { formatColomboDateTime } from '@tourist/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRequestList } from '@/src/requests/useRequests';
import { strings } from '@/src/strings';
import { Body } from '@/src/ui/components';
import { colors, radius, space } from '@/src/ui/theme';

const t = strings.requests;

export default function Requests() {
  const router = useRouter();
  const { rows, reload } = useRequestList();
  const [refreshing, setRefreshing] = useState(false);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.body}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} />
      }
    >
      {rows === null ? <ActivityIndicator color={colors.accent} /> : null}
      {rows?.length === 0 ? <Body muted>{t.empty}</Body> : null}
      {rows?.map((r) => (
        <Pressable
          key={r.id}
          accessibilityRole="button"
          accessibilityLabel={`${t.typeTitle[r.type]}, ${strings.status[r.status]}`}
          onPress={() => router.push(`/requests/${r.id}`)}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.title}>{t.typeTitle[r.type]}</Text>
            <Text style={styles.meta}>{t.sentOn(formatColomboDateTime(r.created_at))}</Text>
          </View>
          <View style={[styles.pill, r.status === 'needs_info' && styles.pillWarn]}>
            <Text style={styles.pillText}>{strings.status[r.status]}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.lg },
  title: { fontSize: 16, fontWeight: '600', color: colors.fg },
  meta: { fontSize: 13, color: colors.muted },
  pill: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.accentSoft },
  pillWarn: { backgroundColor: colors.warnSoft },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.fg },
});
