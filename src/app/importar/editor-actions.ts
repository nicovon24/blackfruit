"use server";

import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import { listCustomerOptions } from "@/modules/customers/infrastructure/prisma-customers";
import { listImportResults } from "@/modules/imports/infrastructure/prisma-import-service";
import type { ImportSummary } from "@/modules/imports/domain/import-types";

export async function loadImportEditor() {
  const actor = await requirePermission("imports:read");
  await requirePermission("customers:read");
  const [customers, batches] = await Promise.all([listCustomerOptions(), listImportResults(actor.id)]);
  return {
    customers,
    history: batches.map((batch) => ({
      id: batch.id,
      fileName: batch.fileName,
      confirmedOn: batch.confirmedAt?.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) ?? "",
      result: batch.result as unknown as ImportSummary,
    })),
  };
}
