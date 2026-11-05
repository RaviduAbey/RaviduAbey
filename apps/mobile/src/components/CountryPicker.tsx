import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COUNTRIES, countryName } from '@/src/data/countries';
import { Button, Label } from '@/src/ui/components';
import { colors, radius, space } from '@/src/ui/theme';

export function CountryPicker({ label, value, onChange }: { label: string; value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q) : COUNTRIES;
  }, [query]);

  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={() => setOpen(true)} style={styles.input}>
        <Text style={value ? styles.value : styles.placeholder}>{value ? countryName(value) : 'Choose a country'}</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHead}>
            <TextInput
              accessibilityLabel="Search countries"
              placeholder="Search countries"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              autoFocus
              style={[styles.input, styles.search]}
            />
            <Button title="Close" variant="secondary" onPress={() => setOpen(false)} />
          </View>
          <FlatList
            data={matches}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.name}
                onPress={() => {
                  onChange(item.code);
                  setOpen(false);
                  setQuery('');
                }}
                style={styles.row}
              >
                <Text style={styles.value}>{item.name}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.sm },
  input: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 12 },
  value: { fontSize: 16, color: colors.fg },
  placeholder: { fontSize: 16, color: colors.muted },
  sheet: { flex: 1, backgroundColor: colors.bg },
  sheetHead: { padding: space.lg, gap: space.sm },
  search: { fontSize: 16, color: colors.fg },
  row: { paddingHorizontal: space.xl, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
