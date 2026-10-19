import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { saveSample, getSample, listContactsWithoutDeliveredSamples } from "../src/modules/samples/infrastructure/prisma-samples";
import { prepareHistoricalSampleReviews } from "../src/modules/samples/infrastructure/prisma-sample-reviews";
import { uploadImport, previewImport, confirmImport } from "../src/modules/imports/infrastructure/prisma-import-service";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("Solo se permite la rama dev/blackfruit.");

async function main() {
  const actorId = randomUUID();
  let customerId = "";
  const reviewIds: string[] = [];
  try {
    await prisma.user.create({ data: { id: actorId, name: "QA Muestras", email: `samples-qa-${actorId}@example.invalid`, role: "admin" } });
    const customer = await prisma.customer.create({ data: { name: `Contacto QA ${actorId}` } });
    customerId = customer.id;
    const salesBefore = await prisma.sale.count();
    const requestKey = randomUUID();
    const input = { recipientName: "Ana QA", sampleOn: "2026-10-11", status: "pending" as const, deliveredOn: "", notes: "", customerId: "", lines: [{ productId: null, productName: "Naranja", variant: "Sin azúcar", quantity: "0.250", unitLabel: "kg" }] };
    const sampleId = await saveSample(input, actorId, requestKey);
    assert.equal(await saveSample(input, actorId, requestKey), sampleId);
    assert.equal((await getSample(sampleId))?.lines[0].quantity, "0.250");
    assert.equal((await listContactsWithoutDeliveredSamples()).some((row) => row.id === customerId), true);
    await saveSample({ ...input, status: "delivered", customerId }, actorId, "", sampleId, 1);
    assert.equal((await listContactsWithoutDeliveredSamples()).some((row) => row.id === customerId), false);

    const uploaded = await uploadImport(Buffer.from("Fecha,Nombre,Producto,Cantidad,Ref\n2026-10-11,Importada QA,Naranja,0.250,M-1\n"), "sample-lines-qa.csv", actorId);
    const mapping = { ...uploaded.mapping, source: `samples-qa-${randomUUID()}`, mode: "lines" as const, reference: 5, product: 3, quantity: 4, unitPrice: 0, total: 0 };
    const preview = await previewImport(uploaded.id, actorId, { mapping, decisions: [{ key: "ref:M-1", kind: "sample", customerId: "", sampleStatus: "delivered", sampleUnit: "kg" }] });
    assert.equal(preview.summary.errors, 0);
    await confirmImport(uploaded.id, actorId, preview.hash);
    const converted = await prisma.sampleImportReview.findFirstOrThrow({ where: { rows: { some: { batchId: uploaded.id } } }, include: { sample: { include: { lines: true } } } });
    reviewIds.push(converted.id);
    assert.equal(converted.status, "converted");
    assert.equal(converted.sample?.status, "delivered");
    assert.equal(converted.sample?.lines[0].quantity.toFixed(3), "0.250");
    assert.equal(converted.sample?.customerId, null);

    const changed = await uploadImport(Buffer.from("Fecha,Nombre,Producto,Cantidad,Ref\n2026-10-11,Importada QA,Naranja,0.300,M-1\n"), "sample-changed-qa.csv", actorId);
    const changedPreview = await previewImport(changed.id, actorId, { mapping: { ...mapping, sheet: changed.mapping.sheet }, decisions: [{ key: "ref:M-1", kind: "sample", customerId: "", sampleStatus: "delivered", sampleUnit: "kg" }] });
    assert.equal(changedPreview.operations[0].errors.some((issue) => issue.field === "Procedencia"), true);
    await confirmImport(changed.id, actorId, changedPreview.hash);
    const conflicted = await prisma.sampleImportReview.findUniqueOrThrow({ where: { id: converted.id }, include: { sample: { include: { lines: true } } } });
    assert.equal(conflicted.status, "conflict");
    assert.equal(conflicted.sample?.lines[0].quantity.toFixed(3), "0.250");

    const zero = await uploadImport(Buffer.from("Fecha,Nombre,Importe\n2026-10-11,Origen QA,0\n"), "sample-legacy-qa.csv", actorId);
    const zeroPreview = await previewImport(zero.id, actorId, { mapping: { ...zero.mapping, source: `legacy-qa-${randomUUID()}` }, decisions: [{ key: "row:2", kind: "sample", customerId: "" }] });
    await confirmImport(zero.id, actorId, zeroPreview.hash);
    const previousReview = await prisma.sampleImportReview.findFirstOrThrow({ where: { rows: { some: { batchId: zero.id } } } });
    reviewIds.push(previousReview.id);
    assert.equal(previousReview.status, "pending");
    await prisma.importSourceRow.updateMany({ where: { batchId: zero.id }, data: { sampleReviewId: null, originKey: null } });
    await prisma.sampleImportReview.delete({ where: { id: previousReview.id } });
    assert.equal(await prepareHistoricalSampleReviews(zero.id), 1);
    assert.equal(await prepareHistoricalSampleReviews(zero.id), 0);
    const restoredReview = await prisma.sampleImportReview.findFirstOrThrow({ where: { rows: { some: { batchId: zero.id } } } });
    reviewIds.push(restoredReview.id);
    assert.equal(restoredReview.status, "pending");
    assert.equal(restoredReview.sampleId, null);
    assert.equal(await prisma.sale.count(), salesBefore);
    process.stdout.write("Muestras manuales, contactos, importación sin precio y procedencia histórica verificadas.\n");
  } finally {
    await prisma.importSourceRow.deleteMany({ where: { batch: { actorId } } });
    if (reviewIds.length) await prisma.sampleImportReview.deleteMany({ where: { id: { in: reviewIds } } });
    await prisma.importBatch.deleteMany({ where: { actorId } });
    await prisma.sampleLine.deleteMany({ where: { sample: { createdById: actorId } } });
    await prisma.sample.deleteMany({ where: { createdById: actorId } });
    if (customerId) await prisma.customer.deleteMany({ where: { id: customerId } });
    await prisma.auditEvent.deleteMany({ where: { actorUserId: actorId } });
    await prisma.user.deleteMany({ where: { id: actorId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1; });
