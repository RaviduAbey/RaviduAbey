import { registerPush } from './registerPush';

const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockGetToken = jest.fn().mockResolvedValue({ data: 'ExponentPushToken[abc]' });
const mockGetPerms = jest.fn();
const mockRequestPerms = jest.fn();

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'proj-1' } } } } }));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => mockGetPerms(),
  requestPermissionsAsync: () => mockRequestPerms(),
  getExpoPushTokenAsync: (o: unknown) => mockGetToken(o),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
}));
jest.mock('@/src/lib/supabase', () => ({ supabase: { from: () => ({ upsert: (p: unknown) => mockUpsert(p) }) } }));

beforeEach(() => jest.clearAllMocks());

test('saves the Expo push token when permission is granted', async () => {
  mockGetPerms.mockResolvedValue({ status: 'granted' });
  await registerPush('p1');
  expect(mockGetToken).toHaveBeenCalledWith({ projectId: 'proj-1' });
  expect(mockUpsert).toHaveBeenCalledWith({ profile_id: 'p1', expo_token: 'ExponentPushToken[abc]' });
});

test('does nothing, without throwing, when permission is denied', async () => {
  mockGetPerms.mockResolvedValue({ status: 'undetermined' });
  mockRequestPerms.mockResolvedValue({ status: 'denied' });
  await expect(registerPush('p1')).resolves.toBeUndefined();
  expect(mockGetToken).not.toHaveBeenCalled();
  expect(mockUpsert).not.toHaveBeenCalled();
});

test('swallows token errors', async () => {
  mockGetPerms.mockResolvedValue({ status: 'granted' });
  mockGetToken.mockRejectedValueOnce(new Error('no network'));
  await expect(registerPush('p1')).resolves.toBeUndefined();
});
