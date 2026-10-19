import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { CycleConflictError, CycleValidationError, kgDifference, kgTotal, validateCycle, type CycleInput, type ProductChoice, type ValidCycle } from "../domain/cycle";

export type CycleView = {
  id: string;
  code: string;
  machineId: string;
  machineName: string;
  trayCount: number;
  status: "draft" | "finished";
  finishedOn: string;
  notes: string;
  version: number;
  trays: Array<{ position: number; productId: string | null; productName: string | null; variant: string | null; resultKey: string | null }>;
  results: Array<{ key: string; kind: "individual" | "group"; productName: string; variant: string | null; kg: string | null; positions: number[] }>;
  totalKg: string;
};

export async function listProductionProducts(): Promise<ProductChoice[]> {
  return prisma.product.findMany({ select: { id: true, name: true, variant: true, active: true }, orderBy: [{ name: "asc" }, { variant: "asc" }] });
}

function resultWrites(data: ValidCycle, cycleId: string) {
  const resultIdByKey = new Map<string, string>();
  const results = data.results.map((result) => {
    const id = randomUUID();
    resultIdByKey.set(result.key, id);
    return { id, cycleId, kind: result.kind, productId: result.productId, productName: result.productName, variant: result.variant, kg: result.kg };
  });
  const trays = data.trays.map((tray) => ({
    cycleId,
    position: tray.position,
    productId: tray.productId,
    productName: tray.productName,
    variant: tray.variant,
    resultId: tray.resultKey ? resultIdByKey.get(tray.resultKey)! : null,
  }));
  return { results, trays };
}

export async function saveCycle(input: CycleInput, actorId: string, requestKey: string, id?: string, version?: number) {
  if (id) {
    if (!Number.isSafeInteger(version) || !version || version < 1) throw new CycleConflictError();
  } else if (!/^[0-9a-f-]{36}$/i.test(requestKey)) throw new CycleConflictError("La clave de envío es inválida.");

  try {
    return await prisma.$transaction(async (tx) => {
      const previous = id ? await tx.productionCycle.findUnique({ where: { id, deletedAt: null }, select: { trays: true, id: true, machineId: true, machineName: true, trayCount: true, status: true, confirmedAt: true, version: true } }) : null;
      if (id && (!previous || previous.version !== version)) throw new CycleConflictError();
      if (!id) {
        const repeated = await tx.productionCycle.findUnique({ where: { requestKey }, select: { id: true } });
        if (repeated) return repeated.id;
      }

      const machine = previous
        ? { id: previous.machineId, name: previous.machineName, trayCount: previous.trayCount }
        : await tx.productionMachine.findFirst({ where: { id: input.machineId, archivedAt: null }, select: { id: true, name: true, trayCount: true } });
      if (!machine) throw new CycleValidationError("machineId", "Elegí una máquina activa.");
      const productIds = Array.isArray(input.trays) ? [...new Set(input.trays.map((tray) => tray.productId).filter((value): value is string => typeof value === "string" && value !== ""))] : [];
      const products = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, variant: true, active: true } });
      const previousProducts = new Map(previous?.trays.filter((tray) => tray.productId).map((tray) => [tray.productId!, tray]) ?? []);
      for (const product of products) {
        const saved = previousProducts.get(product.id);
        if (!product.active && !saved) throw new CycleValidationError("trays", "Seleccioná productos activos para las nuevas bandejas.");
        if (saved) { product.name = saved.productName!; product.variant = saved.variant; }
      }
      const data = validateCycle(input, machine, products);
      const now = new Date();
      let cycleId = id;
      if (previous) {
        const updated = await tx.productionCycle.updateMany({
          where: { id: previous.id, version, deletedAt: null },
          data: { code: data.code, status: data.status, finishedOn: data.finishedOn, notes: data.notes, confirmedAt: data.status === "finished" ? previous.confirmedAt ?? now : null, version: { increment: 1 }, updatedAt: now },
        });
        if (updated.count !== 1) throw new CycleConflictError();
        await tx.productionTray.deleteMany({ where: { cycleId: previous.id } });
        await tx.productionResult.deleteMany({ where: { cycleId: previous.id } });
      } else {
        const cycle = await tx.productionCycle.create({
          data: { code: data.code, machineId: data.machineId, machineName: data.machineName, trayCount: data.trayCount, status: data.status, finishedOn: data.finishedOn, confirmedAt: data.status === "finished" ? now : null, notes: data.notes, requestKey, createdById: actorId },
          select: { id: true },
        });
        cycleId = cycle.id;
      }
      const writes = resultWrites(data, cycleId!);
      if (writes.results.length) await tx.productionResult.createMany({ data: writes.results });
      await tx.productionTray.createMany({ data: writes.trays });
      await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "production_cycle", entityId: cycleId!, action: previous ? "corrected" : data.status === "finished" ? "finished" : "created_draft" } });
      return cycleId!;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (!id) {
        const repeated = await prisma.productionCycle.findUnique({ where: { requestKey }, select: { id: true } });
        if (repeated) return repeated.id;
      }
      throw new CycleValidationError("code", "Ya existe un ciclo con esa identificación.");
    }
    throw error;
  }
}

