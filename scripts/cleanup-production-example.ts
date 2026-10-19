import { prisma } from "../src/lib/prisma";

const expectedHost = "ep-lucky-lake-b69yg8m7-pooler.c-2.sa-east-1.aws.neon.tech";
const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
if (process.env.NEON_BRANCH !== "dev/blackfruit" || url.hostname !== expectedHost || process.env.NODE_ENV === "production") {
  throw new Error("La limpieza solo está habilitada para la rama de desarrollo conocida.");
}

const cycleKeys = ["10000000-0000-4000-8000-000000000004", "10000000-0000-4000-8000-000000000005", "10000000-0000-4000-8000-000000000006"];
const productKeys = ["10000000-0000-4000-8000-000000000002", "10000000-0000-4000-8000-000000000003"];
const machineKey = "10000000-0000-4000-8000-000000000001";

async function main() {
  const cycles = await prisma.productionCycle.findMany({ where: { requestKey: { in: cycleKeys } }, select: { id: true, code: true } });
  const products = await prisma.product.findMany({ where: { requestKey: { in: productKeys } }, select: { id: true, name: true } });
  const machine = await prisma.productionMachine.findUnique({ where: { requestKey: machineKey }, select: { id: true, name: true } });
  const cycleIds = cycles.map((item) => item.id);
  const productIds = products.map((item) => item.id);
  console.log(JSON.stringify({ mode: process.argv.includes("--execute") ? "execute" : "preview", cycles, products, machine }, null, 2));
  if (!process.argv.includes("--execute")) return;

  await prisma.$transaction(async (tx) => {
    const [otherCycles, saleLines, sampleLines, otherTrays, otherResults] = await Promise.all([
      machine ? tx.productionCycle.count({ where: { machineId: machine.id, id: { notIn: cycleIds } } }) : 0,
      tx.saleLine.count({ where: { productId: { in: productIds } } }),
      tx.sampleLine.count({ where: { productId: { in: productIds } } }),
      tx.productionTray.count({ where: { productId: { in: productIds }, cycleId: { notIn: cycleIds } } }),
      tx.productionResult.count({ where: { productId: { in: productIds }, cycleId: { notIn: cycleIds } } }),
    ]);
    if (otherCycles || saleLines || sampleLines || otherTrays || otherResults) throw new Error("El ejemplo tiene referencias externas. Se canceló la limpieza completa.");
    if (machine && cycles.some((cycle) => !cycle.code.startsWith("DEMO-"))) throw new Error("Se canceló: hay ciclos fuera del conjunto DEMO.");
    await tx.productionTray.deleteMany({ where: { cycleId: { in: cycleIds } } });
    await tx.productionResult.deleteMany({ where: { cycleId: { in: cycleIds } } });
    await tx.productionCycle.deleteMany({ where: { id: { in: cycleIds } } });
    await tx.product.deleteMany({ where: { id: { in: productIds } } });
    if (machine) await tx.productionMachine.delete({ where: { id: machine.id } });
    for (const [entityType, ids] of [["production_cycle", cycleIds], ["product", productIds], ["production_machine", machine ? [machine.id] : []]] as const) {
      await tx.auditEvent.deleteMany({ where: { entityType, entityId: { in: [...ids] } } });
    }
  });
  console.log("Ejemplo eliminado de dev/blackfruit.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
