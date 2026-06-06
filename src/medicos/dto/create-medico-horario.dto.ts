import { z } from 'zod';

const diasEntreSemana = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
] as const;
const diasFinSemana = ['sabado', 'domingo'] as const;

export const CreateMedicoHorarioDto = z
  .object({
    diaSemana: z.enum([
      'domingo',
      'lunes',
      'martes',
      'miercoles',
      'jueves',
      'viernes',
      'sabado',
    ]),
    horaInicio: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Formato HH:MM' }),
    horaFin: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Formato HH:MM' }),
    consultorioId: z
      .string()
      .uuid({ message: 'El consultorio es obligatorio' }),
  })
  .refine((data) => data.horaFin > data.horaInicio, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['horaFin'],
  })
  .refine(
    (data) => {
      const inicio = parseInt(data.horaInicio.replace(':', ''));
      const fin = parseInt(data.horaFin.replace(':', ''));

      if (
        diasEntreSemana.includes(
          data.diaSemana as (typeof diasEntreSemana)[number],
        )
      ) {
        // Entre semana: 07:00-14:00 o 14:00-21:00
        const franja1 = inicio >= 700 && fin <= 1400;
        const franja2 = inicio >= 1400 && fin <= 2100;
        return franja1 || franja2;
      }

      if (
        diasFinSemana.includes(data.diaSemana as (typeof diasFinSemana)[number])
      ) {
        // Fin de semana: 07:00-23:00
        return inicio >= 700 && fin <= 2300;
      }

      return true;
    },
    {
      message:
        'Franja no válida. Entre semana: 07:00-14:00 o 14:00-21:00. Fin de semana: 07:00-23:00',
      path: ['horaInicio'],
    },
  );

export type CreateMedicoHorarioDto = z.infer<typeof CreateMedicoHorarioDto>;
