-- DropForeignKey
ALTER TABLE "Observation" DROP CONSTRAINT "Observation_planteId_fkey";

-- DropForeignKey
ALTER TABLE "Plante" DROP CONSTRAINT "Plante_zoneId_fkey";

-- AddForeignKey
ALTER TABLE "Plante" ADD CONSTRAINT "Plante_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_planteId_fkey" FOREIGN KEY ("planteId") REFERENCES "Plante"("id") ON DELETE CASCADE ON UPDATE CASCADE;
