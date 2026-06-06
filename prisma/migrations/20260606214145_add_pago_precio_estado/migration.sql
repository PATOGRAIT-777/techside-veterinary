-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('pendiente', 'pagada', 'cancelada');

-- AlterEnum
ALTER TYPE "EstadoCita" ADD VALUE 'pendiente_de_pago';

-- AlterTable
ALTER TABLE "citas" ALTER COLUMN "estado" SET DEFAULT 'pendiente_de_pago';

-- AlterTable
ALTER TABLE "especialidades" ADD COLUMN     "precio" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "pagos" (
    "id" UUID NOT NULL,
    "cita_id" UUID NOT NULL,
    "folio_pago" VARCHAR(20) NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'pendiente',
    "fecha_pago" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pagos_cita_id_key" ON "pagos"("cita_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_folio_pago_key" ON "pagos"("folio_pago");

-- CreateIndex
CREATE INDEX "pagos_folio_pago_idx" ON "pagos"("folio_pago");

-- CreateIndex
CREATE INDEX "pagos_estado_idx" ON "pagos"("estado");

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cita_id_fkey" FOREIGN KEY ("cita_id") REFERENCES "citas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
