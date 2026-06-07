import { FolioGenerator } from './folio-generator';
import { PrismaService } from '../../prisma/prisma.service';

describe('FolioGenerator', () => {
  let generator: FolioGenerator;
  let mockPrisma: { pago: { findFirst: jest.Mock } };

  beforeEach(() => {
    mockPrisma = {
      pago: {
        findFirst: jest.fn(),
      },
    };
    generator = new FolioGenerator(mockPrisma as unknown as PrismaService);
  });

  it('should be defined', () => {
    expect(generator).toBeDefined();
  });

  it('should generate VET-YYYYMMDD-0001 for the first folio of the day', async () => {
    mockPrisma.pago.findFirst.mockResolvedValue(null);

    const folio = await generator.generate();

    const today = new Date();
    const prefix = `VET-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    expect(folio).toBe(`${prefix}-0001`);
  });

  it('should generate sequential folios per day', async () => {
    mockPrisma.pago.findFirst.mockResolvedValue({
      folioPago: 'VET-20260606-0003',
    });

    const folio = await generator.generate();

    expect(folio).toBe('VET-20260606-0004');
  });

  it('should reset counter at midnight (different day)', async () => {
    // Mock that respects the startsWith filter using local date like the implementation
    mockPrisma.pago.findFirst.mockImplementation(
      (args: { where?: { folioPago?: { startsWith?: string } } }) => {
        const prefix = args?.where?.folioPago?.startsWith;
        const today = new Date();
        const todayPrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        if (prefix?.includes(todayPrefix)) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ folioPago: 'VET-20260605-0007' });
      },
    );

    const folio = await generator.generate();

    const today = new Date();
    const prefix = `VET-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    expect(folio).toBe(`${prefix}-0001`);
  });

  it('should retry on unique constraint collision (P2002)', async () => {
    let callCount = 0;
    mockPrisma.pago.findFirst.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        folioPago: `VET-20260606-${String(callCount).padStart(4, '0')}`,
      });
    });

    // Mock a collision on first attempt, success on second
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
