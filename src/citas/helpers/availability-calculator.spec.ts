import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityCalculator } from './availability-calculator';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoCita } from '@prisma/client';

const mockPrisma = {
  medicoHorario: {
    findMany: jest.fn(),
  },
  cita: {
    findMany: jest.fn(),
  },
};

describe('AvailabilityCalculator', () => {
  let calculator: AvailabilityCalculator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityCalculator,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    calculator = module.get<AvailabilityCalculator>(AvailabilityCalculator);
    jest.clearAllMocks();
  });

  describe('computeDays', () => {
    it('should return only days with configured schedule', async () => {
      // Given: doctor works Mon and Wed
      mockPrisma.medicoHorario.findMany.mockResolvedValue([
        {
          medicoId: 'med-1',
          diaSemana: 'lunes',
          horaInicio: new Date('1970-01-01T09:00:00Z'),
          horaFin: new Date('1970-01-01T12:00:00Z'),
          consultorioId: 'cons-1',
        },
        {
          medicoId: 'med-1',
          diaSemana: 'miercoles',
          horaInicio: new Date('1970-01-01T09:00:00Z'),
          horaFin: new Date('1970-01-01T12:00:00Z'),
          consultorioId: 'cons-1',
        },
      ]);
      mockPrisma.cita.findMany.mockResolvedValue([]);

      // When: query from Tue Jun 2 to Mon Jun 8, 2026
      const desde = new Date('2026-06-02');
      const hasta = new Date('2026-06-08');
      const result = await calculator.computeDays('med-1', desde, hasta);

      // Then: only Wed Jun 3 and Mon Jun 8 (both have schedules)
      // Note: Jun 2 is Tue (no schedule), Jun 3 is Wed, Jun 4-7 no schedule, Jun 8 is Mon
      const fechas = result.map((r) => r.fecha);
      expect(fechas).toContain('2026-06-03');
      expect(fechas).toContain('2026-06-08');
      expect(fechas).not.toContain('2026-06-02');
      expect(fechas).not.toContain('2026-06-04');
      expect(result.every((r) => r.disponible === true)).toBe(true);
    });

    it('should mark fully-booked day as disponible: false', async () => {
      mockPrisma.medicoHorario.findMany.mockResolvedValue([
        {
          medicoId: 'med-1',
          diaSemana: 'lunes',
          horaInicio: new Date('1970-01-01T09:00:00Z'),
          horaFin: new Date('1970-01-01T12:00:00Z'),
          consultorioId: 'cons-1',
        },
      ]);
      // All 3 slots (9-10, 10-11, 11-12) are occupied
      mockPrisma.cita.findMany.mockResolvedValue([
        {
          id: 'c1',
          medicoId: 'med-1',
          fecha: new Date('2026-06-08'),
          horaInicio: new Date('1970-01-01T09:00:00Z'),
          horaFin: new Date('1970-01-01T10:00:00Z'),
          estado: EstadoCita.pendiente,
        },
        {
          id: 'c2',
          medicoId: 'med-1',
          fecha: new Date('2026-06-08'),
          horaInicio: new Date('1970-01-01T10:00:00Z'),
          horaFin: new Date('1970-01-01T11:00:00Z'),
          estado: EstadoCita.pendiente,
        },
        {
          id: 'c3',
          medicoId: 'med-1',
          fecha: new Date('2026-06-08'),
          horaInicio: new Date('1970-01-01T11:00:00Z'),
          horaFin: new Date('1970-01-01T12:00:00Z'),
          estado: EstadoCita.pendiente,
        },
      ]);

      const result = await calculator.computeDays(
        'med-1',
        new Date('2026-06-08'),
        new Date('2026-06-08'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].fecha).toBe('2026-06-08');
      expect(result[0].disponible).toBe(false);
    });
  });

  describe('computeSlots', () => {
    it('should return slots with correct availability', async () => {
      mockPrisma.medicoHorario.findMany.mockResolvedValue([
        {
          medicoId: 'med-1',
          diaSemana: 'lunes',
          horaInicio: new Date('1970-01-01T09:00:00Z'),
          horaFin: new Date('1970-01-01T12:00:00Z'),
          consultorioId: 'cons-1',
        },
      ]);
      // One cita from 10:00 to 11:00
      mockPrisma.cita.findMany.mockResolvedValue([
        {
          id: 'c1',
          medicoId: 'med-1',
          fecha: new Date('2026-06-08'),
          horaInicio: new Date('1970-01-01T10:00:00Z'),
          horaFin: new Date('1970-01-01T11:00:00Z'),
          estado: EstadoCita.pendiente,
        },
      ]);

      const result = await calculator.computeSlots(
        'med-1',
        new Date('2026-06-08'),
      );

      expect(result.slots).toHaveLength(3);
      expect(result.slots[0]).toEqual({
        horaInicio: '09:00',
        horaFin: '10:00',
        disponible: true,
      });
      expect(result.slots[1]).toEqual({
        horaInicio: '10:00',
        horaFin: '11:00',
        disponible: false,
      });
      expect(result.slots[2]).toEqual({
        horaInicio: '11:00',
        horaFin: '12:00',
        disponible: true,
      });
    });

    it('should mark slot unavailable if consultorio is occupied by another doctor', async () => {
      mockPrisma.medicoHorario.findMany.mockResolvedValue([
        {
          medicoId: 'med-1',
          diaSemana: 'lunes',
          horaInicio: new Date('1970-01-01T09:00:00Z'),
          horaFin: new Date('1970-01-01T12:00:00Z'),
          consultorioId: 'cons-1',
        },
      ]);
      // medico-2 uses same consultorio and has a cita
      mockPrisma.cita.findMany.mockResolvedValue([
        {
          id: 'c1',
          medicoId: 'med-2',
          fecha: new Date('2026-06-08'),
          horaInicio: new Date('1970-01-01T09:00:00Z'),
          horaFin: new Date('1970-01-01T10:00:00Z'),
          estado: EstadoCita.pendiente,
        },
      ]);

      const result = await calculator.computeSlots(
        'med-1',
        new Date('2026-06-08'),
      );

      expect(result.slots[0].disponible).toBe(false);
      expect(result.slots[1].disponible).toBe(true);
      expect(result.slots[2].disponible).toBe(true);
    });

    it('should return empty slots when doctor has no schedule', async () => {
      mockPrisma.medicoHorario.findMany.mockResolvedValue([]);

      const result = await calculator.computeSlots(
        'med-1',
        new Date('2026-06-09'),
      ); // Tuesday

      expect(result.slots).toEqual([]);
    });
  });
});
