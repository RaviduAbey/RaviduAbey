import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space } from './theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const body = <View style={styles.body}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title} accessibilityRole="header">{children}</Text>;
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.text, muted && styles.muted]}>{children}</Text>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Button({
  title, onPress, disabled, busy, variant = 'primary',
}: { title: string; onPress: () => void; disabled?: boolean; busy?: boolean; variant?: 'primary' | 'secondary' | 'danger' }) {
  const isDisabled = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!isDisabled, busy: !!busy }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        isDisabled && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variant === 'primary' ? colors.surface : colors.accent} />
      ) : (
        <Text style={[styles.buttonText, variant !== 'primary' && styles.buttonTextAlt, variant === 'danger' && { color: colors.danger }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({ label, error, hint, ...input }: TextInputProps & { label: string; error?: string | null; hint?: string }) {
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : null]}
        {...input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <View style={styles.toggleRow}>
        {[true, false].map((v) => (
          <Pressable
            key={String(v)}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${v ? 'Yes' : 'No'}`}
            accessibilityState={{ selected: value === v }}
            onPress={() => onChange(v)}
            style={[styles.toggle, value === v && styles.toggleOn]}
          >
            <Text style={[styles.toggleText, value === v && styles.toggleTextOn]}>{v ? 'Yes' : 'No'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Card({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'warn' | 'good' }) {
  return <View style={[styles.card, tone === 'warn' && styles.cardWarn, tone === 'good' && styles.cardGood]}>{children}</View>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <Text style={styles.error} accessibilityRole="alert">{children}</Text>;
}

export function Stack({ children, gap = space.lg }: { children: ReactNode; gap?: number }) {
  return <View style={{ gap }}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.xl, gap: space.lg },
  title: { fontSize: 28, fontWeight: '700', color: colors.fg, letterSpacing: -0.3 },
  text: { fontSize: 16, lineHeight: 23, color: colors.fg },
  muted: { color: colors.muted },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  button: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  buttonSecondary: { backgroundColor: colors.accentSoft },
  buttonDanger: { backgroundColor: colors.dangerSoft },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '600' },
  buttonTextAlt: { color: colors.accent },
  field: { gap: space.sm },
  input: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16, color: colors.fg },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 14 },
  hint: { color: colors.muted, fontSize: 13 },
  toggleRow: { flexDirection: 'row', gap: space.sm },
  toggle: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.surface },
  toggleOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  toggleText: { fontSize: 16, color: colors.fg },
  toggleTextOn: { color: colors.accent, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.sm },
  cardWarn: { backgroundColor: colors.warnSoft, borderColor: colors.warnSoft },
  cardGood: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
});
