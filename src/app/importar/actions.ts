"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import { previewImport, confirmImport } from "@/modules/imports/infrastructure/prisma-import-service";
import { ImportValidationError, type ImportConfig } from "@/modules/imports/domain/import-types";

export async function previewImportAction(id: string, config: ImportConfig) {
  const actor = await requirePermission("imports:write");
  await requirePermission("customers:read");
  try { return { preview: await previewImport(id, actor.id, config) }; }
  catch (error) { return { error: error instanceof ImportValidationError ? error.message : "No pudimos revisar el mapeo. Verificá columnas y filas." }; }
}

export async function confirmImportAction(id: string, hash: string) {
  const actor = await requirePermission("imports:write");
  await requirePermission("sales:write");
  await requirePermission("customers:read");
  try {
    const result = await confirmImport(id, actor.id, hash);
    revalidatePath("/dashboard"); revalidatePath("/ventas"); revalidatePath("/importar");
    return { result };
  } catch (error) { return { error: error instanceof ImportValidationError ? error.message : "No se guardó la importación. Podés reintentar la confirmación del mismo lote." }; }
}
