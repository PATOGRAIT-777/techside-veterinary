import { generateSecureToken } from './generate-token';

describe('generateSecureToken', () => {
  it('should return a 64-character hex string with default length', () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it('should return a 32-character hex string with length 16', () => {
    const token = generateSecureToken(16);
    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });
});
