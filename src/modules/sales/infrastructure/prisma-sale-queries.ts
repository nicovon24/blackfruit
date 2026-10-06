import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type SaleListItem = {
  sourceName: string | null;
  customerName: string | null;
  id: string;
  occurredOn: string;
  total: string;
  status: string;
  channel: string | null;
};

function serializeSale(sale: {
  importRows?: { rawName: string | null }[];
  customer?: { name: string } | null;
  id: string;
  occurredOn: Date;
  total: Prisma.Decimal;
  status: string;
  channel: string | null;
}) {
  return {
    sourceName: sale.importRows?.[0]?.rawName ?? null,
    customerName: sale.customer?.name ?? null,
    id: sale.id,
    occurredOn: sale.occurredOn.toISOString().slice(0, 10),
    total: sale.total.toFixed(2),
    status: sale.status,
    channel: sale.channel,
  };
}

export function currentBusinessMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Período inválido.");
  }
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { gte: start, lt: end };
}

export async function getSalesSummary(month: string) {
  const where = {
    occurredOn: monthRange(month),
    status: "confirmed",
    deletedAt: null,
  };

  const [totals, identified] = await Promise.all([
    prisma.sale.aggregate({ where, _count: { id: true }, _sum: { total: true } }),
    prisma.sale.findMany({
      where: { ...where, customerId: { not: null } },
      distinct: ["customerId"],
      select: { customerId: true },
    }),
  ]);

  const count = totals._count.id;
  const total = totals._sum.total ?? new Prisma.Decimal(0);
  return {
    month,
    total: total.toFixed(2),
    count,
    average: count ? total.div(count).toDecimalPlaces(2).toFixed(2) : "0.00",
    identifiedCustomers: identified.length,
  };
}

export async function listSales(limit = 20, month?: string): Promise<SaleListItem[]> {
  const sales = await prisma.sale.findMany({
    where: { deletedAt: null, ...(month ? { occurredOn: monthRange(month) } : {}) },
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: { id: true, occurredOn: true, total: true, status: true, channel: true, customer: { select: { name: true } }, importRows: { take: 1, select: { rawName: true } } },
  });

  return sales.map(serializeSale);
}

export async function getSalesBreakdown(month: string) {
  const where = { occurredOn: monthRange(month), status: "confirmed", deletedAt: null };
  const [daily, products] = await Promise.all([
    prisma.sale.groupBy({ by: ["occurredOn"], where, _sum: { total: true }, orderBy: { occurredOn: "asc" } }),
    prisma.saleLine.groupBy({ by: ["productName", "variant"], where: { sale: where }, _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 }),
  ]);
  const range = monthRange(month);
  const days = new Date(range.lt.getTime() - 86400000).getUTCDate();
  const totals = new Map(daily.map((day) => [day.occurredOn.getUTCDate(), day._sum.total?.toFixed(2) ?? "0.00"]));
  return {
    daily: Array.from({ length: days }, (_, index) => ({ day: index + 1, total: totals.get(index + 1) ?? "0.00" })),
    products: products.map((product) => ({ name: [product.productName, product.variant].filter(Boolean).join(" · "), quantity: product._sum.quantity?.toString() ?? "0" })),
  };
}

export async function getSaleDetail(id: string) {
  const sale = await prisma.sale.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true, occurredOn: true, total: true, status: true, channel: true,
      mode: true, version: true, notes: true,
      customerId: true, customer: { select: { name: true } },
      lines: { orderBy: { position: "asc" }, select: { productName: true, variant: true, quantity: true, unitPrice: true, subtotal: true } },
      importRows: { take: 1, select: { rawName: true, sheet: true, rowNumber: true } },
    },
  });
  return sale ? { ...serializeSale(sale), mode: sale.mode, version: sale.version, notes: sale.notes, customerId: sale.customerId, source: sale.importRows[0] ?? null, lines: sale.lines.map((line) => ({ ...line, quantity: line.quantity.toString(), unitPrice: line.unitPrice.toFixed(2), subtotal: line.subtotal.toFixed(2) })) } : null;
}

export async function listTrashedSales(limit = 50) {
  const sales = await prisma.sale.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: limit,
    select: { id: true, occurredOn: true, total: true, status: true, channel: true, version: true },
  });
  return sales.map((sale) => ({ ...serializeSale(sale), version: sale.version }));
}
