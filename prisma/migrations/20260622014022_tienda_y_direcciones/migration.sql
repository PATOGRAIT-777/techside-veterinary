/*
  Warnings:

  - You are about to drop the column `activo` on the `mx_divisiones` table. All the data in the column will be lost.
  - You are about to drop the column `clave` on the `mx_divisiones` table. All the data in the column will be lost.
  - You are about to drop the column `direccion` on the `mx_divisiones` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `mx_divisiones` table. All the data in the column will be lost.
  - You are about to drop the column `telefono` on the `mx_divisiones` table. All the data in the column will be lost.
  - Added the required column `codigo_postal` to the `mx_divisiones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `colonia` to the `mx_divisiones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estado` to the `mx_divisiones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `municipio` to the `mx_divisiones` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('pendiente_pago', 'pagado', 'en_preparacion', 'enviado', 'entregado', 'cancelado', 'devolucion');

-- DropIndex
DROP INDEX "mx_divisiones_clave_key";

-- AlterTable
ALTER TABLE "mx_divisiones" DROP COLUMN "activo",
DROP COLUMN "clave",
DROP COLUMN "direccion",
DROP COLUMN "nombre",
DROP COLUMN "telefono",
ADD COLUMN     "codigo_postal" VARCHAR(10) NOT NULL,
ADD COLUMN     "colonia" VARCHAR(255) NOT NULL,
ADD COLUMN     "estado" VARCHAR(255) NOT NULL,
ADD COLUMN     "municipio" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "persona" ADD COLUMN     "numero_identificacion" VARCHAR(100),
ADD COLUMN     "tipo_identificacion" VARCHAR(50),
ADD COLUMN     "ubicacion_id" UUID;

-- CreateTable
CREATE TABLE "contactos_usuarios" (
    "id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "relacion" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(15) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contactos_usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_producto" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "categorias_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" UUID NOT NULL,
    "codigo_sku" VARCHAR(100),
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "precio_venta" DECIMAL(10,2) NOT NULL,
    "costo_compra" DECIMAL(10,2),
    "categoria_id" UUID,
    "es_medicamento" BOOLEAN NOT NULL DEFAULT false,
    "requiere_receta" BOOLEAN NOT NULL DEFAULT false,
    "imagen_url" TEXT,
    "marca" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_sucursal" (
    "id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad_existencia" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 5,
    "ubicacion_en_almacen" VARCHAR(255),
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventario_sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "sucursal_id" UUID NOT NULL,
    "fecha_compra" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'pendiente_pago',
    "metodo_pago" VARCHAR(50),
    "direccion_envio" TEXT NOT NULL,

    CONSTRAINT "ordenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_orden" (
    "id" UUID NOT NULL,
    "orden_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "detalles_orden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contactos_usuarios_persona_id_idx" ON "contactos_usuarios"("persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_producto_nombre_key" ON "categorias_producto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_sku_key" ON "productos"("codigo_sku");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_sucursal_sucursal_id_producto_id_key" ON "inventario_sucursal"("sucursal_id", "producto_id");

-- CreateIndex
CREATE INDEX "ordenes_usuario_id_idx" ON "ordenes"("usuario_id");

-- CreateIndex
CREATE INDEX "ordenes_sucursal_id_idx" ON "ordenes"("sucursal_id");

-- CreateIndex
CREATE INDEX "detalles_orden_orden_id_idx" ON "detalles_orden"("orden_id");

-- CreateIndex
CREATE INDEX "detalles_orden_producto_id_idx" ON "detalles_orden"("producto_id");

-- CreateIndex
CREATE INDEX "mx_divisiones_codigo_postal_idx" ON "mx_divisiones"("codigo_postal");

-- CreateIndex
CREATE INDEX "persona_ubicacion_id_idx" ON "persona"("ubicacion_id");

-- AddForeignKey
ALTER TABLE "persona" ADD CONSTRAINT "persona_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "mx_divisiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactos_usuarios" ADD CONSTRAINT "contactos_usuarios_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_sucursal" ADD CONSTRAINT "inventario_sucursal_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_sucursal" ADD CONSTRAINT "inventario_sucursal_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_orden" ADD CONSTRAINT "detalles_orden_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_orden" ADD CONSTRAINT "detalles_orden_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
