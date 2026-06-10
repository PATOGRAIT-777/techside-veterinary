import { resendConfirmationSchema } from './resend-confirmation.dto';

describe('resendConfirmationSchema', () => {
  it('should transform email to lowercase', () => {
    const result = resendConfirmationSchema.safeParse({
      email: 'TEST@EXAMPLE.COM',
    });
    expect(result.success).toBe(true);
    expect(result.data!.email).toBe('test@example.com');
  });

  it('should fail for invalid email', () => {
    const result = resendConfirmationSchema.safeParse({
      email: 'bad',
    });
    expect(result.success).toBe(false);
  });

  it('should fail for missing email', () => {
    const result = resendConfirmationSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
