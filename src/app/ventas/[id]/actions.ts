"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import {
  moveSaleToTrash,
  permanentlyDeleteSale,
  restoreSale,
  SaleConflictError,
  updateAmountSale,
  updateSaleDetails,
  voidSale,
} from "@/modules/sales/application/manage-sale";
import { SaleValidationError } from "@/modules/sales/domain/amount-sale";
import { prismaSaleMutator } from "@/modules/sales/infrastructure/prisma-sale-mutator";
import { readAuthorizedCustomerForm } from "@/modules/customers/infrastructure/customer-form";
import { CustomerValidationError } from "@/modules/customers/domain/customer-selection";
import { getSaleDetail } from "@/modules/sales/infrastructure/prisma-sale-queries";

export type EditSaleState = { field?: string; message?: string; saved?: boolean };

function refreshSales() {
  revalidatePath("/dashboard");
  revalidatePath("/ventas");
  revalidatePath("/ventas/papelera");
}

export async function updateAmountSaleAction(
  id: string,
  _previous: EditSaleState,
  formData: FormData,
): Promise<EditSaleState> {
  const actor = await requirePermission("sales:write");
  const customer = await readAuthorizedCustomerForm(formData);
  try {
    const sale = await getSaleDetail(id);
    if (!sale) throw new SaleConflictError();
    const update = sale.mode === "lines" ? updateSaleDetails : updateAmountSale;
    await update(id, Number(formData.get("version")), {
      ...customer,
      occurredOn: String(formData.get("occurredOn") ?? ""),
      amount: sale.mode === "lines" ? sale.total : String(formData.get("amount") ?? ""),
      channel: String(formData.get("channel") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    }, actor.id, prismaSaleMutator);
  } catch (error) {
    if (error instanceof SaleValidationError || error instanceof CustomerValidationError) return { field: error.field, message: error.message };
    if (error instanceof SaleConflictError) return { message: error.message };
    throw error;
  }
  refreshSales();
  revalidatePath(`/ventas/${id}`);
  return { saved: true };
}

export async function voidSaleAction(id: string, formData: FormData) {
  const actor = await requirePermission("sales:write");
  try {
    await voidSale(id, Number(formData.get("version")), actor.id, prismaSaleMutator);
  } catch (error) {
    if (error instanceof SaleConflictError) redirect(`/ventas/${id}?error=conflict`);
    throw error;
  }
  refreshSales();
  if (formData.get("presentation") === "dialog") return;
  redirect(`/ventas/${id}`);
}

export async function trashSaleAction(id: string, formData: FormData) {
  const actor = await requirePermission("sales:write");
  try {
    await moveSaleToTrash(id, Number(formData.get("version")), actor.id, prismaSaleMutator);
  } catch (error) {
    if (error instanceof SaleConflictError) redirect(`/ventas?error=conflict`);
    throw error;
  }
  refreshSales();
  if (formData.get("presentation") === "dialog") return;
  redirect("/ventas");
}

export async function restoreSaleAction(id: string, formData: FormData) {
  const actor = await requirePermission("sales:write");
  try {
    await restoreSale(id, Number(formData.get("version")), actor.id, prismaSaleMutator);
  } catch (error) {
    if (error instanceof SaleConflictError) redirect("/ventas/papelera?error=conflict");
    throw error;
  }
  refreshSales();
  if (formData.get("presentation") === "dialog") return;
  redirect(`/ventas/${id}`);
}

export async function permanentlyDeleteSaleAction(id: string, formData: FormData) {
  const actor = await requirePermission("sales:write");
  try {
    await permanentlyDeleteSale(id, Number(formData.get("version")), actor.id, prismaSaleMutator);
  } catch (error) {
    if (error instanceof SaleConflictError) redirect("/ventas/papelera?error=conflict");
    throw error;
  }
  refreshSales();
  redirect("/ventas/papelera");
}
