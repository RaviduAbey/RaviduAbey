import { render, screen } from '@testing-library/react-native';
import type { LicenceAssessment } from '@tourist/core';
import { DrivingCard } from './DrivingCard';

const noop = () => {};
const TUK_TUK = 'Three-wheelers (tuk-tuks) need a separate permit — ask us.';

async function show(licence: LicenceAssessment, openRequestId: string | null = null) {
  await render(<DrivingCard licence={licence} openRequestId={openRequestId} onGetHelp={noop} onViewRequest={noop} />);
}

test('no licence: no help button, suggests a driver', async () => {
  await show({ kind: 'no_licence' });
  expect(screen.getByText("You can't drive yourself in Sri Lanka")).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Get my permit' })).toBeNull();
  expect(screen.getByText(TUK_TUK)).toBeOnTheScreen();
});

test('licence expiring during the trip', async () => {
  await show({ kind: 'licence_expires_during_trip', expiryDate: '2027-01-05' });
  expect(screen.getByText('Your licence expires during your trip')).toBeOnTheScreen();
  expect(screen.getByText(/5 Jan 2027/)).toBeOnTheScreen();
  expect(screen.getByText(TUK_TUK)).toBeOnTheScreen();
});

test('with an IDP: AA Ceylon route', async () => {
  await show({ kind: 'eligible_for_permit', route: 'aa_ceylon_recognition' });
  expect(screen.getByText('You can drive with a Sri Lankan permit')).toBeOnTheScreen();
  expect(screen.getByText(/AA Ceylon recognition permit/)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Get my permit' })).toBeOnTheScreen();
  expect(screen.getByText(TUK_TUK)).toBeOnTheScreen();
});

test('without an IDP: DMT route', async () => {
  await show({ kind: 'eligible_for_permit', route: 'dmt_temporary_permit' });
  expect(screen.getByText(/Department of Motor Traffic/)).toBeOnTheScreen();
  expect(screen.getByText(TUK_TUK)).toBeOnTheScreen();
});

test('open request shows View request', async () => {
  await show({ kind: 'eligible_for_permit', route: 'dmt_temporary_permit' }, 'req-9');
  expect(screen.getByRole('button', { name: 'View request' })).toBeOnTheScreen();
});
