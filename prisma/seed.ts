import { PrismaClient, UsuarioStatus, Rol, EstadoPago } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Seed mx_divisiones (5 branches: 4 active, 1 inactive)
  const branches = [
    {
      nombre: 'Vetec Centro',
      clave: 'VTC-001',
      direccion: 'Av. Principal 100, Centro',
      telefono: '55512345678',
      activo: true,
    },
    {
      nombre: 'Vetec Norte',
      clave: 'VTN-002',
      direccion: 'Calle Norte 200, Col. Industrial',
      telefono: '55598765432',
      activo: true,
    },
    {
      nombre: 'Vetec Sur',
      clave: 'VTS-003',
      direccion: 'Av. Sur 300, Col. Reforma',
      telefono: '55545678901',
      activo: true,
    },
    {
      nombre: 'Vetec Oriente',
      clave: 'VTO-004',
      direccion: 'Blvd. Oriente 400',
      telefono: '55511122233',
      activo: true,
    },
    {
      nombre: 'Vetec Poniente',
      clave: 'VTP-005',
      direccion: 'Calle Poniente 500',
      telefono: '55544455566',
      activo: false,
    },
  ];

  for (const b of branches) {
    await prisma.mxDivision.upsert({
      where: { clave: b.clave },
      update: {},
      create: b,
    });
  }

  // 2. Look up first active branch dynamically
  const branch = await prisma.mxDivision.findUnique({
    where: { clave: 'VTC-001' },
  });

  if (!branch) {
    throw new Error('Branch VTC-001 not found');
  }

  // 3. Seed first admin (idempotent)
  let adminPersona = await prisma.persona.findFirst({
    where: { telefono: '55500000000' },
  });
  if (!adminPersona) {
    adminPersona = await prisma.persona.create({
      data: {
        nombreCompleto: 'Administrador Sistema',
        telefono: '55500000000',
        calle: 'Oficina Central',
        sucursalId: branch.id,
      },
    });
  }

  const existingAdmin = await prisma.usuario.findUnique({
    where: { email: 'admin@vetec.local' },
  });
  if (!existingAdmin) {
    await prisma.usuario.create({
      data: {
        email: 'admin@vetec.local',
        telefono: '55500000000',
        passwordHash: await bcrypt.hash('AdminPass123', 12),
        rol: Rol.admin,
        status: UsuarioStatus.activo,
        personaId: adminPersona.id,
      },
    });
  }

  // 4. Seed catalogos
  const especieCanino = await prisma.especie.upsert({
    where: { nombre: 'Canino' },
    update: {},
    create: { nombre: 'Canino' },
  });
  const especieFelino = await prisma.especie.upsert({
    where: { nombre: 'Felino' },
    update: {},
    create: { nombre: 'Felino' },
  });
  const especieAve = await prisma.especie.upsert({
    where: { nombre: 'Ave' },
    update: {},
    create: { nombre: 'Ave' },
  });
  const especieReptil = await prisma.especie.upsert({
    where: { nombre: 'Reptil' },
    update: {},
    create: { nombre: 'Reptil' },
  });

  const razas = [
    { especieId: especieCanino.id, nombre: 'Labrador Retriever' },
    { especieId: especieCanino.id, nombre: 'Pastor Alemán' },
    { especieId: especieFelino.id, nombre: 'Siamés' },
    { especieId: especieFelino.id, nombre: 'Persa' },
    { especieId: especieAve.id, nombre: 'Canario' },
    { especieId: especieAve.id, nombre: 'Periquito' },
    { especieId: especieReptil.id, nombre: 'Iguana' },
    { especieId: especieReptil.id, nombre: 'Tortuga' },
  ];
  for (const r of razas) {
    await prisma.raza.upsert({
      where: {
        especieId_nombre: { especieId: r.especieId, nombre: r.nombre },
      },
      update: {},
      create: r,
    });
  }

  const colores = ['Negro', 'Blanco', 'Marrón', 'Gris', 'Naranja', 'Manchado'];
  for (const nombre of colores) {
    await prisma.color.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  const tiposPelo = ['Corto', 'Largo', 'Sin pelo', 'Rizado'];
  for (const nombre of tiposPelo) {
    await prisma.tipoPelo.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  const patronesPelo = [
    'Sólido',
    'Bicolor',
    'Tricolor',
    'Atigrado',
    'Manchado',
  ];
  for (const nombre of patronesPelo) {
    await prisma.patronPelo.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  const comportamientos = [
    { nombre: 'Tranquilo', requiereBozal: false },
    { nombre: 'Amigable', requiereBozal: false },
    { nombre: 'Agresivo', requiereBozal: true },
    { nombre: 'Nervioso', requiereBozal: false },
    { nombre: 'Juguetón', requiereBozal: false },
  ];
  for (const c of comportamientos) {
    await prisma.comportamiento.upsert({
      where: { nombre: c.nombre },
      update: {},
      create: c,
    });
  }

  const alergias = [
    'Polen',
    'Ácaros',
    'Gluten',
    'Lactosa',
    'Pollos',
    'Garrapatas',
    'Moho',
  ];
  for (const nombre of alergias) {
    await prisma.catalogoAlergia.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  // 5. Seed especialidades
  const especialidades = [
    'Cirugía General',
    'Dermatología',
    'Cardiología',
    'Oftalmología',
    'Odontología',
    'Neurología',
    'Oncología',
    'Medicina Interna',
  ];
  for (const nombre of especialidades) {
    await prisma.especialidad.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  // 6. Seed servicios
  const servicios = [
    { nombre: 'Consulta General', precioBase: 350 },
    { nombre: 'Vacunación', precioBase: 200 },
    { nombre: 'Desparasitación', precioBase: 150 },
    { nombre: 'Cirugía Menor', precioBase: 1500 },
    { nombre: 'Cirugía Mayor', precioBase: 3500 },
    { nombre: 'Estética Canina', precioBase: 400 },
    { nombre: 'Hospitalización', precioBase: 800 },
    { nombre: 'Radiografía', precioBase: 600 },
  ];
  for (const s of servicios) {
    await prisma.servicio.upsert({
      where: { nombre: s.nombre },
      update: {},
      create: s,
    });
  }

  // 7. Seed sucursales
  const sucursalesData = [
    {
      nombre: 'Vetec Centro',
      calleNumero: 'Av. Principal 100, Centro',
      telefonoPrincipal: '55512345678',
      whatsapp: '55512345678',
      activo: true,
    },
    {
      nombre: 'Vetec Norte',
      calleNumero: 'Calle Norte 200, Col. Industrial',
      telefonoPrincipal: '55598765432',
      whatsapp: '55598765432',
      activo: true,
    },
    {
      nombre: 'Vetec Sur',
      calleNumero: 'Av. Sur 300, Col. Reforma',
      telefonoPrincipal: '55545678901',
      whatsapp: '55545678901',
      activo: true,
    },
  ];
  const sucursalesCreadas: Record<string, string> = {};
  for (const s of sucursalesData) {
    const existente = await prisma.sucursal.findFirst({
      where: { nombre: s.nombre },
    });
    if (!existente) {
      const creada = await prisma.sucursal.create({ data: s });
      sucursalesCreadas[s.nombre] = creada.id;
    } else {
      sucursalesCreadas[s.nombre] = existente.id;
    }
  }

  // 8. Seed consultorios
  if (sucursalesCreadas['Vetec Centro']) {
    await prisma.consultorio.createMany({
      data: [
        {
          sucursalId: sucursalesCreadas['Vetec Centro'],
          nombre: 'Consultorio 1',
          equipamiento: 'Mesa de exploración, estetoscopio',
        },
        {
          sucursalId: sucursalesCreadas['Vetec Centro'],
          nombre: 'Consultorio 2',
          equipamiento: 'Mesa de exploración, ultrasonido',
        },
      ],
      skipDuplicates: true,
    });
  }
  if (sucursalesCreadas['Vetec Norte']) {
    await prisma.consultorio.createMany({
      data: [
        {
          sucursalId: sucursalesCreadas['Vetec Norte'],
          nombre: 'Consultorio 1',
          equipamiento: 'Mesa de exploración',
        },
      ],
      skipDuplicates: true,
    });
  }
  if (sucursalesCreadas['Vetec Sur']) {
    await prisma.consultorio.createMany({
      data: [
        {
          sucursalId: sucursalesCreadas['Vetec Sur'],
          nombre: 'Consultorio 1',
          equipamiento: 'Mesa de exploración',
        },
      ],
      skipDuplicates: true,
    });
  }

  // ============================================================
  // 9. Demo data for Epic 2: Historial Médico
  // ============================================================

  // Lookup catalog data
  const razaLabrador = await prisma.raza.findFirst({
    where: { nombre: 'Labrador Retriever' },
  });
  const razaPastor = await prisma.raza.findFirst({
    where: { nombre: 'Pastor Alemán' },
  });
  const razaSiames = await prisma.raza.findFirst({
    where: { nombre: 'Siamés' },
  });
  const colorMarron = await prisma.color.findFirst({
    where: { nombre: 'Marrón' },
  });
  const colorNegro = await prisma.color.findFirst({
    where: { nombre: 'Negro' },
  });
  const colorBlanco = await prisma.color.findFirst({
    where: { nombre: 'Blanco' },
  });
  const tipoPeloCorto = await prisma.tipoPelo.findFirst({
    where: { nombre: 'Corto' },
  });
  const tipoPeloLargo = await prisma.tipoPelo.findFirst({
    where: { nombre: 'Largo' },
  });
  const patronSolido = await prisma.patronPelo.findFirst({
    where: { nombre: 'Sólido' },
  });
  const comportamientoTranquilo = await prisma.comportamiento.findFirst({
    where: { nombre: 'Tranquilo' },
  });
  const comportamientoAmigable = await prisma.comportamiento.findFirst({
    where: { nombre: 'Amigable' },
  });
  const alergiaPolen = await prisma.catalogoAlergia.findFirst({
    where: { nombre: 'Polen' },
  });
  const alergiaGarrapatas = await prisma.catalogoAlergia.findFirst({
    where: { nombre: 'Garrapatas' },
  });
  const alergiaLactosa = await prisma.catalogoAlergia.findFirst({
    where: { nombre: 'Lactosa' },
  });
  const espCirugia = await prisma.especialidad.findFirst({
    where: { nombre: 'Cirugía General' },
  });
  const espDermato = await prisma.especialidad.findFirst({
    where: { nombre: 'Dermatología' },
  });
  const servicioConsulta = await prisma.servicio.findFirst({
    where: { nombre: 'Consulta General' },
  });
  const sucursalCentro = await prisma.sucursal.findFirst({
    where: { nombre: 'Vetec Centro' },
  });
  const sucursalNorte = await prisma.sucursal.findFirst({
    where: { nombre: 'Vetec Norte' },
  });
  const consultorioCentro1 = await prisma.consultorio.findFirst({
    where: { nombre: 'Consultorio 1', sucursalId: sucursalCentro?.id },
  });
  const consultorioNorte1 = await prisma.consultorio.findFirst({
    where: { nombre: 'Consultorio 1', sucursalId: sucursalNorte?.id },
  });

  if (
    !razaLabrador ||
    !razaPastor ||
    !razaSiames ||
    !colorMarron ||
    !colorNegro ||
    !colorBlanco ||
    !tipoPeloCorto ||
    !tipoPeloLargo ||
    !patronSolido ||
    !comportamientoTranquilo ||
    !comportamientoAmigable ||
    !alergiaPolen ||
    !alergiaGarrapatas ||
    !alergiaLactosa ||
    !espCirugia ||
    !espDermato ||
    !servicioConsulta ||
    !sucursalCentro ||
    !sucursalNorte ||
    !consultorioCentro1 ||
    !consultorioNorte1
  ) {
    console.warn('Some catalog data not found, skipping demo data seed');
    console.log('Seed complete.');
    return;
  }

  // Check if demo data already exists
  const existingJuan = await prisma.usuario.findUnique({
    where: { email: 'juan@vetec.local' },
  });
  if (existingJuan) {
    console.log('Demo data already exists, skipping...');
    console.log('Seed complete.');
    return;
  }

  // ── 9.1 Client users ──
  const personaJuan = await prisma.persona.create({
    data: {
      nombreCompleto: 'Juan Pérez',
      telefono: '55511111111',
      calle: 'Calle Primavera 123',
      sucursalId: branch.id,
    },
  });
  const usuarioJuan = await prisma.usuario.create({
    data: {
      email: 'juan@vetec.local',
      telefono: '55511111111',
      passwordHash: await bcrypt.hash('ClientePass123', 12),
      rol: Rol.cliente,
      status: UsuarioStatus.activo,
      personaId: personaJuan.id,
    },
  });

  const personaMaria = await prisma.persona.create({
    data: {
      nombreCompleto: 'María García',
      telefono: '55522222222',
      calle: 'Av. Reforma 456',
      sucursalId: branch.id,
    },
  });
  const usuarioMaria = await prisma.usuario.create({
    data: {
      email: 'maria@vetec.local',
      telefono: '55522222222',
      passwordHash: await bcrypt.hash('ClientePass123', 12),
      rol: Rol.cliente,
      status: UsuarioStatus.activo,
      personaId: personaMaria.id,
    },
  });

  // ── 9.2 Médicos ──
  const personaCarlos = await prisma.persona.create({
    data: {
      nombreCompleto: 'Dr. Carlos Ruiz',
      telefono: '55533333333',
      calle: 'Blvd. Médicos 789',
      sucursalId: branch.id,
    },
  });
  const usuarioCarlos = await prisma.usuario.create({
    data: {
      email: 'carlos@vetec.local',
      telefono: '55533333333',
      passwordHash: await bcrypt.hash('MedicoPass123', 12),
      rol: Rol.medico,
      status: UsuarioStatus.activo,
      personaId: personaCarlos.id,
    },
  });
  const medicoCarlos = await prisma.medico.create({
    data: {
      usuarioId: usuarioCarlos.id,
      sucursalId: sucursalCentro.id,
      especialidadPrincipalId: espCirugia.id,
      cedulaProfesional: 'CED-123456',
      biografiaCorta:
        'Especialista en cirugía general veterinaria con 10 años de experiencia',
    },
  });

  const personaAna = await prisma.persona.create({
    data: {
      nombreCompleto: 'Dra. Ana López',
      telefono: '55544444444',
      calle: 'Calle Salud 321',
      sucursalId: branch.id,
    },
  });
  const usuarioAna = await prisma.usuario.create({
    data: {
      email: 'ana@vetec.local',
      telefono: '55544444444',
      passwordHash: await bcrypt.hash('MedicoPass123', 12),
      rol: Rol.medico,
      status: UsuarioStatus.activo,
      personaId: personaAna.id,
    },
  });
  const medicoAna = await prisma.medico.create({
    data: {
      usuarioId: usuarioAna.id,
      sucursalId: sucursalNorte.id,
      especialidadPrincipalId: espDermato.id,
      cedulaProfesional: 'CED-654321',
      biografiaCorta:
        'Dermatóloga veterinaria, experta en alergias y enfermedades de piel',
    },
  });

  // ── 9.3 Médico horarios ──
  await prisma.medicoHorario.createMany({
    data: [
      {
        medicoId: medicoCarlos.id,
        diaSemana: 'lunes',
        horaInicio: new Date(1970, 0, 1, 9, 0),
        horaFin: new Date(1970, 0, 1, 14, 0),
        consultorioId: consultorioCentro1.id,
      },
      {
        medicoId: medicoCarlos.id,
        diaSemana: 'miercoles',
        horaInicio: new Date(1970, 0, 1, 14, 0),
        horaFin: new Date(1970, 0, 1, 19, 0),
        consultorioId: consultorioCentro1.id,
      },
      {
        medicoId: medicoCarlos.id,
        diaSemana: 'sabado',
        horaInicio: new Date(1970, 0, 1, 9, 0),
        horaFin: new Date(1970, 0, 1, 14, 0),
        consultorioId: consultorioCentro1.id,
      },
      {
        medicoId: medicoCarlos.id,
        diaSemana: 'domingo',
        horaInicio: new Date(1970, 0, 1, 15, 0),
        horaFin: new Date(1970, 0, 1, 20, 0),
        consultorioId: consultorioCentro1.id,
      },
      {
        medicoId: medicoAna.id,
        diaSemana: 'martes',
        horaInicio: new Date(1970, 0, 1, 9, 0),
        horaFin: new Date(1970, 0, 1, 14, 0),
        consultorioId: consultorioNorte1.id,
      },
      {
        medicoId: medicoAna.id,
        diaSemana: 'jueves',
        horaInicio: new Date(1970, 0, 1, 14, 0),
        horaFin: new Date(1970, 0, 1, 19, 0),
        consultorioId: consultorioNorte1.id,
      },
      {
        medicoId: medicoAna.id,
        diaSemana: 'sabado',
        horaInicio: new Date(1970, 0, 1, 10, 0),
        horaFin: new Date(1970, 0, 1, 15, 0),
        consultorioId: consultorioNorte1.id,
      },
      {
        medicoId: medicoAna.id,
        diaSemana: 'domingo',
        horaInicio: new Date(1970, 0, 1, 16, 0),
        horaFin: new Date(1970, 0, 1, 21, 0),
        consultorioId: consultorioNorte1.id,
      },
    ],
  });

  // ── 9.4 Mascotas ──
  const mascotaFido = await prisma.mascota.create({
    data: {
      propietarioId: usuarioJuan.id,
      nombre: 'Fido',
      razaId: razaLabrador.id,
      colorId: colorMarron.id,
      tipoPeloId: tipoPeloCorto.id,
      patronPeloId: patronSolido.id,
      comportamientoId: comportamientoTranquilo.id,
      fechaNacimiento: new Date('2020-03-15'),
      sexo: 'Macho',
      peso: 25.5,
      esterilizado: true,
      ruac: 'RUAC-FIDO-001',
      microchip: 'MC-FIDO-001',
      observaciones: 'Perro muy cariñoso, le gustan los paseos largos',
      alergias: {
        create: [
          { alergiaId: alergiaPolen.id, notas: 'Estacional, primavera' },
          {
            alergiaId: alergiaGarrapatas.id,
            notas: 'Usar collar antiparasitario',
          },
        ],
      },
    },
  });

  const mascotaLuna = await prisma.mascota.create({
    data: {
      propietarioId: usuarioJuan.id,
      nombre: 'Luna',
      razaId: razaSiames.id,
      colorId: colorBlanco.id,
      tipoPeloId: tipoPeloLargo.id,
      patronPeloId: patronSolido.id,
      comportamientoId: comportamientoAmigable.id,
      fechaNacimiento: new Date('2021-07-20'),
      sexo: 'Hembra',
      peso: 4.2,
      esterilizado: false,
      ruac: 'RUAC-LUNA-001',
      microchip: 'MC-LUNA-001',
      observaciones: 'Gata muy juguetona, come solo alimento húmedo',
      alergias: {
        create: [{ alergiaId: alergiaLactosa.id, notas: 'Evitar lácteos' }],
      },
    },
  });

  const mascotaRocky = await prisma.mascota.create({
    data: {
      propietarioId: usuarioMaria.id,
      nombre: 'Rocky',
      razaId: razaPastor.id,
      colorId: colorNegro.id,
      tipoPeloId: tipoPeloCorto.id,
      patronPeloId: patronSolido.id,
      comportamientoId: comportamientoTranquilo.id,
      fechaNacimiento: new Date('2019-11-10'),
      sexo: 'Macho',
      peso: 32.0,
      esterilizado: true,
      ruac: 'RUAC-ROCKY-001',
      microchip: 'MC-ROCKY-001',
      observaciones: 'Perro guardián, requiere ejercicio diario',
    },
  });

  // ── 9.5 Citas (8 citas) ──
  // Helper to create time
  const t = (h: number, m: number) => new Date(1970, 0, 1, h, m);

  const citaFido1 = await prisma.cita.create({
    data: {
      sucursalId: sucursalCentro.id,
      medicoId: medicoCarlos.id,
      mascotaId: mascotaFido.id,
      servicioId: servicioConsulta.id,
      fecha: new Date('2024-01-15'),
      horaInicio: t(10, 0),
      horaFin: t(11, 0),
      estado: 'completada',
      motivo: 'Consulta general de control',
    },
  });

  const citaFido2 = await prisma.cita.create({
    data: {
      sucursalId: sucursalCentro.id,
      medicoId: medicoCarlos.id,
      mascotaId: mascotaFido.id,
      servicioId: servicioConsulta.id,
      fecha: new Date('2024-03-20'),
      horaInicio: t(11, 0),
      horaFin: t(12, 0),
      estado: 'completada',
      motivo: 'Seguimiento post-cirugía',
    },
  });

  const citaFido3 = await prisma.cita.create({
    data: {
      sucursalId: sucursalNorte.id,
      medicoId: medicoAna.id,
      mascotaId: mascotaFido.id,
      servicioId: servicioConsulta.id,
      fecha: new Date('2024-05-10'),
      horaInicio: t(9, 0),
      horaFin: t(10, 0),
      estado: 'cancelada',
      motivo: 'Consulta dermatológica',
    },
  });

  const citaFido4 = await prisma.cita.create({
    data: {
      sucursalId: sucursalCentro.id,
      medicoId: medicoCarlos.id,
      mascotaId: mascotaFido.id,
      servicioId: servicioConsulta.id,
      fecha: new Date('2026-12-20'),
      horaInicio: t(10, 0),
      horaFin: t(11, 0),
      estado: 'pendiente',
      motivo: 'Revisión anual',
    },
  });

  const citaFido5 = await prisma.cita.create({
    data: {
      sucursalId: sucursalNorte.id,
      medicoId: medicoAna.id,
      mascotaId: mascotaFido.id,
      servicioId: servicioConsulta.id,
      fecha: new Date('2026-12-22'),
      horaInicio: t(14, 0),
      horaFin: t(15, 0),
      estado: 'pendiente_de_pago',
      motivo: 'Consulta dermatológica de seguimiento',
    },
  });

  const citaLuna1 = await prisma.cita.create({
    data: {
      sucursalId: sucursalNorte.id,
      medicoId: medicoAna.id,
      mascotaId: mascotaLuna.id,
      servicioId: servicioConsulta.id,
      fecha: new Date('2024-02-10'),
      horaInicio: t(15, 0),
      horaFin: t(16, 0),
      estado: 'completada',
      motivo: 'Problema de piel',
    },
  });

  const citaLuna2 = await prisma.cita.create({
    data: {
      sucursalId: sucursalCentro.id,
      medicoId: medicoCarlos.id,
      mascotaId: mascotaLuna.id,
      servicioId: servicioConsulta.id,
      fecha: new Date('2024-04-05'),
      horaInicio: t(9, 0),
      horaFin: t(10, 0),
      estado: 'inasistencia',
      motivo: 'Control de alergias',
    },
  });

  const citaRocky1 = await prisma.cita.create({
    data: {
      sucursalId: sucursalCentro.id,
      medicoId: medicoCarlos.id,
      mascotaId: mascotaRocky.id,
      servicioId: servicioConsulta.id,
      fecha: new Date('2024-06-12'),
      horaInicio: t(11, 0),
      horaFin: t(12, 0),
      estado: 'completada',
      motivo: 'Consulta ortopédica',
    },
  });

  // ── 9.6 Consultas (3) ──
  await prisma.consulta.create({
    data: {
      citaId: citaFido1.id,
      peso: 24.8,
      temperatura: 38.2,
      frecuenciaCardiaca: 110,
      frecuenciaRespiratoria: 28,
      presionArterial: '120/80',
      estadoGeneral: 'Bueno',
      notasEvolucion: 'Paciente estable',
    },
  });

  await prisma.consulta.create({
    data: {
      citaId: citaFido2.id,
      peso: 25.2,
      temperatura: 38.5,
      frecuenciaCardiaca: 115,
      frecuenciaRespiratoria: 30,
      presionArterial: '118/78',
      estadoGeneral: 'Excelente',
      notasEvolucion: 'Recuperación satisfactoria',
    },
  });

  await prisma.consulta.create({
    data: {
      citaId: citaLuna1.id,
      peso: 4.0,
      temperatura: 38.0,
      frecuenciaCardiaca: 140,
      frecuenciaRespiratoria: 32,
      presionArterial: '110/70',
      estadoGeneral: 'Bueno',
      notasEvolucion: 'Leve dermatitis tratada',
    },
  });

  // ── 9.7 Recetas (3) ──
  await prisma.receta.create({
    data: {
      citaId: citaFido1.id,
      medicoId: medicoCarlos.id,
      diagnostico: 'Infección leve de oído',
      observaciones: 'Aplicar gotas durante 7 días',
      detalles: {
        create: [
          {
            medicamento: 'Amoxicilina',
            dosis: '500mg',
            frecuencia: 'Cada 12 horas',
            duracion: '7 días',
            viaAdministracion: 'Oral',
            instrucciones: 'Tomar con comida',
          },
          {
            medicamento: 'Protector gástrico',
            dosis: '20mg',
            frecuencia: 'Una vez al día',
            duracion: '7 días',
            viaAdministracion: 'Oral',
            instrucciones: '30 minutos antes del antibiótico',
          },
        ],
      },
    },
  });

  await prisma.receta.create({
    data: {
      citaId: citaFido2.id,
      medicoId: medicoCarlos.id,
      diagnostico: 'Control rutinario post-cirugía',
      observaciones: 'Herida cicatrizando bien',
      detalles: {
        create: [
          {
            medicamento: 'Suplemento vitamínico',
            dosis: '1 tableta',
            frecuencia: 'Una vez al día',
            duracion: '30 días',
            viaAdministracion: 'Oral',
            instrucciones: 'Con el desayuno',
          },
        ],
      },
    },
  });

  await prisma.receta.create({
    data: {
      citaId: citaLuna1.id,
      medicoId: medicoAna.id,
      diagnostico: 'Dermatitis alérgica',
      observaciones: 'Evitar contacto con alérgenos identificados',
      detalles: {
        create: [
          {
            medicamento: 'Antihistamínico',
            dosis: '5mg',
            frecuencia: 'Cada 24 horas',
            duracion: '14 días',
            viaAdministracion: 'Oral',
            instrucciones: 'Administrar por la noche',
          },
          {
            medicamento: 'Shampoo medicado',
            dosis: 'Aplicación tópica',
            frecuencia: 'Cada 3 días',
            duracion: '1 mes',
            viaAdministracion: 'Tópica',
            instrucciones: 'Enjuagar bien después de 5 minutos',
          },
        ],
      },
    },
  });

  // ── 9.8 Pagos (8) ──
  let folioCounter = 1;
  const nextFolio = (fecha: Date) => {
    const prefix = fecha.toISOString().split('T')[0].replace(/-/g, '');
    const num = String(folioCounter++).padStart(4, '0');
    return `VET-${prefix}-${num}`;
  };

  const pagosData: {
    citaId: string;
    estado: EstadoPago;
    fechaPago: Date | null;
    cantidad: number;
  }[] = [
    {
      citaId: citaFido1.id,
      estado: 'pagada',
      fechaPago: new Date('2024-01-15'),
      cantidad: Number(espCirugia.precio),
    },
    {
      citaId: citaFido2.id,
      estado: 'pagada',
      fechaPago: new Date('2024-03-20'),
      cantidad: Number(espCirugia.precio),
    },
    {
      citaId: citaFido3.id,
      estado: 'cancelada',
      fechaPago: null,
      cantidad: Number(espDermato.precio),
    },
    {
      citaId: citaFido4.id,
      estado: 'pendiente',
      fechaPago: null,
      cantidad: Number(espCirugia.precio),
    },
    {
      citaId: citaFido5.id,
      estado: 'pendiente',
      fechaPago: null,
      cantidad: Number(espDermato.precio),
    },
    {
      citaId: citaLuna1.id,
      estado: 'pagada',
      fechaPago: new Date('2024-02-10'),
      cantidad: Number(espDermato.precio),
    },
    {
      citaId: citaLuna2.id,
      estado: 'pagada',
      fechaPago: new Date('2024-04-05'),
      cantidad: Number(espCirugia.precio),
    },
    {
      citaId: citaRocky1.id,
      estado: 'pagada',
      fechaPago: new Date('2024-06-12'),
      cantidad: Number(espCirugia.precio),
    },
  ];

  for (const p of pagosData) {
    const cita = await prisma.cita.findUnique({ where: { id: p.citaId } });
    if (cita) {
      await prisma.pago.create({
        data: {
          citaId: p.citaId,
          folioPago: nextFolio(cita.fecha),
          cantidad: p.cantidad || 350.0,
          estado: p.estado,
          fechaPago: p.fechaPago,
        },
      });
    }
  }

  console.log('Seed complete. Demo data created:');
  console.log(`  - 2 clientes (Juan, María)`);
  console.log(`  - 2 médicos (Dr. Carlos, Dra. Ana)`);
  console.log(`  - 3 mascotas (Fido, Luna, Rocky)`);
  console.log(
    `  - 8 citas (completadas, canceladas, pendientes, inasistencia)`,
  );
  console.log(`  - 3 consultas + 3 recetas + 8 pagos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
