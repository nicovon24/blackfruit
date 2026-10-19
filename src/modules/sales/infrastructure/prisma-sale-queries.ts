import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { SalesPeriod } from "@/modules/sales/domain/sales-period";
import { parseBusinessDate } from "@/lib/business-date";

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

export async function listSalesPage(page: number, term = "", status = "all") {
  const search = term.trim().slice(0, 100);
  const date = parseBusinessDate(search);
  const where: Prisma.SaleWhereInput = {
    deletedAt: null,
    ...(status === "confirmed" || status === "void" ? { status } : {}),
    ...(search ? { OR: [
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { importRows: { some: { rawName: { contains: search, mode: "insensitive" } } } },
      { channel: { contains: search, mode: "insensitive" } },
      ...(date ? [{ occurredOn: new Date(`${date}T00:00:00.000Z`) }] : []),
    ] } : {}),
  };
  const rows = await prisma.sale.findMany({
    where, orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: (Math.max(1, page) - 1) * 30, take: 31,
    select: { id: true, occurredOn: true, total: true, status: true, channel: true, customer: { select: { name: true } }, importRows: { take: 1, select: { rawName: true } } },
  });
  return { items: rows.slice(0, 30).map(serializeSale), hasNext: rows.length > 30 };
}

function periodDates(period: SalesPeriod) {
  if (!period.from || !period.to) return undefined;
  const end = new Date(`${period.to}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: new Date(`${period.from}T00:00:00.000Z`), lt: end };
}

export async function getDashboardPeriodData(period: SalesPeriod) {
  const occurredOn = periodDates(period);
  const where: Prisma.SaleWhereInput = { status: "confirmed", deletedAt: null, ...(occurredOn ? { occurredOn } : {}) };
  const sqlDate = occurredOn ? Prisma.sql`AND "occurredOn" >= ${occurredOn.gte} AND "occurredOn" < ${occurredOn.lt}` : Prisma.empty;
  const [totals, identified, products, sales] = await Promise.all([
    prisma.sale.aggregate({ where, _count: { id: true }, _sum: { total: true } }),
    prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`SELECT COUNT(DISTINCT "customerId")::int AS count FROM "sale" WHERE "status" = 'confirmed' AND "deletedAt" IS NULL ${sqlDate}`),
    prisma.saleLine.groupBy({ by: ["productName", "variant", "unitLabel"], where: { sale: where }, _sum: { quantity: true }, orderBy: [{ productName: "asc" }, { variant: "asc" }, { unitLabel: "asc" }], take: 5 }),
    prisma.sale.findMany({ where: { deletedAt: null, ...(occurredOn ? { occurredOn } : {}) }, orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, occurredOn: true, total: true, status: true, channel: true, customer: { select: { name: true } }, importRows: { take: 1, select: { rawName: true } } } }),
  ]);
  const series = period.kind === "month"
    ? await (async () => { const days = await prisma.sale.groupBy({ by: ["occurredOn"], where, _sum: { total: true }, orderBy: { occurredOn: "asc" } }); const values = new Map(days.map((entry) => [entry.occurredOn.getUTCDate(), entry._sum.total?.toFixed(2) ?? "0.00"])); const length = Number(period.to.slice(8)); return Array.from({ length }, (_, index) => ({ label: String(index + 1), total: values.get(index + 1) ?? "0.00" })); })()
    : (await prisma.$queryRaw<Array<{ bucket: Date; total: Prisma.Decimal }>>(Prisma.sql`SELECT date_trunc('month', "occurredOn") AS bucket, SUM("total") AS total FROM "sale" WHERE "status" = 'confirmed' AND "deletedAt" IS NULL ${sqlDate} GROUP BY 1 ORDER BY 1`)).map((entry) => ({ label: new Intl.DateTimeFormat("es-AR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(entry.bucket), total: entry.total.toFixed(2) }));
  const count = totals._count.id;
  const total = totals._sum.total ?? new Prisma.Decimal(0);
  return {
    summary: { total: total.toFixed(2), count, average: count ? total.div(count).toDecimalPlaces(2).toFixed(2) : "0.00", identifiedCustomers: identified[0]?.count ?? 0 },
    recent: sales.map(serializeSale),
    products: products.map((product) => ({ name: [product.productName, product.variant].filter(Boolean).join(" · "), quantity: product._sum.quantity?.toString() ?? "0", unitLabel: product.unitLabel })),
    series,
  };
}

export async function getSalesBreakdown(month: string) {
  const where = { occurredOn: monthRange(month), status: "confirmed", deletedAt: null };
  const [daily, products] = await Promise.all([
    prisma.sale.groupBy({ by: ["occurredOn"], where, _sum: { total: true }, orderBy: { occurredOn: "asc" } }),
    prisma.saleLine.groupBy({ by: ["productName", "variant", "unitLabel"], where: { sale: where }, _sum: { quantity: true }, orderBy: [{ productName: "asc" }, { variant: "asc" }, { unitLabel: "asc" }], take: 5 }),
  ]);
  const range = monthRange(month);
  const days = new Date(range.lt.getTime() - 86400000).getUTCDate();
  const totals = new Map(daily.map((day) => [day.occurredOn.getUTCDate(), day._sum.total?.toFixed(2) ?? "0.00"]));
  return {
    daily: Array.from({ length: days }, (_, index) => ({ day: index + 1, total: totals.get(index + 1) ?? "0.00" })),
    products: products.map((product) => ({ name: [product.productName, product.variant].filter(Boolean).join(" · "), quantity: product._sum.quantity?.toString() ?? "0", unitLabel: product.unitLabel })),
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
