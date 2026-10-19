import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { listMachines } from "@/modules/production/infrastructure/prisma-machines";
import { listMachineCycleChoices } from "@/modules/production/infrastructure/prisma-cycles";
import { ProductionNavigation } from "../production-navigation";
import { dashboardReturn } from "../production-links";
import { MachinePreview } from "./machine-preview";
import { MachineCyclePicker } from "./machine-cycle-picker";

export default async function MachinePage({ searchParams }: { searchParams: Promise<{ machine?: string; back?: string }> }) {
  const user = await requirePagePermission("production:read");
  const query = await searchParams;
  const back = dashboardReturn(query.back);
  const machines = await listMachines();
  const machine = machines.find((item) => item.id === query.machine) ?? machines.find((item) => !item.archived) ?? machines[0];
  const cycles = machine ? await listMachineCycleChoices(machine.id) : [];
  return <AppShell user={user} section="Producción / Máquina">
    <ProductionNavigation active="machine" dashboardHref={back} />
    <PageHeading title="Máquina" description="Elegí un deshidratador para registrar una pasada o consultar sus ciclos." actions={<><Button asChild variant="outline"><Link href="/productos">Productos</Link></Button><Button asChild variant="outline"><Link href="/produccion/maquinas">Gestionar máquinas</Link></Button><Button asChild variant="outline"><Link href="/produccion/importar">Importar Excel</Link></Button>{machine && !machine.archived && <Button asChild><Link href={`/produccion/nuevo?${new URLSearchParams({ machine: machine.id, back })}`}>Registrar ciclo</Link></Button>}</>} />
    {!machine ? <section className="panel p-6"><h2 className="text-lg font-semibold">Primero configurá una máquina</h2><p className="mt-2 text-sm text-muted-foreground">Podés comenzar con dos deshidratadores de 16 bandejas y agregar más después.</p><Button asChild className="mt-4"><Link href="/produccion/maquinas">Agregar máquina</Link></Button></section> : <>
      <section className="panel mb-5 flex flex-wrap items-end gap-4 p-5" aria-label="Seleccionar máquina y ciclo"><form action="/produccion/maquina" className="flex flex-wrap items-end gap-3"><input type="hidden" name="back" value={back} /><label className="space-y-1 text-sm">Equipo<select name="machine" defaultValue={machine.id} className="block h-11 min-w-52 rounded-lg border border-input bg-background px-3">{machines.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.trayCount} bandejas{item.archived ? " · Archivada" : ""}</option>)}</select></label><Button type="submit" variant="outline">Ver máquina</Button></form>{cycles.length > 0 && <MachineCyclePicker cycles={cycles} back={back} />}<Link href={`/produccion?${new URLSearchParams({ machine: machine.id })}`} className="min-h-11 self-end px-3 py-2 text-sm text-primary hover:underline">Ver historial completo</Link></section>
      <MachinePreview key={machine.id} machine={machine} />
      {machine.archived && <p className="mt-4 text-sm text-muted-foreground">Esta máquina está archivada. Sus ciclos siguen disponibles; podés reactivarla desde Gestionar máquinas.</p>}
    </>}
  </AppShell>;
}
