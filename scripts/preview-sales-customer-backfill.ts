import { prisma } from "../src/lib/prisma";

const expectedHost = "ep-lucky-lake-b69yg8m7-pooler.c-2.sa-east-1.aws.neon.tech";
const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
if (process.env.NEON_BRANCH !== "dev/blackfruit" || url.hostname !== expectedHost || process.env.NODE_ENV === "production") {
  throw new Error("La vista previa solo está habilitada para dev/blackfruit.");
}

async function main() {
  const candidates = await prisma.$queryRaw<Array<{
    normalized_name: string;
    variants: string[];
    unlinked_sales: number;
    active_sales: number;
    trashed_sales: number;
    active_customer_matches: string[];
    trashed_customer_matches: string[];
  }>>`
    WITH source_sales AS (
      SELECT DISTINCT s.id AS sale_id, s.status, s."deletedAt" AS sale_deleted_at,
        i."rawName" AS raw_name,
        lower(regexp_replace(btrim(i."rawName"), '[[:space:]]+', ' ', 'g')) AS normalized_name
      FROM import_source_row i
      JOIN sale s ON s.id = i."saleId"
      WHERE i."rawName" IS NOT NULL AND btrim(i."rawName") <> ''
        AND s."customerId" IS NULL
    ), grouped_sources AS (
      SELECT normalized_name, array_agg(DISTINCT raw_name ORDER BY raw_name) AS variants,
        count(DISTINCT sale_id)::int AS unlinked_sales,
        count(DISTINCT sale_id) FILTER (WHERE sale_deleted_at IS NULL)::int AS active_sales,
        count(DISTINCT sale_id) FILTER (WHERE sale_deleted_at IS NOT NULL)::int AS trashed_sales
      FROM source_sales GROUP BY normalized_name
    )
    SELECT g.*,
      COALESCE((SELECT array_agg(c.name ORDER BY c.name) FROM customer c
        WHERE c."deletedAt" IS NULL AND lower(regexp_replace(btrim(c.name), '[[:space:]]+', ' ', 'g')) = g.normalized_name), ARRAY[]::text[]) AS active_customer_matches,
      COALESCE((SELECT array_agg(c.name ORDER BY c.name) FROM customer c
        WHERE c."deletedAt" IS NOT NULL AND lower(regexp_replace(btrim(c.name), '[[:space:]]+', ' ', 'g')) = g.normalized_name), ARRAY[]::text[]) AS trashed_customer_matches
    FROM grouped_sources g ORDER BY g.normalized_name
  `;
  const totals = candidates.reduce((summary, candidate) => ({
    groups: summary.groups + 1,
    sales: summary.sales + candidate.unlinked_sales,
    salesInTrash: summary.salesInTrash + candidate.trashed_sales,
    groupsWithActiveMatch: summary.groupsWithActiveMatch + Number(candidate.active_customer_matches.length > 0),
    groupsWithTrashedMatch: summary.groupsWithTrashedMatch + Number(candidate.trashed_customer_matches.length > 0),
  }), { groups: 0, sales: 0, salesInTrash: 0, groupsWithActiveMatch: 0, groupsWithTrashedMatch: 0 });
  const [createdEvents, linkedEvents] = await Promise.all([
    prisma.auditEvent.findMany({ where: { entityType: "customer", action: "sales-customer-backfill-dev-v1:created" }, select: { entityId: true } }),
    prisma.auditEvent.findMany({ where: { entityType: "sale", action: "sales-customer-backfill-dev-v1:linked" }, select: { entityId: true } }),
  ]);
  const linkedIds = linkedEvents.map((event) => event.entityId);
  const linkedSales = linkedIds.length ? await prisma.sale.findMany({ where: { id: { in: linkedIds } }, select: { id: true, customerId: true, customer: { select: { name: true } }, importRows: { select: { rawName: true } } } }) : [];
  const sourceRowsPreserved = linkedIds.length ? await prisma.importSourceRow.count({ where: { saleId: { in: linkedIds }, rawName: { not: null } } }) : 0;
  const consistentLinks = linkedSales.filter((sale) => sale.customer?.name && sale.importRows.every((row) => !row.rawName || normalizeName(row.rawName) === normalizeName(sale.customer!.name))).length;
  const runCustomersStillPresent = await prisma.customer.count({ where: { id: { in: createdEvents.map((event) => event.entityId) } } });
  console.log(JSON.stringify({ branch: process.env.NEON_BRANCH, mode: "read-only-preview", totals, candidates, previousRun: { customersCreatedInRun: createdEvents.length, customersStillPresent: runCustomersStillPresent, salesLinkedInRun: linkedEvents.length, salesStillAssigned: linkedSales.filter((sale) => sale.customerId !== null).length, linksMatchingSourceNames: consistentLinks, sourceRowsPreserved } }, null, 2));
}

function normalizeName(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es-AR");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
