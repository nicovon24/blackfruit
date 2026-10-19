ALTER TABLE "customer" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "deletedAt" TIMESTAMPTZ(3);
ALTER TABLE "product" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "production_cycle" ADD COLUMN "deletedAt" TIMESTAMPTZ(3);
ALTER TABLE "sample" ADD COLUMN "deletedAt" TIMESTAMPTZ(3);
CREATE INDEX "customer_deletedAt_id_idx" ON "customer"("deletedAt", "id");
CREATE INDEX "sale_deletedAt_id_idx" ON "sale"("deletedAt", "id");
CREATE INDEX "production_cycle_deletedAt_id_idx" ON "production_cycle"("deletedAt", "id");
CREATE INDEX "sample_deletedAt_id_idx" ON "sample"("deletedAt", "id");
