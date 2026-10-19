"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import { CycleConflictError, CycleValidationError, type CycleInput } from "@/modules/production/domain/cycle";
import { saveCycle } from "@/modules/production/infrastructure/prisma-cycles";

export type CycleActionState = { field?: string; message?: string; savedId?: string };

function readCycleInput(formData: FormData): CycleInput {
  const raw = String(formData.get("cycle") ?? "");
  if (raw.length > 100_000) throw new CycleValidationError("trays", "El ciclo supera el tamaño permitido.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new CycleValidationError("trays", "Los datos del ciclo no son válidos."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CycleValidationError("trays", "Los datos del ciclo no son válidos.");
  const input = value as Record<string, unknown>;
  if (typeof input.code !== "string" || typeof input.machineId !== "string" || typeof input.finishedOn !== "string" || typeof input.notes !== "string" || !Array.isArray(input.trays) || !Array.isArray(input.results) || input.trays.length > 128 || input.results.length > 128) {
    throw new CycleValidationError("trays", "Los datos del ciclo no son válidos.");
  }
  if (input.trays.some((tray) => !tray || typeof tray !== "object" || !Number.isInteger(tray.position) || (tray.productId !== null && typeof tray.productId !== "string") || (tray.resultKey !== null && typeof tray.resultKey !== "string"))) {
    throw new CycleValidationError("trays", "Las bandejas no son válidas.");
  }
  if (input.results.some((result) => !result || typeof result !== "object" || typeof result.key !== "string" || (result.kg !== null && typeof result.kg !== "string"))) {
    throw new CycleValidationError("results", "Los pesajes no son válidos.");
  }
  return input as CycleInput;
}

export async function saveCycleAction(_previous: CycleActionState, formData: FormData): Promise<CycleActionState> {
  const actor = await requirePermission("production:write");
  try {
    const input = readCycleInput(formData);
    const id = String(formData.get("id") ?? "");
    const version = id ? Number(formData.get("version")) : undefined;
    if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new CycleConflictError();
    const requestKey = String(formData.get("requestKey") ?? "");
    const savedId = await saveCycle(input, actor.id, requestKey, id || undefined, version);
    revalidatePath("/produccion");
    revalidatePath(`/produccion/${savedId}`);
    return { savedId };
  } catch (error) {
    if (error instanceof CycleValidationError) return { field: error.field, message: error.message };
    if (error instanceof CycleConflictError) return { message: error.message };
    throw error;
  }
}
