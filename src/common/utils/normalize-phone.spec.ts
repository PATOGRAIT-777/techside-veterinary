import { normalizePhone } from './normalize-phone';

describe('normalizePhone', () => {
  it('should strip non-digit characters and return 11 digits', () => {
    expect(normalizePhone('+1 55 1234 5678')).toBe('15512345678');
  });

  it('should throw when input has fewer than 11 digits', () => {
    expect(() => normalizePhone('123')).toThrow(
      'El teléfono debe contener exactamente 11 dígitos',
    );
  });

  it('should throw when input contains letters', () => {
    expect(() => normalizePhone('52a1234567')).toThrow(
      'El teléfono debe contener exactamente 11 dígitos',
    );
  });

  it('should return the same string when already clean', () => {
    expect(normalizePhone('15512345678')).toBe('15512345678');
  });
});
