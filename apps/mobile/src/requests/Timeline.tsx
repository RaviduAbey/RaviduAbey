import { formatColomboDateTime } from '@tourist/core';
import { StyleSheet, Text, View } from 'react-native';
import { strings } from '@/src/strings';
import { colors, space } from '@/src/ui/theme';

export interface TimelineEvent {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  const ordered = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <View style={styles.list}>
      {ordered.map((e, i) => (
        <View key={e.id} style={styles.row}>
          <View style={styles.rail}>
            <View style={[styles.dot, i === ordered.length - 1 && styles.dotLast]} />
            {i < ordered.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.content}>
            <Text testID="timeline-status" style={styles.status}>{strings.status[e.to_status] ?? e.to_status}</Text>
            <Text style={styles.time}>{formatColomboDateTime(e.created_at)}</Text>
            {e.note ? <Text style={styles.note}>{e.note}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  row: { flexDirection: 'row', gap: space.md },
  rail: { width: 14, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.line, marginTop: 4 },
  dotLast: { backgroundColor: colors.accent },
  line: { flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 2 },
  content: { flex: 1, paddingBottom: space.lg, gap: 2 },
  status: { fontSize: 16, fontWeight: '600', color: colors.fg },
  time: { fontSize: 13, color: colors.muted },
  note: { fontSize: 15, color: colors.fg, marginTop: space.xs, backgroundColor: colors.warnSoft, padding: space.sm, borderRadius: 8 },
});
