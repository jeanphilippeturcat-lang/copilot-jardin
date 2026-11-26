-- AlterTable
ALTER TABLE "BandeDessinee" ALTER COLUMN "imageUrl" DROP NOT NULL;
ALTER TABLE "BandeDessinee" ADD COLUMN "promptImage" TEXT;
