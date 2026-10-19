import { TrashButton } from "@/components/shared/trash-button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { getCycle, listProductionProducts } from "@/modules/production/infrastructure/prisma-cycles";
import { CycleEditor } from "../cycle-editor";
import { ProductionNavigation } from "../production-navigation";
import { dashboardReturn } from "../production-links";

export default async function CycleDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string }> }) {
  const user = await requirePagePermission("production:read");
  const { id } = await params;
  const back = dashboardReturn((await searchParams).back);
  const [cycle, products] = await Promise.all([getCycle(id), listProductionProducts()]);
  if (!cycle) notFound();
  return <AppShell user={user} section={`Producción / ${cycle.code}`}>
    <ProductionNavigation active="machine" dashboardHref={back} />
    <Link href={`/produccion/maquina?${new URLSearchParams({ machine: cycle.machineId, back })}`} className="text-sm text-primary hover:underline">← Volver a Máquina</Link>
    <div className="mt-6"><PageHeading title={cycle.code} description={`${cycle.machineName} · ${cycle.trayCount} bandejas · ${cycle.status === "finished" ? "Finalizado" : "Borrador"}`} /></div>
    <div className="mb-5 flex justify-end"><TrashButton type="production" id={cycle.id} version={cycle.version} back="/produccion" /></div>
    <CycleEditor key={`${cycle.id}-${cycle.version}`} machines={[]} products={products} today={cycle.finishedOn} requestKey="" initial={cycle} dashboardHref={back} />
  </AppShell>;
}
