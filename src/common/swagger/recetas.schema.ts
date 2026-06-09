export const recetaResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    diagnostico: { type: 'string' },
    observaciones: { type: 'string', nullable: true },
    fechaReceta: { type: 'string', format: 'date-time' },
    detalles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          medicamento: { type: 'string' },
          dosis: { type: 'string' },
          frecuencia: { type: 'string' },
          duracion: { type: 'string' },
          viaAdministracion: { type: 'string' },
          instrucciones: { type: 'string', nullable: true },
        },
      },
    },
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

export const recetasListSchema = {
  type: 'array',
  items: recetaResponseSchema,
};
