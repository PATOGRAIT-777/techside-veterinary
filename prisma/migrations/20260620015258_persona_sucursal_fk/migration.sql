-- DropForeignKey
ALTER TABLE "persona" DROP CONSTRAINT "persona_sucursal_id_fkey";

-- AddForeignKey
ALTER TABLE "persona" ADD CONSTRAINT "persona_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
