"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import { createAmountSale } from "@/modules/sales/application/create-amount-sale";
import { SaleValidationError } from "@/modules/sales/domain/amount-sale";
import { prismaAmountSaleWriter } from "@/modules/sales/infrastructure/prisma-amount-sale-writer";
import { readAuthorizedCustomerForm } from "@/modules/customers/infrastructure/customer-form";
import { CustomerValidationError } from "@/modules/customers/domain/customer-selection";

export type SaleFormState = { field?: string; message?: string; saleId?: string };

export async function createAmountSaleAction(
  _previous: SaleFormState,
  formData: FormData,
): Promise<SaleFormState> {
  const actor = await requirePermission("sales:write");
  const customer = await readAuthorizedCustomerForm(formData);
  let saleId: string;

  try {
    const created = await createAmountSale(
      {
        ...customer,
        occurredOn: String(formData.get("occurredOn") ?? ""),
        amount: String(formData.get("amount") ?? ""),
        channel: String(formData.get("channel") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      },
      actor.id,
      String(formData.get("requestKey") ?? ""),
      prismaAmountSaleWriter,
    );
    saleId = created.id;
  } catch (error) {
    if (error instanceof SaleValidationError || error instanceof CustomerValidationError) {
      return { field: error.field, message: error.message };
    }
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/ventas");
  return { saleId };
}
