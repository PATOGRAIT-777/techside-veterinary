import { z } from 'zod';
import { normalizePhone } from '../../common/utils/normalize-phone';

export const registerSchema = z.object({
  email: z
    .string()
    .email('El correo electrónico no es válido')
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña no puede exceder 100 caracteres'),
  rol: z.enum(['cliente', 'medico', 'admin']),
  nombreCompleto: z
    .string()
    .min(1, 'El nombre completo es obligatorio')
    .max(200, 'El nombre no puede exceder 200 caracteres'),
  telefono: z
    .string()
    .min(1, 'El teléfono es obligatorio')
    .transform((val) => normalizePhone(val)),
  telefonoSecundario: z
    .string()
    .optional()
    .transform((val) => (val ? normalizePhone(val) : undefined)),
  calle: z
    .string()
    .min(1, 'La calle es obligatoria')
    .max(200, 'La calle no puede exceder 200 caracteres'),
  numExterior: z.string().max(20).optional(),
  numInterior: z.string().max(20).optional(),
  sucursalId: z.coerce
    .number()
    .int('La sucursal debe ser un número entero')
    .positive('La sucursal debe ser mayor a cero'),
});

export type RegisterDto = z.infer<typeof registerSchema>;
