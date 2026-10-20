import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { CustomerConflictError, CustomerValidationError } from "../src/modules/customers/domain/customer-selection";
import { updateCustomer } from "../src/modules/customers/infrastructure/prisma-customers";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("Solo se permite dev/blackfruit.");

async function main() {
  let actorId = "";
  let customerId = "";
  try {
    const actor = await auth.api.createUser({ body: { email: `customer-edit-${randomUUID()}@example.invalid`, password: randomBytes(32).toString("hex"), name: "Customer Edit QA", role: "admin" } });
    actorId = actor.user.id;
    const customer = await prisma.customer.create({ data: { name: "Cliente QA original", phone: "123", email: null } });
    customerId = customer.id;
    const sample = await prisma.sample.create({ data: { customerId, recipientName: "Muestra QA", sampleOn: new Date("2026-10-19T00:00:00Z"), status: "pending", createdById: actorId } });
    const sale = await prisma.sale.create({ data: { customerId, occurredOn: new Date("2026-10-19T00:00:00Z"), total: "100.00", createdById: actorId } });

    await updateCustomer(customerId, 1, { name: "  Cliente QA corregido  ", phone: " 456 ", email: " prueba@example.invalid " }, actorId);
    const updated = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    assert.equal(updated.name, "Cliente QA corregido");
    assert.equal(updated.phone, "456");
    assert.equal(updated.email, "prueba@example.invalid");
    assert.equal(updated.version, 2);
    assert.equal((await prisma.sample.findUniqueOrThrow({ where: { id: sample.id } })).customerId, customerId);
    const associatedSale = await prisma.sale.findUniqueOrThrow({ where: { id: sale.id }, include: { customer: true } });
    assert.equal(associatedSale.customerId, customerId);
    assert.equal(associatedSale.customer?.name, "Cliente QA corregido");
    assert.equal(associatedSale.total.toFixed(2), "100.00");
    assert.equal(await prisma.auditEvent.count({ where: { actorUserId: actorId, entityType: "customer", entityId: customerId, action: "updated" } }), 1);

    await assert.rejects(updateCustomer(customerId, 1, { name: "Cambio viejo", phone: "", email: "" }, actorId), CustomerConflictError);
    await assert.rejects(updateCustomer(customerId, 2, { name: "Sigue válido", phone: "", email: "mal" }, actorId), CustomerValidationError);
    assert.equal((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).name, "Cliente QA corregido");
    await prisma.customer.update({ where: { id: customerId }, data: { deletedAt: new Date(), version: { increment: 1 } } });
    await assert.rejects(updateCustomer(customerId, 2, { name: "No editar", phone: "", email: "" }, actorId), CustomerConflictError);
    assert.equal(await prisma.auditEvent.count({ where: { actorUserId: actorId, entityType: "customer", entityId: customerId, action: "updated" } }), 1);
    console.log("Edición de cliente, relación de muestra, conflictos, validación y auditoría: OK.");
  } finally {
    if (customerId) {
      await prisma.sample.deleteMany({ where: { customerId } });
      await prisma.sale.deleteMany({ where: { customerId } });
      await prisma.customer.deleteMany({ where: { id: customerId } });
    }
    if (actorId) {
      await prisma.auditEvent.deleteMany({ where: { actorUserId: actorId } });
      await prisma.user.deleteMany({ where: { id: actorId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
