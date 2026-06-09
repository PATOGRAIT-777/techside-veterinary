import { z } from 'zod';

export const resendConfirmationSchema = z.object({
  email: z
    .string()
    .email('El correo electrónico no es válido')
    .transform((val) => val.toLowerCase()),
});

export type ResendConfirmationDto = z.infer<typeof resendConfirmationSchema>;
