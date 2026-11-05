import * as ImagePicker from 'expo-image-picker';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { strings } from '@/src/strings';
import { Button } from '@/src/ui/components';
import { colors, radius, space } from '@/src/ui/theme';

export function PhotoSlot({ label, uri, onPicked }: { label: string; uri: string | null; onPicked: (uri: string) => void }) {
  async function pick(fromCamera: boolean) {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
    const result = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!result.canceled && result.assets[0]) onPicked(result.assets[0].uri);
  }

  return (
    <View style={styles.slot}>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        {uri ? <Text style={styles.added}>{strings.request.added}</Text> : null}
      </View>
      {uri ? <Image source={{ uri }} style={styles.preview} accessibilityLabel={`${label} preview`} /> : null}
      <View style={styles.buttons}>
        {Platform.OS !== 'web' ? (
          <View style={{ flex: 1 }}><Button title={strings.request.takePhoto} variant="secondary" onPress={() => pick(true)} /></View>
        ) : null}
        <View style={{ flex: 1 }}><Button title={strings.request.choosePhoto} variant="secondary" onPress={() => pick(false)} /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.md },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 16, fontWeight: '600', color: colors.fg },
  added: { fontSize: 14, fontWeight: '600', color: colors.accent },
  preview: { width: '100%', height: 160, borderRadius: radius.sm, backgroundColor: colors.bg },
  buttons: { flexDirection: 'row', gap: space.sm },
});
