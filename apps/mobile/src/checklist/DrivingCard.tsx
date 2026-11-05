import type { LicenceAssessment } from '@tourist/core';
import { Text } from 'react-native';
import { formatDate } from '@/src/components/DateField';
import { strings } from '@/src/strings';
import { Body, Button, Card, Label } from '@/src/ui/components';
import { colors } from '@/src/ui/theme';

const t = strings.checklist.driving;

function copy(licence: LicenceAssessment): { title: string; body: string; canRequest: boolean; tone: 'good' | 'plain' | 'warn' } {
  switch (licence.kind) {
    case 'no_licence':
      return { title: t.none.title, body: t.none.body, canRequest: false, tone: 'plain' };
    case 'licence_expires_during_trip':
      return { title: t.expires.title, body: t.expires.body(formatDate(licence.expiryDate)), canRequest: false, tone: 'warn' };
    case 'eligible_for_permit':
      return {
        title: t.eligible.title,
        body: licence.route === 'aa_ceylon_recognition' ? t.aa : t.dmt,
        canRequest: true,
        tone: 'good',
      };
  }
}

export function DrivingCard({
  licence, openRequestId, onGetHelp, onViewRequest,
}: { licence: LicenceAssessment; openRequestId: string | null; onGetHelp: () => void; onViewRequest: (id: string) => void }) {
  const c = copy(licence);
  return (
    <Card tone={c.tone}>
      <Label>{strings.checklist.drivingLabel}</Label>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.fg }}>{c.title}</Text>
      <Body muted>{c.body}</Body>
      <Body muted>{t.tukTuk}</Body>
      {openRequestId ? (
        <Button title={strings.checklist.viewRequest} variant="secondary" onPress={() => onViewRequest(openRequestId)} />
      ) : c.canRequest ? (
        <Button title={t.help} onPress={onGetHelp} />
      ) : null}
    </Card>
  );
}
