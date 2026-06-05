# 📚 Techside Veterinary API Documentation

Documentación completa de la API REST para el equipo de frontend.

---

## 🌐 Base URL

```
http://localhost:3000
```

Todos los endpoints están bajo el prefijo implícito del servidor.

---

## 🔐 Autenticación

La API usa **JWT Bearer Token**. Incluir el token en el header de cada request:

```http
Authorization: Bearer <access_token>
```

### Obtener token

#### `POST /auth/login`

**Body:**
```json
{
  "emailOrPhone": "string",  // Email o teléfono
  "password": "string"       // Mínimo 8 caracteres
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "rol": "cliente"
  }
}
```

**Notas:**
- Si el usuario es médico (`rol: "medico"`), se registra automáticamente su asistencia.
- Rate limit: 5 intentos por 15 minutos.

---

## 👤 Registro de Usuarios

#### `POST /auth/register`

**Content-Type:** `multipart/form-data`

**Body fields:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | ✅ | Correo electrónico válido |
| `password` | string | ✅ | Mínimo 8 caracteres |
| `rol` | string | ✅ | `cliente`, `medico`, `admin` |
| `nombreCompleto` | string | ✅ | Nombre completo |
| `telefono` | string | ✅ | Teléfono (se normaliza) |
| `telefonoSecundario` | string | ❌ | Teléfono alternativo |
| `calle` | string | ✅ | Dirección |
| `numExterior` | string | ❌ | Número exterior |
| `numInterior` | string | ❌ | Número interior |
| `sucursalId` | UUID | ✅ | ID de la sucursal |
| `addressDoc` | File | ✅ | PDF/JPG/PNG - Comprobante de domicilio |
| `identityDoc` | File | ✅ | PDF/JPG/PNG - Identificación |

**Response 201:**
```json
{
  "message": "Te enviamos un correo para continuar..."
}
```

**Notas:**
- Solo admin puede registrar médicos u otros admins.
- Si el email/teléfono ya existe, devuelve 201 genérico (por seguridad).

---

## 🐕 Mascotas

### Crear mascota

#### `POST /mascotas`

**Auth:** Requiere JWT (cliente)

**Content-Type:** `multipart/form-data`

