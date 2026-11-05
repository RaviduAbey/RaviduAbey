import { render, screen } from '@testing-library/react-native';
import type { VisaAssessment } from '@tourist/core';
import { EtaCard } from './EtaCard';

const noop = () => {};

async function show(visa: VisaAssessment, openRequestId: string | null = null) {
  await render(<EtaCard visa={visa} openRequestId={openRequestId} onGetHelp={noop} onViewRequest={noop} />);
}

test('free ETA', async () => {
  await show({ kind: 'eta_free', stayDays: 22, maxStayDays: 30 });
  expect(screen.getByText('Free ETA — apply before you fly')).toBeOnTheScreen();
});

test('paid ETA shows the fee', async () => {
  await show({ kind: 'eta_paid', feeUsd: 50, stayDays: 10, maxStayDays: 30 });
  expect(screen.getByText('ETA required — US$50')).toBeOnTheScreen();
});

test('stay longer than the ETA warns about an extension', async () => {
  await show({ kind: 'stay_exceeds_eta', feeUsd: 0, stayDays: 45, maxStayDays: 30 });
  expect(screen.getByText('Your stay is longer than the ETA allows')).toBeOnTheScreen();
  expect(screen.getByText(/45-day trip is longer than the 30 days an ETA covers/)).toBeOnTheScreen();
});

test('unknown country never guesses', async () => {
  await show({ kind: 'unknown_country' });
  expect(screen.getByText('Our team will check your visa requirements.')).toBeOnTheScreen();
});

test.each<VisaAssessment>([
  { kind: 'eta_free', stayDays: 22, maxStayDays: 30 },
  { kind: 'eta_paid', feeUsd: 50, stayDays: 10, maxStayDays: 30 },
  { kind: 'stay_exceeds_eta', feeUsd: 0, stayDays: 45, maxStayDays: 30 },
  { kind: 'unknown_country' },
])('never says no visa is needed (%o)', async (visa) => {
  await show(visa);
  expect(screen.queryByText(/no visa/i)).toBeNull();
});

test('button reads Get help, or View request when one is open', async () => {
  await show({ kind: 'eta_free', stayDays: 22, maxStayDays: 30 });
  expect(screen.getByRole('button', { name: 'Get help applying' })).toBeOnTheScreen();
  await show({ kind: 'eta_free', stayDays: 22, maxStayDays: 30 }, 'req-1');
  expect(screen.getByRole('button', { name: 'View request' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Get help applying' })).toBeNull();
});
