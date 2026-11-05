import { requiredFiles, submitRequest } from './submitRequest';

const mockInsert = jest.fn();
const mockDocInsert = jest.fn().mockResolvedValue({ error: null });
const mockUpload = jest.fn();
const mockRpc = jest.fn().mockResolvedValue({ error: null });

jest.mock('./uploadDocument', () => ({
  uploadDocument: (...args: unknown[]) => mockUpload(...args),
}));
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (table: string) =>
      table === 'service_requests'
        ? { insert: (p: unknown) => ({ select: () => ({ single: () => mockInsert(p) }) }) }
        : { insert: (p: unknown) => mockDocInsert(p) },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

const base = { profileId: 'p1', tripId: 't1', departure: '2027-02-02' };

beforeEach(() => {
  jest.clearAllMocks();
  mockInsert.mockResolvedValue({ data: { id: 'r1' }, error: null });
  mockUpload.mockImplementation((p: string, r: string, kind: string) => Promise.resolve(`${p}/${r}/${kind}-abc.jpg`));
});

test('required files per request type', () => {
  expect(requiredFiles('eta_application', false)).toEqual(['passport']);
  expect(requiredFiles('driving_permit', false)).toEqual(['licence_front', 'licence_back', 'photo']);
  expect(requiredFiles('driving_permit', true)).toEqual(['licence_front', 'licence_back', 'photo', 'idp']);
});

test('ETA with a passport expiring before departure is refused before any network call', async () => {
  const result = await submitRequest({
    ...base, type: 'eta_application', hasIdp: false,
    details: { passportNumber: 'N123', passportExpiry: '2027-01-30' },
    files: [{ kind: 'passport', uri: 'file:///p.jpg' }],
  });
  expect(result).toEqual({ error: 'passport_expires_before_departure' });
  expect(mockInsert).not.toHaveBeenCalled();
  expect(mockUpload).not.toHaveBeenCalled();
});

test('missing files are refused before any network call', async () => {
  const result = await submitRequest({ ...base, type: 'driving_permit', hasIdp: true, details: {}, files: [{ kind: 'licence_front', uri: 'f' }] });
  expect(result).toEqual({ error: 'missing_files' });
  expect(mockInsert).not.toHaveBeenCalled();
});

test('a second open request of the same type maps to already_open', async () => {
  mockInsert.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate' } });
  const result = await submitRequest({
    ...base, type: 'eta_application', hasIdp: false,
    details: { passportNumber: 'N123', passportExpiry: '2030-01-01' },
    files: [{ kind: 'passport', uri: 'file:///p.jpg' }],
  });
  expect(result).toEqual({ error: 'already_open' });
  expect(mockUpload).not.toHaveBeenCalled();
});

test('creates the request, uploads each file under the request folder and records it', async () => {
  const result = await submitRequest({
    ...base, type: 'driving_permit', hasIdp: false, details: {},
    files: [
      { kind: 'licence_front', uri: 'file:///a.jpg' },
      { kind: 'licence_back', uri: 'file:///b.jpg' },
      { kind: 'photo', uri: 'file:///c.jpg' },
    ],
  });
  expect(result).toEqual({ requestId: 'r1' });
  expect(mockInsert).toHaveBeenCalledWith({ profile_id: 'p1', trip_id: 't1', type: 'driving_permit', details: {} });
  expect(mockUpload).toHaveBeenCalledWith('p1', 'r1', 'licence_front', 'file:///a.jpg');
  expect(mockDocInsert).toHaveBeenCalledWith([
    { request_id: 'r1', kind: 'licence_front', storage_path: 'p1/r1/licence_front-abc.jpg', uploaded_by: 'p1' },
    { request_id: 'r1', kind: 'licence_back', storage_path: 'p1/r1/licence_back-abc.jpg', uploaded_by: 'p1' },
    { request_id: 'r1', kind: 'photo', storage_path: 'p1/r1/photo-abc.jpg', uploaded_by: 'p1' },
  ]);
});

test('if an upload fails the request is cancelled so the tourist can try again', async () => {
  mockUpload.mockRejectedValueOnce(new Error('network'));
  const result = await submitRequest({
    ...base, type: 'eta_application', hasIdp: false,
    details: { passportNumber: 'N123', passportExpiry: '2030-01-01' },
    files: [{ kind: 'passport', uri: 'file:///p.jpg' }],
  });
  expect(result).toEqual({ error: 'upload_failed' });
  expect(mockRpc).toHaveBeenCalledWith('change_request_status', {
    p_request_id: 'r1', p_to_status: 'cancelled', p_note: 'Upload failed on the device',
  });
});
