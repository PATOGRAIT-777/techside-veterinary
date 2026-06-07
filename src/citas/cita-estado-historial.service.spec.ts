import { Test, TestingModule } from '@nestjs/testing';
import { CitaEstadoHistorialService } from './cita-estado-historial.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CitaEstadoHistorialService', () => {
  let service: CitaEstadoHistorialService;
  const mockPrisma = {
    citaEstadoHistorial: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitaEstadoHistorialService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CitaEstadoHistorialService>(
      CitaEstadoHistorialService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should write audit row for cita creation', async () => {
    await service.registrarCambio(
      'cita-1',
      null,
      'pendiente_de_pago',
      'user-1',
      null,
    );

    expect(mockPrisma.citaEstadoHistorial.create).toHaveBeenCalledWith({
      data: {
        citaId: 'cita-1',
        estadoAnterior: null,
        estadoNuevo: 'pendiente_de_pago',
        usuarioId: 'user-1',
        razon: null,
      },
    });
  });

  it('should write audit row with reason for cron transition', async () => {
    await service.registrarCambio(
      'cita-1',
      'pendiente_de_pago',
      'cancelada',
      null,
      'Pago no recibido antes del plazo',
    );

    expect(mockPrisma.citaEstadoHistorial.create).toHaveBeenCalledWith({
      data: {
        citaId: 'cita-1',
        estadoAnterior: 'pendiente_de_pago',
        estadoNuevo: 'cancelada',
        usuarioId: null,
        razon: 'Pago no recibido antes del plazo',
      },
    });
  });

  it('should write audit row for payment transition', async () => {
    await service.registrarCambio(
      'cita-1',
      'pendiente_de_pago',
      'pendiente',
      'user-1',
      null,
    );

    expect(mockPrisma.citaEstadoHistorial.create).toHaveBeenCalledWith({
      data: {
        citaId: 'cita-1',
        estadoAnterior: 'pendiente_de_pago',
        estadoNuevo: 'pendiente',
        usuarioId: 'user-1',
        razon: null,
      },
    });
  });
});
