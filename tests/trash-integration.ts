import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { changeTrashState } from "../src/modules/trash/infrastructure/prisma-trash";
import { createCustomer, listCustomers, listCustomerOptions, resolveCustomer } from "../src/modules/customers/infrastructure/prisma-customers";
import { createProduct, updateProduct } from "../src/modules/catalog/infrastructure/prisma-products";
import { saveSample, getSample, listSamples } from "../src/modules/samples/infrastructure/prisma-samples";
import { saveCycle, getCycle, getProductionSummary } from "../src/modules/production/infrastructure/prisma-cycles";
import { getDashboardPeriodData } from "../src/modules/sales/infrastructure/prisma-sale-queries";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("La prueba solo se ejecuta en dev/blackfruit.");

async function main() {
  const actor = await prisma.user.findFirstOrThrow({ where: { role: "admin" }, select: { id: true } });
  const marker = randomUUID().slice(0, 8);
  const ids = { customers: [] as string[], products: [] as string[], samples: [] as string[], cycles: [] as string[], sales: [] as string[], machines: [] as string[] };
  try {
    const emptyId = await createCustomer({ name: `Papelera vacío ${marker}`, email: "", phone: "" }, randomUUID(), actor.id); ids.customers.push(emptyId);
    await changeTrashState("customers", emptyId, 1, false, actor.id);
    assert.equal((await listCustomers(1, marker)).items.some((c) => c.id === emptyId), false);
    assert.equal((await listCustomerOptions(marker)).some((c) => c.id === emptyId), false);
    await changeTrashState("customers", emptyId, 2, true, actor.id);
    assert.equal((await listCustomers(1, marker)).items.some((c) => c.id === emptyId), true);

    const raceId = await createCustomer({ name: `Papelera concurrencia ${marker}`, email: "", phone: "" }, randomUUID(), actor.id); ids.customers.push(raceId);
    let releaseLock!: () => void;
    let signalLock!: () => void;
    const lockHeld = new Promise<void>((resolve) => { signalLock = resolve; });
    const release = new Promise<void>((resolve) => { releaseLock = resolve; });
    const linking = prisma.$transaction(async (tx) => {
      await resolveCustomer(tx, { kind: "existing", id: raceId }, actor.id);
      signalLock();
      await release;
      const linked = await tx.sale.create({ data: { occurredOn: new Date("2026-10-18T00:00:00.000Z"), total: "1.00", customerId: raceId, createdById: actor.id, requestKey: randomUUID() } });
      ids.sales.push(linked.id);
    });
    await lockHeld;
    const attemptedTrash = changeTrashState("customers", raceId, 1, false, actor.id);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal((await prisma.customer.findUniqueOrThrow({ where: { id: raceId } })).deletedAt, null);
    } finally { releaseLock(); }
    await linking;
    await assert.rejects(attemptedTrash, /ventas y .* muestras/);

    const customerId = await createCustomer({ name: `Papelera asociado ${marker}`, email: "", phone: "" }, randomUUID(), actor.id); ids.customers.push(customerId);
    const productId = await createProduct({ name: `Naranja QA ${marker}`, variant: "Natural", unitLabel: "kg" }, actor.id, randomUUID()); ids.products.push(productId);
    const sampleId = await saveSample({ recipientName: `Muestra ${marker}`, sampleOn: "2026-10-18", status: "delivered", deliveredOn: "2026-10-18", notes: "", customerId, customerName: "", customerEmail: "", customerPhone: "", lines: [{ productId, quantity: "0.250", unitLabel: "kg" }] }, actor.id, randomUUID()); ids.samples.push(sampleId);
    const sale = await prisma.sale.create({ data: { occurredOn: new Date("2026-10-18T00:00:00.000Z"), total: "123.45", customerId, createdById: actor.id, requestKey: randomUUID() } }); ids.sales.push(sale.id);
    await assert.rejects(changeTrashState("customers", customerId, 1, false, actor.id), /ventas y .* muestras/);
    await changeTrashState("samples", sampleId, 1, false, actor.id);
    await changeTrashState("sales", sale.id, 1, false, actor.id);
    await assert.rejects(changeTrashState("customers", customerId, 1, false, actor.id), /ventas y .* muestras/);
    assert.equal((await listSamples("delivered", 1)).items.some((s) => s.id === sampleId), false);
    await changeTrashState("samples", sampleId, 2, true, actor.id);
    await changeTrashState("sales", sale.id, 2, true, actor.id);
    assert.equal((await listSamples("delivered", 1)).items.some((s) => s.id === sampleId), true);
    const before = await getSample(sampleId); assert.equal(before?.lines[0]?.productName, `Naranja QA ${marker}`);

    const machine = await prisma.productionMachine.create({ data: { name: `Papelera QA ${marker}`, trayCount: 4 }, select: { id: true } }); ids.machines.push(machine.id);
    const cycleId = await saveCycle({ code: `QA-${marker}`, machineId: machine.id, finishedOn: "2026-10-18", status: "finished", notes: "", trays: [1,2,3,4].map((position) => ({ position, productId: position === 1 ? productId : null, resultKey: position === 1 ? "one" : null })), results: [{ key: "one", kg: "0.500" }] }, actor.id, randomUUID()); ids.cycles.push(cycleId);
    const productionBefore = await getProductionSummary("2026-10");
    await changeTrashState("production", cycleId, 1, false, actor.id);
    assert.equal(await getCycle(cycleId), null);
    const productionAfter = await getProductionSummary("2026-10");
    assert.equal(Number(productionBefore.totalKg) - Number(productionAfter.totalKg), 0.5);
    await changeTrashState("production", cycleId, 2, true, actor.id);
    assert.equal((await getCycle(cycleId))?.totalKg, "0.500");

    await updateProduct(productId, 1, { name: `Manzana QA ${marker}`, variant: "Nueva", unitLabel: "kg" }, actor.id);
    const existing = await getSample(sampleId);
    await saveSample({ recipientName: existing!.recipientName, sampleOn: existing!.sampleOn, status: existing!.status, deliveredOn: existing!.deliveredOn, notes: "Nota editada", customerId, customerName: "", customerEmail: "", customerPhone: "", lines: existing!.lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitLabel: line.unitLabel })) }, actor.id, randomUUID(), sampleId, existing!.version);
    assert.equal((await getSample(sampleId))?.lines[0]?.productName, `Naranja QA ${marker}`);
    const previousCycle = await getCycle(cycleId);
    await saveCycle({ code: previousCycle!.code, machineId: machine.id, finishedOn: previousCycle!.finishedOn, status: "finished", notes: "Nota editada", trays: previousCycle!.trays, results: previousCycle!.results.map((r) => ({ key: r.key, kg: r.kg })) }, actor.id, randomUUID(), cycleId, previousCycle!.version);
    assert.equal((await getCycle(cycleId))?.results[0]?.productName, `Naranja QA ${marker}`);
    assert.ok(await prisma.sale.findUnique({ where: { id: sale.id } }));
    const period = await getDashboardPeriodData({ kind: "month", month: "2026-10", from: "2026-10-01", to: "2026-10-31" });
    assert.ok(Number(period.summary.total) >= 123.45);
    console.log("Papelera, bloqueo de relaciones y descripciones históricas: correcto.");
  } finally {
    await prisma.productionTray.deleteMany({ where: { cycleId: { in: ids.cycles } } });
    await prisma.productionResult.deleteMany({ where: { cycleId: { in: ids.cycles } } });
    await prisma.productionCycle.deleteMany({ where: { id: { in: ids.cycles } } });
    await prisma.productionMachine.deleteMany({ where: { id: { in: ids.machines } } });
    await prisma.sampleLine.deleteMany({ where: { sampleId: { in: ids.samples } } });
    await prisma.sample.deleteMany({ where: { id: { in: ids.samples } } });
    await prisma.sale.deleteMany({ where: { id: { in: ids.sales } } });
    await prisma.customer.deleteMany({ where: { id: { in: ids.customers } } });
    await prisma.product.deleteMany({ where: { id: { in: ids.products } } });
    for (const [entityType, list] of [["customer", ids.customers], ["product", ids.products], ["sample", ids.samples], ["production_cycle", ids.cycles], ["sale", ids.sales]] as const) await prisma.auditEvent.deleteMany({ where: { entityType, entityId: { in: [...list] } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
