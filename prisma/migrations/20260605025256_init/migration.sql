-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('cliente', 'medico', 'admin');

-- CreateEnum
CREATE TYPE "UsuarioStatus" AS ENUM ('activo', 'pendiente', 'inactivo');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('pendiente', 'en_curso', 'inasistencia', 'completada', 'cancelada');

-- CreateEnum
CREATE TYPE "EstadoAsistencia" AS ENUM ('asistencia', 'falta', 'retardo', 'justificado', 'incapacidad');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado');

-- CreateTable
CREATE TABLE "mx_divisiones" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "clave" VARCHAR(20) NOT NULL,
    "direccion" VARCHAR(255),
    "telefono" VARCHAR(15),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mx_divisiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona" (
    "id" UUID NOT NULL,
    "nombre_completo" VARCHAR(200) NOT NULL,
    "telefono" VARCHAR(15) NOT NULL,
    "telefono_secundario" VARCHAR(15),
    "calle" VARCHAR(200) NOT NULL,
    "num_exterior" VARCHAR(20),
    "num_interior" VARCHAR(20),
    "sucursal_id" UUID NOT NULL,
    "proof_address_id" UUID,
    "proof_id_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "telefono" VARCHAR(15) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "status" "UsuarioStatus" NOT NULL DEFAULT 'pendiente',
    "persona_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos" (
    "id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "mime" VARCHAR(100) NOT NULL,
    "tamano" INTEGER NOT NULL,
    "subido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "especies" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "especies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "razas" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "especie_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "razas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colores" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_pelo" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_pelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrones_pelo" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patrones_pelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comportamientos" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "requiere_bozal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comportamientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_alergias" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_alergias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mascotas" (
    "id" UUID NOT NULL,
    "propietario_id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "raza_id" UUID,
    "color_id" UUID,
    "tipo_pelo_id" UUID,
    "patron_pelo_id" UUID,
    "comportamiento_id" UUID,
    "fecha_nacimiento" TIMESTAMP(3),
    "sexo" VARCHAR(20),
    "peso" DECIMAL(10,3),
    "esterilizado" BOOLEAN NOT NULL DEFAULT false,
    "ruac" VARCHAR(50),
    "microchip" VARCHAR(100),
    "tatuaje" VARCHAR(100),
    "foto_perfil_id" UUID,
    "carnet_vacunacion_id" UUID,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mascotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mascota_alergias" (
    "mascota_id" UUID NOT NULL,
    "alergia_id" UUID NOT NULL,
    "notas" VARCHAR(500),

    CONSTRAINT "mascota_alergias_pkey" PRIMARY KEY ("mascota_id","alergia_id")
);

-- CreateTable
CREATE TABLE "sucursales" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "calle_numero" VARCHAR(255),
    "ubicacion_id" UUID,
    "mapa_coords" VARCHAR(100),
    "descripcion_web" TEXT,
    "horario_atencion" VARCHAR(255),
    "foto_portada_id" UUID,
    "telefono_principal" VARCHAR(20),
    "whatsapp" VARCHAR(20),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultorios" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "equipamiento" TEXT,

    CONSTRAINT "consultorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "especialidades" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "especialidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "precio_base" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sucursales_especialidades" (
    "sucursal_id" UUID NOT NULL,
    "especialidad_id" UUID NOT NULL,

    CONSTRAINT "sucursales_especialidades_pkey" PRIMARY KEY ("sucursal_id","especialidad_id")
);

