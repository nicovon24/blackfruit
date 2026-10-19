import { prisma } from "../src/lib/prisma";
import { createMachine } from "../src/modules/production/infrastructure/prisma-machines";
import { createProduct } from "../src/modules/catalog/infrastructure/prisma-products";
import { saveCycle } from "../src/modules/production/infrastructure/prisma-cycles";
import type { CycleInput } from "../src/modules/production/domain/cycle";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("El ejemplo solo se puede cargar en dev/blackfruit.");

const keys = {
  machine: "10000000-0000-4000-8000-000000000001",
  orange: "10000000-0000-4000-8000-000000000002",
  apple: "10000000-0000-4000-8000-000000000003",
  september: "10000000-0000-4000-8000-000000000004",
  october: "10000000-0000-4000-8000-000000000005",
  draft: "10000000-0000-4000-8000-000000000006",
};

async function main() {
  const actor = await prisma.user.findFirst({ where: { role: "admin", banned: { not: true } }, select: { id: true } });
  if (!actor) throw new Error("Hace falta un administrador en la rama de desarrollo para auditar el ejemplo.");
  const machineId = await createMachine({ name: "DEMO · Deshidratador", trayCount: 4, model: "Ejemplo", notes: "Datos ficticios para explorar el dashboard" }, actor.id, keys.machine);
  const orangeId = await createProduct({ name: "DEMO · Naranja", variant: "Natural", unitLabel: "kg" }, actor.id, keys.orange);
  const appleId = await createProduct({ name: "DEMO · Manzana", variant: "Natural", unitLabel: "kg" }, actor.id, keys.apple);
  function cycle(code: string, finishedOn: string, status: CycleInput["status"], firstKg: string | null, secondKg: string | null): CycleInput {
    return { code, machineId, finishedOn, status, notes: "Ejemplo ficticio para explorar Producción", trays: [
      { position: 1, productId: orangeId, resultKey: "orange-group" },
      { position: 2, productId: orangeId, resultKey: "orange-group" },
      { position: 3, productId: appleId, resultKey: "apple" },
      { position: 4, productId: null, resultKey: null },
    ], results: [{ key: "orange-group", kg: firstKg }, { key: "apple", kg: secondKg }] };
  }
  await saveCycle(cycle("DEMO-SEP-2026", "2026-09-18", "finished", "1.250", "0.400"), actor.id, keys.september);
  await saveCycle(cycle("DEMO-OCT-2026", "2026-10-12", "finished", "0.875", "0.300"), actor.id, keys.october);
  await saveCycle(cycle("DEMO-BORRADOR-2026", "", "draft", null, null), actor.id, keys.draft);
  const summary = await prisma.productionCycle.findMany({ where: { requestKey: { in: [keys.september, keys.october, keys.draft] } }, select: { code: true, status: true, finishedOn: true }, orderBy: { code: "asc" } });
  console.log(summary.map((item) => `${item.code}: ${item.status} ${item.finishedOn?.toISOString().slice(0, 10) ?? "sin fecha"}`).join("\n"));
}

main().finally(() => prisma.$disconnect());
