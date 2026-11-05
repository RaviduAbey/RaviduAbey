import { render, screen, userEvent } from '@testing-library/react-native';
import Verify from './verify';

const mockVerifyOtp = jest.fn().mockResolvedValue({ error: null });

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ email: 'anna@example.test' }),
}));
jest.mock('@/src/lib/supabase', () => ({
  supabase: { auth: { verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args), signInWithOtp: jest.fn() } },
}));

beforeEach(() => jest.clearAllMocks());

test('verifies the 6-digit code for the email', async () => {
  const user = userEvent.setup();
  await render(<Verify />);
  const button = screen.getByRole('button', { name: 'Sign in' });
  expect(button).toBeDisabled();
  await user.type(screen.getByLabelText('6-digit code'), '123456');
  await user.press(button);
  expect(mockVerifyOtp).toHaveBeenCalledWith({ email: 'anna@example.test', token: '123456', type: 'email' });
});

test('shows a clear message for a wrong code', async () => {
  mockVerifyOtp.mockResolvedValueOnce({ error: { message: 'Token has expired or is invalid' } });
  const user = userEvent.setup();
  await render(<Verify />);
  await user.type(screen.getByLabelText('6-digit code'), '000000');
  await user.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByText('That code is wrong or has expired. Check the latest email or send a new code.')).toBeOnTheScreen();
});
