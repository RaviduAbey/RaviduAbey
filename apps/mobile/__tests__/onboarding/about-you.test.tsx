import { render, screen, userEvent } from '@testing-library/react-native';
import AboutYou from '@/app/onboarding/about-you';
import { DraftProvider } from '@/src/onboarding/draft';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

test('Next stays disabled until name, phone and nationality are valid', async () => {
  const user = userEvent.setup();
  await render(<DraftProvider><AboutYou /></DraftProvider>);
  const next = screen.getByRole('button', { name: 'Next' });
  expect(next).toBeDisabled();

  await user.type(screen.getByLabelText('Full name (as on passport)'), 'Anna Demo');
  await user.type(screen.getByLabelText('Mobile number'), '0400 000 001');
  expect(next).toBeDisabled();
  expect(screen.getByText('Start with + and your country code, for example +44 7700 900123.')).toBeOnTheScreen();

  await user.clear(screen.getByLabelText('Mobile number'));
  await user.type(screen.getByLabelText('Mobile number'), '+61 400 000 001');
  expect(next).toBeDisabled();

  await user.press(screen.getByLabelText('Nationality (passport)'));
  await user.type(screen.getByLabelText('Search countries'), 'austral');
  await user.press(screen.getByRole('button', { name: 'Australia' }));
  expect(next).toBeEnabled();

  await user.press(next);
  expect(mockPush).toHaveBeenCalledWith('/onboarding/trip');
});
