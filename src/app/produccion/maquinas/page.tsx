import { randomUUID } from "node:crypto";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { listMachines } from "@/modules/production/infrastructure/prisma-machines";
import { MachineForm, ManageMachineButton } from "./machine-form";
import { ProductionNavigation } from "../production-navigation";

export default async function MachinesPage() {
  const user = await requirePagePermission("production:read");
  const machines = await listMachines();
  return <AppShell user={user} section="Producción / Máquinas">
    <ProductionNavigation active="machine" />
    <Link href="/produccion/maquina" className="text-sm text-primary hover:underline">← Volver a Máquina</Link>
    <div className="mt-6"><PageHeading title="Máquinas" description="Configurá cada deshidratador. Los ciclos conservan la configuración que usaron." /></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
      <section className="space-y-4" aria-label="Máquinas registradas">
        {machines.length === 0 && <div className="panel p-6"><p className="font-medium">Todavía no hay máquinas.</p><p className="mt-2 text-sm text-muted-foreground">Podés comenzar agregando tus dos máquinas de 16 bandejas. Cada una tendrá su propio nombre y configuración.</p></div>}
        {machines.map((machine) => <article key={machine.id} className="panel p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{machine.name}</h2><p className="mt-1 text-sm text-muted-foreground">{machine.trayCount} bandejas{machine.model ? ` · ${machine.model}` : ""}</p></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${machine.archived ? "bg-muted text-muted-foreground" : "bg-[#e8efd9] text-olive"}`}>{machine.archived ? "Archivada" : "Activa"}</span></div>
          {!machine.archived && <details className="rounded-lg border bg-muted/20 p-4"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-primary">Editar configuración</summary><div className="mt-3"><MachineForm key={machine.version} machine={machine} /></div></details>}
          {machine.archived && machine.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{machine.notes}</p>}
          <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">{machine.archived ? <ManageMachineButton machine={machine} operation="restore" label="Reactivar" /> : <><ManageMachineButton machine={machine} operation="archive" label="Archivar" /><ManageMachineButton machine={machine} operation="delete" label="Eliminar si no tiene ciclos" /></>}</div>
        </article>)}
      </section>
      <section className="panel h-fit p-5 sm:p-6" aria-label="Agregar máquina"><h2 className="mb-2 text-lg font-semibold">Agregar máquina</h2><p className="mb-5 text-sm text-muted-foreground">La cantidad inicial sugerida es 16 bandejas. Podés ajustarla para cada máquina.</p><MachineForm initialRequestKey={randomUUID()} /></section>
    </div>
  </AppShell>;
}
