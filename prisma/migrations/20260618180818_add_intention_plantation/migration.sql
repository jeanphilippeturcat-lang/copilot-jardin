-- AlterTable
ALTER TABLE "Tache" ADD COLUMN     "intentionId" TEXT;

-- CreateTable
CREATE TABLE "IntentionPlantation" (
    "id" TEXT NOT NULL,
    "nomPlante" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "notes" TEXT,
    "periodeOptimale" TEXT,
    "datePlantation" TIMESTAMP(3),
    "raisonnement" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'planifiee',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntentionPlantation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Tache" ADD CONSTRAINT "Tache_intentionId_fkey" FOREIGN KEY ("intentionId") REFERENCES "IntentionPlantation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentionPlantation" ADD CONSTRAINT "IntentionPlantation_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
