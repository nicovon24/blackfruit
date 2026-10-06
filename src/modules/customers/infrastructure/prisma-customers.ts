import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { CustomerValidationError, type CustomerSelection } from "../domain/customer-selection";

export async function listCustomerOptions() {
  return prisma.customer.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, phone: true, email: true } });
}

// Called inside the sale transaction: failures roll back the customer and audit too.
export async function resolveCustomer(tx: Prisma.TransactionClient, selection: CustomerSelection, actorId: string) {
  if (selection.kind === "none") return null;
  if (selection.kind === "existing") {
    const customer = await tx.customer.findUnique({ where: { id: selection.id }, select: { id: true } });
    if (!customer) throw new CustomerValidationError("customerId", "Ese cliente ya no está disponible. Elegí otro o creá uno nuevo.");
    return customer.id;
  }
  const customer = await tx.customer.create({ data: selection.data });
  await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "customer", entityId: customer.id, action: "created" } });
  return customer.id;
}
