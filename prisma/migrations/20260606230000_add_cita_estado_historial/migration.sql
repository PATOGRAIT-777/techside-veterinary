-- CreateTable
CREATE TABLE "cita_estado_historial" (
    "id" UUID NOT NULL,
    "cita_id" UUID NOT NULL,
    "estado_anterior" VARCHAR(30),
    "estado_nuevo" VARCHAR(30) NOT NULL,
    "usuario_id" UUID,
    "razon" TEXT,
    "fecha_cambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cita_estado_historial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cita_estado_historial_cita_id_idx" ON "cita_estado_historial"("cita_id");

-- CreateIndex
CREATE INDEX "cita_estado_historial_fecha_cambio_idx" ON "cita_estado_historial"("fecha_cambio");

-- AddForeignKey
ALTER TABLE "cita_estado_historial" ADD CONSTRAINT "cita_estado_historial_cita_id_fkey" FOREIGN KEY ("cita_id") REFERENCES "citas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
