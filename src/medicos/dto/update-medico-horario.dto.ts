import { z } from 'zod';

const diasEntreSemana = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
] as const;
const diasFinSemana = ['sabado', 'domingo'] as const;

export const UpdateMedicoHorarioDto = z
  .object({
    diaSemana: z
      .enum([
        'domingo',
        'lunes',
        'martes',
        'miercoles',
        'jueves',
        'viernes',
        'sabado',
      ])
      .optional(),
    horaInicio: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    horaFin: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe proporcionar al menos un campo para actualizar',
  })
  .refine(
    (data) => {
      if (!data.horaInicio || !data.horaFin) return true;
      return data.horaFin > data.horaInicio;
    },
    {
      message: 'La hora de fin debe ser posterior a la de inicio',
      path: ['horaFin'],
    },
  )
  .refine(
    (data) => {
      if (!data.diaSemana || !data.horaInicio || !data.horaFin) return true;

      const inicio = parseInt(data.horaInicio.replace(':', ''));
      const fin = parseInt(data.horaFin.replace(':', ''));

      if (
        diasEntreSemana.includes(
          data.diaSemana as (typeof diasEntreSemana)[number],
        )
      ) {
        const franja1 = inicio >= 700 && fin <= 1400;
        const franja2 = inicio >= 1400 && fin <= 2100;
        return franja1 || franja2;
      }

      if (
        diasFinSemana.includes(data.diaSemana as (typeof diasFinSemana)[number])
      ) {
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

export type UpdateMedicoHorarioDto = z.infer<typeof UpdateMedicoHorarioDto>;
