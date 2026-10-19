"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import { ProductValidationError } from "@/modules/catalog/domain/product";
import { changeProductActive, createProduct, updateProduct } from "@/modules/catalog/infrastructure/prisma-products";

export type ProductActionState = { field?: string; message?: string; completed?: boolean };

export async function createProductAction(_previous: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const actor = await requirePermission("catalog:write");
  try {
    const requestKey = String(formData.get("requestKey") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(requestKey)) return { message: "La clave de envío es inválida." };
    await createProduct({ name: String(formData.get("name") ?? ""), variant: String(formData.get("variant") ?? ""), unitLabel: String(formData.get("unitLabel") ?? "") }, actor.id, requestKey);
    refreshCatalog();
    return { completed: true };
  } catch (error) {
    if (error instanceof ProductValidationError) return { field: error.field, message: error.message };
    throw error;
  }
}

export async function changeProductActiveAction(id: string, active: boolean, version: number): Promise<ProductActionState> {
  const actor = await requirePermission("catalog:write");
  if (typeof active !== "boolean" || !Number.isSafeInteger(version) || version < 1) return { message: "La versión no es válida." };
  try { await changeProductActive(id, active, actor.id, version); }
  catch (error) { if (error instanceof ProductValidationError) return { message: error.message }; throw error; }
  refreshCatalog();
  return { completed: true };
}

function refreshCatalog() {
  for (const path of ["/productos", "/produccion", "/muestras", "/ventas"]) revalidatePath(path, "layout");
}

export async function updateProductAction(id: string, version: number, _previous: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const actor = await requirePermission("catalog:write");
  try {
    await updateProduct(id, version, { name: String(formData.get("name") ?? ""), variant: String(formData.get("variant") ?? ""), unitLabel: String(formData.get("unitLabel") ?? "") }, actor.id);
    refreshCatalog();
    return { completed: true };
  } catch (error) {
    if (error instanceof ProductValidationError) return { field: error.field, message: error.message };
    throw error;
  }
}
