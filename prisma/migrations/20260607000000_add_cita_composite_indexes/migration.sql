-- Create composite indexes for Cita table
CREATE INDEX "citas_medico_id_fecha_estado_idx" ON "citas"("medico_id", "fecha", "estado");
CREATE INDEX "citas_mascota_id_fecha_estado_idx" ON "citas"("mascota_id", "fecha", "estado");