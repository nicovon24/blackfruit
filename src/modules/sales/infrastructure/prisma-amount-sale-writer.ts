import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AmountSaleWriter } from "../application/create-amount-sale";
import { resolveCustomer } from "@/modules/customers/infrastructure/prisma-customers";

export const prismaAmountSaleWriter: AmountSaleWriter = {
  async create(data, actorId, requestKey) {
    try {
      const sale = await prisma.$transaction(async (tx) => {
        const customerId = await resolveCustomer(tx, data.customer, actorId);
        const created = await tx.sale.create({
          data: {
            occurredOn: data.occurredOn,
            total: new Prisma.Decimal(data.total),
            channel: data.channel,
            notes: data.notes,
            createdById: actorId,
            requestKey,
            customerId,
          },
        });
        await tx.auditEvent.create({
          data: {
            actorUserId: actorId,
            entityType: "sale",
            entityId: created.id,
            action: "created",
          },
        });
        return created;
      });
      return { id: sale.id, total: sale.total.toFixed(2) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.sale.findUnique({ where: { requestKey } });
        if (existing && existing.createdById === actorId) {
          return { id: existing.id, total: existing.total.toFixed(2) };
        }
      }
      throw error;
    }
  },
};
