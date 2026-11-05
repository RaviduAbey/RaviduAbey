import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Label } from '@/src/ui/components';
import { colors, radius, space } from '@/src/ui/theme';

function toIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return fromIso(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Picks a calendar date and reports it as YYYY-MM-DD. */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        <Label>{label}</Label>
        <TextInput
          accessibilityLabel={label}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.muted}
          value={value}
          onChangeText={onChange}
          style={[styles.input, styles.text]}
        />
      </View>
    );
  }

  function handle(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && date) onChange(toIso(date));
  }

  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={() => setOpen((o) => !o)} style={styles.input}>
        <Text style={[styles.text, !value && { color: colors.muted }]}>{value ? formatDate(value) : 'Choose a date'}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value ? fromIso(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handle}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.sm },
  input: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 12 },
  text: { fontSize: 16, color: colors.fg },
});
