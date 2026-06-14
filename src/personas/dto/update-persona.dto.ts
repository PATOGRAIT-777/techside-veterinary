import { z } from 'zod';

export const UpdatePersonaDto = z
  .object({
    nombreCompleto: z
      .string()
      .min(1, 'El nombre completo no puede estar vacío')
      .max(200, 'El nombre completo no puede exceder 200 caracteres')
      .optional(),
    telefonoSecundario: z
      .string()
      .max(15, 'El teléfono secundario no puede exceder 15 caracteres')
      .nullable()
      .optional(),
    calle: z
      .string()
      .min(1, 'La calle no puede estar vacía')
      .max(200, 'La calle no puede exceder 200 caracteres')
      .optional(),
    numExterior: z
      .string()
      .max(20, 'El número exterior no puede exceder 20 caracteres')
      .nullable()
      .optional(),
    numInterior: z
      .string()
      .max(20, 'El número interior no puede exceder 20 caracteres')
      .nullable()
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe proporcionar al menos un campo para actualizar',
  });

export type UpdatePersonaDto = z.infer<typeof UpdatePersonaDto>;
