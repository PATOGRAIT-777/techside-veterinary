import { registerSchema } from './register.dto';

const validBase = {
  email: 'test@example.com',
  password: 'password123',
  rol: 'cliente',
  nombreCompleto: 'Juan Pérez',
  calle: 'Calle 1',
  sucursalId: '00000000-0000-4000-8000-000000000001',
} as const;

describe('registerSchema phone validation', () => {
  it('accepts a phone with exactly 10 digits', () => {
    const result = registerSchema.parse({
      ...validBase,
      telefono: '+52 1 234 567 890',
    });
    expect(result.telefono).toBe('521234567890');
  });

  it('accepts a phone with exactly 15 digits', () => {
    const result = registerSchema.parse({
      ...validBase,
      telefono: '+52 123 456 789 012 3',
    });
    expect(result.telefono).toBe('521234567890123');
  });

  it('rejects a phone with fewer than 10 digits', () => {
    expect(() =>
      registerSchema.parse({
        ...validBase,
        telefono: '+52 123 456',
      }),
    ).toThrow('El teléfono debe tener entre 10 y 15 dígitos');
  });

  it('rejects a phone with more than 15 digits', () => {
    expect(() =>
      registerSchema.parse({
        ...validBase,
        telefono: '+52 123 456 789 012 34',
      }),
    ).toThrow('El teléfono debe tener entre 10 y 15 dígitos');
  });

  it('rejects an empty phone after normalization', () => {
    expect(() =>
      registerSchema.parse({
        ...validBase,
        telefono: 'abc-()',
      }),
    ).toThrow('El teléfono debe tener entre 10 y 15 dígitos');
  });

  it('accepts a valid secondary phone', () => {
    const result = registerSchema.parse({
      ...validBase,
      telefono: '+52 123 456 789 0',
      telefonoSecundario: '+52 987 654 321 0',
    });
    expect(result.telefonoSecundario).toBe('529876543210');
  });

  it('accepts omitted secondary phone', () => {
    const result = registerSchema.parse({
      ...validBase,
      telefono: '+52 123 456 789 0',
    });
    expect(result.telefonoSecundario).toBeUndefined();
  });

  it('rejects a secondary phone with invalid length', () => {
    expect(() =>
      registerSchema.parse({
        ...validBase,
        telefono: '+52 123 456 789 0',
        telefonoSecundario: '+52 123',
      }),
    ).toThrow('El teléfono secundario debe tener entre 10 y 15 dígitos');
  });
});
