import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { HistorialResumenDto } from '../dto/historial-resumen.dto';
import type { CitaDetalleDto } from '../dto/cita-detalle.dto';
import type { PesoHistorialItemDto } from '../dto/peso-historial.dto';

type DocType = InstanceType<typeof PDFDocument>;

@Injectable()
export class PdfGeneratorService {
  async generateHistorialPdf(
    resumen: HistorialResumenDto,
    citasCompletas: CitaDetalleDto[],
    pesoCompleto: PesoHistorialItemDto[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      let pageNumber = 0;

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const addPageWithFooter = () => {
        if (pageNumber > 0) doc.addPage();
        pageNumber++;
      };

      // ── Página 1: Portada / Resumen ──
      addPageWithFooter();
      this.renderPortada(doc, resumen);

      // ── Página 2: Peso Histórico ──
      if (pesoCompleto.length > 0) {
        addPageWithFooter();
        this.renderPesoHistorial(doc, pesoCompleto);
      }

      // ── Página 3: Citas ──
      if (citasCompletas.length > 0) {
        addPageWithFooter();
        this.renderCitasTabla(doc, citasCompletas);
      }

      // ── Página siguiente: Consultas Detalladas ──
      const citasConConsulta = citasCompletas.filter((c) => c.consulta);
      if (citasConConsulta.length > 0) {
        addPageWithFooter();
        this.renderConsultasDetalladas(doc, citasConConsulta);
      }

      // ── Carnet de Vacunación ──
      if (resumen.mascota.carnetVacunacionUrl) {
        addPageWithFooter();
        this.renderCarnetVacunacion(doc, resumen.mascota.carnetVacunacionUrl);
      }

      doc.end();
    });
  }

  private renderPortada(doc: DocType, resumen: HistorialResumenDto) {
    const { mascota, agregados, propietario } = resumen;

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Historial Médico', 50, 50);
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        `Generado: ${new Date().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        50,
        80,
      );

    let y = 120;

    // Datos del Paciente
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Datos del Paciente', 50, y, { underline: true });
    y += 25;
    doc.fontSize(10).font('Helvetica');
    const datos = [
      ['Nombre', mascota.nombre],
      ['Raza', mascota.raza ?? 'No registrado'],
      ['Color', mascota.color ?? 'No registrado'],
      ['Sexo', mascota.sexo ?? 'No registrado'],
      [
        'Fecha de nacimiento',
        mascota.fechaNacimiento
          ? this.formatDate(mascota.fechaNacimiento)
          : 'No registrado',
      ],
      ['Esterilizado', mascota.esterilizado ? 'Sí' : 'No'],
      ['RUAC', mascota.ruac ?? 'No registrado'],
      ['Microchip', mascota.microchip ?? 'No registrado'],
      ['Observaciones', mascota.observaciones ?? '—'],
    ];
    for (const [label, value] of datos) {
      doc.text(`${label}: ${value}`, 50, y);
      y += 15;
    }

    // Alergias
    y += 10;
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Alergias', 50, y, { underline: true });
    y += 25;
    doc.fontSize(10).font('Helvetica');
    if (mascota.alergias.length === 0) {
      doc.text('Sin alergias registradas', 50, y);
      y += 15;
    } else {
      for (const a of mascota.alergias) {
        doc.text(`• ${a.nombre}${a.notas ? ` — ${a.notas}` : ''}`, 50, y);
        y += 15;
      }
    }

    // Resumen Clínico
    y += 10;
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Resumen Clínico', 50, y, { underline: true });
    y += 25;
    doc.fontSize(10).font('Helvetica');
    doc.text(
      `Peso actual: ${resumen.pesoActual !== null ? `${resumen.pesoActual} kg` : 'No registrado'}`,
      50,
      y,
    );
    y += 15;
    doc.text(
      `Frec. cardíaca promedio: ${agregados.frecuenciaCardiacaPromedio !== null ? `${agregados.frecuenciaCardiacaPromedio} lpm` : 'No registrado'}`,
      50,
      y,
    );
    y += 15;
    doc.text(
      `Última visita: ${agregados.ultimaVisita ? this.formatDate(agregados.ultimaVisita) : 'No registrado'}`,
      50,
      y,
    );
    y += 15;
    doc.text(
      `Próxima visita: ${agregados.proximaVisita ? this.formatDate(agregados.proximaVisita) : 'No registrada'}`,
      50,
      y,
    );

    // Propietario
    if (propietario) {
      y += 25;
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Propietario', 50, y, { underline: true });
      y += 25;
      doc.fontSize(10).font('Helvetica');
      doc.text(`Nombre: ${propietario.nombreCompleto}`, 50, y);
      y += 15;
      doc.text(`Teléfono: ${propietario.telefono}`, 50, y);
      y += 15;
      doc.text(`Email: ${propietario.email}`, 50, y);
    }
  }

  private renderPesoHistorial(doc: DocType, pesos: PesoHistorialItemDto[]) {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Peso Histórico', 50, 50, { underline: true });

    let y = 90;
    const colFecha = 80;
    const colPeso = 250;

    // Header row
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Fecha', colFecha, y);
    doc.text('Peso (kg)', colPeso, y);
    y += 20;
    doc
      .moveTo(50, y - 5)
      .lineTo(350, y - 5)
      .stroke();

    // Data rows
    doc.fontSize(10).font('Helvetica');
    for (const p of pesos) {
      doc.text(this.formatDate(p.fecha), colFecha, y);
      doc.text(`${p.peso}`, colPeso, y);
      y += 18;

      // New page if needed
      if (y > 720) {
        doc.addPage();
        y = 50;
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('Peso Histórico (continuación)', 50, 30);
        doc.fontSize(10).font('Helvetica');
      }
    }
  }

  private renderCitasTabla(doc: DocType, citas: CitaDetalleDto[]) {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Historial de Citas', 50, 50, { underline: true });

    let y = 90;
    const cols = [80, 150, 260, 380, 480];

    // Header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Fecha', cols[0], y);
    doc.text('Hora', cols[1], y);
    doc.text('Especialidad', cols[2], y);
    doc.text('Médico', cols[3], y);
    doc.text('Estado', cols[4], y);
    y += 20;
    doc
      .moveTo(50, y - 5)
      .lineTo(540, y - 5)
      .stroke();

    // Data
    doc.fontSize(9).font('Helvetica');
    for (const c of citas) {
      doc.text(this.formatDate(c.fecha), cols[0], y);
      doc.text(`${c.horaInicio} - ${c.horaFin}`, cols[1], y);
      doc.text(c.especialidad, cols[2], y);
      doc.text(c.medico, cols[3], y);
      doc.text(c.estado, cols[4], y);
      y += 18;

      if (y > 720) {
        doc.addPage();
        y = 50;
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('Historial de Citas (continuación)', 50, 30);
        doc.fontSize(9).font('Helvetica');
      }
    }
  }

  private renderConsultasDetalladas(doc: DocType, citas: CitaDetalleDto[]) {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Consultas Detalladas', 50, 50, { underline: true });

    let y = 90;

    for (const c of citas) {
      if (!c.consulta) continue;

      // Sub-header
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`Consulta del ${this.formatDate(c.fecha)} — ${c.medico}`, 50, y);
      y += 20;

      // Consulta data
      doc.fontSize(10).font('Helvetica');
      const con = c.consulta;
      const campos = [
        ['Peso', con.peso !== null ? `${con.peso} kg` : 'No registrado'],
        [
          'Temperatura',
          con.temperatura !== null ? `${con.temperatura} °C` : 'No registrado',
        ],
        [
          'Frec. cardíaca',
          con.frecuenciaCardiaca !== null
            ? `${con.frecuenciaCardiaca} lpm`
            : 'No registrado',
        ],
        [
          'Frec. respiratoria',
          con.frecuenciaRespiratoria !== null
            ? `${con.frecuenciaRespiratoria} rpm`
            : 'No registrado',
        ],
        ['Presión arterial', con.presionArterial ?? 'No registrado'],
        ['Estado general', con.estadoGeneral ?? 'No registrado'],
        ['Notas de evolución', con.notasEvolucion ?? '—'],
      ];
      for (const [label, value] of campos) {
        doc.text(`${label}: ${value}`, 70, y);
        y += 14;
      }

      // Receta
      if (c.receta) {
        y += 8;
        doc.fontSize(11).font('Helvetica-Bold').text('Receta', 70, y);
        y += 16;
        doc.fontSize(10).font('Helvetica');
        doc.text(`Diagnóstico: ${c.receta.diagnostico}`, 70, y);
        y += 14;
        if (c.receta.observaciones) {
          doc.text(`Observaciones: ${c.receta.observaciones}`, 70, y);
          y += 14;
        }

        if (c.receta.detalles.length > 0) {
          y += 5;
          const rCols = [90, 200, 310, 400, 480];
          doc.fontSize(9).font('Helvetica-Bold');
          doc.text('Medicamento', rCols[0], y);
          doc.text('Dosis', rCols[1], y);
          doc.text('Frec.', rCols[2], y);
          doc.text('Duración', rCols[3], y);
          doc.text('Vía', rCols[4], y);
          y += 16;
          doc
            .moveTo(80, y - 5)
            .lineTo(540, y - 5)
            .stroke();
          doc.fontSize(9).font('Helvetica');
          for (const d of c.receta.detalles) {
            doc.text(d.medicamento, rCols[0], y);
            doc.text(d.dosis, rCols[1], y);
            doc.text(d.frecuencia, rCols[2], y);
            doc.text(d.duracion, rCols[3], y);
            doc.text(d.viaAdministracion, rCols[4], y);
            y += 14;
          }
        }
      }

      y += 20;

      // New page if needed
      if (y > 680) {
        doc.addPage();
        y = 50;
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('Consultas Detalladas (continuación)', 50, 30);
      }
    }
  }

  private renderCarnetVacunacion(doc: DocType, url: string) {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Carnet de Vacunación', 50, 50, { underline: true });

    try {
      // Try to embed image from local path
      doc.image(url, 50, 90, { width: 400 });
    } catch {
      // Fallback to text link
      doc.fontSize(10).font('Helvetica');
      doc.text('No se pudo cargar la imagen del carnet.', 50, 90);
      doc.text(`URL: ${url}`, 50, 110);
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
