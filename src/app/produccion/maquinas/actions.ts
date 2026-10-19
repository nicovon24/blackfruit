"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import { MachineConflictError, MachineValidationError, validateMachine } from "@/modules/production/domain/machine";
import { changeMachineArchive, createMachine, deleteMachine, updateMachine } from "@/modules/production/infrastructure/prisma-machines";

export type MachineActionState = { field?: string; message?: string; savedId?: string; completed?: boolean };

function parseVersion(formData: FormData) {
  const version = Number(formData.get("version"));
  if (!Number.isSafeInteger(version) || version < 1) throw new MachineConflictError();
  return version;
}

function parseId(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new MachineConflictError();
  return id;
}

export async function saveMachineAction(_previous: MachineActionState, formData: FormData): Promise<MachineActionState> {
  const actor = await requirePermission("production:write");
  try {
    const data = validateMachine({
      name: String(formData.get("name") ?? ""),
      trayCount: String(formData.get("trayCount") ?? ""),
      model: String(formData.get("model") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
    const mode = String(formData.get("mode") ?? "");
    if (mode === "create") {
      const requestKey = String(formData.get("requestKey") ?? "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestKey)) throw new MachineConflictError();
      const savedId = await createMachine(data, actor.id, requestKey);
      revalidatePath("/produccion/maquinas");
      return { savedId, completed: true };
    }
    if (mode !== "update") throw new MachineConflictError();
    const id = parseId(formData);
    await updateMachine(id, parseVersion(formData), data, actor.id);
    revalidatePath("/produccion/maquinas");
    return { savedId: id, completed: true };
  } catch (error) {
    if (error instanceof MachineValidationError) return { field: error.field, message: error.message };
    if (error instanceof MachineConflictError) return { message: error.message };
    throw error;
  }
}

export async function manageMachineAction(_previous: MachineActionState, formData: FormData): Promise<MachineActionState> {
  const actor = await requirePermission("production:write");
  try {
    const id = parseId(formData);
    const version = parseVersion(formData);
    const operation = String(formData.get("operation") ?? "");
    if (operation === "archive") await changeMachineArchive(id, version, true, actor.id);
    else if (operation === "restore") await changeMachineArchive(id, version, false, actor.id);
    else if (operation === "delete") await deleteMachine(id, version, actor.id);
    else throw new MachineConflictError();
    revalidatePath("/produccion/maquinas");
    return { completed: true };
  } catch (error) {
    if (error instanceof MachineConflictError) return { message: error.message };
    throw error;
  }
}
