"use server";

import { randomUUID } from "node:crypto";
import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import { listCustomerOptions } from "@/modules/customers/infrastructure/prisma-customers";
import { getSaleDetail } from "@/modules/sales/infrastructure/prisma-sale-queries";

export async function loadSaleEditor(id?: string) {
  await requirePermission(id ? "sales:read" : "sales:write");
  await requirePermission("customers:read");
  const [customers, sale] = await Promise.all([listCustomerOptions(), id ? getSaleDetail(id) : null]);
  if (id && !sale) throw new Error("La venta ya no está disponible.");
  return { customers, sale, requestKey: randomUUID(), today: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()) };
}
