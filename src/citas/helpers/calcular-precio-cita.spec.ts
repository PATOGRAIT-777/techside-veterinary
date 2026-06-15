import { calcularPrecioCita } from './calcular-precio-cita';

describe('calcularPrecioCita', () => {
  it('should sum service base price and specialty price', () => {
    expect(calcularPrecioCita(3500, 1500)).toBe(5000);
  });

  it('should handle Decimal-like objects', () => {
    expect(
      calcularPrecioCita({ toNumber: () => 3500 }, { toNumber: () => 1500 }),
    ).toBe(5000);
  });

  it('should handle string numbers', () => {
    expect(calcularPrecioCita('3500', '1500')).toBe(5000);
  });

  it('should default null service price to 0', () => {
    expect(calcularPrecioCita(null, 1500)).toBe(1500);
  });

  it('should default undefined specialty price to 0', () => {
    expect(calcularPrecioCita(3500, undefined)).toBe(3500);
  });

  it('should default both null/undefined to 0', () => {
    expect(calcularPrecioCita(null, undefined)).toBe(0);
  });

  it('should default invalid strings to 0', () => {
    expect(calcularPrecioCita('abc', 'def')).toBe(0);
  });

  it('should default empty strings to 0', () => {
    expect(calcularPrecioCita('', '')).toBe(0);
  });

  it('should handle negative numbers', () => {
    expect(calcularPrecioCita(-500, 1500)).toBe(1000);
  });

  it('should handle floating point sums', () => {
    expect(calcularPrecioCita(0.1, 0.2)).toBeCloseTo(0.3);
  });

  it('should handle Decimal-like objects with toNumber', () => {
    expect(calcularPrecioCita({ toNumber: () => 100 }, undefined)).toBe(100);
  });
});
