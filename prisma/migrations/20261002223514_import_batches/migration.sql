-- CreateTable
CREATE TABLE "import_batch" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "workbook" JSONB NOT NULL,
    "config" JSONB,
    "previewHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "result" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMPTZ(3),

    CONSTRAINT "import_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_source_row" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sheet" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "rawName" TEXT,
    "raw" JSONB NOT NULL,
    "originKey" TEXT,
    "rowHash" TEXT NOT NULL,
    "saleId" TEXT,

    CONSTRAINT "import_source_row_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "import_source_row_originKey_key" ON "import_source_row"("originKey");

-- CreateIndex
CREATE INDEX "import_source_row_saleId_idx" ON "import_source_row"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "import_source_row_batchId_sheet_rowNumber_key" ON "import_source_row"("batchId", "sheet", "rowNumber");

-- AddForeignKey
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_source_row" ADD CONSTRAINT "import_source_row_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "import_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_source_row" ADD CONSTRAINT "import_source_row_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_status_check" CHECK ("status" IN ('draft', 'processing', 'confirmed'));
ALTER TABLE "import_source_row" ADD CONSTRAINT "import_source_row_kind_check" CHECK ("kind" IN ('sale', 'sample', 'excluded', 'duplicate'));
ALTER TABLE "import_source_row" ADD CONSTRAINT "import_source_row_number_check" CHECK ("rowNumber" > 0);
