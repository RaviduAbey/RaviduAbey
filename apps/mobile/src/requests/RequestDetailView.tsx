import { nextStatuses, type DocumentKind, type RequestStatus, type RequestType, formatColomboDateTime } from '@tourist/core';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PhotoSlot } from '@/src/components/PhotoSlot';
import { requiredFiles } from '@/src/requests/requiredFiles';
import { strings } from '@/src/strings';
import { Body, Button, Card, ErrorText, Field, Label, Title } from '@/src/ui/components';
import { colors, space } from '@/src/ui/theme';
import { Timeline, type TimelineEvent } from './Timeline';

const t = strings.requests;

export interface DocumentRow {
  id: string;
  kind: string;
  storage_path: string;
  created_at: string;
}

export interface Reply {
  note: string;
  file: { kind: DocumentKind; uri: string } | null;
}

export function RequestDetailView(props: {
  id: string;
  type: RequestType;
  status: RequestStatus;
  created_at: string;
  events: TimelineEvent[];
  documents: DocumentRow[];
  onCancel: () => void;
  onReply: (reply: Reply) => void;
  onOpenDocument: (path: string) => void;
  busy?: boolean;
  error?: string | null;
}) {
  const allowed = nextStatuses(props.status, 'tourist');
  const canCancel = allowed.includes('cancelled');
  const canReply = props.status === 'needs_info';
  const kinds = requiredFiles(props.type, true);
  const [kind, setKind] = useState<DocumentKind>(kinds[0]!);
  const [note, setNote] = useState('');
  const [uri, setUri] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.xs }}>
        <Title>{t.typeTitle[props.type]}</Title>
        <Body muted>{t.sentOn(formatColomboDateTime(props.created_at))}</Body>
      </View>
      <View style={[styles.pill, props.status === 'needs_info' && styles.pillWarn, props.status === 'completed' && styles.pillGood]}>
        <Text style={styles.pillText}>{strings.status[props.status]}</Text>
      </View>

      {canReply ? (
        <Card tone="warn">
          <Label>{t.replyTitle}</Label>
          <Field label={t.replyNote} value={note} onChangeText={setNote} multiline />
          {kinds.length > 1 ? (
            <View style={{ gap: space.sm }}>
              <Label>{t.replyKind}</Label>
              <View style={styles.chips}>
                {kinds.map((k) => (
                  <Pressable
                    key={k}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: k === kind }}
                    onPress={() => setKind(k)}
                    style={[styles.chip, k === kind && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, k === kind && styles.chipTextOn]}>{strings.request.files[k]}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <PhotoSlot label={strings.request.files[kind]} uri={uri} onPicked={setUri} />
          {props.error ? <ErrorText>{props.error}</ErrorText> : null}
          <Button
            title={t.replySend}
            busy={props.busy}
            disabled={!note.trim() && !uri}
            onPress={() => props.onReply({ note: note.trim(), file: uri ? { kind, uri } : null })}
          />
        </Card>
      ) : null}

      <View style={{ gap: space.md }}>
        <Label>{t.timeline}</Label>
        <Timeline events={props.events} />
      </View>

      {props.documents.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Label>{t.documents}</Label>
          {props.documents.map((d) => {
            const label = strings.request.files[d.kind as DocumentKind] ?? d.kind;
            return <Button key={d.id} title={t.open(label)} variant="secondary" onPress={() => props.onOpenDocument(d.storage_path)} />;
          })}
        </View>
      ) : null}

      {canCancel ? (
        confirmCancel ? (
          <Card>
            <Body>{t.cancelAsk}</Body>
            <Button title={t.cancelConfirm} variant="danger" onPress={props.onCancel} busy={props.busy} />
            <Button title={t.keep} variant="secondary" onPress={() => setConfirmCancel(false)} />
          </Card>
        ) : (
          <Button title={t.cancel} variant="danger" onPress={() => setConfirmCancel(true)} />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.accentSoft },
  pillWarn: { backgroundColor: colors.warnSoft },
  pillGood: { backgroundColor: colors.accentSoft },
  pillText: { fontSize: 14, fontWeight: '600', color: colors.fg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: space.md, paddingVertical: 6, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { fontSize: 14, color: colors.fg },
  chipTextOn: { color: colors.accent, fontWeight: '600' },
});
