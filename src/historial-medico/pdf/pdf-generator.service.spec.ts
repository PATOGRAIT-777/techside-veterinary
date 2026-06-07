import { Test, TestingModule } from '@nestjs/testing';
import { PdfGeneratorService } from './pdf-generator.service';
import type { HistorialResumenDto } from '../dto/historial-resumen.dto';
import type { CitaDetalleDto } from '../dto/cita-detalle.dto';
import type { PesoHistorialItemDto } from '../dto/peso-historial.dto';
import { EstadoCita, EstadoPago } from '@prisma/client';

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfGeneratorService],
    }).compile();

    service = module.get<PdfGeneratorService>(PdfGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateHistorialPdf', () => {
    const resumenBase: HistorialResumenDto = {
      mascota: {
        id: 'm1',
        nombre: 'Firulais',
        raza: 'Labrador',
        color: 'Dorado',
        fechaNacimiento: new Date('2020-01-01'),
        sexo: 'Macho',
        esterilizado: true,
        ruac: 'RUAC-001',
        microchip: 'CHIP-001',
        fotoPerfilUrl: null,
        carnetVacunacionUrl: null,
        observaciones: 'Muy tranquilo',
        alergias: [{ nombre: 'Penicilina', notas: 'Leve' }],
      },
      agregados: {
        frecuenciaCardiacaPromedio: 120,
        ultimaVisita: new Date('2024-06-15'),
        proximaVisita: new Date('2024-07-01'),
      },
      proximasCitas: [],
      ultimasCitas: [],
      pesoActual: 25.5,
      pesoHistorial: [],
    };

    it('returns a non-empty Buffer for valid data', async () => {
      const buffer = await service.generateHistorialPdf(resumenBase, [], []);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('returns a valid Buffer for empty data (mascota without citas)', async () => {
      const emptyResumen: HistorialResumenDto = {
        ...resumenBase,
        agregados: {
          frecuenciaCardiacaPromedio: null,
          ultimaVisita: null,
          proximaVisita: null,
        },
        pesoActual: null,
        pesoHistorial: [],
        proximasCitas: [],
        ultimasCitas: [],
      };

      const buffer = await service.generateHistorialPdf(emptyResumen, [], []);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('returns a valid Buffer with citas and recetas', async () => {
      const citas: CitaDetalleDto[] = [
        {
          id: 'c1',
          estado: EstadoCita.completada,
          especialidad: 'General',
          medico: 'Dr. Test',
          fecha: new Date('2024-06-15'),
          horaInicio: '10:00',
          horaFin: '11:00',
          sucursal: 'Sucursal Norte',
          motivo: 'Consulta',
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
        },
      ];

      const pesos: PesoHistorialItemDto[] = [
        { fecha: new Date('2024-01-01'), peso: 20.0 },
        { fecha: new Date('2024-06-01'), peso: 25.5 },
      ];

      const buffer = await service.generateHistorialPdf(
        resumenBase,
        citas,
        pesos,
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('handles carnetVacunacionUrl without throwing', async () => {
      const resumenConCarnet: HistorialResumenDto = {
        ...resumenBase,
        mascota: {
          ...resumenBase.mascota,
          carnetVacunacionUrl: '/uploads/carnet.png',
        },
      };

      // The image path doesn't exist, but it should not throw
      // It will render a text fallback instead
      const buffer = await service.generateHistorialPdf(
        resumenConCarnet,
        [],
        [],
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
