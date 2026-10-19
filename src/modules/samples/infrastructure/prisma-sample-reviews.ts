import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { digest, parseImport } from "@/modules/imports/domain/parse-import";
import type { ImportConfig, ImportOperation, SourceWorkbook } from "@/modules/imports/domain/import-types";

type HistoricalRow = Awaited<ReturnType<typeof prisma.importSourceRow.findMany>>[number];

function suggestion(op: ImportOperation | null) {
  if (!op) return null;
  return { lines: op.sampleLines, status: op.sampleStatus, unit: op.sampleUnit };
}

function safeDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : null; }

async function registerHistoricalGroup(rows: HistoricalRow[], op: ImportOperation | null) {
  const first = rows[0];
  const originKey = op?.originKeys[0] ?? digest(["legacy-sample", first.batchId, first.sheet, first.rowNumber]);
  const contentHash = op ? digest(op.rowHashes) : digest(rows.map((row) => row.rowHash));
  await prisma.$transaction(async (tx) => {
    let review = await tx.sampleImportReview.findUnique({ where: { originKey }, select: { id: true, contentHash: true, status: true } });
    if (!review) {
      review = await tx.sampleImportReview.create({ data: { originKey, contentHash, recipientName: op?.name || first.rawName || null, sampleOn: op?.date ? safeDate(op.date) : null, suggested: suggestion(op) as Prisma.InputJsonValue ?? Prisma.JsonNull }, select: { id: true, contentHash: true, status: true } });
    } else if (review.contentHash !== contentHash && review.status !== "conflict") {
      await tx.sampleImportReview.update({ where: { id: review.id }, data: { status: "conflict", updatedAt: new Date() } });
    }
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const origin = op?.originKeys[op.rows.findIndex((source) => source.number === row.rowNumber)];
      const occupied = origin ? await tx.importSourceRow.findUnique({ where: { originKey: origin }, select: { id: true, rowHash: true } }) : null;
      if (occupied && occupied.rowHash !== row.rowHash) await tx.sampleImportReview.update({ where: { id: review.id }, data: { status: "conflict", updatedAt: new Date() } });
      await tx.importSourceRow.update({ where: { id: row.id }, data: { sampleReviewId: review.id, originKey: origin && !occupied ? origin : row.originKey } });
    }
  });
}

export async function prepareHistoricalSampleReviews(batchId?: string) {
  let prepared = 0;
  while (true) {
    const first = await prisma.importSourceRow.findFirst({ where: { kind: "sample", sampleReviewId: null, ...(batchId ? { batchId } : {}) }, orderBy: [{ batchId: "asc" }, { rowNumber: "asc" }], select: { batchId: true } });
    if (!first) break;
    const batch = await prisma.importBatch.findUniqueOrThrow({ where: { id: first.batchId }, include: { rows: { where: { kind: "sample", sampleReviewId: null }, orderBy: { rowNumber: "asc" } } } });
    let operations: ImportOperation[] = [];
    try {
      if (batch.config) operations = parseImport(batch.workbook as unknown as SourceWorkbook, batch.config as unknown as ImportConfig).filter((op) => op.kind === "sample");
    } catch { /* El origen crudo sigue disponible para revisión manual. */ }
    const pending = new Map(batch.rows.map((row) => [row.rowNumber, row]));
    for (const op of operations) {
      const rows = op.rows.map((row) => pending.get(row.number)).filter((row): row is HistoricalRow => Boolean(row));
      if (!rows.length) continue;
      await registerHistoricalGroup(rows, op);
      rows.forEach((row) => pending.delete(row.rowNumber));
      prepared += rows.length;
    }
    for (const row of pending.values()) { await registerHistoricalGroup([row], null); prepared += 1; }
  }
  return prepared;
}

export async function listSampleReviews(page = 1, status?: "pending" | "conflict" | "converted" | "ignored") {
  const rows = await prisma.sampleImportReview.findMany({ where: status ? { status } : undefined, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (Math.max(1, page) - 1) * 30, take: 31, include: { rows: { include: { batch: { select: { fileName: true } } }, orderBy: { rowNumber: "asc" } }, sample: { select: { id: true } } } });
  return { items: rows.slice(0, 30).map((review) => ({ id: review.id, status: review.status, recipientName: review.recipientName, sampleOn: review.sampleOn?.toISOString().slice(0, 10) ?? "", sampleId: review.sample?.id ?? null, sources: review.rows.map((row) => ({ fileName: row.batch.fileName, sheet: row.sheet, rowNumber: row.rowNumber, rawName: row.rawName })) })), hasNext: rows.length > 30 };
}

export async function countUnreviewedSampleRows() {
  return prisma.importSourceRow.count({ where: { kind: "sample", sampleReviewId: null } });
}

export async function getSampleReview(id: string) {
  const review = await prisma.sampleImportReview.findUnique({ where: { id }, include: { rows: { include: { batch: { select: { fileName: true } } }, orderBy: { rowNumber: "asc" } } } });
  if (!review) return null;
  const suggested = review.suggested && typeof review.suggested === "object" && !Array.isArray(review.suggested) ? review.suggested : null;
  const rawLines = suggested && "lines" in suggested && Array.isArray(suggested.lines) ? suggested.lines : [];
  const lines = rawLines.filter((line): line is { productName: string; variant: string | null; quantity: string; unitLabel: string } => Boolean(line && typeof line === "object" && !Array.isArray(line) && typeof line.productName === "string" && typeof line.quantity === "string" && typeof line.unitLabel === "string"));
  return { id: review.id, status: review.status, recipientName: review.recipientName ?? "", sampleOn: review.sampleOn?.toISOString().slice(0, 10) ?? "", sampleId: review.sampleId, lines, rows: review.rows.map((row) => ({ fileName: row.batch.fileName, sheet: row.sheet, rowNumber: row.rowNumber, raw: row.raw })) };
}

export async function ignoreSampleReview(id: string, actorId: string) {
  await prisma.$transaction(async (tx) => {
    const changed = await tx.sampleImportReview.updateMany({ where: { id, status: { in: ["pending", "conflict"] }, sampleId: null }, data: { status: "ignored", updatedAt: new Date() } });
    if (changed.count !== 1) throw new Error("La revisión cambió. Recargá la página.");
    await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "sample_import_review", entityId: id, action: "ignored" } });
  });
}
