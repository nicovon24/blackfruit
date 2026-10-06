-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant" TEXT,
    "unitLabel" TEXT,
    "suggestedPrice" DECIMAL(14,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale" (
    "id" TEXT NOT NULL,
    "occurredOn" DATE NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'amount',
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "total" DECIMAL(14,2) NOT NULL,
    "channel" TEXT,
    "notes" TEXT,
    "customerId" TEXT,
    "createdById" TEXT NOT NULL,
    "requestKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "voidedAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_line" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "variant" TEXT,
    "unitLabel" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "sale_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_event" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sale_requestKey_key" ON "sale"("requestKey");

-- CreateIndex
CREATE INDEX "sale_occurredOn_status_deletedAt_idx" ON "sale"("occurredOn", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "sale_customerId_idx" ON "sale"("customerId");

-- CreateIndex
CREATE INDEX "sale_line_productId_idx" ON "sale_line"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_line_saleId_position_key" ON "sale_line"("saleId", "position");

-- CreateIndex
CREATE INDEX "audit_event_entityType_entityId_createdAt_idx" ON "audit_event"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line" ADD CONSTRAINT "sale_line_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line" ADD CONSTRAINT "sale_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business invariants shared by all writers, including future import jobs.
ALTER TABLE "sale" ADD CONSTRAINT "sale_mode_check" CHECK ("mode" IN ('amount', 'lines'));
ALTER TABLE "sale" ADD CONSTRAINT "sale_status_check" CHECK ("status" IN ('confirmed', 'void'));
ALTER TABLE "sale" ADD CONSTRAINT "sale_total_positive_check" CHECK ("total" > 0);
ALTER TABLE "sale" ADD CONSTRAINT "sale_version_positive_check" CHECK ("version" > 0);
ALTER TABLE "product" ADD CONSTRAINT "product_price_positive_check" CHECK ("suggestedPrice" IS NULL OR "suggestedPrice" > 0);
ALTER TABLE "sale_line" ADD CONSTRAINT "sale_line_amounts_positive_check" CHECK ("quantity" > 0 AND "unitPrice" > 0 AND "subtotal" > 0);
