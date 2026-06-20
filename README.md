# 🏥 Techside Veterinary API

Backend API para clínica veterinaria. Sistema de agendamiento de citas, gestión de médicos, recetas médicas y historial clínico.

## 🚀 Tecnologías

- **Framework:** [NestJS](https://nestjs.com/) (Node.js/TypeScript)
- **ORM:** [Prisma](https://prisma.io/)
- **Base de datos:** PostgreSQL
- **Auth:** JWT + bcrypt
- **Validación:** Zod
- **Tests:** Jest

## 📋 Requisitos

- Node.js 20+
- PostgreSQL 15+
- pnpm

## ⚙️ Configuración

1. **Clonar el repo**
   ```bash
   git clone <repo-url>
   cd techside-veterinary
   ```

2. **Instalar dependencias**
   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   Editar `.env` con tus credenciales de PostgreSQL.

4. **Generar Prisma Client y correr migraciones**
   ```bash
   pnpm run db:generate
   pnpm run db:deploy
   ```

5. **Seed de datos**
   ```bash
   pnpm run db:seed
   ```

## 🏃 Correr el proyecto

```bash
# Desarrollo
pnpm run start:dev

# Producción
pnpm run build
pnpm run start:prod
```

La API estará disponible en `http://localhost:3000`

## 🧪 Tests

```bash
# Unit tests
pnpm test

# Coverage
pnpm run test:cov

# E2E
pnpm run test:e2e
```

**Estado actual:** 41 suites, 315 tests — todos pasan ✅

## 📚 Documentación de API

Ver [`API-DOCS.md`](./API-DOCS.md) para documentación completa de todos los endpoints.

También puedes consultar la documentación interactiva de Swagger UI en `/api/docs` cuando el servidor esté corriendo.

### Módulos implementados

| Módulo | Endpoints | Descripción |
|--------|-----------|-------------|
| **Auth** | `POST /auth/login`, `POST /auth/register` | Login JWT y registro de usuarios |
| **Usuarios** | `GET /usuarios` | Búsqueda paginada de usuarios |
| **Personas** | `GET /personas/me`, `PATCH /personas/me` | Perfil del usuario autenticado |
| **Mascotas** | `POST/GET/PATCH /mascotas` | Gestión de mascotas del cliente |
| **Catálogos** | `GET /catalogos/*` | Especies, razas, colores, alergias, servicios, etc. |
| **Citas** | `POST/GET/PATCH/DELETE /api/v1/citas` | Agendamiento con validaciones de negocio |
| **Médicos** | `POST/GET/PATCH /api/v1/medicos` | Perfiles, horarios y asistencias |
| **Especialidades** | `GET /api/v1/especialidades` | Especialidades médicas |
| **Recetas** | `POST/GET /api/v1/recetas` | Generación al completar cita |
| **Consultas** | `POST/GET/PATCH /api/v1/consultas` | Datos clínicos de la atención |
| **Pagos** | `POST/GET /api/v1/pagos` | Gestión de pagos por folio |
| **Historial Médico** | `GET /mascotas/:id/historial/*`, `GET /admin/historial-mascotas` | Historial clínico y dashboard admin |

## 🗄️ Base de Datos

### Modelos principales

```
Usuario → Persona
Usuario → Mascota
Usuario → Medico

Mascota → Raza → Especie
Mascota → Color
Mascota → TipoPelo
Mascota → PatronPelo
Mascota → Comportamiento

Cita → Sucursal
Cita → Medico
Cita → Mascota
Cita → Consultorio
Cita → Servicio
Cita → Receta (1:1)
Cita → Consulta (1:1)

Receta → DetalleReceta (1:N)
Medico → MedicoHorario (1:N)
Medico → MedicoAsistencia (1:N)
```

### Estados de cita

```
pendiente → en_curso → completada
              ↓
         inasistencia
              ↓
          cancelada
```

## 🔐 Autenticación

La API usa JWT Bearer Token. Obtener token:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"admin@vetec.local","password":"AdminPass123"}'
```

Incluir en headers:
```http
Authorization: Bearer <token>
```

## 🧑‍💻 Roles

| Rol | Permisos |
|-----|----------|
| `cliente` | Registrar mascotas, agendar citas, ver sus recetas |
| `medico` | Atender citas, generar recetas, registrar consultas, ver horarios |
| `admin` | Todo lo anterior + gestionar médicos, horarios, asistencias |

## 📁 Estructura del proyecto

```
src/
├── auth/              # Login, register, JWT
├── citas/             # Agendamiento y validaciones
├── consultas/         # Datos clínicos
├── medicos/           # Médicos, horarios, asistencias
├── recetas/           # Recetas médicas
├── mascotas/          # Gestión de mascotas
├── catalogos/         # Catálogos (especies, razas, etc.)
├── mx-divisiones/     # Sucursales
├── personas/          # Datos personales y perfil del usuario autenticado
├── usuarios/          # Gestión de usuarios
├── historial-medico/  # Historial clínico y dashboard admin
├── common/            # Guards, pipes, decorators, filters
├── prisma/            # Prisma service
└── config/            # Configuración y validación de env
```

## 📝 Scripts útiles

```bash
# Prisma
pnpm run db:migrate        # Crear migración en desarrollo
pnpm run db:deploy         # Aplicar migraciones en producción
pnpm run db:seed           # Poblar base de datos
pnpm run db:studio         # UI visual de la BD

# Lint y format
pnpm run lint
pnpm run format
```

## 🤝 Contribuir

1. Crear rama desde `main`
2. Implementar cambios con tests
3. Abrir Pull Request
4. Revisión de código antes de merge

## 📄 Licencia

[MIT](LICENSE)
