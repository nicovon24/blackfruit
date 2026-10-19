import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { getSalesBreakdown } from "../src/modules/sales/infrastructure/prisma-sale-queries";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("Solo se permite dev/blackfruit.");

async function main() {
const actorId = randomUUID();
let saleId = "";
try {
  await prisma.user.create({ data: { id: actorId, name: "QA Unidades", email: `units-qa-${actorId}@example.invalid`, role: "admin" } });
  const sale = await prisma.sale.create({ data: { occurredOn: new Date("2099-01-10T00:00:00Z"), mode: "lines", status: "confirmed", total: "30.00", createdById: actorId, lines: { create: [
    { productName: "Naranja QA unidades", variant: "Natural", unitLabel: "kg", quantity: "1.250", unitPrice: "10.00", subtotal: "12.50", position: 1 },
    { productName: "Naranja QA unidades", variant: "Natural", unitLabel: "paquetes", quantity: "2.000", unitPrice: "8.75", subtotal: "17.50", position: 2 },
  ] } }, select: { id: true } });
  saleId = sale.id;
  const rows = (await getSalesBreakdown("2099-01")).products.filter((row) => row.name === "Naranja QA unidades · Natural");
  assert.deepEqual(rows.map((row) => [row.unitLabel, row.quantity]), [["kg", "1.25"], ["paquetes", "2"]]);
  process.stdout.write("Cantidades de ventas agrupadas por producto, variante y unidad.\n");
} finally {
  if (saleId) await prisma.sale.delete({ where: { id: saleId } });
  await prisma.user.deleteMany({ where: { id: actorId } });
  await prisma.$disconnect();
}
}

main().catch((error) => { process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1; });