export async function getCycle(id: string): Promise<CycleView | null> {
  const cycle = await prisma.productionCycle.findUnique({
    where: { id, deletedAt: null },
    include: { trays: { orderBy: { position: "asc" } }, results: { include: { trays: { select: { position: true }, orderBy: { position: "asc" } } } } },
  });
  if (!cycle) return null;
  const results = cycle.results.map((result) => ({ key: result.id, kind: result.kind as "individual" | "group", productName: result.productName, variant: result.variant, kg: result.kg?.toFixed(3) ?? null, positions: result.trays.map((tray) => tray.position) }));
  return {
    id: cycle.id, code: cycle.code, machineId: cycle.machineId, machineName: cycle.machineName, trayCount: cycle.trayCount, status: cycle.status as "draft" | "finished", finishedOn: cycle.finishedOn?.toISOString().slice(0, 10) ?? "", notes: cycle.notes ?? "", version: cycle.version,
    trays: cycle.trays.map((tray) => ({ position: tray.position, productId: tray.productId, productName: tray.productName, variant: tray.variant, resultKey: tray.resultId })),
    results, totalKg: kgTotal(results.map((result) => result.kg)),
  };
}

export type CycleListItem = Pick<CycleView, "id" | "code" | "machineName" | "status" | "finishedOn" | "totalKg"> & { products: string[] };

function monthRange(month?: string) {
  if (!month || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) return { month: null, from: undefined, to: undefined };
  const from = new Date(`${month}-01T00:00:00.000Z`);
  const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
  return { month, from, to };
}

