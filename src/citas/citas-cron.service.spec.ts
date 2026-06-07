import { Test, TestingModule } from '@nestjs/testing';
import { CitasCronService, computePaymentDeadline } from './citas-cron.service';
import { PrismaService } from '../prisma/prisma.service';
import { CitaEstadoHistorialService } from './cita-estado-historial.service';
import { EstadoCita, EstadoPago } from '@prisma/client';

describe('CitasCronService', () => {
  let service: CitasCronService;

  const mockPrisma = {
    cita: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    pago: {
      update: jest.fn(),
    },
  };

  const mockHistorial = {
    registrarCambio: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitasCronService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CitaEstadoHistorialService, useValue: mockHistorial },
      ],
    }).compile();

    service = module.get<CitasCronService>(CitasCronService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handlePendingToEnCurso', () => {
    it('should transition pendiente citas to en_curso when horaInicio reached', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-10T09:05:00Z'));

      mockPrisma.cita.findMany.mockResolvedValue([
        {
          id: 'c1',
          estado: EstadoCita.pendiente,
          fecha: new Date('2026-06-10'),
          horaInicio: new Date(Date.UTC(1970, 0, 1, 9, 0)),
        },
      ]);
      mockPrisma.cita.update.mockResolvedValue({
        id: 'c1',
        estado: EstadoCita.en_curso,
      });

      await service.handlePendingToEnCurso();

      expect(mockPrisma.cita.update).toHaveBeenCalledWith({
        where: { id: 'c1', estado: EstadoCita.pendiente },
        data: { estado: EstadoCita.en_curso },
      });
      expect(mockHistorial.registrarCambio).toHaveBeenCalledWith(
        'c1',
        EstadoCita.pendiente,
        EstadoCita.en_curso,
        null,
        null,
      );

      jest.useRealTimers();
    });

    it('should skip if no citas match', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-10T09:05:00Z'));

      mockPrisma.cita.findMany.mockResolvedValue([]);

      await service.handlePendingToEnCurso();

      expect(mockPrisma.cita.update).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('handleAutoCancelUnpaid', () => {
    it('should cancel unpaid citas past deadline', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-03T11:00:00Z'));

      const createdAt = new Date('2026-06-01T10:00:00Z');
      const fecha = new Date('2026-06-10');
      const horaInicio = new Date(Date.UTC(1970, 0, 1, 9, 0));

      mockPrisma.cita.findMany.mockResolvedValue([
        {
          id: 'c1',
          estado: EstadoCita.pendiente_de_pago,
          createdAt,
          fecha,
          horaInicio,
          pago: { estado: EstadoPago.pendiente },
        },
      ]);
      mockPrisma.cita.update.mockResolvedValue({
        id: 'c1',
        estado: EstadoCita.cancelada,
      });

      await service.handleAutoCancelUnpaid();

      expect(mockPrisma.cita.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { estado: EstadoCita.cancelada },
      });
      expect(mockPrisma.pago.update).toHaveBeenCalledWith({
        where: { citaId: 'c1' },
        data: { estado: EstadoPago.cancelada },
      });
      expect(mockHistorial.registrarCambio).toHaveBeenCalledWith(
        'c1',
        EstadoCita.pendiente_de_pago,
        EstadoCita.cancelada,
        null,
        'Pago no recibido antes del plazo',
      );

      jest.useRealTimers();
    });

    it('should skip citas before deadline', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-02T10:00:00Z'));

      const createdAt = new Date('2026-06-01T10:00:00Z');
      const fecha = new Date('2026-06-10');
      const horaInicio = new Date(Date.UTC(1970, 0, 1, 9, 0));

      mockPrisma.cita.findMany.mockResolvedValue([
        {
          id: 'c1',
          estado: EstadoCita.pendiente_de_pago,
          createdAt,
          fecha,
          horaInicio,
          pago: { estado: EstadoPago.pendiente },
        },
      ]);

      await service.handleAutoCancelUnpaid();

      expect(mockPrisma.cita.update).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('computePaymentDeadline', () => {
    it('should return createdAt + 48h when appointment is far', () => {
      const createdAt = new Date('2026-06-01T10:00:00Z');
      const fecha = new Date('2026-06-20');
      const horaInicio = new Date(Date.UTC(1970, 0, 1, 10, 0));

      const result = computePaymentDeadline(createdAt, fecha, horaInicio);

      expect(result).toEqual(new Date('2026-06-03T10:00:00Z'));
    });

    it('should return fechaHoraInicio - 24h when appointment is within 72h', () => {
      const createdAt = new Date('2026-06-01T10:00:00Z');
      const fecha = new Date('2026-06-02');
      const horaInicio = new Date(Date.UTC(1970, 0, 1, 10, 0));

      const result = computePaymentDeadline(createdAt, fecha, horaInicio);

      expect(result).toEqual(new Date('2026-06-01T10:00:00Z'));
    });

    it('should handle boundary: exactly 48h vs exactly 24h before', () => {
      const createdAt = new Date('2026-06-01T10:00:00Z');
      const fecha = new Date('2026-06-03');
      const horaInicio = new Date(Date.UTC(1970, 0, 1, 10, 0));

      const result = computePaymentDeadline(createdAt, fecha, horaInicio);

      // createdAt + 48h = 2026-06-03T10:00:00Z
      // fechaHoraInicio - 24h = 2026-06-02T10:00:00Z
      // min = 2026-06-02T10:00:00Z
      expect(result).toEqual(new Date('2026-06-02T10:00:00Z'));
    });
  });
});
