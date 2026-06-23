import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoCita, EstadoPago, Rol } from '@prisma/client';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { CambiarEstadoCitaDto } from './dto/cambiar-estado-cita.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { FolioGenerator } from './helpers/folio-generator';
import { calcularPrecioCita } from './helpers/calcular-precio-cita';
import { CitaEstadoHistorialService } from './cita-estado-historial.service';
import { EmailService } from '../email/email.service';
import { citaInclude, mapCitaToResponse } from './citas.mapper';

@Injectable()
export class CitasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folioGenerator: FolioGenerator,
    private readonly historialService: CitaEstadoHistorialService,
    private readonly emailService: EmailService,
  ) {}

  // --- MÉTODOS PARA EL FRONTEND (INICIALIZACIÓN Y SELECCIÓN) ---

  async getInitData() {
    const [sucursales, servicios] = await Promise.all([
      this.prisma.sucursal.findMany({ 
        select: { id: true, nombre: true } 
      }),
      this.prisma.servicio.findMany({ 
        select: { id: true, nombre: true, precioBase: true } 
      }),
    ]);
    return { sucursales, servicios };
  }

  async getMascotasPorUsuario(usuarioId: string) {
    return await this.prisma.mascota.findMany({
      where: { propietarioId: usuarioId },
      select: { id: true, nombre: true }
    });
  }

  async getMedicosPorSucursal(sucursalId: string) {
    const medicos = await this.prisma.medico.findMany({
      where: {
        horarios: {
          some: { consultorio: { sucursalId: sucursalId } }
        }
      },
      include: { 
        usuario: { include: { persona: true } } 
      }
    });

    return medicos.map(m => ({ 
      id: m.id, 
      nombre_completo: m.usuario?.persona?.nombreCompleto || 'Sin nombre' 
    }));
  }
async getProximasCitas(usuario: JwtPayload) {
    const hoy = new Date();
    
    const citas = await this.prisma.cita.findMany({
      where: { 
        estado: { not: EstadoCita.cancelada },
        fecha: { gte: hoy }
      },
      // AQUÍ ESTABA EL ERROR: Agrega 'servicio: true'
      include: { 
          mascota: true, 
          servicio: true, // <--- ESTO FALTABA
          medico: { include: { usuario: { include: { persona: true } } } } 
      },
      orderBy: { fecha: 'asc' },
      take: 5 
    });

    return citas.map(c => ({
      hora: c.horaInicio.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mascota: c.mascota.nombre,
      dueno: "Cliente", 
      servicio: c.servicio?.nombre || "N/A", // Ahora ya no dará error
      medico: c.medico.usuario.persona.nombreCompleto,
      estado: c.estado
    }));
  }
  // Agrega o reemplaza estos métodos en tu src/citas/citas.service.ts

