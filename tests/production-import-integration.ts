import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { prisma } from "../src/lib/prisma";
import { uploadProductionImport, confirmProductionImport } from "../src/modules/production/infrastructure/prisma-production-imports";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("La integración solo se ejecuta en dev/blackfruit.");

async function file(code: string, machineName: string, productName: string, total = "0,875") {
  const workbook = new ExcelJS.Workbook();
  const cycles = workbook.addWorksheet("Ciclos");
  cycles.addRow(["codigo", "fecha", "maquina", "total_kg", "observaciones"]);
  cycles.addRow([code, "15/10/2026", machineName, total, "QA importación"]);
  const weighings = workbook.addWorksheet("Pesajes");
  weighings.addRow(["codigo", "producto", "variante", "bandejas", "kg"]);
  weighings.addRow([code, productName, "Natural", "1,2", "0,875"]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function main() {
  const actor = await prisma.user.findFirstOrThrow({ where: { role: "admin", banned: { not: true } }, select: { id: true } });
  const code = `QA-IMPORT-${randomUUID()}`;
  const batches: string[] = [];
  let cycleId = "";
  let machineId = "";
  let productId = "";
  try {
    const machineName = `QA Import Máquina ${code}`;
    const productName = `QA Import Producto ${code}`;
    machineId = (await prisma.productionMachine.create({ data: { name: machineName, trayCount: 4 } })).id;
    productId = (await prisma.product.create({ data: { name: productName, variant: "Natural", unitLabel: "kg" } })).id;
    const buffer = await file(code, machineName, productName);
    const draft = await uploadProductionImport(buffer, "qa-produccion.xlsx", actor.id);
    batches.push(draft.id);
    assert.equal(draft.preview.valid, 1);
    assert.equal(draft.preview.errors, 0);
    assert.deepEqual(await confirmProductionImport(draft.id, actor.id), { cycles: 1 });
    const cycle = await prisma.productionCycle.findUniqueOrThrow({ where: { code }, include: { results: { include: { trays: true } } } });
    cycleId = cycle.id;
    assert.equal(cycle.finishedOn?.toISOString().slice(0, 10), "2026-10-15");
    assert.equal(cycle.results[0].kg?.toFixed(3), "0.875");
    assert.equal(cycle.results[0].trays.length, 2);
    assert.equal((await uploadProductionImport(buffer, "qa-produccion.xlsx", actor.id)).confirmed, true);
    assert.deepEqual(await confirmProductionImport(draft.id, actor.id), { cycles: 1 });
    assert.equal(await prisma.productionCycle.count({ where: { code } }), 1);

    const conflicting = await uploadProductionImport(await file(code, machineName, productName, "0,876"), "qa-conflicto.xlsx", actor.id);
    batches.push(conflicting.id);
    assert.equal(conflicting.preview.conflicts, 1);
    assert.equal(conflicting.preview.valid, 0);
    console.log("Importación XLSX: grupo, fecha, confirmación idempotente y conflicto verificados.");
  } finally {
    if (cycleId) {
      await prisma.productionTray.deleteMany({ where: { cycleId } });
      await prisma.productionResult.deleteMany({ where: { cycleId } });
      await prisma.auditEvent.deleteMany({ where: { entityType: "production_cycle", entityId: cycleId } });
      await prisma.productionCycle.deleteMany({ where: { id: cycleId } });
    }
    await prisma.productionImportBatch.deleteMany({ where: { id: { in: batches } } });
    if (productId) await prisma.product.delete({ where: { id: productId } });
    if (machineId) await prisma.productionMachine.delete({ where: { id: machineId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
