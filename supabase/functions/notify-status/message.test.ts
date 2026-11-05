import { assertEquals } from 'jsr:@std/assert@1';
import { buildMessage } from './message.ts';

Deno.test('needs_info asks the tourist to act, using the staff note', () => {
  assertEquals(
    buildMessage({ from_status: 'in_review', to_status: 'needs_info', note: 'Passport photo is blurry' }, { id: 'r1', type: 'eta_application' }),
    { title: 'Action needed: ETA application', body: 'Passport photo is blurry', data: { requestId: 'r1' } },
  );
});

Deno.test('needs_info without a note still says what to do', () => {
  assertEquals(
    buildMessage({ from_status: 'in_review', to_status: 'needs_info', note: null }, { id: 'r1', type: 'driving_permit' })?.body,
    'Open the app to see what we need.',
  );
});

Deno.test('completed driving permit', () => {
  assertEquals(
    buildMessage({ from_status: 'in_review', to_status: 'completed', note: null }, { id: 'r2', type: 'driving_permit' })?.title,
    'Your driving permit is ready',
  );
});

Deno.test('completed ETA', () => {
  assertEquals(
    buildMessage({ from_status: 'in_review', to_status: 'completed', note: null }, { id: 'r2', type: 'eta_application' })?.title,
    'Your ETA is approved',
  );
});

Deno.test('no push for the initial submitted event or the tourist cancelling', () => {
  assertEquals(buildMessage({ from_status: null, to_status: 'submitted', note: null }, { id: 'r1', type: 'eta_application' }), null);
  assertEquals(buildMessage({ from_status: 'submitted', to_status: 'cancelled', note: null }, { id: 'r1', type: 'eta_application' }), null);
});
