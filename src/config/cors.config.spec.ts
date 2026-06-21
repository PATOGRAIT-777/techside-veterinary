import {
  CORS_ALLOWED_HEADERS,
  CORS_METHODS,
  LOCALHOST_ORIGIN_REGEX,
  resolveCorsOrigin,
} from './cors.config';

describe('resolveCorsOrigin', () => {
  it('should return the exact FRONTEND_URL when set, regardless of NODE_ENV', () => {
    const origin = 'https://app.example.com';
    expect(resolveCorsOrigin(origin, 'production')).toBe(origin);
    expect(resolveCorsOrigin(origin, 'development')).toBe(origin);
    expect(resolveCorsOrigin(origin, 'test')).toBe(origin);
  });

  it('should return LOCALHOST_ORIGIN_REGEX when FRONTEND_URL is unset in development', () => {
    expect(resolveCorsOrigin(undefined, 'development')).toBe(
      LOCALHOST_ORIGIN_REGEX,
    );
  });

  it('should return LOCALHOST_ORIGIN_REGEX when FRONTEND_URL is unset in test', () => {
    expect(resolveCorsOrigin(undefined, 'test')).toBe(LOCALHOST_ORIGIN_REGEX);
  });

  it('should return undefined when FRONTEND_URL is unset in production', () => {
    expect(resolveCorsOrigin(undefined, 'production')).toBeUndefined();
  });

  it('should return undefined for empty FRONTEND_URL in production', () => {
    expect(resolveCorsOrigin('', 'production')).toBeUndefined();
  });
});

describe('LOCALHOST_ORIGIN_REGEX', () => {
  it.each([
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost',
  ])('should allow %s', (origin) => {
    expect(LOCALHOST_ORIGIN_REGEX.test(origin)).toBe(true);
  });

  it.each([
    'https://localhost:3000',
    'http://127.0.0.1:3000',
    'http://example.com',
    'http://localhost:3000/evil',
    'http://localhostx:3000',
  ])('should reject %s', (origin) => {
    expect(LOCALHOST_ORIGIN_REGEX.test(origin)).toBe(false);
  });
});

describe('CORS_METHODS', () => {
  it('should contain the expected HTTP methods', () => {
    expect(CORS_METHODS).toEqual([
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ]);
  });
});

describe('CORS_ALLOWED_HEADERS', () => {
  it('should contain Content-Type and Authorization', () => {
    expect(CORS_ALLOWED_HEADERS).toEqual(['Content-Type', 'Authorization']);
  });
});
