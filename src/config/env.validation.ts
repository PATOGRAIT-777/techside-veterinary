import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).default(12),
  RESEND_API_KEY: z.string().min(1),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  FRONTEND_CONFIRMATION_SUCCESS_URL: z.string().url().optional(),
  FRONTEND_CONFIRMATION_ERROR_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),
  BACKEND_BASE_URL: z.string().url().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;
