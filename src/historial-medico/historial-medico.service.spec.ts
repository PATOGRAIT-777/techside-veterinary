import { Test, TestingModule } from '@nestjs/testing';
import { HistorialMedicoService } from './historial-medico.service';
import { PrismaService } from '../prisma/prisma.service';
import { PdfGeneratorService } from './pdf/pdf-generator.service';
import { EstadoCita, EstadoPago, Rol } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('HistorialMedicoService', () => {
  let service: HistorialMedicoService;

  const mockPrisma = {
    mascota: {
      findUnique: jest.fn(),
    },
    cita: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    consulta: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    medico: {
      findFirst: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
  };

  const cliente = { sub: 'u1', email: 'cliente@test.com', rol: Rol.cliente };
  const medico = { sub: 'u2', email: 'medico@test.com', rol: Rol.medico };
  const admin = { sub: 'u3', email: 'admin@test.com', rol: Rol.admin };

  const mockPdfGenerator = {
    generateHistorialPdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistorialMedicoService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PdfGeneratorService, useValue: mockPdfGenerator },
      ],
    }).compile();

    service = module.get<HistorialMedicoService>(HistorialMedicoService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validarAcceso', () => {
    it('cliente propietario → OK', async () => {
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'm1',
        propietarioId: 'u1',
      });
      const result = await service.validarAcceso('m1', cliente);
      expect(result.tieneRelacion).toBe(true);
    });

    it('cliente ajeno → 403', async () => {
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'm1',
        propietarioId: 'u2',
      });
      await expect(service.validarAcceso('m1', cliente)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('médico con cita → OK', async () => {
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'm1',
        propietarioId: 'u1',
      });
      mockPrisma.medico.findFirst.mockResolvedValue({ id: 'med1' });
      mockPrisma.cita.count.mockResolvedValue(1);
      const result = await service.validarAcceso('m1', medico);
      expect(result.tieneRelacion).toBe(true);
    });

    it('médico sin cita → 403', async () => {
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'm1',
        propietarioId: 'u1',
      });
      mockPrisma.medico.findFirst.mockResolvedValue({ id: 'med1' });
      mockPrisma.cita.count.mockResolvedValue(0);
      await expect(service.validarAcceso('m1', medico)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('admin → OK', async () => {
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'm1',
        propietarioId: 'u1',
      });
      const result = await service.validarAcceso('m1', admin);
      expect(result.tieneRelacion).toBe(true);
    });

    it('mascota no existe → 404', async () => {
      mockPrisma.mascota.findUnique.mockResolvedValue(null);
      await expect(service.validarAcceso('m1', cliente)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getResumen', () => {
    const mascotaCompleta = {
      id: 'm1',
      nombre: 'Firulais',
      propietarioId: 'u1',
      raza: { nombre: 'Labrador' },
      color: { nombre: 'Dorado' },
      fechaNacimiento: new Date('2020-01-01'),
      sexo: 'Macho',
      esterilizado: true,
      ruac: 'RUAC-001',
      microchip: 'CHIP-001',
      fotoPerfil: { url: 'http://foto.jpg' },
      carnetVacunacion: { url: 'http://carnet.jpg' },
      observaciones: 'Muy tranquilo',
      alergias: [{ alergia: { nombre: 'Penicilina' }, notas: 'Leve' }],
      comportamiento: { nombre: 'Tranquilo', requiereBozal: false },
      propietario: {
        email: 'cliente@test.com',
        persona: { nombreCompleto: 'Juan Pérez', telefono: '5551234567' },
      },
    };

    beforeEach(() => {
      mockPrisma.mascota.findUnique.mockResolvedValue(mascotaCompleta);
      mockPrisma.consulta.aggregate.mockResolvedValue({
        _avg: { frecuenciaCardiaca: 120 },
      });
      mockPrisma.cita.findFirst
        .mockResolvedValueOnce({ fecha: new Date('2024-06-15') }) // ultimaVisita
        .mockResolvedValueOnce({ fecha: new Date('2024-07-01') }); // proximaVisita
      mockPrisma.consulta.findFirst.mockResolvedValue({
        peso: 25.5,
      });
      mockPrisma.consulta.findMany.mockResolvedValue([
        { cita: { fecha: new Date('2024-06-01') }, peso: 25.0 },
        { cita: { fecha: new Date('2024-06-15') }, peso: 25.5 },
      ]);
      mockPrisma.cita.findMany.mockResolvedValue([]);
    });

    it('cliente ve su mascota correctamente', async () => {
      const result = await service.getResumen('m1', cliente);

      expect(result.mascota.nombre).toBe('Firulais');
      expect(result.mascota.raza).toBe('Labrador');
      expect(result.agregados.frecuenciaCardiacaPromedio).toBe(120);
      expect(result.agregados.ultimaVisita).toEqual(new Date('2024-06-15'));
      expect(result.agregados.proximaVisita).toEqual(new Date('2024-07-01'));
      expect(result.pesoActual).toBe(25.5);
      expect(result.pesoHistorial).toHaveLength(2);
      expect(result.proximasCitas).toEqual([]);
      expect(result.ultimasCitas).toEqual([]);
      expect(result.propietario).toBeUndefined();
      expect(result.mascota.comportamiento).toBeUndefined();
    });

    it('médico ve campos adicionales', async () => {
      mockPrisma.medico.findFirst.mockResolvedValue({ id: 'med1' });
      mockPrisma.cita.count.mockResolvedValue(1);

      const result = await service.getResumen('m1', medico);

      expect(result.propietario).toBeDefined();
      expect(result.propietario?.nombreCompleto).toBe('Juan Pérez');
      expect(result.mascota.comportamiento).toBe('Tranquilo');
      expect(result.mascota.requiereBozal).toBe(false);
    });

    it('admin ve campos adicionales', async () => {
      const result = await service.getResumen('m1', admin);

      expect(result.propietario).toBeDefined();
      expect(result.mascota.comportamiento).toBe('Tranquilo');
    });

    it('mascota sin citas devuelve arrays vacíos y nulls', async () => {
      mockPrisma.consulta.aggregate.mockResolvedValue({
        _avg: { frecuenciaCardiaca: null },
      });
      mockPrisma.cita.findFirst.mockReset();
      mockPrisma.cita.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.consulta.findFirst.mockResolvedValue(null);
      mockPrisma.consulta.findMany.mockResolvedValue([]);

      const result = await service.getResumen('m1', cliente);

      expect(result.proximasCitas).toEqual([]);
      expect(result.ultimasCitas).toEqual([]);
      expect(result.pesoActual).toBeNull();
      expect(result.pesoHistorial).toEqual([]);
      expect(result.agregados.frecuenciaCardiacaPromedio).toBeNull();
      expect(result.agregados.ultimaVisita).toBeNull();
      expect(result.agregados.proximaVisita).toBeNull();
    });

    it('pesoHistorial limitado a 20 registros', async () => {
      const pesos = Array.from({ length: 25 }, (_, i) => ({
        cita: { fecha: new Date(2024, 0, i + 1) },
        peso: 20 + i * 0.1,
      }));
      mockPrisma.consulta.findMany.mockImplementation(
        (args: { take?: number }) =>
          Promise.resolve(args?.take ? pesos.slice(0, args.take) : pesos),
      );

      const result = await service.getResumen('m1', cliente);
      expect(result.pesoHistorial.length).toBe(20);
    });
  });

  describe('getCitasProximas', () => {
    it('devuelve citas futuras con estadoPago', async () => {
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'm1',
        propietarioId: 'u1',
      });

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      mockPrisma.cita.findMany.mockResolvedValue([
        {
          id: 'c1',
          estado: EstadoCita.pendiente,
          fecha: manana,
          horaInicio: new Date(1970, 0, 1, 10, 0),
          horaFin: new Date(1970, 0, 1, 11, 0),
          motivo: 'Consulta general',
          medico: {
            especialidadPrincipal: { nombre: 'Cirugía' },
            usuario: { persona: { nombreCompleto: 'Dr. García' } },
          },
          sucursal: { nombre: 'Sucursal Norte' },
          pago: { estado: EstadoPago.pendiente },
        },
      ]);

      const result = await service.getCitasProximas('m1', cliente);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].estadoPago).toBe(EstadoPago.pendiente);
      expect(result.data[0].especialidad).toBe('Cirugía');
    });
  });

  describe('getCitasPasadas', () => {
    it('cursor-based pagination: hasMore=true cuando hay más', async () => {
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'm1',
        propietarioId: 'u1',
      });

      mockPrisma.cita.findMany.mockResolvedValue(
        Array.from({ length: 11 }, (_, i) => ({
          id: `c${i}`,
          estado: EstadoCita.completada,
          fecha: new Date(2024, 5, 15 - i),
          horaInicio: new Date(1970, 0, 1, 10, 0),
          horaFin: new Date(1970, 0, 1, 11, 0),
          motivo: null,
          medico: {
            especialidadPrincipal: { nombre: 'General' },
            usuario: { persona: { nombreCompleto: 'Dr. Test' } },
          },
          sucursal: { nombre: 'Sucursal' },
        })),
      );

      const result = await service.getCitasPasadas(
        'm1',
        cliente,
        undefined,
        10,
      );

      expect(result.data).toHaveLength(10);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).not.toBeNull();
    });

    it('cursor-based pagination: hasMore=false en última página', async () => {
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'm1',
        propietarioId: 'u1',
      });

      mockPrisma.cita.findMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          id: `c${i}`,
          estado: EstadoCita.completada,
          fecha: new Date(2024, 5, 15 - i),
          horaInicio: new Date(1970, 0, 1, 10, 0),
          horaFin: new Date(1970, 0, 1, 11, 0),
          motivo: null,
          medico: {
            especialidadPrincipal: { nombre: 'General' },
            usuario: { persona: { nombreCompleto: 'Dr. Test' } },
          },
          sucursal: { nombre: 'Sucursal' },
        })),
      );

      const result = await service.getCitasPasadas(
        'm1',
        cliente,
        undefined,
        10,
      );

      expect(result.data).toHaveLength(5);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.nextCursor).toBeNull();
    });
  });

  describe('getCitaDetalle', () => {
    beforeEach(() => {
      mockPrisma.cita.findFirst.mockReset();
      mockPrisma.mascota.findUnique.mockReset();
      mockPrisma.medico.findFirst.mockReset();
    });

    const citaConTodo = {
      id: 'c1',
      estado: EstadoCita.completada,
      fecha: new Date('2024-06-15'),
      horaInicio: new Date(1970, 0, 1, 10, 0),
      horaFin: new Date(1970, 0, 1, 11, 0),
      motivo: 'Consulta',
      medicoId: 'med1',
      medico: {
        especialidadPrincipal: { nombre: 'General' },
        usuario: { persona: { nombreCompleto: 'Dr. Test' } },
      },
      sucursal: { nombre: 'Sucursal' },
      receta: {
        diagnostico: 'Gripe canina',
        observaciones: 'Reposo',
        fechaReceta: new Date('2024-06-15'),
        detalles: [
          {
            medicamento: 'Antibiótico',
            dosis: '1 pastilla',
            frecuencia: 'Cada 8h',
            duracion: '5 días',
            viaAdministracion: 'Oral',
            instrucciones: 'Con comida',
          },
        ],
      },
      consulta: {
        peso: 25.5,
        temperatura: 38.5,
        frecuenciaCardiaca: 120,
        frecuenciaRespiratoria: 30,
        presionArterial: '120/80',
        estadoGeneral: 'Bueno',
        notasEvolucion: 'Evolución favorable',
      },
      pago: {
        folioPago: 'VET-20240615-0001',
        cantidad: 500.0,
        estado: EstadoPago.pagada,
        fechaPago: new Date('2024-06-15'),
      },
    };

    it('cliente NO ve estadoGeneral ni notasEvolucion', async () => {
      mockPrisma.cita.findFirst.mockResolvedValue(citaConTodo);
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'm1',
        propietarioId: 'u1',
      });

      const result = await service.getCitaDetalle('m1', 'c1', cliente);

      expect(result.consulta).toBeDefined();
      expect(result.consulta?.peso).toBe(25.5);
      expect(result.consulta?.estadoGeneral).toBeUndefined();
      expect(result.consulta?.notasEvolucion).toBeUndefined();
    });

    it('médico SÍ ve estadoGeneral y notasEvolucion', async () => {
      mockPrisma.cita.findFirst.mockResolvedValue(citaConTodo);
      mockPrisma.medico.findFirst.mockResolvedValue({ id: 'med1' });

      const result = await service.getCitaDetalle('m1', 'c1', medico);

      expect(result.consulta?.estadoGeneral).toBe('Bueno');
      expect(result.consulta?.notasEvolucion).toBe('Evolución favorable');
    });

    it('cita sin receta ni consulta devuelve null', async () => {
      mockPrisma.cita.findFirst.mockResolvedValue({
        ...citaConTodo,
        receta: null,
        consulta: null,
        pago: null,
      });
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'm1',
        propietarioId: 'u1',
      });

      const result = await service.getCitaDetalle('m1', 'c1', cliente);

      expect(result.receta).toBeNull();
      expect(result.consulta).toBeNull();
      expect(result.pago).toBeNull();
    });

    it('cita no pertenece a mascota → 404', async () => {
      mockPrisma.cita.findFirst.mockResolvedValue(null);

      await expect(
        service.getCitaDetalle('m1', 'c99', cliente),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPesoHistorial', () => {
    it('devuelve serie cronológica ordenada ASC', async () => {
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'm1',
        propietarioId: 'u1',
      });

      mockPrisma.consulta.findMany.mockResolvedValue([
        { cita: { fecha: new Date('2024-01-10') }, peso: 20.0 },
        { cita: { fecha: new Date('2024-02-20') }, peso: 21.0 },
        { cita: { fecha: new Date('2024-03-15') }, peso: 22.0 },
      ]);

      const result = await service.getPesoHistorial('m1', cliente);

      expect(result.data).toHaveLength(3);
      expect(result.data[0].fecha).toEqual(new Date('2024-01-10'));
      expect(result.data[0].peso).toBe(20.0);
      expect(result.data[2].fecha).toEqual(new Date('2024-03-15'));
      expect(result.data[2].peso).toBe(22.0);
    });

    it('sin datos devuelve array vacío', async () => {
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'm1',
        propietarioId: 'u1',
      });
      mockPrisma.consulta.findMany.mockResolvedValue([]);

      const result = await service.getPesoHistorial('m1', cliente);
      expect(result.data).toEqual([]);
    });
  });
});
