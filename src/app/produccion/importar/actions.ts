"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import { confirmProductionImport, ProductionImportError } from "@/modules/production/infrastructure/prisma-production-imports";

export async function confirmProductionImportAction(batchId: string) {
  const actor = await requirePermission("production:write");
  await requirePermission("imports:write");
  try {
    const result = await confirmProductionImport(batchId, actor.id);
    revalidatePath("/produccion");
    revalidatePath("/produccion/maquina");
    return { result };
  } catch (error) {
    if (error instanceof ProductionImportError) return { error: error.message };
    throw error;
  }
}
