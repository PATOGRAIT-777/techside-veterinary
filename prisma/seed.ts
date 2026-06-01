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

  // 2. Seed first admin
  const adminPersona = await prisma.persona.create({
    data: {
      nombreCompleto: 'Administrador Sistema',
      telefono: '55500000000',
      calle: 'Oficina Central',
      sucursalId: 1,
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