-- CreateTable
CREATE TABLE "medicos" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "sucursal_id" UUID,
    "especialidad_principal_id" UUID,
    "cedula_profesional" VARCHAR(50),
    "biografia_corta" TEXT,

    CONSTRAINT "medicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medico_horarios" (
    "id" UUID NOT NULL,
    "medico_id" UUID NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,

    CONSTRAINT "medico_horarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medico_asistencias" (
    "id" UUID NOT NULL,
    "medico_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_entrada_real" TIME,
    "hora_salida_real" TIME,
    "estado" "EstadoAsistencia" NOT NULL,
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medico_asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citas" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "medico_id" UUID NOT NULL,
    "mascota_id" UUID NOT NULL,
    "consultorio_id" UUID NOT NULL,
    "servicio_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'pendiente',
    "motivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recetas" (
    "id" UUID NOT NULL,
    "cita_id" UUID NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "observaciones" TEXT,
    "fecha_receta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "medico_id" UUID NOT NULL,

    CONSTRAINT "recetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_receta" (
    "id" UUID NOT NULL,
    "receta_id" UUID NOT NULL,
    "medicamento" VARCHAR(500) NOT NULL,
    "dosis" VARCHAR(255) NOT NULL,
    "frecuencia" VARCHAR(255) NOT NULL,
    "duracion" VARCHAR(255) NOT NULL,
    "via_administracion" VARCHAR(255) NOT NULL,
    "instrucciones" TEXT,

    CONSTRAINT "detalles_receta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultas" (
    "id" UUID NOT NULL,
    "cita_id" UUID NOT NULL,
    "peso" DECIMAL(10,3),
    "temperatura" DECIMAL(5,2),
    "frecuencia_cardiaca" INTEGER,
    "frecuencia_respiratoria" INTEGER,
    "presion_arterial" VARCHAR(20),
    "estado_general" VARCHAR(500),
    "notas_evolucion" TEXT,

    CONSTRAINT "consultas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mx_divisiones_clave_key" ON "mx_divisiones"("clave");

-- CreateIndex
CREATE INDEX "persona_telefono_idx" ON "persona"("telefono");

-- CreateIndex
CREATE INDEX "persona_sucursal_id_idx" ON "persona"("sucursal_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_telefono_key" ON "usuario"("telefono");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_persona_id_key" ON "usuario"("persona_id");

-- CreateIndex
CREATE INDEX "usuario_email_idx" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_telefono_idx" ON "usuario"("telefono");

-- CreateIndex
CREATE INDEX "usuario_rol_idx" ON "usuario"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_token_idx" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_usuario_id_idx" ON "email_verification_tokens"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_usuario_id_idx" ON "password_reset_tokens"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "especies_nombre_key" ON "especies"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "razas_especie_id_nombre_key" ON "razas"("especie_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "colores_nombre_key" ON "colores"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_pelo_nombre_key" ON "tipos_pelo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "patrones_pelo_nombre_key" ON "patrones_pelo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "comportamientos_nombre_key" ON "comportamientos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_alergias_nombre_key" ON "catalogo_alergias"("nombre");

-- CreateIndex
CREATE INDEX "sucursales_ubicacion_id_idx" ON "sucursales"("ubicacion_id");

-- CreateIndex
CREATE INDEX "sucursales_activo_idx" ON "sucursales"("activo");

-- CreateIndex
CREATE INDEX "consultorios_sucursal_id_idx" ON "consultorios"("sucursal_id");

-- CreateIndex
CREATE UNIQUE INDEX "especialidades_nombre_key" ON "especialidades"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "servicios_nombre_key" ON "servicios"("nombre");

-- CreateIndex
CREATE INDEX "sucursales_especialidades_especialidad_id_idx" ON "sucursales_especialidades"("especialidad_id");

-- CreateIndex
CREATE UNIQUE INDEX "medicos_usuario_id_key" ON "medicos"("usuario_id");

-- CreateIndex
CREATE INDEX "medicos_sucursal_id_idx" ON "medicos"("sucursal_id");

-- CreateIndex
CREATE INDEX "medicos_especialidad_principal_id_idx" ON "medicos"("especialidad_principal_id");

-- CreateIndex
CREATE INDEX "medico_horarios_medico_id_idx" ON "medico_horarios"("medico_id");

-- CreateIndex
CREATE UNIQUE INDEX "medico_horarios_medico_id_diaSemana_hora_inicio_key" ON "medico_horarios"("medico_id", "diaSemana", "hora_inicio");

-- CreateIndex
CREATE INDEX "medico_asistencias_medico_id_idx" ON "medico_asistencias"("medico_id");

-- CreateIndex
CREATE INDEX "medico_asistencias_fecha_idx" ON "medico_asistencias"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "medico_asistencias_medico_id_fecha_key" ON "medico_asistencias"("medico_id", "fecha");

-- CreateIndex
CREATE INDEX "citas_sucursal_id_idx" ON "citas"("sucursal_id");

-- CreateIndex
CREATE INDEX "citas_medico_id_idx" ON "citas"("medico_id");

-- CreateIndex
CREATE INDEX "citas_mascota_id_idx" ON "citas"("mascota_id");

-- CreateIndex
CREATE INDEX "citas_consultorio_id_idx" ON "citas"("consultorio_id");

-- CreateIndex
CREATE INDEX "citas_servicio_id_idx" ON "citas"("servicio_id");

-- CreateIndex
CREATE INDEX "citas_fecha_idx" ON "citas"("fecha");

-- CreateIndex
CREATE INDEX "citas_estado_idx" ON "citas"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "recetas_cita_id_key" ON "recetas"("cita_id");

-- CreateIndex
CREATE INDEX "recetas_medico_id_idx" ON "recetas"("medico_id");

-- CreateIndex
CREATE INDEX "detalles_receta_receta_id_idx" ON "detalles_receta"("receta_id");

-- CreateIndex
CREATE UNIQUE INDEX "consultas_cita_id_key" ON "consultas"("cita_id");

-- AddForeignKey
ALTER TABLE "persona" ADD CONSTRAINT "persona_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "mx_divisiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "razas" ADD CONSTRAINT "razas_especie_id_fkey" FOREIGN KEY ("especie_id") REFERENCES "especies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascotas" ADD CONSTRAINT "mascotas_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascotas" ADD CONSTRAINT "mascotas_raza_id_fkey" FOREIGN KEY ("raza_id") REFERENCES "razas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascotas" ADD CONSTRAINT "mascotas_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascotas" ADD CONSTRAINT "mascotas_tipo_pelo_id_fkey" FOREIGN KEY ("tipo_pelo_id") REFERENCES "tipos_pelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascotas" ADD CONSTRAINT "mascotas_patron_pelo_id_fkey" FOREIGN KEY ("patron_pelo_id") REFERENCES "patrones_pelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascotas" ADD CONSTRAINT "mascotas_comportamiento_id_fkey" FOREIGN KEY ("comportamiento_id") REFERENCES "comportamientos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascotas" ADD CONSTRAINT "mascotas_foto_perfil_id_fkey" FOREIGN KEY ("foto_perfil_id") REFERENCES "archivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascotas" ADD CONSTRAINT "mascotas_carnet_vacunacion_id_fkey" FOREIGN KEY ("carnet_vacunacion_id") REFERENCES "archivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascota_alergias" ADD CONSTRAINT "mascota_alergias_mascota_id_fkey" FOREIGN KEY ("mascota_id") REFERENCES "mascotas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascota_alergias" ADD CONSTRAINT "mascota_alergias_alergia_id_fkey" FOREIGN KEY ("alergia_id") REFERENCES "catalogo_alergias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sucursales" ADD CONSTRAINT "sucursales_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "mx_divisiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultorios" ADD CONSTRAINT "consultorios_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sucursales_especialidades" ADD CONSTRAINT "sucursales_especialidades_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sucursales_especialidades" ADD CONSTRAINT "sucursales_especialidades_especialidad_id_fkey" FOREIGN KEY ("especialidad_id") REFERENCES "especialidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_especialidad_principal_id_fkey" FOREIGN KEY ("especialidad_principal_id") REFERENCES "especialidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medico_horarios" ADD CONSTRAINT "medico_horarios_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medico_asistencias" ADD CONSTRAINT "medico_asistencias_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "medicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_mascota_id_fkey" FOREIGN KEY ("mascota_id") REFERENCES "mascotas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "consultorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_medico_id_fkey" FOREIGN KEY ("medico_id") REFERENCES "medicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_cita_id_fkey" FOREIGN KEY ("cita_id") REFERENCES "citas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_receta" ADD CONSTRAINT "detalles_receta_receta_id_fkey" FOREIGN KEY ("receta_id") REFERENCES "recetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_cita_id_fkey" FOREIGN KEY ("cita_id") REFERENCES "citas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
