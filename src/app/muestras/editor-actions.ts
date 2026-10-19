"use server";

import { randomUUID } from "node:crypto";
import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import { listCustomerOptions } from "@/modules/customers/infrastructure/prisma-customers";
import { listProductionProducts } from "@/modules/production/infrastructure/prisma-cycles";

export async function loadSampleEditor(preselectedCustomerId?: string) {
  await requirePermission("samples:write");
  await requirePermission("customers:read");
  const [customers, products] = await Promise.all([listCustomerOptions("", preselectedCustomerId), listProductionProducts()]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return { customers, products, today, requestKey: randomUUID(), preselectedCustomerId };
}
