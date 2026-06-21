import { EstadoPago } from '@prisma/client';
import {
  buscarPagosQuerySchema,
  DEFAULT_PAGE_LIMIT,
  DEFAULT_OFFSET,
  MAX_PAGE_LIMIT,
} from './buscar-pagos-query.dto';

describe('buscarPagosQuerySchema', () => {
  it('should accept empty query and apply defaults', () => {
    const result = buscarPagosQuerySchema.parse({});

    expect(result.estado).toBeUndefined();
    expect(result.limit).toBe(DEFAULT_PAGE_LIMIT);
    expect(result.offset).toBe(DEFAULT_OFFSET);
  });

  it('should parse estado', () => {
    const result = buscarPagosQuerySchema.parse({ estado: EstadoPago.pagada });

    expect(result.estado).toBe(EstadoPago.pagada);
  });

  it('should reject invalid estado', () => {
    expect(() =>
      buscarPagosQuerySchema.parse({ estado: 'invalido' }),
    ).toThrow();
  });

  it('should parse valid limit and offset strings', () => {
    const result = buscarPagosQuerySchema.parse({ limit: '10', offset: '5' });

    expect(result.limit).toBe(10);
    expect(result.offset).toBe(5);
  });

  it('should clamp limit above maximum', () => {
    const result = buscarPagosQuerySchema.parse({ limit: '999' });

    expect(result.limit).toBe(MAX_PAGE_LIMIT);
  });

  it('should clamp limit below minimum to 1', () => {
    const result = buscarPagosQuerySchema.parse({ limit: '0' });

    expect(result.limit).toBe(1);
  });

  it('should clamp negative limit to 1', () => {
    const result = buscarPagosQuerySchema.parse({ limit: '-5' });

    expect(result.limit).toBe(1);
  });

  it('should reject non-numeric limit', () => {
    expect(() => buscarPagosQuerySchema.parse({ limit: 'abc' })).toThrow();
  });

  it('should reject decimal limit', () => {
    expect(() => buscarPagosQuerySchema.parse({ limit: '10.5' })).toThrow();
  });

  it('should reject negative offset', () => {
    expect(() => buscarPagosQuerySchema.parse({ offset: '-5' })).toThrow();
  });

  it('should reject non-numeric offset', () => {
    expect(() => buscarPagosQuerySchema.parse({ offset: 'abc' })).toThrow();
  });

  it('should reject decimal offset', () => {
    expect(() => buscarPagosQuerySchema.parse({ offset: '5.5' })).toThrow();
  });
});
