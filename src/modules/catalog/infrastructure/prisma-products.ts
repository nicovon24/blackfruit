import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProductInput } from "../domain/product";
import { ProductValidationError, validateProduct } from "../domain/product";

export async function listProducts() {
  return prisma.product.findMany({ select: { id: true, name: true, variant: true, unitLabel: true, active: true, version: true }, orderBy: [{ name: "asc" }, { variant: "asc" }] });
}

export async function listCatalogProducts(search: string, status: "all" | "active" | "archived", page: number) {
  const where: Prisma.ProductWhereInput = {
    ...(status === "active" ? { active: true } : status === "archived" ? { active: false } : {}),
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { variant: { contains: search, mode: "insensitive" } }] } : {}),
  };
  const size = 50;
  const [count, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, select: { id: true, name: true, variant: true, unitLabel: true, active: true, version: true }, orderBy: [{ name: "asc" }, { variant: "asc" }, { id: "asc" }], skip: (page - 1) * size, take: size }),
  ]);
  return { items, count, hasNext: page * size < count };
}

export async function createProduct(input: ProductInput, actorId: string, requestKey: string) {
  const data = validateProduct(input);
  const repeated = await prisma.product.findUnique({ where: { requestKey }, select: { id: true } });
  if (repeated) return repeated.id;
  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: { ...data, requestKey }, select: { id: true } });
      await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "product", entityId: product.id, action: "created" } });
      return product.id;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.product.findUnique({ where: { requestKey }, select: { id: true } });
      if (existing) return existing.id;
    }
    throw error;
  }
}

export async function changeProductActive(id: string, active: boolean, actorId: string, version?: number) {
  await prisma.$transaction(async (tx) => {
    const changed = await tx.product.updateMany({ where: { id, active: !active, ...(version !== undefined ? { version } : {}) }, data: { active, version: { increment: 1 }, updatedAt: new Date() } });
    if (changed.count !== 1) throw new Error("El producto cambió. Recargá la página.");
    await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "product", entityId: id, action: active ? "reactivated" : "archived" } });
  });
}

export async function updateProduct(id: string, version: number, input: ProductInput, actorId: string) {
  const data = validateProduct(input);
  if (!Number.isSafeInteger(version) || version < 1) throw new ProductValidationError("name", "La versión es inválida. Recargá la página.");
  await prisma.$transaction(async (tx) => {
    const changed = await tx.product.updateMany({ where: { id, version }, data: { ...data, version: { increment: 1 } } });
    if (changed.count !== 1) throw new ProductValidationError("name", "El producto cambió. Recargá la página antes de editar.");
    await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "product", entityId: id, action: "updated" } });
  });
}
