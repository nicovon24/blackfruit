import Link from "next/link";
import { SaleDialog } from "@/components/shared/sale-dialog";
import { ImportDialog } from "@/components/shared/import-dialog";
import { SampleDialog } from "@/components/shared/sample-dialog";
import { Banknote, ShoppingBag, ChartColumnIncreasing, Users, PackageOpen } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { SalesList } from "@/components/shared/sales-list";
import { SalesChart } from "@/components/shared/sales-chart";
import { formatArs } from "@/lib/format-money";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { currentBusinessMonth, getDashboardPeriodData } from "@/modules/sales/infrastructure/prisma-sale-queries";
import { parseSalesPeriod } from "@/modules/sales/domain/sales-period";
import { PeriodPicker } from "./period-picker";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string; view?: string; from?: string; to?: string }> }) {
  const admin = await requirePagePermission("dashboard:read");
  const currentMonth = currentBusinessMonth();
  const period = parseSalesPeriod(await searchParams, currentMonth);
  const { summary, recent, products, series } = await getDashboardPeriodData(period);
  const metrics = [
    { label: "Total vendido", value: formatArs(summary.total), help: "Solo operaciones confirmadas", icon: Banknote },
    { label: "Cantidad de ventas", value: String(summary.count), help: "Muestras excluidas", icon: ShoppingBag },
    { label: "Ticket promedio", value: formatArs(summary.average), help: "Importe por operación", icon: ChartColumnIncreasing },
    { label: "Clientes compradores", value: String(summary.identifiedCustomers), help: "Clientes identificados distintos", icon: Users },
  ];

  return <AppShell user={admin} section="Dashboard">
    <PageHeading title="Resumen de ventas" description="Ventas confirmadas del período, sin muestras." actions={<><ImportDialog /><SaleDialog /></>} />
    <nav aria-label="Otras tareas" className="mb-5 flex flex-wrap gap-4 text-sm"><Link href="/produccion/maquina" className="inline-flex min-h-11 items-center text-primary hover:underline">Registrar un ciclo →</Link><SampleDialog>Registrar muestra →</SampleDialog></nav>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <PeriodPicker key={`${period.kind}:${period.from ?? ""}:${period.to ?? ""}`} period={period} currentMonth={currentMonth} /><span className="text-xs text-muted-foreground">Moneda: ARS</span>
    </div>
    <section aria-label="Indicadores de ventas" className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
      {metrics.map(({ label, value, help, icon: Icon }) => <div key={label} className="panel metric-card"><div className="metric-label"><span>{label}</span><span className="metric-icon"><Icon size={17} strokeWidth={1.5} aria-hidden="true" /></span></div><p className="metric-value">{value}</p><p className="metric-help">{help}</p></div>)}
    </section>
    <div className="dashboard-sections">
    <div className="dashboard-analysis grid gap-5 xl:grid-cols-[1.8fr_1fr]">
      <section className="panel"><div className="panel-heading"><div><h2>Evolución de ventas</h2><p>Importe registrado en el período</p></div><span className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Por {period.kind === "month" ? "día" : "mes"}</span></div><SalesChart daily={series.map((item, index) => ({ day: index + 1, total: item.total }))} labels={series.map((item) => item.label)} cadence={period.kind === "month" ? "día" : "mes"} /></section>
      <section className="panel"><div className="panel-heading"><div><h2>Productos vendidos</h2><p>Cantidades por producto y unidad</p></div></div>
        {products.length === 0 ? <div className="empty-state product-empty"><PackageOpen size={30} strokeWidth={1.3} aria-hidden="true" /><h3>Todavía sin detalle de productos</h3><p>Las ventas por importe ya suman al total. Acá verás los productos cuando registres ventas con ese detalle.</p></div> : <div className="px-5 pb-6"><ul className="divide-y">{products.map((product) => <li key={`${product.name}-${product.unitLabel}`} className="flex justify-between gap-4 py-3 text-sm"><span>{product.name}</span><strong className="shrink-0 tabular-nums">{new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 }).format(Number(product.quantity))} {product.unitLabel ?? "sin unidad"}</strong></li>)}</ul><p className="border-t pt-3 text-xs text-muted-foreground">Primeras 5 combinaciones alfabéticas · Solo ventas con detalle</p></div>}
      </section>
    </div>
    <section className="panel dashboard-recent"><div className="panel-heading"><div><h2>Ventas recientes</h2><p>Últimas operaciones del período</p></div><Link href="/ventas" className="text-link shrink-0">Ver todas</Link></div><SalesList sales={recent} /></section>
    </div>
  </AppShell>;
}
