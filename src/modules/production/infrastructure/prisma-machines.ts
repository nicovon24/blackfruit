import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { MachineConflictError, type ValidMachine } from "../domain/machine";

export type MachineView = {
  id: string;
  name: string;
  trayCount: number;
  model: string | null;
  notes: string | null;
  version: number;
  archived: boolean;
};

export async function listMachines(): Promise<MachineView[]> {
  const rows = await prisma.productionMachine.findMany({
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, trayCount: true, model: true, notes: true, version: true, archivedAt: true },
  });
  return rows.map(({ archivedAt, ...row }) => ({ ...row, archived: archivedAt !== null }));
}

export async function createMachine(data: ValidMachine, actorId: string, requestKey: string) {
  const existing = await prisma.productionMachine.findUnique({ where: { requestKey }, select: { id: true } });
  if (existing) return existing.id;

  try {
    return await prisma.$transaction(async (tx) => {
      const machine = await tx.productionMachine.create({ data: { ...data, requestKey }, select: { id: true } });
      await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "production_machine", entityId: machine.id, action: "created" } });
      return machine.id;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const repeated = await prisma.productionMachine.findUnique({ where: { requestKey }, select: { id: true } });
      if (repeated) return repeated.id;
    }
    throw error;
  }
}

export async function updateMachine(id: string, version: number, data: ValidMachine, actorId: string) {
  await prisma.$transaction(async (tx) => {
    const result = await tx.productionMachine.updateMany({
      where: { id, version, archivedAt: null },
      data: { ...data, version: { increment: 1 }, updatedAt: new Date() },
    });
    if (result.count !== 1) throw new MachineConflictError();
    await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "production_machine", entityId: id, action: "updated" } });
  });
}

export async function changeMachineArchive(id: string, version: number, archived: boolean, actorId: string) {
  await prisma.$transaction(async (tx) => {
    const result = await tx.productionMachine.updateMany({
      where: { id, version, archivedAt: archived ? null : { not: null } },
      data: { archivedAt: archived ? new Date() : null, version: { increment: 1 }, updatedAt: new Date() },
    });
    if (result.count !== 1) throw new MachineConflictError();
    await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "production_machine", entityId: id, action: archived ? "archived" : "restored" } });
  });
}

export async function deleteMachine(id: string, version: number, actorId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const machine = await tx.productionMachine.findUnique({ where: { id }, select: { version: true } });
      if (!machine || machine.version !== version) throw new MachineConflictError();
      const cycles = await tx.productionCycle.count({ where: { machineId: id } });
      if (cycles > 0) throw new MachineConflictError("La máquina tiene ciclos. Archivala para conservar su historial.");
      await tx.productionMachine.delete({ where: { id } });
      await tx.auditEvent.create({ data: { actorUserId: actorId, entityType: "production_machine", entityId: id, action: "deleted" } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw new MachineConflictError();
    }
    throw error;
  }
}
