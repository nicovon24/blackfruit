ALTER TABLE "customer" ADD COLUMN "requestKey" TEXT;
CREATE UNIQUE INDEX "customer_requestKey_key" ON "customer"("requestKey");
CREATE INDEX "customer_name_id_idx" ON "customer"("name", "id");
