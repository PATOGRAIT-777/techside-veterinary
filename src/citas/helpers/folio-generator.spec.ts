import { FolioGenerator } from './folio-generator';
import { PrismaService } from '../../prisma/prisma.service';

describe('FolioGenerator', () => {
  let generator: FolioGenerator;
  let mockPrisma: { pago: { findFirst: jest.Mock } };
  const FROZEN_DATE = new Date(2026, 5, 6, 12, 0, 0); // 2026-06-06 12:00 local

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FROZEN_DATE);
    mockPrisma = {
      pago: {
        findFirst: jest.fn(),
      },
    };
    generator = new FolioGenerator(mockPrisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(generator).toBeDefined();
  });

  it('should generate VET-YYYYMMDD-0001 for the first folio of the day', async () => {
    mockPrisma.pago.findFirst.mockResolvedValue(null);

    const folio = await generator.generate();

    expect(folio).toBe('VET-20260606-0001');
  });

  it('should generate sequential folios per day', async () => {
    mockPrisma.pago.findFirst.mockResolvedValue({
      folioPago: 'VET-20260606-0003',
    });

    const folio = await generator.generate();

    expect(folio).toBe('VET-20260606-0004');
  });

  it('should reset counter at midnight (different day)', async () => {
    mockPrisma.pago.findFirst.mockImplementation(
      (args: { where?: { folioPago?: { startsWith?: string } } }) => {
        const prefix = args?.where?.folioPago?.startsWith;
        if (prefix?.includes('20260606')) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ folioPago: 'VET-20260605-0007' });
      },
    );

    const folio = await generator.generate();

    expect(folio).toBe('VET-20260606-0001');
  });

  it('should retry on unique constraint collision (P2002)', async () => {
    let callCount = 0;
    mockPrisma.pago.findFirst.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        folioPago: `VET-20260606-${String(callCount).padStart(4, '0')}`,
      });
    });

    const mockTx = {
      pago: {
        create: jest
          .fn()
          .mockRejectedValueOnce({
            code: 'P2002',
            meta: { target: ['folio_pago'] },
          })
          .mockResolvedValueOnce({ id: 'pago-1' }),
      },
    };

    const result = await generator.generateWithRetry(mockTx);
    expect(result).toMatch(/^VET-\d{8}-\d{4}$/);
    expect(mockTx.pago.create).toHaveBeenCalledTimes(2);
  });
});
