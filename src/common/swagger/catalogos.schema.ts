export const catalogoItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    nombre: { type: 'string' },
  },
};
