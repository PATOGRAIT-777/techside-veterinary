import { normalizePhone } from './normalize-phone';

describe('normalizePhone', () => {
  it('should strip non-digit characters', () => {
    expect(normalizePhone('+1 55 1234 5678')).toBe('15512345678');
  });

  it('should strip + prefix and return digits', () => {
    expect(normalizePhone('+525555555555')).toBe('525555555555');
  });

  it('should allow short numbers without throwing', () => {
    expect(normalizePhone('123')).toBe('123');
  });

  it('should ignore letters and return only digits', () => {
    expect(normalizePhone('52a1234567')).toBe('521234567');
  });

  it('should return the same string when already clean', () => {
    expect(normalizePhone('15512345678')).toBe('15512345678');
  });

  it('should return empty string when input is empty', () => {
    expect(normalizePhone('')).toBe('');
  });

  it('should return empty string when input has no digits', () => {
    expect(normalizePhone('abc-+-()')).toBe('');
  });

  it('should preserve very long digit strings', () => {
    expect(normalizePhone('+52 123 456 789 012 345 6')).toBe(
      '521234567890123456',
    );
  });
});
