import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readWorkbook } from "./read-workbook";
import { digest, proposeMapping } from "../domain/parse-import";
import { ImportValidationError, type ImportConfig, type ImportSummary, type SourceWorkbook } from "../domain/import-types";

import { reviewImport, type ImportReviewLookup } from "../application/review-import";
import { validateSample } from "@/modules/samples/domain/sample";
import { resolveCustomer } from "@/modules/customers/infrastructure/prisma-customers";

function lookup(db: Prisma.TransactionClient): ImportReviewLookup {
  return {
    findOrigins: (keys) => db.importSourceRow.findMany({ where: { originKey: { in: keys } }, select: { originKey: true, rowHash: true } }),
    findCustomerIds: async (ids) => (await db.customer.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true } })).map((customer) => customer.id),
  };
}

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export async function uploadImport(buffer: Buffer, fileName: string, actorId: string) {
  const workbook = await readWorkbook(buffer, fileName);
  const batch = await prisma.importBatch.create({ data: { actorId, fileName: fileName.slice(0, 180), fileHash: digest(buffer.toString("base64")), workbook: json(workbook) } });
  return { id: batch.id, fileName: batch.fileName, workbook, mapping: proposeMapping(workbook) };
}

async function ownedBatch(id: string, actorId: string) {
  const batch = await prisma.importBatch.findFirst({ where: { id, actorId } });
  if (!batch) throw new ImportValidationError("El lote no existe o no pertenece a tu cuenta.");
  return batch;
}

export async function previewImport(id: string, actorId: string, config: ImportConfig) {
  const batch = await ownedBatch(id, actorId);
  if (batch.status !== "draft") throw new ImportValidationError("Este lote ya fue confirmado. Consultá su resultado.");
  const preview = await reviewImport(batch.workbook as unknown as SourceWorkbook, config, lookup(prisma));
  const saved = await prisma.importBatch.updateMany({ where: { id, actorId, status: "draft" }, data: { config: json(config), previewHash: preview.hash } });
  if (saved.count !== 1) throw new ImportValidationError("El lote cambió. Volvé a cargar su resultado.");
  return preview;
}

