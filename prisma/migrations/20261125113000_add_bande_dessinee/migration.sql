-- CreateTable
CREATE TABLE "BandeDessinee" (
    "id" TEXT NOT NULL,
    "semaineCle" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "titre" TEXT NOT NULL,
    "resume" TEXT,
    "imageUrl" TEXT NOT NULL,
    "actionsJson" TEXT NOT NULL,
    "modeleTexte" TEXT,
    "modeleImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BandeDessinee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BandeDessinee_semaineCle_key" ON "BandeDessinee"("semaineCle");
