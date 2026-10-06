import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { uploadImport, previewImport, confirmImport } from "../src/modules/imports/infrastructure/prisma-import-service";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("Solo dev/blackfruit.");

async function main() {
  let actorId = "";
  try {
    const actor = await auth.api.createUser({ body: { email: `zero-sample-qa-${randomUUID()}@example.invalid`, password: randomBytes(32).toString("hex"), name: "Zero Sample QA", role: "admin" } });
    actorId = actor.user.id;
    const uploaded = await uploadImport(Buffer.from("Fecha,Nombre,Importe\n2026-09-16,Cliente QA,0\n"), "zero-sample-qa.csv", actorId);
    const config = { mapping: { ...uploaded.mapping, source: `qa-zero-sample-${randomUUID()}` }, decisions: [{ key: "row:2", kind: "sample" as const, customerId: "" }] };
    const preview = await previewImport(uploaded.id, actorId, config);
    assert.deepEqual(preview.operations[0].errors, []);
    assert.equal(preview.summary.errors, 0);
    assert.equal(preview.summary.samples, 1);
    assert.equal(preview.summary.sampleTotal, "0.00");
    assert.equal(preview.summary.sales, 0);
    const result = await confirmImport(uploaded.id, actorId, preview.hash);
    assert.equal(result.sales, 0);
    assert.equal(result.samples, 1);
    assert.equal(await prisma.importSourceRow.count({ where: { batchId: uploaded.id, kind: "sample", saleId: null } }), 1);
    assert.equal(await prisma.sale.count({ where: { createdById: actorId } }), 0);
    process.stdout.write("Muestra de importe cero conservada sin crear ventas.\n");
  } finally {
    if (actorId) {
      await prisma.importSourceRow.deleteMany({ where: { batch: { actorId } } });
      await prisma.importBatch.deleteMany({ where: { actorId } });
      await prisma.auditEvent.deleteMany({ where: { actorUserId: actorId } });
      await prisma.user.delete({ where: { id: actorId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => { process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1; });
