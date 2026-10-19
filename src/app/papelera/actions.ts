"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import { isTrashType, TrashConflictError } from "@/modules/trash/domain/trash";
import { changeTrashState } from "@/modules/trash/infrastructure/prisma-trash";

export async function changeTrashAction(type: string, id: string, version: number, restore: boolean): Promise<{ error?: string }> {
  if (!isTrashType(type) || typeof restore !== "boolean") return { error: "La operación no es válida." };
  const actor = await requirePermission(`${type}:write`);
  try {
    await changeTrashState(type, id, version, restore, actor.id);
  } catch (error) {
    if (error instanceof TrashConflictError) return { error: error.message };
    throw error;
  }
  for (const path of ["/papelera", "/clientes", "/ventas", "/muestras", "/produccion", "/dashboard"]) revalidatePath(path, "layout");
  return {};
}