export async function confirmImport(id: string, actorId: string, previewHash: string): Promise<ImportSummary> {
  const batch = await ownedBatch(id, actorId);
  if (batch.status === "confirmed") return batch.result as unknown as ImportSummary;
  if (!batch.config || !batch.previewHash || batch.previewHash !== previewHash) throw new ImportValidationError("La revisión cambió. Volvé a revisar antes de confirmar.");
  try {
    return await prisma.$transaction(async (tx) => {
      const locked = await tx.importBatch.updateMany({ where: { id, actorId, status: "draft", previewHash }, data: { status: "processing" } });
      if (locked.count !== 1) {
        const done = await tx.importBatch.findUniqueOrThrow({ where: { id } });
        if (done.status === "confirmed") return done.result as unknown as ImportSummary;
        throw new ImportValidationError("El lote cambió. Revisalo nuevamente.");
      }
      const preview = await reviewImport(batch.workbook as unknown as SourceWorkbook, batch.config as unknown as ImportConfig, lookup(tx));
      if (preview.hash !== previewHash) throw new ImportValidationError("Cambió la información desde la revisión. Revisá otra vez los duplicados y clientes.");
      if (preview.summary.errors) throw new ImportValidationError("Corregí o excluí expresamente las operaciones con errores.");
      const saleIds: string[] = [];
      for (const op of preview.operations) {
        let saleId: string | null = null;
        let sampleReviewId: string | null = null;
        let claimSampleOrigins = false;
        if (op.kind === "sale" && !op.duplicate) {
          const sale = await tx.sale.create({ data: {
            occurredOn: new Date(`${op.date}T00:00:00Z`), total: op.total, mode: op.lines.length ? "lines" : "amount",
            channel: op.channel || null, notes: op.notes || null, customerId: op.customerId || null, createdById: actorId,
            lines: { create: op.lines.map((line, position) => ({ ...line, position })) },
          } });
          saleId = sale.id; saleIds.push(sale.id);
          await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "sale", entityId: sale.id, action: "imported" } });
        }
        if (op.kind === "sample") {
          const contentHash = digest(op.rowHashes);
          const existing = await tx.sampleImportReview.findUnique({ where: { originKey: op.originKeys[0] }, select: { id: true, contentHash: true } });
          if (existing) {
            sampleReviewId = existing.id;
            if (existing.contentHash !== contentHash) await tx.sampleImportReview.update({ where: { id: existing.id }, data: { status: "conflict", updatedAt: new Date() } });
          } else if (!op.duplicate) {
            const review = await tx.sampleImportReview.create({ data: { originKey: op.originKeys[0], contentHash, recipientName: op.name || null, sampleOn: op.date ? new Date(`${op.date}T00:00:00.000Z`) : null, suggested: json({ lines: op.sampleLines, status: op.sampleStatus, unit: op.sampleUnit }) }, select: { id: true } });
            sampleReviewId = review.id;
            claimSampleOrigins = true;
            if (op.sampleStatus && op.name && op.date && op.sampleLines.length > 0 && op.sampleLines.every((line) => line.unitLabel) && op.errors.length === 0) {
              const data = validateSample({ recipientName: op.name, sampleOn: op.date, status: op.sampleStatus, deliveredOn: "", notes: op.notes, customerId: op.customerId, lines: op.sampleLines.map((line) => ({ ...line, productId: null })) }, []);
              const customerId = await resolveCustomer(tx, data.customer, actorId);
              const sample = await tx.sample.create({ data: { recipientName: data.recipientName, sampleOn: data.sampleOn, status: data.status, deliveredOn: data.deliveredOn, notes: data.notes, customerId, createdById: actorId, lines: { create: data.lines.map((line) => line) } }, select: { id: true } });
              await tx.sampleImportReview.update({ where: { id: review.id }, data: { status: "converted", sampleId: sample.id } });
              await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "sample", entityId: sample.id, action: "imported" } });
            }
          }
        }
        await tx.importSourceRow.createMany({ data: op.rows.map((row, index) => ({ batchId: id, sheet: (batch.config as unknown as ImportConfig).mapping.sheet, rowNumber: row.number, kind: op.duplicate ? "duplicate" : op.kind, rawName: op.name || null, raw: json(row), originKey: saleId || claimSampleOrigins ? op.originKeys[index] : null, rowHash: op.rowHashes[index], saleId, sampleReviewId })) });
      }
      const totals = await tx.sale.aggregate({ where: { id: { in: saleIds } }, _count: { id: true }, _sum: { total: true } });
      const units = await tx.saleLine.aggregate({ where: { saleId: { in: saleIds } }, _sum: { quantity: true } });
      if (totals._count.id !== preview.summary.sales || (totals._sum.total ?? new Prisma.Decimal(0)).toFixed(2) !== preview.summary.total || (units._sum.quantity ?? new Prisma.Decimal(0)).toFixed(3) !== preview.summary.units) throw new ImportValidationError("La conciliación no coincide; se revirtió la importación.");
      await tx.importBatch.update({ where: { id }, data: { status: "confirmed", confirmedAt: new Date(), result: json(preview.summary) } });
      await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "import_batch", entityId: id, action: "confirmed" } });
      return preview.summary;
    }, { timeout: 60000, maxWait: 10000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) throw new ImportValidationError("Otra importación modificó estas filas. Revisá nuevamente para ver los duplicados.");
    throw error;
  }
}

export async function listImportResults(actorId: string) {
  return prisma.importBatch.findMany({ where: { actorId, status: "confirmed" }, orderBy: { confirmedAt: "desc" }, take: 10, select: { id: true, fileName: true, result: true, confirmedAt: true } });
}
