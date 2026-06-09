export const mascotaResponseSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    },
    propietarioId: {
      type: 'string',
      format: 'uuid',
      example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    },
    nombre: { type: 'string', example: 'Luna' },
    raza: {
      type: 'object',
      nullable: true,
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        nombre: { type: 'string', example: 'Golden Retriever' },
      },
    },
    color: {
      type: 'object',
      nullable: true,
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        nombre: { type: 'string', example: 'Negro' },
      },
    },
    tipoPelo: {
      type: 'object',
      nullable: true,
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        nombre: { type: 'string', example: 'Largo' },
      },
    },
    patronPelo: {
      type: 'object',
      nullable: true,
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        nombre: { type: 'string', example: 'Manchado' },
      },
    },
    comportamiento: {
      type: 'object',
      nullable: true,
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        nombre: { type: 'string', example: 'Tranquilo' },
      },
    },
    fechaNacimiento: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2020-05-15T00:00:00.000Z',
    },
    sexo: { type: 'string', nullable: true, example: 'Hembra' },
    peso: {
      type: 'string',
      nullable: true,
      example: '12.500',
      description:
        'Serialized as string because Prisma Decimal is returned as a string in JSON responses.',
    },
    esterilizado: { type: 'boolean', example: true },
    ruac: { type: 'string', nullable: true, example: 'RUAC-12345' },
    microchip: {
      type: 'string',
      nullable: true,
      example: '985112345678901',
    },
    tatuaje: { type: 'string', nullable: true, example: 'TAT-001' },
    fotoPerfil: {
      type: 'object',
      nullable: true,
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          example: 'cccccccc-dddd-eeee-ffff-000000000000',
        },
        url: {
          type: 'string',
          example: '/uploads/foto-perfil-123.jpg',
        },
      },
    },
    carnetVacunacion: {
      type: 'object',
      nullable: true,
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          example: 'dddddddd-eeee-ffff-0000-111111111111',
        },
        url: {
          type: 'string',
          example: '/uploads/carnet-vacunacion-456.pdf',
        },
      },
    },
    observaciones: {
      type: 'string',
      nullable: true,
      example: 'Alergia a penicilina',
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      example: '2024-01-01T00:00:00.000Z',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      example: '2024-01-01T00:00:00.000Z',
    },
    alergias: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          mascotaId: {
            type: 'string',
            format: 'uuid',
            example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          },
          alergia: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: 'eeeeeeee-ffff-0000-1111-222222222222',
              },
              nombre: { type: 'string', example: 'Penicilina' },
            },
          },
          notas: {
            type: 'string',
            nullable: true,
            example: 'Reacción leve',
          },
        },
      },
    },
  },
} as const;
