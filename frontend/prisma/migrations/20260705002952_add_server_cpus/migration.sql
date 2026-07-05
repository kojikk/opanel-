-- AlterTable
ALTER TABLE "Server" ADD COLUMN     "cpus" DOUBLE PRECISION,
ADD COLUMN     "provisionStatus" TEXT NOT NULL DEFAULT 'ready';
