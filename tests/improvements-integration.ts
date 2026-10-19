import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { getDashboardPeriodData } from "../src/modules/sales/infrastructure/prisma-sale-queries";
import { getProductionSummary } from "../src/modules/production/infrastructure/prisma-cycles";
import { listCustomers } from "../src/modules/customers/infrastructure/prisma-customers";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("La integración solo se ejecuta en dev/blackfruit.");

async function main() {
  const [october, history, production, customers] = await Promise.all([
    getDashboardPeriodData({ kind: "month", month: "2026-10", from: "2026-10-01", to: "2026-10-31" }),
    getDashboardPeriodData({ kind: "all", from: null, to: null }),
    getProductionSummary("2026-10"),
    listCustomers(1),
  ]);
  assert.equal(october.series.length, 31);
  assert.ok(history.summary.count >= october.summary.count);
  assert.ok(production.finishedCount >= 1);
  assert.equal(typeof customers.hasNext, "boolean");
  console.log(`Dashboard OK: ${october.series.length} días, ${history.summary.count} ventas históricas, ${production.finishedCount} ciclo(s) de octubre.`);
}

main().finally(() => prisma.$disconnect());
