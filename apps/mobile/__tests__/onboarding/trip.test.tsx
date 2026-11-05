import { render, screen, userEvent } from '@testing-library/react-native';
import Trip from '@/app/onboarding/trip';
import { DraftProvider } from '@/src/onboarding/draft';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
// Replace the native date picker with a plain text input for tests.
jest.mock('@/src/components/DateField', () => {
  const { TextInput } = jest.requireActual('react-native');
  return {
    DateField: ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} />
    ),
  };
});

async function fill(arrival: string, departure: string) {
  const user = userEvent.setup();
  await render(<DraftProvider><Trip /></DraftProvider>);
  await user.type(screen.getByLabelText('Arrival date'), arrival);
  await user.type(screen.getByLabelText('Departure date'), departure);
  return screen.getByRole('button', { name: 'Next' });
}

test('departure before arrival is blocked', async () => {
  const next = await fill('2030-01-10', '2030-01-05');
  expect(screen.getByText('Your departure date is before your arrival date.')).toBeOnTheScreen();
  expect(next).toBeDisabled();
});

test('arrival in the past is blocked', async () => {
  const next = await fill('2020-01-10', '2020-01-20');
  expect(screen.getByText('Your arrival date has already passed.')).toBeOnTheScreen();
  expect(next).toBeDisabled();
});

test('valid dates show the trip length and enable Next', async () => {
  const next = await fill('2030-01-01', '2030-01-30');
  expect(screen.getByText('30 days in Sri Lanka')).toBeOnTheScreen();
  expect(next).toBeEnabled();
});