**Body fields:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nombre` | string | ✅ | Nombre de la mascota |
| `razaId` | UUID | ❌ | ID de la raza |
| `colorId` | UUID | ❌ | ID del color |
| `tipoPeloId` | UUID | ❌ | ID del tipo de pelo |
| `patronPeloId` | UUID | ❌ | ID del patrón de pelo |
| `comportamientoId` | UUID | ❌ | ID del comportamiento |
| `fechaNacimiento` | string (ISO) | ❌ | Fecha de nacimiento |
| `sexo` | string | ❌ | `Macho` o `Hembra` |
| `peso` | number | ❌ | Peso en kg |
| `esterilizado` | boolean | ❌ | `true` o `false` |
| `ruac` | string | ❌ | Registro único |
| `microchip` | string | ❌ | Número de microchip |
| `tatuaje` | string | ❌ | Número de tatuaje |
| `observaciones` | string | ❌ | Notas adicionales |
| `alergiaIds` | UUID[] | ❌ | IDs de alergias (puede ser array o string único) |
| `foto` | File | ❌ | Foto de perfil |
| `carnet` | File | ❌ | Carnet de vacunación |

**Response:**
```json
{
  "id": "uuid",
  "nombre": "Firulais",
  "razaId": "uuid",
  "colorId": "uuid",
  ...
}
```

---

### Listar mascotas del usuario

#### `GET /mascotas`

**Auth:** Requiere JWT (cliente)

**Response:** Array de mascotas del usuario autenticado.

---

### Obtener una mascota

#### `GET /mascotas/:id`

**Auth:** Requiere JWT (cliente)

**Response:** Datos completos de la mascota (incluye raza, color, alergias, etc.)

---

### Actualizar mascota

#### `PATCH /mascotas/:id`

**Auth:** Requiere JWT (cliente)

**Content-Type:** `multipart/form-data`

Mismos campos que POST, todos opcionales. Se pueden subir nuevos `foto` y `carnet`.

---

## 📋 Catálogos

Todos los endpoints de catálogos requieren JWT.

#### `GET /catalogos/especies`

Lista todas las especies.

#### `GET /catalogos/razas?especieId=<UUID>`

Lista razas. Si se pasa `especieId`, filtra por especie.

#### `GET /catalogos/colores`

Lista todos los colores.

#### `GET /catalogos/tipos-pelo`

Lista todos los tipos de pelo.

#### `GET /catalogos/patrones-pelo`

Lista todos los patrones de pelo.

#### `GET /catalogos/comportamientos`

Lista todos los comportamientos.

#### `GET /catalogos/alergias`

Lista todas las alergias del catálogo.

**Response ejemplo:**
```json
[
  { "id": "uuid", "nombre": "Canino" }
]
```

---

## 🏥 Sucursales (MxDivisiones)

#### `GET /mx-divisiones`

Lista todas las sucursales/divisiones.

#### `GET /mx-divisiones/:id`

Obtiene una sucursal por ID.

**Response:**
```json
{
  "id": "uuid",
  "nombre": "Vetec Centro",
  "clave": "VTC-001",
  "direccion": "Av. Principal 100",
  "telefono": "55512345678",
  "activo": true
}
```

---

## 📅 Citas

### Crear cita

#### `POST /api/v1/citas`

**Auth:** Requiere JWT (cliente o admin)

**Body:**
```json
{
  "sucursalId": "uuid",
  "medicoId": "uuid",
  "mascotaId": "uuid",
  "consultorioId": "uuid",
  "servicioId": "uuid",
  "fecha": "2026-12-31",      // Formato YYYY-MM-DD
  "horaInicio": "10:00",      // Formato HH:MM
  "motivo": "Consulta general" // Opcional, máx 500 chars
}
```

**Validaciones:**
- Mínimo 24 horas de anticipación
- No puede haber 2 citas del mismo paciente con el mismo médico el mismo día
- No traslape de horarios para médico, consultorio ni paciente
- Si es en otra sucursal, debe haber 2h de diferencia con otras citas

**Response:**
```json
{
  "id": "uuid",
  "sucursalId": "uuid",
  "medicoId": "uuid",
  "mascotaId": "uuid",
  "consultorioId": "uuid",
  "servicioId": "uuid",
  "fecha": "2026-12-31T00:00:00.000Z",
  "horaInicio": "1970-01-01T10:00:00.000Z",
  "horaFin": "1970-01-01T11:00:00.000Z",
  "estado": "pendiente",
  "motivo": "Consulta general",
  "sucursal": { ... },
  "medico": { ... },
  "mascota": { ... },
  "consultorio": { ... },
  "servicio": { ... }
}
```

---

### Listar citas

#### `GET /api/v1/citas`

**Auth:** Requiere JWT

- **Cliente:** ve solo sus citas (por sus mascotas)
- **Médico:** ve solo sus citas
- **Admin:** ve todas

**Response:** Array de citas con relaciones incluidas.

---

### Obtener una cita

#### `GET /api/v1/citas/:id`

**Auth:** Requiere JWT

**Response:** Cita completa con receta y consulta (si existen).

---

### Consultar disponibilidad

#### `GET /api/v1/citas/disponibilidad?medicoId=<UUID>&fecha=YYYY-MM-DD`

**Auth:** Requiere JWT (o puede ser público)

**Response:**
```json
{
  "slots": [
    {
      "horaInicio": "09:00",
      "horaFin": "10:00",
      "disponible": true
    },
    {
      "horaInicio": "10:00",
      "horaFin": "11:00",
      "disponible": false
    }
  ]
}
```

---

### Actualizar cita

#### `PATCH /api/v1/citas/:id`

**Auth:** Requiere JWT (cliente propietario o admin)

**Body:** Campos opcionales (mismos que POST, excepto mascotaId).

**Nota:** No se puede modificar si está completada, en curso o cancelada.

---

### Cancelar cita

#### `DELETE /api/v1/citas/:id`

**Auth:** Requiere JWT (cliente propietario o admin)

Cambia el estado a `cancelada`. Solo funciona si está `pendiente` o `en_curso`.

---

### Cambiar estado de cita

#### `PATCH /api/v1/citas/:id/estado`

**Auth:** Requiere JWT (médico de la cita o admin)

**Body:**
```json
{
  "estado": "en_curso"  // "en_curso" | "completada" | "inasistencia" | "cancelada"
}
```

**Transiciones permitidas:**
- `pendiente` → `en_curso`, `cancelada`
- `en_curso` → `completada`, `inasistencia`, `cancelada`
- `completada`, `inasistencia`, `cancelada` → (no se puede cambiar)

---

## 👨‍⚕️ Médicos

### Listar médicos

#### `GET /api/v1/medicos`

**Auth:** Requiere JWT

**Response:** Array de médicos con usuario, sucursal, especialidad y horarios.

---

### Obtener médico

#### `GET /api/v1/medicos/:id`

**Auth:** Requiere JWT

---

### Crear médico

#### `POST /api/v1/medicos`

**Auth:** Requiere JWT (solo admin)

**Body:**
```json
{
  "usuarioId": "uuid",
  "sucursalId": "uuid",           // Opcional
  "especialidadPrincipalId": "uuid", // Opcional
  "cedulaProfesional": "string",    // Opcional
  "biografiaCorta": "string"        // Opcional
}
```

**Nota:** El usuario debe tener rol `medico`. Solo un médico por usuario.

---

### Actualizar médico

#### `PATCH /api/v1/medicos/:id`

**Auth:** Requiere JWT (solo admin)

---

### Horarios

#### `POST /api/v1/medicos/:id/horarios`

**Auth:** Requiere JWT (solo admin)

**Body:**
```json
{
  "diaSemana": "lunes",    // "domingo" | "lunes" | ... | "sabado"
  "horaInicio": "09:00",   // HH:MM
  "horaFin": "14:00"       // HH:MM
}
```

**Franjas permitidas:**
- Entre semana (lunes-viernes): `07:00-14:00` o `14:00-21:00`
- Fin de semana (sábado-domingo): `07:00-23:00`

**Validaciones:**
- No puede haber traslape con otro horario del mismo médico
- No puede haber duplicado (mismo día + hora inicio)

---

#### `GET /api/v1/medicos/:id/horarios`

**Auth:** Requiere JWT

Lista horarios ordenados por día y hora.

---

#### `PATCH /api/v1/medicos/:id/horarios/:horarioId`

**Auth:** Requiere JWT (solo admin)

---

#### `DELETE /api/v1/medicos/:id/horarios/:horarioId`

**Auth:** Requiere JWT (solo admin)

---

### Asistencias

#### `POST /api/v1/medicos/:id/asistencias`

**Auth:** Requiere JWT (solo admin)

Registro manual de asistencia.

**Body:**
```json
{
  "fecha": "2026-06-10",
  "horaEntradaReal": "08:55",
  "horaSalidaReal": "14:05",
  "estado": "asistencia",  // "asistencia" | "falta" | "retardo" | "justificado" | "incapacidad"
  "observaciones": "string"
}
```

---

#### `GET /api/v1/medicos/:id/asistencias?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`

**Auth:** Requiere JWT (admin o el propio médico)

---

#### `POST /api/v1/medicos/:id/asistencias/salida`

**Auth:** Requiere JWT (médico propio o admin)

Marca la hora de salida para el día actual.

**Nota:** La entrada se marca automáticamente cuando el médico inicia sesión.

---

## 💊 Recetas

### Generar receta (al completar cita)

#### `POST /api/v1/recetas`

**Auth:** Requiere JWT (médico de la cita o admin)

**Body:**
```json
{
  "citaId": "uuid",
  "diagnostico": "string",
  "observaciones": "string",
  "detalles": [
    {
      "medicamento": "Amoxicilina",
      "dosis": "500mg",
      "frecuencia": "Cada 8 horas",
      "duracion": "7 días",
      "viaAdministracion": "Oral",
      "instrucciones": "Tomar con comida"
    }
  ]
}
```

**Validaciones:**
- La cita debe estar en estado `en_curso`
- Solo el médico asignado puede generar la receta
- Máximo 20 medicamentos
- La receta es **inmutable** (no se puede editar ni eliminar)

**Efecto secundario:** La cita cambia a estado `completada`.

---

### Listar recetas

#### `GET /api/v1/recetas`

**Auth:** Requiere JWT

- **Médico:** ve sus recetas
- **Admin:** ve todas
- **Cliente:** ve recetas de sus mascotas

---

### Obtener receta

#### `GET /api/v1/recetas/:id`

**Auth:** Requiere JWT

---

### Obtener receta por cita

#### `GET /api/v1/recetas/cita/:citaId`

**Auth:** Requiere JWT

---

## 🩺 Consultas

### Registrar consulta

#### `POST /api/v1/consultas`

**Auth:** Requiere JWT (médico de la cita o admin)

**Body:**
```json
{
  "citaId": "uuid",
  "peso": 12.5,
  "temperatura": 38.5,
  "frecuenciaCardiaca": 120,
  "frecuenciaRespiratoria": 30,
  "presionArterial": "120/80",
  "estadoGeneral": "Bueno",
  "notasEvolucion": "Paciente estable"
}
```

**Validaciones:**
- La cita debe estar `en_curso` o `completada`
- Solo una consulta por cita (1:1)

---

### Listar consultas

#### `GET /api/v1/consultas`

**Auth:** Requiere JWT

---

### Obtener consulta

#### `GET /api/v1/consultas/:id`

**Auth:** Requiere JWT

---

### Obtener consulta por cita

#### `GET /api/v1/consultas/cita/:citaId`

**Auth:** Requiere JWT

---

### Actualizar consulta

#### `PATCH /api/v1/consultas/:id`

**Auth:** Requiere JWT (médico de la cita o admin)

**Body:** Campos opcionales (mismos que POST).

---

## ⚠️ Códigos de Error

| Código | Significado | Cuándo ocurre |
|--------|-------------|---------------|
| `400` | Bad Request | Datos inválidos, validación fallida |
| `401` | Unauthorized | Token JWT ausente o inválido |
| `403` | Forbidden | Sin permisos para la acción |
| `404` | Not Found | Recurso no existe |
| `409` | Conflict | Conflicto de negocio (traslape, duplicado) |
| `429` | Too Many Requests | Rate limit excedido |

**Error response:**
```json
{
  "statusCode": 400,
  "message": "Descripción del error",
  "error": "Bad Request"
}
```

---

## 🔒 Roles y Permisos

| Endpoint | Cliente | Médico | Admin |
|----------|---------|--------|-------|
| `POST /auth/login` | ✅ | ✅ | ✅ |
| `POST /auth/register` | ✅ (self) | ❌ (admin) | ✅ (admin) |
| `GET /mascotas` | ✅ (suyas) | ❌ | ✅ |
| `POST /mascotas` | ✅ | ❌ | ✅ |
| `GET /catalogos/*` | ✅ | ✅ | ✅ |
| `POST /api/v1/citas` | ✅ | ❌ | ✅ |
| `GET /api/v1/citas` | ✅ (suyas) | ✅ (suyas) | ✅ |
| `PATCH /api/v1/citas/:id/estado` | ❌ | ✅ (suya) | ✅ |
| `POST /api/v1/recetas` | ❌ | ✅ (suya) | ✅ |
| `POST /api/v1/consultas` | ❌ | ✅ (suya) | ✅ |
| `POST /api/v1/medicos` | ❌ | ❌ | ✅ |
| `POST /api/v1/medicos/:id/horarios` | ❌ | ❌ | ✅ |

---

## 📊 Base de Datos — Diagrama de Relaciones

```
Usuario (1:1) → Persona
Usuario (1:N) → Mascota
Usuario (1:1) → Medico

Mascota (N:1) → Raza → Especie
Mascota (N:1) → Color
Mascota (N:1) → TipoPelo
Mascota (N:1) → PatronPelo
Mascota (N:1) → Comportamiento
Mascota (N:M) → CatalogoAlergia

Cita (N:1) → Sucursal
Cita (N:1) → Medico
Cita (N:1) → Mascota
Cita (N:1) → Consultorio
Cita (N:1) → Servicio
Cita (1:1) → Receta
Cita (1:1) → Consulta

Receta (1:N) → DetalleReceta

Medico (1:N) → MedicoHorario
Medico (1:N) → MedicoAsistencia
Medico (N:1) → Especialidad
Medico (N:1) → Sucursal

Sucursal (N:M) → Especialidad
Sucursal (1:N) → Consultorio
```

---

## 🧪 Flujo Típico (Frontend)

### 1. Agendar una cita
```
GET /catalogos/servicios        → Obtener servicios disponibles
GET /api/v1/medicos             → Obtener médicos
GET /api/v1/citas/disponibilidad?medicoId=X&fecha=YYYY-MM-DD
                                → Ver slots disponibles
POST /api/v1/citas              → Crear cita
```

### 2. El médico atiende
```
PATCH /api/v1/citas/:id/estado  → { "estado": "en_curso" }
POST /api/v1/consultas          → Registrar datos clínicos
POST /api/v1/recetas            → Generar receta (completa la cita)
```

### 3. Ver historial
```
GET /api/v1/citas               → Listar citas
GET /api/v1/recetas/cita/:id    → Ver receta de una cita
GET /api/v1/consultas/cita/:id  → Ver consulta de una cita
```

---

*Documentación generada el 2026-06-05. Para actualizaciones, revisar los controllers en `src/`. *