async getHorariosDisponibles(medicoId: string, fecha: string) {
    const fechaDate = new Date(fecha + 'T00:00:00');
    const diaSemana = this.numToDiaSemana(fechaDate.getDay());

    // 1. Obtener horario del médico para ese día
    const horario = await this.prisma.medicoHorario.findFirst({
        where: { medicoId, diaSemana: diaSemana as any }
    });

    if (!horario) return []; // El médico no trabaja ese día

    // 2. Obtener citas existentes para ese día
    const citasExistentes = await this.prisma.cita.findMany({
        where: { medicoId, fecha: fechaDate, estado: { not: EstadoCita.cancelada } }
    });

    // 3. Generar slots de 1 hora (ejemplo: 09:00, 10:00...)
    const slots = [];
    let horaActual = new Date(horario.horaInicio);
    const horaFin = new Date(horario.horaFin);

    while (horaActual < horaFin) {
        const h = String(horaActual.getHours()).padStart(2, '0');
        const m = String(horaActual.getMinutes()).padStart(2, '0');
        const slot = `${h}:${m}`;

        // Verificar si este slot está ocupado
        const ocupado = citasExistentes.some(c => 
            c.horaInicio.getHours() === horaActual.getHours()
        );

        if (!ocupado) slots.push(slot);
        
        horaActual.setHours(horaActual.getHours() + 1);
    }
    return slots;
}

  // --- MÉTODOS DE NEGOCIO (CREATE, UPDATE, ETC) ---

  async create(dto: CreateCitaDto, usuario: JwtPayload) {
    if (usuario.rol !== Rol.cliente && usuario.rol !== Rol.admin) {
      throw new ForbiddenException('Solo clientes y administradores pueden agendar citas');
    }

    const mascota = await this.prisma.mascota.findUnique({ where: { id: dto.mascotaId } });
    if (!mascota) throw new NotFoundException('Mascota no encontrada');

    let usuarioTargetEmail: string | null = null;

    if (usuario.rol === Rol.cliente) {
      if (mascota.propietarioId !== usuario.sub) {
        throw new ForbiddenException('La mascota no pertenece al usuario');
      }
    } else if (usuario.rol === Rol.admin && dto.emailUsuario) {
      const usuarioTarget = await this.prisma.usuario.findUnique({ where: { email: dto.emailUsuario } });
      if (!usuarioTarget) throw new NotFoundException('Usuario no encontrado');
      if (mascota.propietarioId !== usuarioTarget.id) {
        throw new ForbiddenException('La mascota no pertenece al usuario indicado');
      }
      usuarioTargetEmail = usuarioTarget.email;
    }

    const fechaCita = new Date(dto.fecha + 'T00:00:00');
    const [horaParte, minParte] = dto.horaInicio.split(':');
    const horaInicio = new Date(1970, 0, 1, parseInt(horaParte), parseInt(minParte));
    const horaFin = new Date(horaInicio.getTime() + 60 * 60 * 1000); 

    const ahora = new Date();
    const fechaHoraCita = new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate(), horaInicio.getHours(), horaInicio.getMinutes());
    
    if (fechaHoraCita <= ahora) throw new BadRequestException('La fecha y hora de la cita deben ser futuras');

    const diffHoras = (fechaHoraCita.getTime() - ahora.getTime()) / (1000 * 60 * 60);
    if (diffHoras < 24) throw new BadRequestException('Las citas deben agendarse con al menos 24 horas de anticipación');

    const citaMismoDia = await this.prisma.cita.findFirst({
      where: { medicoId: dto.medicoId, mascotaId: dto.mascotaId, fecha: fechaCita, estado: { not: EstadoCita.cancelada } },
    });
    if (citaMismoDia) throw new ConflictException('Ya existe una cita para esta mascota con este médico en este día');

    await this.validarTraslapeMedico(dto.medicoId, fechaCita, horaInicio, horaFin);
    const consultorioId = await this.obtenerConsultorioDesdeHorario(dto.medicoId, fechaCita);
    await this.validarTraslapeConsultorio(consultorioId, fechaCita, horaInicio, horaFin);
    await this.validarTraslapePaciente(dto.mascotaId, dto.sucursalId, fechaCita, horaInicio, horaFin);
    await this.validarSucursalCruzada(dto.mascotaId, dto.sucursalId, fechaCita, horaInicio);

    const medicoData = await this.prisma.medico.findUnique({
      where: { id: dto.medicoId },
      include: { especialidadPrincipal: true, usuario: { select: { persona: true } } },
    });

    const servicioData = await this.prisma.servicio.findUnique({ where: { id: dto.servicioId } });
    const precio = calcularPrecioCita(servicioData?.precioBase, medicoData?.especialidadPrincipal?.precio);
    const folioPago = await this.folioGenerator.generate();

    const cita = await this.prisma.cita.create({
      data: {
        sucursalId: dto.sucursalId,
        medicoId: dto.medicoId,
        mascotaId: dto.mascotaId,
        servicioId: dto.servicioId,
        fecha: fechaCita,
        horaInicio,
        horaFin,
        estado: EstadoCita.pendiente_de_pago,
        motivo: dto.motivo,
        pago: { create: { folioPago, cantidad: precio, estado: EstadoPago.pendiente } },
      },
      include: { ...citaInclude, pago: true },
    });

    await this.historialService.registrarCambio(cita.id, null, EstadoCita.pendiente_de_pago, usuario.sub, null);
    
    // ... (El resto del código original de creación de email se mantiene igual)
    return mapCitaToResponse(cita);
  }

  // --- MANTÉN AQUÍ TUS MÉTODOS EXISTENTES: findAll, findOne, update, remove, cambiarEstado ---
  // --- Y LOS MÉTODOS PRIVADOS DE VALIDACIÓN ---
  
  async findAll(usuario: JwtPayload) { /* Tu lógica existente */ return []; }
  private async findOneWithPermissions(id: string, usuario: JwtPayload) { /* Tu lógica existente */ }
  async findOne(id: string, usuario: JwtPayload) { /* Tu lógica existente */ return null; }
  async update(id: string, dto: UpdateCitaDto, usuario: JwtPayload) { /* Tu lógica existente */ }
  async remove(id: string, usuario: JwtPayload) { /* Tu lógica existente */ }
  async cambiarEstado(id: string, dto: CambiarEstadoCitaDto, usuario: JwtPayload) { /* Tu lógica existente */ }
  
  private async validarTraslapeMedico(m: string, f: Date, hI: Date, hF: Date, e?: string) { /* ... */ }
  private async validarTraslapeConsultorio(c: string, f: Date, hI: Date, hF: Date, e?: string) { /* ... */ }
  private async obtenerConsultorioDesdeHorario(m: string, f: Date): Promise<string> { return ''; }
  private async validarTraslapePaciente(m: string, s: string, f: Date, hI: Date, hF: Date, e?: string) { /* ... */ }
  private async validarSucursalCruzada(m: string, s: string, f: Date, hI: Date) { /* ... */ }
  private timeToMinutes(d: Date): number { return d.getHours() * 60 + d.getMinutes(); }
  private formatTime(d: Date): string { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  private numToDiaSemana(n: number) { const m = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const; return m[n]; }
}