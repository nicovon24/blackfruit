import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { CustomerValidationError, validateCustomerSelection, type CustomerSelection } from "../domain/customer-selection";

export async function listCustomerOptions(term = "", selectedId?: string) {
  const text = term.trim().slice(0, 100);
  const rows = await prisma.customer.findMany({
    where: { deletedAt: null, ...(text ? { OR: [{ name: { contains: text, mode: "insensitive" } }, { email: { contains: text, mode: "insensitive" } }, { phone: { contains: text, mode: "insensitive" } }] } : {}) },
    orderBy: [{ name: "asc" }, { id: "asc" }], take: 30,
    select: { id: true, name: true, phone: true, email: true },
  });
  if (selectedId && !rows.some((row) => row.id === selectedId)) {
    const selected = await prisma.customer.findUnique({ where: { id: selectedId, deletedAt: null }, select: { id: true, name: true, phone: true, email: true } });
    if (selected) rows.unshift(selected);
  }
  return rows;
}

export async function listCustomers(page = 1, term = "") {
  const text = term.trim().slice(0, 100);
  const where = { deletedAt: null, ...(text ? { OR: [{ name: { contains: text, mode: "insensitive" as const } }, { email: { contains: text, mode: "insensitive" as const } }, { phone: { contains: text, mode: "insensitive" as const } }] } : {}) };
  const rows = await prisma.customer.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (Math.max(1, page) - 1) * 30, take: 31, select: { id: true, name: true, phone: true, email: true, updatedAt: true, version: true } });
  return { items: rows.slice(0, 30), hasNext: rows.length > 30 };
}

export async function createCustomer(input: { name: string; email: string; phone: string }, requestKey: string, actorId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(requestKey)) throw new CustomerValidationError("customerId", "Volvé a abrir el formulario e intentá otra vez.");
  const selection = validateCustomerSelection({ customerId: "new", customerName: input.name, customerEmail: input.email, customerPhone: input.phone });
  if (selection.kind !== "new") throw new Error("Selección inesperada.");
  const existing = await prisma.customer.findUnique({ where: { requestKey }, select: { id: true } });
  if (existing) return existing.id;
  try {
    return await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data: { ...selection.data, requestKey }, select: { id: true } });
      await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "customer", entityId: customer.id, action: "created" } });
      return customer.id;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const repeated = await prisma.customer.findUnique({ where: { requestKey }, select: { id: true } });
      if (repeated) return repeated.id;
    }
    throw error;
  }
}

// Called inside the sale transaction: failures roll back the customer and audit too.
export async function resolveCustomer(tx: Prisma.TransactionClient, selection: CustomerSelection, actorId: string) {
  if (selection.kind === "none") return null;
  if (selection.kind === "existing") {
    await tx.$queryRaw`SELECT id FROM customer WHERE id = ${selection.id} FOR UPDATE`;
    const customer = await tx.customer.findUnique({ where: { id: selection.id, deletedAt: null }, select: { id: true } });
    if (!customer) throw new CustomerValidationError("customerId", "Ese cliente ya no está disponible. Elegí otro o creá uno nuevo.");
    return customer.id;
  }
  const customer = await tx.customer.create({ data: selection.data });
  await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "customer", entityId: customer.id, action: "created" } });
  return customer.id;
}
