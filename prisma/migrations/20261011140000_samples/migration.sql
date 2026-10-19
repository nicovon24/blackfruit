CREATE TABLE "sample" (
    "id" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "sampleOn" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deliveredOn" DATE,
    "notes" TEXT,
    "customerId" TEXT,
    "createdById" TEXT NOT NULL,
    "requestKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "sample_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sample_status_check" CHECK ("status" IN ('pending', 'delivered')),
    CONSTRAINT "sample_version_check" CHECK ("version" > 0),
    CONSTRAINT "sample_delivery_check" CHECK ("status" = 'delivered' OR "deliveredOn" IS NULL)
);
CREATE TABLE "sample_line" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "variant" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitLabel" TEXT NOT NULL,
    CONSTRAINT "sample_line_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sample_line_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "sample_line_position_check" CHECK ("position" > 0)
);
CREATE TABLE "sample_import_review" (
    "id" TEXT NOT NULL,
    "originKey" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "recipientName" TEXT,
    "sampleOn" DATE,
    "sampleId" TEXT,
    "suggested" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "sample_import_review_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sample_import_review_status_check" CHECK ("status" IN ('pending', 'conflict', 'converted', 'ignored'))
);
ALTER TABLE "import_source_row" ADD COLUMN "sampleReviewId" TEXT;
CREATE UNIQUE INDEX "sample_requestKey_key" ON "sample"("requestKey");
CREATE INDEX "sample_status_sampleOn_idx" ON "sample"("status", "sampleOn");
CREATE INDEX "sample_customerId_idx" ON "sample"("customerId");
CREATE UNIQUE INDEX "sample_line_sampleId_position_key" ON "sample_line"("sampleId", "position");
CREATE INDEX "sample_line_productId_idx" ON "sample_line"("productId");
CREATE UNIQUE INDEX "sample_import_review_originKey_key" ON "sample_import_review"("originKey");
CREATE UNIQUE INDEX "sample_import_review_sampleId_key" ON "sample_import_review"("sampleId");
CREATE INDEX "sample_import_review_status_createdAt_idx" ON "sample_import_review"("status", "createdAt");
CREATE INDEX "import_source_row_sampleReviewId_idx" ON "import_source_row"("sampleReviewId");
ALTER TABLE "sample" ADD CONSTRAINT "sample_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sample" ADD CONSTRAINT "sample_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sample_line" ADD CONSTRAINT "sample_line_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sample_line" ADD CONSTRAINT "sample_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sample_import_review" ADD CONSTRAINT "sample_import_review_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "sample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_source_row" ADD CONSTRAINT "import_source_row_sampleReviewId_fkey" FOREIGN KEY ("sampleReviewId") REFERENCES "sample_import_review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
