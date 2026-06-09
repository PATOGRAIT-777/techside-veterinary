export const citaResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    fecha: { type: 'string', format: 'date' },
    horaInicio: { type: 'string', format: 'time' },
    horaFin: { type: 'string', format: 'time' },
    estado: {
      type: 'string',
      enum: [
        'pendiente_de_pago',
        'pendiente',
        'en_curso',
        'completada',
        'inasistencia',
        'cancelada',
      ],
    },
    motivo: { type: 'string', nullable: true },
    sucursal: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        nombre: { type: 'string' },
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
    servicio: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        nombre: { type: 'string' },
      },
    },
    pago: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid' },
        folioPago: { type: 'string' },
        cantidad: {
          type: 'string',
          description:
            'Serialized as string because Prisma Decimal is returned as a string in JSON responses.',
        },
        estado: {
          type: 'string',
          enum: ['pendiente', 'pagada', 'cancelada'],
        },
        fechaPago: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    receta: {
      type: 'object',
      nullable: true,
      properties: { id: { type: 'string', format: 'uuid' } },
    },
    consulta: {
      type: 'object',
      nullable: true,
      properties: { id: { type: 'string', format: 'uuid' } },
    },
  },
};

export const citasListSchema = {
  type: 'array',
  items: citaResponseSchema,
};
