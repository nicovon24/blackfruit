import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { Prisma as PrismaRuntime } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readWorkbook } from "@/modules/imports/infrastructure/read-workbook";
import type { SourceWorkbook } from "@/modules/imports/domain/import-types";
import { parseProductionWorkbook, type ProductionImportPreview } from "../domain/parse-production-import";
import { saveCycle } from "./prisma-cycles";

export class ProductionImportError extends Error {}

function requestKey(batchHash: string, code: string) {
  const hex = createHash("sha256").update(`${batchHash}:${code}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function previewWorkbook(workbook: SourceWorkbook, batchHash?: string) {
  const [machines, products] = await Promise.all([
    prisma.productionMachine.findMany({ select: { id: true, name: true, trayCount: true, archivedAt: true } }),
    prisma.product.findMany({ select: { id: true, name: true, variant: true, active: true } }),
  ]);
  const first = parseProductionWorkbook(workbook, machines.map((machine) => ({ ...machine, archived: machine.archivedAt !== null })), products);
  const codes = first.records.map((record) => record.code).filter(Boolean);
  const existing = codes.length ? await prisma.productionCycle.findMany({ where: { code: { in: codes } }, select: { code: true, requestKey: true } }) : [];
  const conflicts = new Set(existing.filter((cycle) => !batchHash || cycle.requestKey !== requestKey(batchHash, cycle.code)).map((cycle) => cycle.code));
  return parseProductionWorkbook(workbook, machines.map((machine) => ({ ...machine, archived: machine.archivedAt !== null })), products, conflicts);
}

export async function uploadProductionImport(buffer: Buffer, fileName: string, actorId: string) {
  const workbook = await readWorkbook(buffer, fileName);
  const hash = createHash("sha256").update(buffer).digest("hex");
  const preview = await previewWorkbook(workbook, hash);
  let batch = await prisma.productionImportBatch.findUnique({ where: { actorId_fileHash: { actorId, fileHash: hash } }, select: { id: true, status: true } });
  if (!batch) {
    try { batch = await prisma.productionImportBatch.create({ data: { actorId, fileName: fileName.slice(0, 255), fileHash: hash, workbook: workbook as unknown as Prisma.InputJsonValue }, select: { id: true, status: true } }); }
    catch (error) {
      if (!(error instanceof PrismaRuntime.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      batch = await prisma.productionImportBatch.findUnique({ where: { actorId_fileHash: { actorId, fileHash: hash } }, select: { id: true, status: true } });
    }
  }
  if (!batch) throw new ProductionImportError("No pudimos guardar la revisión. Intentá otra vez.");
  return { id: batch.id, fileName, preview: publicPreview(preview), confirmed: batch.status === "confirmed" };
}

function publicPreview(preview: ProductionImportPreview) {
  return { valid: preview.valid, conflicts: preview.conflicts, errors: preview.errors, records: preview.records.map((record) => ({ code: record.code, row: record.row, machineName: record.machineName, finishedOn: record.finishedOn, totalKg: record.totalKg, resultCount: record.resultCount, errors: record.errors })) };
}

export async function confirmProductionImport(batchId: string, actorId: string) {
  const batch = await prisma.productionImportBatch.findFirst({ where: { id: batchId, actorId }, select: { id: true, fileHash: true, status: true, workbook: true, result: true } });
  if (!batch) throw new ProductionImportError("La revisión ya no está disponible.");
  if (batch.status === "confirmed") return batch.result as { cycles: number };
  const preview = await previewWorkbook(batch.workbook as unknown as SourceWorkbook, batch.fileHash);
  if (preview.errors || !preview.valid) throw new ProductionImportError("El archivo tiene errores o conflictos. Revisá la vista previa antes de confirmar.");
  let count = 0;
  for (const record of preview.records) {
    if (!record.input) throw new ProductionImportError(`El ciclo ${record.code} no está listo.`);
    const id = await saveCycle(record.input, actorId, requestKey(batch.fileHash, record.code));
    await prisma.productionCycle.update({ where: { id }, data: { productionImportBatchId: batch.id } });
    count++;
  }
  const result = { cycles: count };
  await prisma.productionImportBatch.update({ where: { id: batch.id }, data: { status: "confirmed", confirmedAt: new Date(), result } });
  return result;
}
