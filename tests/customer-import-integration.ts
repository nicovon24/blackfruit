import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { createAmountSale } from "../src/modules/sales/application/create-amount-sale";
import { updateAmountSale, updateSaleDetails, SaleConflictError, moveSaleToTrash, permanentlyDeleteSale, restoreSale } from "../src/modules/sales/application/manage-sale";
import { prismaAmountSaleWriter } from "../src/modules/sales/infrastructure/prisma-amount-sale-writer";
import { prismaSaleMutator } from "../src/modules/sales/infrastructure/prisma-sale-mutator";
import { CustomerValidationError } from "../src/modules/customers/domain/customer-selection";
import { currentBusinessMonth, getSalesSummary } from "../src/modules/sales/infrastructure/prisma-sale-queries";
import { uploadImport, previewImport, confirmImport } from "../src/modules/imports/infrastructure/prisma-import-service";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("Solo dev/blackfruit.");
async function main() {
  let actorId = "";
  const customerIds: string[] = [];
  try {
    const actor = await auth.api.createUser({ body: { email: `import-qa-${randomUUID()}@example.invalid`, password: randomBytes(32).toString("hex"), name: "Import QA", role: "admin" } });
    actorId = actor.user.id;
    const month = currentBusinessMonth();
    const baseline = await getSalesSummary(month);
    const input = { occurredOn: `${month}-02`, amount: "100.50", customerId: "new", customerName: `QA ${randomUUID()}`, customerPhone: "+54 351 0000000" };
    const requestKey = randomUUID();
    const first = await createAmountSale(input, actorId, requestKey, prismaAmountSaleWriter);
    const repeated = await createAmountSale(input, actorId, requestKey, prismaAmountSaleWriter);
    assert.equal(first.id, repeated.id);
    const sale = await prisma.sale.findUniqueOrThrow({ where: { id: first.id } });
    customerIds.push(sale.customerId!);
    assert.equal(await prisma.customer.count({ where: { name: input.customerName } }), 1);
    await createAmountSale({ ...input, customerId: sale.customerId! }, actorId, randomUUID(), prismaAmountSaleWriter);
    assert.equal((await getSalesSummary(month)).identifiedCustomers, baseline.identifiedCustomers + 1);
    await assert.rejects(updateAmountSale(first.id, 99, { ...input, customerName: "Must roll back QA" }, actorId, prismaSaleMutator), SaleConflictError);
    assert.equal(await prisma.customer.count({ where: { name: "Must roll back QA" } }), 0);
    await assert.rejects(createAmountSale({ ...input, customerId: randomUUID() }, actorId, randomUUID(), prismaAmountSaleWriter), CustomerValidationError);
    await moveSaleToTrash(first.id, 1, actorId, prismaSaleMutator); await restoreSale(first.id, 2, actorId, prismaSaleMutator);
    assert.equal((await prisma.sale.findUniqueOrThrow({ where: { id: first.id } })).customerId, sale.customerId);
    await updateAmountSale(first.id, 3, { ...input, customerId: "" }, actorId, prismaSaleMutator);
    assert.equal((await prisma.sale.findUniqueOrThrow({ where: { id: first.id } })).customerId, null);

    const csv = Buffer.from(`Fecha,Nombre,Importe\n${month}-02,Cliente QA,123.45\n${month}-03,Sin importe,0\n`);
    const uploaded = await uploadImport(csv, "qa.csv", actorId);
    const config = { mapping: { ...uploaded.mapping, source: `qa-${randomUUID()}` }, decisions: [{ key: "row:3", kind: "excluded" as const, customerId: "" }, { key: "row:2", kind: "sale" as const, customerId: sale.customerId! }] };
    const preview = await previewImport(uploaded.id, actorId, config);
    assert.equal(preview.summary.errors, 0); assert.equal(preview.summary.sales, 1); assert.equal(preview.summary.excluded, 1);
    const results = await Promise.all([confirmImport(uploaded.id, actorId, preview.hash), confirmImport(uploaded.id, actorId, preview.hash)]);
    assert.deepEqual(results[0], results[1]); assert.equal(results[0].total, "123.45");
    assert.equal(await prisma.importSourceRow.count({ where: { batchId: uploaded.id, saleId: { not: null } } }), 1);
    const retryUpload = await uploadImport(csv, "qa-copy.csv", actorId);
    const duplicates = await previewImport(retryUpload.id, actorId, config);
    assert.equal(duplicates.summary.sales, 0); assert.equal(duplicates.summary.duplicates, 1);
    const changed = await uploadImport(Buffer.from(csv.toString().replace("123.45", "999.00")), "qa-changed.csv", actorId);
    const conflict = await previewImport(changed.id, actorId, config);
    assert.ok(conflict.summary.errors > 0);
    await assert.rejects(confirmImport(changed.id, actorId, conflict.hash));
    assert.equal((await prisma.importBatch.findUniqueOrThrow({ where: { id: changed.id } })).status, "draft");
    const linesFile = await uploadImport(Buffer.from(`Fecha,Nombre,Producto,Cantidad,Precio,Ref,Subtotal\n${month}-02,QA líneas,Manzana,2,3200.50,op-1,6401\n${month}-02,QA líneas,Naranja,1,2500,op-1,2500\n`), "qa-lines.csv", actorId);
    const lineConfig = { mapping: { ...linesFile.mapping, source: `qa-lines-${randomUUID()}`, mode: "lines" as const, reference: 6, product: 3, quantity: 4, unitPrice: 5, total: 7 }, decisions: [] };
    const linePreview = await previewImport(linesFile.id, actorId, lineConfig);
    const lineResult = await confirmImport(linesFile.id, actorId, linePreview.hash);
    assert.equal(lineResult.sales, 1); assert.equal(lineResult.total, "8901.00"); assert.equal(lineResult.units, "3.000");
    const source = await prisma.importSourceRow.findFirstOrThrow({ where: { batchId: linesFile.id, saleId: { not: null } } });
    const imported = await prisma.sale.findUniqueOrThrow({ where: { id: source.saleId! }, include: { lines: true } });
    assert.equal(imported.mode, "lines"); assert.equal(imported.lines.length, 2); assert.equal(imported.customerId, null);
    await updateSaleDetails(imported.id, 1, { occurredOn: `${month}-03`, amount: "1.00", customerId: sale.customerId!, notes: "Cliente vinculado después de importar" }, actorId, prismaSaleMutator);
    const updatedLines = await prisma.sale.findUniqueOrThrow({ where: { id: imported.id }, include: { lines: true } });
    assert.equal(updatedLines.customerId, sale.customerId); assert.equal(updatedLines.total.toFixed(2), "8901.00");
    assert.deepEqual(updatedLines.lines, imported.lines);

    await assert.rejects(permanentlyDeleteSale(imported.id, 2, actorId, prismaSaleMutator), SaleConflictError);
    await moveSaleToTrash(imported.id, 2, actorId, prismaSaleMutator);
    await assert.rejects(permanentlyDeleteSale(imported.id, 2, actorId, prismaSaleMutator), SaleConflictError);
    await permanentlyDeleteSale(imported.id, 3, actorId, prismaSaleMutator);
    assert.equal(await prisma.sale.count({ where: { id: imported.id } }), 0);
    assert.equal(await prisma.saleLine.count({ where: { saleId: imported.id } }), 0);
    assert.equal(await prisma.importSourceRow.count({ where: { batchId: linesFile.id, kind: "deleted", saleId: null, originKey: null } }), 2);
    assert.equal(await prisma.auditEvent.count({ where: { entityType: "sale", entityId: imported.id, action: "permanently_deleted" } }), 1);
    const reloadedLines = await uploadImport(Buffer.from(`Fecha,Nombre,Producto,Cantidad,Precio,Ref,Subtotal\n${month}-02,QA líneas,Manzana,2,3200.50,op-1,6401\n${month}-02,QA líneas,Naranja,1,2500,op-1,2500\n`), "qa-lines-again.csv", actorId);
    const freshPreview = await previewImport(reloadedLines.id, actorId, lineConfig);
    assert.equal(freshPreview.summary.sales, 1);
    assert.equal(freshPreview.summary.duplicates, 0);
    const correctedFile = await uploadImport(Buffer.from(`Fecha,Nombre,Importe\n${month}-02,QA corregida,0\n`), "qa-corrected.csv", actorId);
    const correctedConfig = { mapping: { ...correctedFile.mapping, source: `qa-corrected-${randomUUID()}` }, decisions: [{ key: "row:2", kind: "sale" as const, customerId: "", amount: "1000.00" }] };
    const correctedPreview = await previewImport(correctedFile.id, actorId, correctedConfig);
    assert.equal(correctedPreview.summary.total, "1000.00");
    await confirmImport(correctedFile.id, actorId, correctedPreview.hash);
    const correctedSource = await prisma.importSourceRow.findFirstOrThrow({ where: { batchId: correctedFile.id }, include: { sale: { include: { lines: true } } } });
    assert.equal(correctedSource.sale?.mode, "amount");
    assert.equal(correctedSource.sale?.total.toFixed(2), "1000.00");
    assert.equal(correctedSource.sale?.lines.length, 0);
    process.stdout.write("Clientes, transacciones, duplicados y conciliación de importación: correcto.\n");
  } finally {
    if (actorId) {
      await prisma.importSourceRow.deleteMany({ where: { batch: { actorId } } });
      await prisma.importBatch.deleteMany({ where: { actorId } });
      await prisma.auditEvent.deleteMany({ where: { actorUserId: actorId } });
      await prisma.sale.deleteMany({ where: { createdById: actorId } });
      await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
      await prisma.user.delete({ where: { id: actorId } });
    }
    await prisma.$disconnect();
  }
}
main().catch((error) => { process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1; });
