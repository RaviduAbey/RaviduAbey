import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

vi.mock('./actions', () => ({ changeStatus: vi.fn(async () => ({ error: null })) }));
import { StatusActions } from './StatusActions';

afterEach(cleanup);

const names = () => screen.getAllByRole('button').map((b) => b.textContent);

test('shows only the moves staff can make', () => {
  render(<StatusActions requestId="r1" status="submitted" type="eta_application" />);
  expect(names()).toEqual(['Start review']);
  cleanup();
  render(<StatusActions requestId="r1" status="in_review" type="eta_application" />);
  expect(names()).toEqual(['Ask tourist for info', 'Mark completed', 'Reject']);
  cleanup();
  render(<StatusActions requestId="r1" status="completed" type="eta_application" />);
  expect(screen.queryAllByRole('button')).toEqual([]);
  expect(screen.getByText('This request is closed.')).toBeTruthy();
});

test('asking for info and rejecting need a note', () => {
  render(<StatusActions requestId="r1" status="in_review" type="eta_application" />);
  const ask = screen.getByRole('button', { name: 'Ask tourist for info' }) as HTMLButtonElement;
  const reject = screen.getByRole('button', { name: 'Reject' }) as HTMLButtonElement;
  const complete = screen.getByRole('button', { name: 'Mark completed' }) as HTMLButtonElement;
  expect(ask.disabled).toBe(true);
  expect(reject.disabled).toBe(true);
  expect(complete.disabled).toBe(false);
  fireEvent.change(screen.getByLabelText('Note to the tourist'), { target: { value: 'Passport photo is blurry' } });
  expect(ask.disabled).toBe(false);
  expect(reject.disabled).toBe(false);
});

test('completing offers an attachment for the approval', () => {
  render(<StatusActions requestId="r1" status="in_review" type="driving_permit" />);
  expect(screen.getByLabelText('Attach the permit (optional)')).toBeTruthy();
});
