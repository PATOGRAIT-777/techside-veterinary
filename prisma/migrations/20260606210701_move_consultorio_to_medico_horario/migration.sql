/*
  Migration: move consultorio_id from citas to medico_horarios

  Steps:
  1. Add consultorio_id to medico_horarios (nullable).
  2. Migrate data: derive from most frequent Cita.consultorio_id per (medico_id, diaSemana).
  3. Drop consultorio_id from citas.
  4. Enforce NOT NULL on medico_horarios.consultorio_id.
  5. Create index and foreign key.
*/

-- Step A: add consultorio_id to medico_horarios as nullable (allows data migration first)
ALTER TABLE "medico_horarios" ADD COLUMN "consultorio_id" UUID;

-- Step B: data migration — populate from most frequent consultorio_id in citas
UPDATE "medico_horarios" mh
SET "consultorio_id" = sub."consultorio_id"
FROM (
  SELECT
    c."medico_id",
    EXTRACT(DOW FROM c."fecha") AS dia_num,
    c."consultorio_id",
    COUNT(*) AS freq,
    ROW_NUMBER() OVER (
      PARTITION BY c."medico_id", EXTRACT(DOW FROM c."fecha")
      ORDER BY COUNT(*) DESC
    ) AS rn
  FROM "citas" c
  WHERE c."consultorio_id" IS NOT NULL
  GROUP BY c."medico_id", EXTRACT(DOW FROM c."fecha"), c."consultorio_id"
) sub
WHERE mh."medico_id" = sub."medico_id"
  AND CASE sub.dia_num
    WHEN 0 THEN 'domingo'::"DiaSemana"
    WHEN 1 THEN 'lunes'::"DiaSemana"
    WHEN 2 THEN 'martes'::"DiaSemana"
    WHEN 3 THEN 'miercoles'::"DiaSemana"
    WHEN 4 THEN 'jueves'::"DiaSemana"
    WHEN 5 THEN 'viernes'::"DiaSemana"
    WHEN 6 THEN 'sabado'::"DiaSemana"
  END = mh."diaSemana"
  AND sub.rn = 1;

-- Step C: drop consultorio_id from citas (FK and index first, then column)
ALTER TABLE "citas" DROP CONSTRAINT "citas_consultorio_id_fkey";
DROP INDEX "citas_consultorio_id_idx";
ALTER TABLE "citas" DROP COLUMN "consultorio_id";

-- Step D: enforce NOT NULL on medico_horarios.consultorio_id
ALTER TABLE "medico_horarios" ALTER COLUMN "consultorio_id" SET NOT NULL;

-- Step E: create index and foreign key
CREATE INDEX "medico_horarios_consultorio_id_idx" ON "medico_horarios"("consultorio_id");
ALTER TABLE "medico_horarios" ADD CONSTRAINT "medico_horarios_consultorio_id_fkey" FOREIGN KEY ("consultorio_id") REFERENCES "consultorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
