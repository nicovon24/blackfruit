CREATE TABLE "production_import_batch" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileHash" TEXT NOT NULL,
  "workbook" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "result" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMPTZ(3),
  CONSTRAINT "production_import_batch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "production_import_batch_status_check" CHECK ("status" IN ('draft', 'confirmed'))
);
CREATE UNIQUE INDEX "production_import_batch_actorId_fileHash_key" ON "production_import_batch"("actorId", "fileHash");
CREATE INDEX "production_import_batch_status_createdAt_idx" ON "production_import_batch"("status", "createdAt");
ALTER TABLE "production_import_batch" ADD CONSTRAINT "production_import_batch_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_cycle" ADD COLUMN "productionImportBatchId" TEXT;
CREATE INDEX "production_cycle_productionImportBatchId_idx" ON "production_cycle"("productionImportBatchId");
ALTER TABLE "production_cycle" ADD CONSTRAINT "production_cycle_productionImportBatchId_fkey" FOREIGN KEY ("productionImportBatchId") REFERENCES "production_import_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
