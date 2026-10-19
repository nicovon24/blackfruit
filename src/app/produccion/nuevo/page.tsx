import { randomUUID } from "node:crypto";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { listMachines } from "@/modules/production/infrastructure/prisma-machines";
import { listProductionProducts } from "@/modules/production/infrastructure/prisma-cycles";
import { CycleEditor } from "../cycle-editor";
import { ProductionNavigation } from "../production-navigation";
import { dashboardReturn } from "../production-links";

export default async function NewCyclePage({ searchParams }: { searchParams: Promise<{ machine?: string; back?: string }> }) {
  const user = await requirePagePermission("production:read");
  const query = await searchParams;
  const back = dashboardReturn(query.back);
  const [machines, products] = await Promise.all([listMachines(), listProductionProducts()]);
  const active = machines.filter((machine) => !machine.archived);
  const initialMachineId = active.find((machine) => machine.id === query.machine)?.id;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <AppShell user={user} section="Producción / Nuevo ciclo">
    <ProductionNavigation active="machine" dashboardHref={back} />
    <Link href={`/produccion/maquina?${new URLSearchParams({ ...(initialMachineId ? { machine: initialMachineId } : {}), back })}`} className="text-sm text-primary hover:underline">← Volver a Máquina</Link>
    <div className="mt-6"><PageHeading title="Registrar ciclo" description="Cargá los resultados de una pasada que ya terminó físicamente." /></div>
    {active.length ? <CycleEditor key={initialMachineId ?? "default"} machines={active} products={products} today={today} requestKey={randomUUID()} initialMachineId={initialMachineId} dashboardHref={back} /> : <div className="panel p-6"><p>Primero agregá una máquina.</p><Link href="/produccion/maquinas" className="mt-3 inline-block text-primary hover:underline">Gestionar máquinas</Link></div>}
  </AppShell>;
}
