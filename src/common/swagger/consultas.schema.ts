export const consultaResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    peso: {
      type: 'string',
      nullable: true,
      description:
        'Serialized as string because Prisma Decimal is returned as a string in JSON responses.',
    },
    temperatura: {
      type: 'string',
      nullable: true,
      description:
        'Serialized as string because Prisma Decimal is returned as a string in JSON responses.',
    },
    frecuenciaCardiaca: { type: 'integer', nullable: true },
    frecuenciaRespiratoria: { type: 'integer', nullable: true },
    presionArterial: { type: 'string', nullable: true },
    estadoGeneral: { type: 'string', nullable: true },
    notasEvolucion: { type: 'string', nullable: true },
    cita: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        fecha: { type: 'string', format: 'date' },
        horaInicio: { type: 'string', format: 'time' },
        horaFin: { type: 'string', format: 'time' },
        mascota: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nombre: { type: 'string' },
            raza: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' },
              },
            },
            color: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' },
              },
            },
            tipoPelo: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' },
              },
            },
            patronPelo: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' },
              },
            },
            comportamiento: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' },
              },
            },
            fotoPerfil: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                url: { type: 'string' },
              },
            },
            carnetVacunacion: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                url: { type: 'string' },
              },
            },
          },
        },
        medico: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nombreCompleto: { type: 'string' },
            especialidad: { type: 'string' },
          },
        },
        sucursal: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nombre: { type: 'string' },
          },
        },
      },
    },
  },
};

export const consultasListSchema = {
  type: 'array',
  items: consultaResponseSchema,
};
