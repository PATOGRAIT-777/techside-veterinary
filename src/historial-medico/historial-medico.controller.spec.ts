import { Test, TestingModule } from '@nestjs/testing';
import { HistorialMedicoController } from './historial-medico.controller';
import { HistorialMedicoService } from './historial-medico.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { EstadoCita, EstadoPago, Rol } from '@prisma/client';

describe('HistorialMedicoController', () => {
  let controller: HistorialMedicoController;

  const mockService = {
    getResumen: jest.fn(),
    getCitasProximas: jest.fn(),
    getCitasPasadas: jest.fn(),
    getCitaDetalle: jest.fn(),
    getPesoHistorial: jest.fn(),
    generatePdf: jest.fn(),
  };

  const mockJwtGuard = { canActivate: jest.fn(() => true) };

  const cliente = { sub: 'u1', email: 'cliente@test.com', rol: Rol.cliente };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistorialMedicoController],
      providers: [{ provide: HistorialMedicoService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    controller = module.get<HistorialMedicoController>(
      HistorialMedicoController,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /mascotas/:mascotaId/historial', () => {
    it('debe llamar a getResumen con los parámetros correctos', async () => {
      const resumenMock = {
        mascota: { id: 'm1', nombre: 'Firulais' },
        agregados: {},
        proximasCitas: [],
        ultimasCitas: [],
        pesoActual: null,
        pesoHistorial: [],
      };
      mockService.getResumen.mockResolvedValue(resumenMock);

      const result = await controller.getResumen('m1', cliente);

      expect(mockService.getResumen).toHaveBeenCalledWith('m1', cliente);
      expect(result.mascota.nombre).toBe('Firulais');
    });
  });

  describe('GET /mascotas/:mascotaId/historial/citas-proximas', () => {
    it('debe llamar a getCitasProximas', async () => {
      mockService.getCitasProximas.mockResolvedValue({
        data: [
          {
            id: 'c1',
            estado: EstadoCita.pendiente,
            especialidad: 'General',
            medico: 'Dr. Test',
            fecha: new Date(),
            horaInicio: '10:00',
            estadoPago: EstadoPago.pendiente,
          },
        ],
      });

      const result = await controller.getCitasProximas('m1', cliente);

      expect(mockService.getCitasProximas).toHaveBeenCalledWith('m1', cliente);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('GET /mascotas/:mascotaId/historial/citas-pasadas', () => {
    it('debe parsear query y llamar a getCitasPasadas', async () => {
      mockService.getCitasPasadas.mockResolvedValue({
        data: [],
        meta: { nextCursor: null, limit: 20, hasMore: false },
      });

      const result = await controller.getCitasPasadas(
        'm1',
        { limit: '10' },
        cliente,
      );

      expect(mockService.getCitasPasadas).toHaveBeenCalledWith(
        'm1',
        cliente,
        undefined,
        10,
      );
      expect(result.meta.limit).toBe(20);
    });
  });

  describe('GET /mascotas/:mascotaId/historial/citas/:citaId', () => {
    it('debe llamar a getCitaDetalle', async () => {
      mockService.getCitaDetalle.mockResolvedValue({
        id: 'c1',
        estado: EstadoCita.completada,
        especialidad: 'General',
        medico: 'Dr. Test',
        fecha: new Date(),
        horaInicio: '10:00',
        horaFin: '11:00',
        sucursal: 'Sucursal',
        motivo: null,
        receta: null,
        consulta: null,
        pago: null,
      });

      const result = await controller.getCitaDetalle('m1', 'c1', cliente);

      expect(mockService.getCitaDetalle).toHaveBeenCalledWith(
        'm1',
        'c1',
        cliente,
      );
      expect(result.id).toBe('c1');
    });
  });

  describe('GET /mascotas/:mascotaId/historial/peso', () => {
    it('debe llamar a getPesoHistorial', async () => {
      mockService.getPesoHistorial.mockResolvedValue({
        data: [{ fecha: new Date(), peso: 25.5 }],
      });

      const result = await controller.getPesoHistorial('m1', cliente);

      expect(mockService.getPesoHistorial).toHaveBeenCalledWith('m1', cliente);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('GET /mascotas/:mascotaId/historial/pdf', () => {
    it('debe devolver un PDF con headers correctos', async () => {
      const fakeBuffer = Buffer.from('fake-pdf-data');
      mockService.generatePdf.mockResolvedValue(fakeBuffer);

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as import('express').Response;

      await controller.getPdf('m1', cliente, res);

      expect(mockService.generatePdf).toHaveBeenCalledWith('m1', cliente);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename='),
      );
      expect(res.send).toHaveBeenCalledWith(fakeBuffer);
    });
  });
});
