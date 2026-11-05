import { render, screen, userEvent } from '@testing-library/react-native';
import { RequestDetailView } from './RequestDetailView';

jest.mock('@/src/components/PhotoSlot', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    PhotoSlot: ({ label, onPicked }: { label: string; onPicked: (u: string) => void }) => (
      <Pressable accessibilityRole="button" accessibilityLabel={`Pick ${label}`} onPress={() => onPicked('file:///new.jpg')}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});

const base = {
  id: 'r1', type: 'eta_application' as const, created_at: '2027-01-01T08:00:00Z',
  events: [], documents: [], onCancel: jest.fn(), onReply: jest.fn(), onOpenDocument: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

test('Cancel shows only when the tourist may cancel', async () => {
  await render(<RequestDetailView {...base} status="submitted" />);
  expect(screen.getByRole('button', { name: 'Cancel request' })).toBeOnTheScreen();
  await render(<RequestDetailView {...base} status="in_review" />);
  expect(screen.queryByRole('button', { name: 'Cancel request' })).toBeNull();
  await render(<RequestDetailView {...base} status="completed" />);
  expect(screen.queryByRole('button', { name: 'Cancel request' })).toBeNull();
});

test('needs_info lets the tourist reply with a note and a photo', async () => {
  const user = userEvent.setup();
  await render(<RequestDetailView {...base} status="needs_info" />);
  expect(screen.getByText('We need something from you')).toBeOnTheScreen();
  await user.type(screen.getByLabelText('Message to our team'), 'New photo attached');
  await user.press(screen.getByRole('button', { name: 'Pick Passport photo page' }));
  await user.press(screen.getByRole('button', { name: 'Send to team' }));
  expect(base.onReply).toHaveBeenCalledWith({ note: 'New photo attached', file: { kind: 'passport', uri: 'file:///new.jpg' } });
});

test('no reply box unless the team asked for something', async () => {
  await render(<RequestDetailView {...base} status="in_review" />);
  expect(screen.queryByRole('button', { name: 'Send to team' })).toBeNull();
});

test('team attachments can be opened', async () => {
  const user = userEvent.setup();
  await render(
    <RequestDetailView
      {...base}
      status="completed"
      documents={[{ id: 'd1', kind: 'eta_approval', storage_path: 'p/r1/eta_approval-x.pdf', created_at: '2027-01-04T00:00:00Z' }]}
    />,
  );
  await user.press(screen.getByRole('button', { name: 'Open ETA approval' }));
  expect(base.onOpenDocument).toHaveBeenCalledWith('p/r1/eta_approval-x.pdf');
});
