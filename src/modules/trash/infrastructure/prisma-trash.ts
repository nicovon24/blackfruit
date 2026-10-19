import { prisma } from "@/lib/prisma";
import { TrashConflictError, type TrashType } from "../domain/trash";

export async function changeTrashState(type: TrashType, id: string, version: number, restore: boolean, actorId: string) {
  if (!id || !Number.isSafeInteger(version) || version < 1) throw new TrashConflictError("La versión no es válida. Recargá la página.");
  await prisma.$transaction(async (tx) => {
    const where = { id, version, deletedAt: restore ? { not: null } : null };
    const data = { deletedAt: restore ? null : new Date(), version: { increment: 1 } };
    let count = 0;
    if (type === "customers") {
      // resolveCustomer takes this same lock before creating any association.
      await tx.$queryRaw`SELECT id FROM customer WHERE id = ${id} FOR UPDATE`;
      if (!restore) {
        const [sales, samples] = await Promise.all([tx.sale.count({ where: { customerId: id } }), tx.sample.count({ where: { customerId: id } })]);
        if (sales || samples) throw new TrashConflictError(`Este cliente tiene ${sales} ventas y ${samples} muestras asociadas, incluidas las de papelera. No se puede enviar a papelera.`);
      }
      count = (await tx.customer.updateMany({ where, data })).count;
    } else if (type === "sales") count = (await tx.sale.updateMany({ where, data })).count;
    else if (type === "production") count = (await tx.productionCycle.updateMany({ where, data })).count;
    else if (type === "samples") count = (await tx.sample.updateMany({ where, data })).count;
    if (count !== 1) throw new TrashConflictError("El registro cambió o ya fue movido. Recargá la página.");
    const entityType = { sales: "sale", customers: "customer", production: "production_cycle", samples: "sample" }[type];
    await tx.auditEvent.create({ data: { actorUserId: actorId, entityType, entityId: id, action: restore ? "restored" : "trashed" } });
  });
}

export type TrashItem = { id: string; version: number; label: string; detail: string; deletedAt: string; imported: boolean };
export async function listTrash(type: TrashType, page: number, search: string) {
  const contains = { contains: search.trim().slice(0, 100), mode: "insensitive" as const };
  const common = { take: 31, skip: (Math.max(1, page) - 1) * 30, orderBy: [{ deletedAt: "desc" as const }, { id: "desc" as const }] };
  let items: TrashItem[];
  if (type === "customers") {
    const rows = await prisma.customer.findMany({ ...common, where: { deletedAt: { not: null }, OR: [{ name: contains }, { email: contains }, { phone: contains }] } });
    items = rows.map((r) => ({ id: r.id, version: r.version, label: r.name, detail: [r.phone, r.email].filter(Boolean).join(" · ") || "Sin datos de contacto", deletedAt: r.deletedAt!.toISOString(), imported: false }));
  } else if (type === "sales") {
    const rows = await prisma.sale.findMany({ ...common, where: { deletedAt: { not: null }, ...(search ? { OR: [{ customer: { name: contains } }, { importRows: { some: { rawName: contains } } }, { channel: contains }] } : {}) }, include: { customer: { select: { name: true } }, _count: { select: { importRows: true } } } });
    items = rows.map((r) => ({ id: r.id, version: r.version, label: r.customer?.name ?? "Venta sin cliente", detail: `${r.occurredOn.toISOString().slice(0, 10).split("-").reverse().join("/")} · $ ${r.total.toFixed(2)} · ${r.status === "void" ? "Anulada" : "Confirmada"}`, deletedAt: r.deletedAt!.toISOString(), imported: r._count.importRows > 0 }));
  } else if (type === "production") {
    const rows = await prisma.productionCycle.findMany({ ...common, where: { deletedAt: { not: null }, OR: [{ code: contains }, { machineName: contains }] } });
    items = rows.map((r) => ({ id: r.id, version: r.version, label: r.code, detail: `${r.machineName} · ${r.status === "draft" ? "Borrador" : "Finalizado"}`, deletedAt: r.deletedAt!.toISOString(), imported: Boolean(r.productionImportBatchId) }));
  } else {
    const rows = await prisma.sample.findMany({ ...common, where: { deletedAt: { not: null }, recipientName: contains }, include: { importReview: { select: { id: true } } } });
    items = rows.map((r) => ({ id: r.id, version: r.version, label: r.recipientName, detail: `${r.sampleOn.toISOString().slice(0, 10).split("-").reverse().join("/")} · ${r.status === "pending" ? "Pendiente" : "Entregada"}`, deletedAt: r.deletedAt!.toISOString(), imported: Boolean(r.importReview) }));
  }
  return { items: items.slice(0, 30), hasNext: items.length > 30 };
}
