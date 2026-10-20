"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import { CustomerConflictError, CustomerValidationError } from "@/modules/customers/domain/customer-selection";
import { createCustomer, listCustomerOptions, updateCustomer } from "@/modules/customers/infrastructure/prisma-customers";

export async function searchCustomersAction(term: string, selectedId?: string) {
  await requirePermission("customers:read");
  return listCustomerOptions(term, selectedId);
}

export type CustomerFormState = { field?: string; message?: string; savedId?: string };

export async function createCustomerAction(_previous: CustomerFormState, form: FormData): Promise<CustomerFormState> {
  const actor = await requirePermission("customers:write");
  try {
    const savedId = await createCustomer({ name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), phone: String(form.get("phone") ?? "") }, String(form.get("requestKey") ?? ""), actor.id);
    revalidatePath("/clientes");
    return { savedId };
  } catch (error) {
    if (error instanceof CustomerValidationError) return { field: error.field, message: error.message };
    throw error;
  }
}

export async function updateCustomerAction(id: string, version: number, _previous: CustomerFormState, form: FormData): Promise<CustomerFormState> {
  const actor = await requirePermission("customers:write");
  try {
    await updateCustomer(id, version, { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), phone: String(form.get("phone") ?? "") }, actor.id);
    for (const path of ["/clientes", "/ventas", "/muestras", "/dashboard"]) revalidatePath(path, "layout");
    return { savedId: id };
  } catch (error) {
    if (error instanceof CustomerValidationError) return { field: error.field, message: error.message };
    if (error instanceof CustomerConflictError) return { message: error.message };
    throw error;
  }
}
