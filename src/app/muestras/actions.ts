"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import { CustomerValidationError } from "@/modules/customers/domain/customer-selection";
import { SampleConflictError, SampleValidationError, type SampleInput } from "@/modules/samples/domain/sample";
import { saveSample } from "@/modules/samples/infrastructure/prisma-samples";

export type SampleActionState = { field?: string; message?: string; savedId?: string };

function readLines(formData: FormData): SampleInput["lines"] {
  const text = String(formData.get("lines") ?? "");
  if (text.length > 30_000) throw new SampleValidationError("lines", "Hay demasiados datos en las líneas.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new SampleValidationError("lines", "Revisá los productos de la muestra."); }
  if (!Array.isArray(value) || value.length < 1 || value.length > 100 || value.some((line) => !line || typeof line !== "object" || (line.productId !== null && typeof line.productId !== "string") || typeof line.quantity !== "string" || typeof line.unitLabel !== "string" || (line.productName !== undefined && typeof line.productName !== "string") || (line.variant !== undefined && typeof line.variant !== "string" && line.variant !== null))) {
    throw new SampleValidationError("lines", "Revisá los productos de la muestra.");
  }
  return value as SampleInput["lines"];
}

export async function saveSampleAction(_previous: SampleActionState, formData: FormData): Promise<SampleActionState> {
  const actor = await requirePermission("samples:write");
  try {
    const reviewId = String(formData.get("reviewId") ?? "");
    if (reviewId) await requirePermission("imports:write");
    const id = String(formData.get("id") ?? "");
    if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new SampleConflictError();
    const version = id ? Number(formData.get("version")) : undefined;
    const input: SampleInput = {
      recipientName: String(formData.get("recipientName") ?? ""),
      sampleOn: String(formData.get("sampleOn") ?? ""),
      status: String(formData.get("status") ?? "") as SampleInput["status"],
      deliveredOn: String(formData.get("deliveredOn") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      customerId: String(formData.get("customerId") ?? ""),
      customerName: String(formData.get("customerName") ?? ""),
      customerEmail: String(formData.get("customerEmail") ?? ""),
      customerPhone: String(formData.get("customerPhone") ?? ""),
      lines: readLines(formData),
    };
    const savedId = await saveSample(input, actor.id, String(formData.get("requestKey") ?? ""), id || undefined, version, reviewId || undefined);
    revalidatePath("/muestras");
    revalidatePath(`/muestras/${savedId}`);
    revalidatePath("/muestras/revision");
    return { savedId };
  } catch (error) {
    if (error instanceof SampleValidationError || error instanceof CustomerValidationError) return { field: error.field, message: error.message };
    if (error instanceof SampleConflictError) return { message: error.message };
    throw error;
  }
}
