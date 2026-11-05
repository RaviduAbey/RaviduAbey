import { normalisePhone, isValidPhone } from './draft';

test('phone numbers are normalised to +digits', () => {
  expect(normalisePhone(' +44 7700-900 123 ')).toBe('+447700900123');
  expect(normalisePhone('(+94) 77 123 4567')).toBe('+94771234567');
});

test('phone must be in international format', () => {
  expect(isValidPhone('+447700900123')).toBe(true);
  expect(isValidPhone('07700900123')).toBe(false);
  expect(isValidPhone('+0123456789')).toBe(false);
  expect(isValidPhone('+12345')).toBe(false);
});
