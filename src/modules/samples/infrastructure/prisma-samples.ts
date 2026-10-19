import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCustomer } from "@/modules/customers/infrastructure/prisma-customers";
import { SampleConflictError, SampleValidationError, validateSample, type SampleInput } from "../domain/sample";

export type SampleView = {
  id: string;
  recipientName: string;
  sampleOn: string;
  status: "pending" | "delivered";
  deliveredOn: string;
  notes: string;
  customerId: string | null;
  version: number;
  lines: Array<{ productId: string | null; productName: string; variant: string | null; quantity: string; unitLabel: string }>;
  source: Array<{ fileName: string; sheet: string; rowNumber: number }>;
};

export async function saveSample(input: SampleInput, actorId: string, requestKey: string, id?: string, version?: number, reviewId?: string) {
  if (id && (!Number.isInteger(version) || !version || version < 1)) throw new SampleConflictError();
  if (!id && !/^[0-9a-f-]{36}$/i.test(requestKey)) throw new SampleConflictError("La clave de envío es inválida.");
  try {
    return await prisma.$transaction(async (tx) => {
      const previous = id ? await tx.sample.findUnique({ where: { id, deletedAt: null }, select: { version: true, lines: true } }) : null;
      if (id && (!previous || previous.version !== version)) throw new SampleConflictError();
      if (!id) {
        const repeated = await tx.sample.findUnique({ where: { requestKey }, select: { id: true } });
        if (repeated) return repeated.id;
      }
      const review = reviewId ? await tx.sampleImportReview.findUnique({ where: { id: reviewId }, select: { id: true, status: true, sampleId: true } }) : null;
      if (reviewId && !review) throw new SampleConflictError("La revisión de origen ya no está disponible.");
      if (review?.sampleId) return review.sampleId;
      if (review && review.status !== "pending") throw new SampleConflictError("Revisá el conflicto de procedencia antes de convertir esta muestra.");
      const productIds = input.lines.map((line) => line.productId).filter((value): value is string => Boolean(value));
      const products = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, variant: true, active: true } });
      const data = validateSample(input, products);
      for (const line of data.lines) {
        const saved = previous?.lines.find((item) => item.position === line.position && item.productId === line.productId);
        if (line.productId && !products.find((item) => item.id === line.productId)?.active && !saved) throw new SampleValidationError("lines", "Elegí productos activos para las nuevas líneas.");
        if (saved) { line.productName = saved.productName; line.variant = saved.variant; }
      }
      const customerId = await resolveCustomer(tx, data.customer, actorId);
      let sampleId = id;
      if (id) {
        const updated = await tx.sample.updateMany({ where: { id, version, deletedAt: null }, data: { recipientName: data.recipientName, sampleOn: data.sampleOn, status: data.status, deliveredOn: data.deliveredOn, notes: data.notes, customerId, version: { increment: 1 }, updatedAt: new Date() } });
        if (updated.count !== 1) throw new SampleConflictError();
        await tx.sampleLine.deleteMany({ where: { sampleId: id } });
      } else {
        const sample = await tx.sample.create({ data: { recipientName: data.recipientName, sampleOn: data.sampleOn, status: data.status, deliveredOn: data.deliveredOn, notes: data.notes, customerId, createdById: actorId, requestKey }, select: { id: true } });
        sampleId = sample.id;
      }
      await tx.sampleLine.createMany({ data: data.lines.map((line) => ({ ...line, sampleId: sampleId! })) });
      if (review) {
        const changed = await tx.sampleImportReview.updateMany({ where: { id: review.id, status: "pending", sampleId: null }, data: { status: "converted", sampleId, updatedAt: new Date() } });
        if (changed.count !== 1) throw new SampleConflictError();
      }
      await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "sample", entityId: sampleId!, action: id ? "updated" : review ? "converted_from_import" : "created" } });
      return sampleId!;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const repeated = !id ? await prisma.sample.findUnique({ where: { requestKey }, select: { id: true } }) : null;
      if (repeated) return repeated.id;
      throw new SampleConflictError("Otra operación guardó esta muestra. Recargá la página.");
    }
    throw error;
  }
}

export async function listSamples(status?: "pending" | "delivered", page = 1) {
  const rows = await prisma.sample.findMany({ where: { deletedAt: null, ...(status ? { status } : {}) }, orderBy: [{ sampleOn: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: 31, skip: (Math.max(1, page) - 1) * 30, select: { id: true, recipientName: true, sampleOn: true, status: true, customerId: true, lines: { select: { productName: true, variant: true, quantity: true, unitLabel: true } } } });
  return { items: rows.slice(0, 30).map((row) => ({ id: row.id, recipientName: row.recipientName, sampleOn: row.sampleOn.toISOString().slice(0, 10), status: row.status, customerLinked: Boolean(row.customerId), lines: row.lines.map((line) => `${line.productName}${line.variant ? ` · ${line.variant}` : ""} · ${line.quantity.toFixed(3)} ${line.unitLabel}`) })), hasNext: rows.length > 30 };
}

export async function getSample(id: string): Promise<SampleView | null> {
  const sample = await prisma.sample.findUnique({ where: { id, deletedAt: null }, include: { lines: { orderBy: { position: "asc" } }, importReview: { include: { rows: { include: { batch: { select: { fileName: true } } } } } } } });
  if (!sample) return null;
  return { id: sample.id, recipientName: sample.recipientName, sampleOn: sample.sampleOn.toISOString().slice(0, 10), status: sample.status as "pending" | "delivered", deliveredOn: sample.deliveredOn?.toISOString().slice(0, 10) ?? "", notes: sample.notes ?? "", customerId: sample.customerId, version: sample.version, lines: sample.lines.map((line) => ({ productId: line.productId, productName: line.productName, variant: line.variant, quantity: line.quantity.toFixed(3), unitLabel: line.unitLabel })), source: sample.importReview?.rows.map((row) => ({ fileName: row.batch.fileName, sheet: row.sheet, rowNumber: row.rowNumber })) ?? [] };
}

export async function listContactsWithoutDeliveredSamples(page = 1, search = "") {
  const term = search.trim().slice(0, 100);
  const customers = await prisma.customer.findMany({ where: { deletedAt: null, samples: { none: { status: "delivered", deletedAt: null } }, ...(term ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }, { phone: { contains: term, mode: "insensitive" } }] } : {}) }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 51, skip: (Math.max(1, page) - 1) * 50, select: { id: true, name: true, email: true, phone: true, _count: { select: { samples: { where: { status: "pending", deletedAt: null } } } } } });
  return customers.map((customer) => ({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, pendingCount: customer._count.samples }));
}

export async function countContacts() {
  return prisma.customer.count({ where: { deletedAt: null } });
}