export async function listCycles(page = 1, machineId?: string, month?: string, status: "finished" | "draft" = "finished"): Promise<{ items: CycleListItem[]; hasNext: boolean }> {
  const { from, to } = monthRange(month);
  const rows = await prisma.productionCycle.findMany({
    where: { deletedAt: null, status, ...(machineId ? { machineId } : {}), ...(status === "finished" && from && to ? { finishedOn: { gte: from, lt: to } } : {}) },
    take: 31,
    skip: (Math.max(1, page) - 1) * 30,
    orderBy: [{ finishedOn: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    select: { id: true, code: true, machineName: true, status: true, finishedOn: true, results: { select: { productName: true, variant: true, kg: true } } },
  });
  return { items: rows.slice(0, 30).map((row) => ({
    id: row.id, code: row.code, machineName: row.machineName, status: row.status as "draft" | "finished", finishedOn: row.finishedOn?.toISOString().slice(0, 10) ?? "",
    products: [...new Set(row.results.map((result) => `${result.productName}${result.variant ? ` · ${result.variant}` : ""}`))],
    totalKg: kgTotal(row.results.map((result) => result.kg?.toFixed(3) ?? null)),
  })), hasNext: rows.length > 30 };
}

export async function listFinishedCycleChoices(selectedIds: string[] = []) {
  const select = { id: true, code: true, finishedOn: true, machineName: true } as const;
  const [recent, selected] = await Promise.all([
    prisma.productionCycle.findMany({ where: { deletedAt: null, status: "finished" }, orderBy: [{ finishedOn: "desc" }, { id: "desc" }], take: 100, select }),
    selectedIds.length ? prisma.productionCycle.findMany({ where: { deletedAt: null, status: "finished", id: { in: selectedIds } }, select }) : Promise.resolve([]),
  ]);
  return [...new Map([...recent, ...selected].map((row) => [row.id, row])).values()].map((row) => ({ id: row.id, code: row.code, machineName: row.machineName, finishedOn: row.finishedOn!.toISOString().slice(0, 10) }));
}

export async function listMachineCycleChoices(machineId: string) {
  const rows = await prisma.productionCycle.findMany({ where: { machineId, deletedAt: null }, orderBy: [{ finishedOn: "desc" }, { createdAt: "desc" }], take: 20, select: { id: true, code: true, status: true, finishedOn: true } });
  return rows.map((row) => ({ id: row.id, code: row.code, status: row.status, finishedOn: row.finishedOn?.toISOString().slice(0, 10) ?? null }));
}

export async function getProductionSummary(month?: string, machineId?: string) {
  const { month: validMonth, from, to } = monthRange(month);
  const cycleWhere = { deletedAt: null, status: "finished", ...(machineId ? { machineId } : {}), ...(from && to ? { finishedOn: { gte: from, lt: to } } : {}) };
  const [finishedCount, drafts, grouped] = await Promise.all([
    prisma.productionCycle.count({ where: cycleWhere }),
    prisma.productionCycle.count({ where: { deletedAt: null, status: "draft", ...(machineId ? { machineId } : {}) } }),
    prisma.productionResult.groupBy({ by: ["productName", "variant"], where: { cycle: cycleWhere }, _sum: { kg: true } }),
  ]);
  const byProduct = grouped.map((row) => ({ product: `${row.productName}${row.variant ? ` · ${row.variant}` : ""}`, kg: row._sum.kg?.toFixed(3) ?? "0.000" })).sort((a, b) => a.product.localeCompare(b.product, "es"));
  return { month: validMonth, finishedCount, draftCount: drafts, totalKg: kgTotal(byProduct.map((row) => row.kg)), byProduct };
}

export async function compareCycles(firstId: string, secondId: string) {
  if (!firstId || !secondId || firstId === secondId) return null;
  const [first, second] = await Promise.all([getCycle(firstId), getCycle(secondId)]);
  if (!first || !second || first.status !== "finished" || second.status !== "finished") return null;
  const breakdown = (cycle: CycleView) => {
    const map = new Map<string, Array<string | null>>();
    for (const result of cycle.results) {
      const label = `${result.productName}${result.variant ? ` · ${result.variant}` : ""}`;
      map.set(label, [...(map.get(label) ?? []), result.kg]);
    }
    return new Map([...map].map(([label, weights]) => [label, kgTotal(weights)]));
  };
  const left = breakdown(first);
  const right = breakdown(second);
  const products = [...new Set([...left.keys(), ...right.keys()])].sort((a, b) => a.localeCompare(b, "es"));
  return { first: { id: first.id, code: first.code, machineName: first.machineName, totalKg: first.totalKg }, second: { id: second.id, code: second.code, machineName: second.machineName, totalKg: second.totalKg }, rows: products.map((product) => ({ product, firstKg: left.get(product) ?? "0.000", secondKg: right.get(product) ?? "0.000", differenceKg: kgDifference(right.get(product) ?? "0.000", left.get(product) ?? "0.000") })), differenceKg: kgDifference(second.totalKg, first.totalKg) };
}
