import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { createMachine, changeMachineArchive, deleteMachine } from "../src/modules/production/infrastructure/prisma-machines";
import { MachineConflictError } from "../src/modules/production/domain/machine";
import { createProduct } from "../src/modules/catalog/infrastructure/prisma-products";
import { CycleConflictError, kgDifference, type CycleInput } from "../src/modules/production/domain/cycle";
import { compareCycles, getCycle, getProductionSummary, listCycles, listMachineCycleChoices, saveCycle } from "../src/modules/production/infrastructure/prisma-cycles";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("Solo se permite la rama dev/blackfruit.");

async function main() {
  const actorId = randomUUID();
  let machineId = "";
  const cycleIds: string[] = [];
  let orangeId = "";
  let appleId = "";
  try {
    await prisma.user.create({ data: { id: actorId, name: "QA Producción", email: `production-qa-${actorId}@example.invalid`, role: "admin" } });
    machineId = await createMachine({ name: "Máquina QA", trayCount: 4, model: null, notes: null }, actorId, randomUUID());
    orangeId = await createProduct({ name: "Naranja QA", variant: "Con azúcar" }, actorId, randomUUID());
    appleId = await createProduct({ name: "Manzana QA" }, actorId, randomUUID());
    const baseline = await getProductionSummary("2026-10");
    const cycle: CycleInput = {
      code: `QA-${randomUUID()}`, machineId, finishedOn: "2026-10-11", status: "draft", notes: "",
      trays: [
        { position: 1, productId: orangeId, resultKey: "orange-group" },
        { position: 2, productId: orangeId, resultKey: "orange-group" },
        { position: 3, productId: appleId, resultKey: "apple-tray" },
        { position: 4, productId: null, resultKey: null },
      ],
      results: [{ key: "orange-group", kg: null }, { key: "apple-tray", kg: "0" }],
    };
    const requestKey = randomUUID();
    const cycleId = await saveCycle(cycle, actorId, requestKey);
    cycleIds.push(cycleId);
    assert.equal(await saveCycle(cycle, actorId, requestKey), cycleId);
    assert.equal((await getCycle(cycleId))?.totalKg, "0.000");
    assert.equal((await getProductionSummary("2026-10")).finishedCount, baseline.finishedCount);
    assert.equal((await getProductionSummary("2026-10", machineId)).draftCount, 1);
    assert.equal((await listCycles(1, machineId, undefined, "draft")).items[0]?.id, cycleId);
    assert.equal((await listCycles(1, machineId, "2026-10")).items.length, 0);

    cycle.status = "finished";
    cycle.results[0].kg = "0.875";
    await saveCycle(cycle, actorId, "", cycleId, 1);
    const saved = await getCycle(cycleId);
    assert.equal(saved?.status, "finished");
    assert.equal(saved?.totalKg, "0.875");
    assert.deepEqual(saved?.results.find((row) => row.kind === "group")?.positions, [1, 2]);
    const summary = await getProductionSummary("2026-10");
    assert.equal(summary.finishedCount, baseline.finishedCount + 1);
    assert.equal(kgDifference(summary.totalKg, baseline.totalKg), "+0.875");
    assert.equal((await getProductionSummary("2026-10", machineId)).totalKg, "0.875");
    assert.equal((await getProductionSummary("2026-11", machineId)).finishedCount, 0);
    assert.equal((await listCycles(1, machineId, "2026-11")).items.length, 0);
    const secondId = await saveCycle({ code: `QA-${randomUUID()}`, machineId, finishedOn: "2026-10-12", status: "finished", notes: "", trays: [
      { position: 1, productId: orangeId, resultKey: "orange-individual" },
      { position: 2, productId: null, resultKey: null },
      { position: 3, productId: null, resultKey: null },
      { position: 4, productId: null, resultKey: null },
    ], results: [{ key: "orange-individual", kg: "0.250" }] }, actorId, randomUUID());
    cycleIds.push(secondId);
    assert.equal((await getProductionSummary("2026-10", machineId)).totalKg, "1.125");
    assert.equal((await listCycles(1, machineId, "2026-10")).items.length, 2);
    assert.equal((await listCycles(1, machineId, undefined, "draft")).items.length, 0);
    assert.equal((await listMachineCycleChoices(machineId)).length, 2);
    const comparison = await compareCycles(cycleId, secondId);
    assert.equal(comparison?.first.totalKg, "0.875");
    assert.equal(comparison?.second.totalKg, "0.250");
    assert.equal(comparison?.differenceKg, "-0.625");
    assert.equal(comparison?.rows.find((row) => row.product.includes("Naranja QA"))?.differenceKg, "-0.625");
    await assert.rejects(saveCycle(cycle, actorId, "", cycleId, 1), CycleConflictError);
    await assert.rejects(deleteMachine(machineId, 1, actorId), MachineConflictError);
    await changeMachineArchive(machineId, 1, true, actorId);
    assert.equal((await getCycle(cycleId))?.machineName, "Máquina QA");
    process.stdout.write("Persistencia de máquinas, grupos, cero, resumen, comparación, idempotencia y conflicto verificada.\n");
  } finally {
    if (cycleIds.length) {
      await prisma.productionTray.deleteMany({ where: { cycleId: { in: cycleIds } } });
      await prisma.productionResult.deleteMany({ where: { cycleId: { in: cycleIds } } });
      await prisma.productionCycle.deleteMany({ where: { id: { in: cycleIds } } });
    }
    if (machineId) await prisma.productionMachine.deleteMany({ where: { id: machineId } });
    if (orangeId) await prisma.product.deleteMany({ where: { id: orangeId } });
    if (appleId) await prisma.product.deleteMany({ where: { id: appleId } });
    await prisma.auditEvent.deleteMany({ where: { actorUserId: actorId } });
    await prisma.user.deleteMany({ where: { id: actorId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1; });
