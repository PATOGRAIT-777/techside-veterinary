import { envSchema } from './env.validation';

describe('envSchema', () => {
  const validEnv = {
    NODE_ENV: 'development' as const,
    PORT: '3000',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/vetec',
    JWT_SECRET: 'this-is-a-very-long-secret-key-32-chars!!',
    JWT_EXPIRES_IN: '24h',
    BCRYPT_ROUNDS: '12',
  };

  it('should parse a complete valid environment', () => {
    const result = envSchema.parse(validEnv);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(result.JWT_SECRET).toBe(validEnv.JWT_SECRET);
    expect(result.JWT_EXPIRES_IN).toBe('24h');
    expect(result.BCRYPT_ROUNDS).toBe(12);
  });

  it('should throw when DATABASE_URL is missing', () => {
    const env = { ...validEnv };
    delete (env as Partial<typeof validEnv>).DATABASE_URL;
    expect(() => envSchema.parse(env)).toThrow(/DATABASE_URL/);
  });

  it('should throw when JWT_SECRET is missing', () => {
    const env = { ...validEnv };
    delete (env as Partial<typeof validEnv>).JWT_SECRET;
    expect(() => envSchema.parse(env)).toThrow(/JWT_SECRET/);
  });

  it('should throw when JWT_SECRET is shorter than 32 chars', () => {
    const env = { ...validEnv, JWT_SECRET: 'short' };
    expect(() => envSchema.parse(env)).toThrow(/32/);
  });

  it('should apply defaults when optional fields are omitted', () => {
    const minimal = {
      DATABASE_URL: validEnv.DATABASE_URL,
      JWT_SECRET: validEnv.JWT_SECRET,
    };
    const result = envSchema.parse(minimal);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.JWT_EXPIRES_IN).toBe('24h');
    expect(result.BCRYPT_ROUNDS).toBe(12);
  });
});
