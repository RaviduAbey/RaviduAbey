import { render, screen, userEvent } from '@testing-library/react-native';
import SignIn from '@/app/(auth)/sign-in';

const mockPush = jest.fn();
const mockSignInWithOtp = jest.fn().mockResolvedValue({ error: null });

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }) }));
jest.mock('@/src/lib/supabase', () => ({
  supabase: { auth: { signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args) } },
}));

beforeEach(() => jest.clearAllMocks());

test('Send code is disabled until the email is valid', async () => {
  const user = userEvent.setup();
  await render(<SignIn />);
  const button = screen.getByRole('button', { name: 'Send code' });
  expect(button).toBeDisabled();
  await user.type(screen.getByLabelText('Email'), 'anna@example');
  expect(button).toBeDisabled();
  await user.type(screen.getByLabelText('Email'), '.test');
  expect(button).toBeEnabled();
});

test('sends a code and goes to the verify screen', async () => {
  const user = userEvent.setup();
  await render(<SignIn />);
  await user.type(screen.getByLabelText('Email'), ' Anna@Example.test ');
  await user.press(screen.getByRole('button', { name: 'Send code' }));
  expect(mockSignInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ email: 'anna@example.test' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/verify', params: { email: 'anna@example.test' } });
});

test('shows the error when sending fails', async () => {
  mockSignInWithOtp.mockResolvedValueOnce({ error: { message: 'Email rate limit exceeded' } });
  const user = userEvent.setup();
  await render(<SignIn />);
  await user.type(screen.getByLabelText('Email'), 'anna@example.test');
  await user.press(screen.getByRole('button', { name: 'Send code' }));
  expect(await screen.findByText('Email rate limit exceeded')).toBeOnTheScreen();
  expect(mockPush).not.toHaveBeenCalled();
});
