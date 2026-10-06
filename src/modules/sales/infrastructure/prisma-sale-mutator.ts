import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SaleConflictError, type SaleMutator } from "../application/manage-sale";
import { resolveCustomer } from "@/modules/customers/infrastructure/prisma-customers";
import type { CustomerSelection } from "@/modules/customers/domain/customer-selection";

async function mutate(
  id: string,
  version: number,
  actorId: string,
  action: string,
  where: Prisma.SaleWhereInput,
  data: Prisma.SaleUpdateManyMutationInput,
  customer?: CustomerSelection,
) {
  await prisma.$transaction(async (tx) => {
    const customerData = customer ? { customerId: await resolveCustomer(tx, customer, actorId) } : {};
    const result = await tx.sale.updateMany({
      where: { id, version, ...where },
      data: { ...data, ...customerData, version: { increment: 1 } },
    });
    if (result.count !== 1) throw new SaleConflictError();
    await tx.auditEvent.create({
      data: { actorUserId: actorId, entityType: "sale", entityId: id, action },
    });
  });
}

export const prismaSaleMutator: SaleMutator = {
  async updateDetails(id, version, data, actorId) {
    await mutate(id, version, actorId, "updated", { mode: "lines", status: "confirmed", deletedAt: null }, {
      occurredOn: data.occurredOn, channel: data.channel, notes: data.notes,
    }, data.customer);
  },
  async updateAmount(id, version, data, actorId) {
    await mutate(id, version, actorId, "updated", {
      mode: "amount", status: "confirmed", deletedAt: null,
    }, {
      occurredOn: data.occurredOn,
      total: new Prisma.Decimal(data.total),
      channel: data.channel,
      notes: data.notes,
    }, data.customer);
  },
  async void(id, version, actorId) {
    await mutate(id, version, actorId, "voided", {
      status: "confirmed", deletedAt: null,
    }, { status: "void", voidedAt: new Date() });
  },
  async moveToTrash(id, version, actorId) {
    await mutate(id, version, actorId, "trashed", {
      deletedAt: null,
    }, { deletedAt: new Date() });
  },
  async restore(id, version, actorId) {
    await mutate(id, version, actorId, "restored", {
      deletedAt: { not: null },
    }, { deletedAt: null });
  },
  async permanentlyDelete(id, version, actorId) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.sale.updateMany({
        where: { id, version, deletedAt: { not: null } },
        data: { version: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new SaleConflictError();
      await tx.importSourceRow.updateMany({
        where: { saleId: id },
        data: { saleId: null, originKey: null, kind: "deleted" },
      });
      await tx.sale.delete({ where: { id } });
      await tx.auditEvent.create({
        data: { actorUserId: actorId, entityType: "sale", entityId: id, action: "permanently_deleted" },
      });
    });
  },
};
