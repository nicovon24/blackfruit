import { Prisma } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

const expectedHost = "ep-lucky-lake-b69yg8m7-pooler.c-2.sa-east-1.aws.neon.tech";
const runId = "sales-customer-backfill-dev-v1";
const linkedAction = `${runId}:linked`;
const createdAction = `${runId}:created`;
const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
if (process.env.NEON_BRANCH !== "dev/blackfruit" || url.hostname !== expectedHost || process.env.NODE_ENV === "production") {
  throw new Error("Esta carga solo está habilitada para dev/blackfruit.");
}

type SourceRow = { saleId: string; rawName: string };
type Candidate = { key: string; name: string; saleIds: string[] };

function normalize(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es-AR");
}

function groupRows(rows: SourceRow[]): Candidate[] {
  const grouped = new Map<string, { names: Set<string>; saleIds: Set<string> }>();
  const saleNames = new Map<string, string>();
  for (const row of rows) {
    const key = normalize(row.rawName);
    if (!key || row.rawName.trim().length > 160) throw new Error("Hay un nombre vacío o mayor a 160 caracteres; no se aplicaron cambios.");
    const previous = saleNames.get(row.saleId);
    if (previous && previous !== key) throw new Error("Una venta tiene nombres de origen diferentes; requiere revisión manual.");
    saleNames.set(row.saleId, key);
    const group = grouped.get(key) ?? { names: new Set<string>(), saleIds: new Set<string>() };
    group.names.add(row.rawName.trim().replace(/\s+/g, " "));
    group.saleIds.add(row.saleId);
    grouped.set(key, group);
  }
  return [...grouped].map(([key, group]) => ({
    key,
    name: [...group.names].sort((a, b) => a.localeCompare(b, "es-AR"))[0],
    saleIds: [...group.saleIds],
  })).sort((a, b) => a.key.localeCompare(b.key, "es-AR"));
}

async function getSourceRows(tx: Prisma.TransactionClient) {
  return tx.$queryRaw<SourceRow[]>`
    SELECT DISTINCT s.id AS "saleId", i."rawName"
    FROM import_source_row i
    JOIN sale s ON s.id = i."saleId"
    WHERE i."rawName" IS NOT NULL AND btrim(i."rawName") <> ''
      AND s."customerId" IS NULL
    ORDER BY s.id, i."rawName"
  `;
}

async function main() {
  if (process.argv.includes("--rollback")) throw new Error("El rollback requiere una revisión explícita de los eventos de este ensayo.");
  const apply = process.argv.includes("--execute");
  if (!apply) {
    const candidates = groupRows(await getSourceRows(prisma));
    const customerNames = await prisma.customer.findMany({ select: { name: true, deletedAt: true } });
    const matched = candidates.filter((candidate) => customerNames.some((customer) => normalize(customer.name) === candidate.key));
    console.log(JSON.stringify({ mode: "preview", branch: process.env.NEON_BRANCH, groups: candidates.length, sales: candidates.reduce((sum, candidate) => sum + candidate.saleIds.length, 0), matchingCustomers: matched.length, candidates: candidates.map(({ name, saleIds }) => ({ name, sales: saleIds.length })) }, null, 2));
    return;
  }

  const actor = await prisma.user.findFirstOrThrow({ where: { role: "admin", banned: { not: true } }, select: { id: true } });
  const result = await prisma.$transaction(async (tx) => {
    const candidates = groupRows(await getSourceRows(tx));
    if (candidates.length === 0) {
      return { customersCreated: 0, salesLinked: 0, names: [], alreadyApplied: true };
    }
    if (candidates.length !== 26 || candidates.reduce((sum, candidate) => sum + candidate.saleIds.length, 0) !== 32) {
      throw new Error("Cambió la vista previa (se esperaban 26 nombres y 32 ventas). No se aplicaron cambios.");
    }
    const saleIds = candidates.flatMap((candidate) => candidate.saleIds);
    const lockedSales = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM sale WHERE id IN (${Prisma.join(saleIds)}) AND "customerId" IS NULL FOR UPDATE
    `);
    if (lockedSales.length !== saleIds.length) throw new Error("Cambió una asociación de venta durante la carga. No se aplicaron cambios.");

    const customers = await tx.customer.findMany({ select: { name: true, deletedAt: true } });
    const existingKeys = new Set(customers.map((customer) => normalize(customer.name)));
    if (candidates.some((candidate) => existingKeys.has(candidate.key))) {
      throw new Error("Apareció un cliente con uno de los nombres revisados. No se aplicaron cambios.");
    }

    for (const candidate of candidates) {
      const customer = await tx.customer.create({ data: { name: candidate.name } });
      await tx.auditEvent.create({ data: { actorUserId: actor.id, entityType: "customer", entityId: customer.id, action: createdAction } });
      const linked = await tx.sale.updateMany({ where: { id: { in: candidate.saleIds }, customerId: null }, data: { customerId: customer.id, version: { increment: 1 } } });
      if (linked.count !== candidate.saleIds.length) throw new Error("Una venta dejó de estar disponible; se revirtió toda la carga.");
      await tx.auditEvent.createMany({ data: candidate.saleIds.map((saleId) => ({ actorUserId: actor.id, entityType: "sale", entityId: saleId, action: linkedAction })) });
    }
    return { customersCreated: candidates.length, salesLinked: saleIds.length, names: candidates.map((candidate) => candidate.name), alreadyApplied: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
  console.log(JSON.stringify({ mode: "applied", branch: process.env.NEON_BRANCH, runId, ...result }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
