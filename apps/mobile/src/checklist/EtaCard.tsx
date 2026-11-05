import type { VisaAssessment } from '@tourist/core';
import { strings } from '@/src/strings';
import { Body, Button, Card, Label } from '@/src/ui/components';
import { Text } from 'react-native';
import { colors } from '@/src/ui/theme';

const t = strings.checklist.eta;

function copy(visa: VisaAssessment): { title: string; body: string; tone: 'good' | 'plain' | 'warn' } {
  switch (visa.kind) {
    case 'eta_free':
      return { title: t.free.title, body: t.free.body(visa.stayDays), tone: 'good' };
    case 'eta_paid':
      return { title: t.paid.title(visa.feeUsd), body: t.paid.body, tone: 'plain' };
    case 'stay_exceeds_eta':
      return { title: t.exceeds.title, body: t.exceeds.body(visa.stayDays, visa.maxStayDays), tone: 'warn' };
    case 'unknown_country':
      return { title: t.unknown.title, body: t.unknown.body, tone: 'warn' };
  }
}

export function EtaCard({
  visa, openRequestId, onGetHelp, onViewRequest,
}: { visa: VisaAssessment; openRequestId: string | null; onGetHelp: () => void; onViewRequest: (id: string) => void }) {
  const c = copy(visa);
  return (
    <Card tone={c.tone}>
      <Label>{strings.checklist.visaLabel}</Label>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.fg }}>{c.title}</Text>
      <Body muted>{c.body}</Body>
      {openRequestId ? (
        <Button title={strings.checklist.viewRequest} variant="secondary" onPress={() => onViewRequest(openRequestId)} />
      ) : (
        <Button title={t.help} onPress={onGetHelp} />
      )}
    </Card>
  );
}
