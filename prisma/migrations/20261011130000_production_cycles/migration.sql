CREATE TABLE "production_cycle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "trayCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "finishedOn" DATE,
    "confirmedAt" TIMESTAMPTZ(3),
    "notes" TEXT,
    "requestKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "production_cycle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "production_cycle_status_check" CHECK ("status" IN ('draft', 'finished')),
    CONSTRAINT "production_cycle_trayCount_check" CHECK ("trayCount" BETWEEN 1 AND 128),
    CONSTRAINT "production_cycle_version_check" CHECK ("version" > 0),
    CONSTRAINT "production_cycle_finish_check" CHECK ("status" = 'draft' OR ("finishedOn" IS NOT NULL AND "confirmedAt" IS NOT NULL))
);
ALTER TABLE "product" ADD COLUMN "requestKey" TEXT;
CREATE UNIQUE INDEX "product_requestKey_key" ON "product"("requestKey");
CREATE TABLE "production_result" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "variant" TEXT,
    "kg" DECIMAL(12,3),
    CONSTRAINT "production_result_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "production_result_kind_check" CHECK ("kind" IN ('individual', 'group')),
    CONSTRAINT "production_result_kg_check" CHECK ("kg" IS NULL OR "kg" >= 0)
);
CREATE TABLE "production_tray" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "productId" TEXT,
    "productName" TEXT,
    "variant" TEXT,
    "resultId" TEXT,
    CONSTRAINT "production_tray_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "production_tray_position_check" CHECK ("position" > 0),
    CONSTRAINT "production_tray_assignment_check" CHECK (("productName" IS NULL AND "resultId" IS NULL) OR ("productName" IS NOT NULL AND "resultId" IS NOT NULL))
);
CREATE UNIQUE INDEX "production_cycle_code_key" ON "production_cycle"("code");
CREATE UNIQUE INDEX "production_cycle_requestKey_key" ON "production_cycle"("requestKey");
CREATE INDEX "production_cycle_machineId_finishedOn_idx" ON "production_cycle"("machineId", "finishedOn");
CREATE INDEX "production_cycle_status_finishedOn_idx" ON "production_cycle"("status", "finishedOn");
CREATE UNIQUE INDEX "production_result_id_cycleId_key" ON "production_result"("id", "cycleId");
CREATE INDEX "production_result_cycleId_idx" ON "production_result"("cycleId");
CREATE INDEX "production_result_productId_idx" ON "production_result"("productId");
CREATE UNIQUE INDEX "production_tray_cycleId_position_key" ON "production_tray"("cycleId", "position");
CREATE INDEX "production_tray_productId_idx" ON "production_tray"("productId");
CREATE INDEX "production_tray_resultId_cycleId_idx" ON "production_tray"("resultId", "cycleId");
ALTER TABLE "production_cycle" ADD CONSTRAINT "production_cycle_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "production_machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_cycle" ADD CONSTRAINT "production_cycle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_result" ADD CONSTRAINT "production_result_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "production_cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_result" ADD CONSTRAINT "production_result_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "production_tray" ADD CONSTRAINT "production_tray_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "production_cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_tray" ADD CONSTRAINT "production_tray_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "production_tray" ADD CONSTRAINT "production_tray_resultId_cycleId_fkey" FOREIGN KEY ("resultId", "cycleId") REFERENCES "production_result"("id", "cycleId") ON DELETE RESTRICT ON UPDATE CASCADE;
