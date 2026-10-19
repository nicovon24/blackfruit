CREATE TABLE "production_machine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trayCount" INTEGER NOT NULL,
    "model" TEXT,
    "notes" TEXT,
    "requestKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "production_machine_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "production_machine_trayCount_check" CHECK ("trayCount" BETWEEN 1 AND 128),
    CONSTRAINT "production_machine_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "production_machine_requestKey_key" ON "production_machine"("requestKey");
CREATE INDEX "production_machine_archivedAt_name_idx" ON "production_machine"("archivedAt", "name");
