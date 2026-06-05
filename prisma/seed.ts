import { PrismaClient, UsuarioStatus, Rol } from '@prisma/client';
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

  // 3. Seed first admin
  const adminPersona = await prisma.persona.create({
    data: {
      nombreCompleto: 'Administrador Sistema',
      telefono: '55500000000',
      calle: 'Oficina Central',
      sucursalId: branch.id,
    },
  });

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

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
