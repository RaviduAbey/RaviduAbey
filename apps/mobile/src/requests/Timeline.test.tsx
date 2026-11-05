import { render, screen } from '@testing-library/react-native';
import { Timeline } from './Timeline';

const events = [
  { id: 'e2', from_status: 'submitted', to_status: 'in_review', note: null, created_at: '2027-01-02T09:00:00Z' },
  { id: 'e1', from_status: null, to_status: 'submitted', note: null, created_at: '2027-01-01T08:00:00Z' },
  { id: 'e3', from_status: 'in_review', to_status: 'needs_info', note: 'Passport photo is blurry', created_at: '2027-01-03T10:30:00Z' },
];

test('lists events oldest first with labels and staff notes', async () => {
  await render(<Timeline events={events} />);
  const labels = screen.getAllByTestId('timeline-status').map((n) => n.props.children);
  expect(labels).toEqual(['Sent', 'Being worked on', 'We need something from you']);
  expect(screen.getByText('Passport photo is blurry')).toBeOnTheScreen();
  expect(screen.getByText('1 Jan 2027, 13:30')).toBeOnTheScreen(); // shown in Sri Lanka time (UTC+5:30)
});
