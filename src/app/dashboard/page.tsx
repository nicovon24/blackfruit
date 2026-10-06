import Link from "next/link";
import { SaleDialog } from "@/components/shared/sale-dialog";
import { ImportDialog } from "@/components/shared/import-dialog";
import { Banknote, ShoppingBag, ChartColumnIncreasing, Users, PackageOpen } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { SalesList } from "@/components/shared/sales-list";
import { SalesChart } from "@/components/shared/sales-chart";
import { Button } from "@/components/ui/button";
import { formatArs } from "@/lib/format-money";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { currentBusinessMonth, getSalesSummary, getSalesBreakdown, listSales } from "@/modules/sales/infrastructure/prisma-sale-queries";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const admin = await requirePagePermission("dashboard:read");
  const requestedPeriod = (await searchParams).period;
  const period = requestedPeriod && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedPeriod) ? requestedPeriod : currentBusinessMonth();
  const [summary, recent, breakdown] = await Promise.all([getSalesSummary(period), listSales(5, period), getSalesBreakdown(period)]);
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(period + "-01T12:00:00Z"));
  const metrics = [
    { label: "Total vendido", value: formatArs(summary.total), help: "Solo operaciones confirmadas", icon: Banknote },
    { label: "Cantidad de ventas", value: String(summary.count), help: "Muestras excluidas", icon: ShoppingBag },
    { label: "Ticket promedio", value: formatArs(summary.average), help: "Importe por operación", icon: ChartColumnIncreasing },
    { label: "Clientes compradores", value: String(summary.identifiedCustomers), help: "Clientes identificados distintos", icon: Users },
  ];
  const maxUnits = Math.max(1, ...breakdown.products.map((product) => Number(product.quantity)));

  return <AppShell user={admin} section="Dashboard">
    <PageHeading title="Resumen del negocio" description="Tus ventas, en un solo lugar." actions={<><ImportDialog /><SaleDialog /></>} />
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <form method="get" className="flex flex-wrap items-center gap-2">
        <label htmlFor="period" className="sr-only">Período</label>
        <input id="period" name="period" type="month" defaultValue={period} className="h-11 min-w-0 rounded-lg border border-border bg-white px-3 text-sm" />
        <Button type="submit" variant="outline">Ver</Button>
        <span className="ml-2 hidden text-xs text-muted-foreground xl:inline capitalize">{monthLabel}</span>
      </form><span className="text-xs text-muted-foreground">Moneda: ARS</span>
    </div>
    <section aria-label="Indicadores de ventas" className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
      {metrics.map(({ label, value, help, icon: Icon }) => <div key={label} className="panel metric-card"><div className="metric-label"><span>{label}</span><span className="metric-icon"><Icon size={17} strokeWidth={1.5} aria-hidden="true" /></span></div><p className="metric-value">{value}</p><p className="metric-help">{help}</p></div>)}
    </section>
    <div className="dashboard-sections">
    <div className="dashboard-analysis grid gap-5 xl:grid-cols-[1.8fr_1fr]">
      <section className="panel"><div className="panel-heading"><div><h2>Evolución de ventas</h2><p>Importe registrado en el período</p></div><span className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Por día</span></div><SalesChart daily={breakdown.daily} /></section>
      <section className="panel"><div className="panel-heading"><div><h2>Productos vendidos</h2><p>Unidades con detalle de producto</p></div></div>
        {breakdown.products.length === 0 ? <div className="empty-state product-empty"><PackageOpen size={30} strokeWidth={1.3} aria-hidden="true" /><h3>Todavía sin detalle de productos</h3><p>Las ventas por importe ya suman al total. Acá verás los productos cuando registres ventas con ese detalle.</p></div> : <div className="space-y-6 px-5 pb-6">{breakdown.products.map((product) => <div key={product.name}><div className="mb-2 flex justify-between gap-4 text-xs"><span>{product.name}</span><span className="shrink-0 font-medium">{new Intl.NumberFormat("es-AR").format(Number(product.quantity))} u.</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[var(--olive)]" style={{ width: (Number(product.quantity) / maxUnits * 100) + "%" }} /></div></div>)}<p className="border-t pt-3 text-xs text-muted-foreground">Hasta 5 productos · Solo ventas con detalle</p></div>}
      </section>
    </div>
    <section className="panel dashboard-recent"><div className="panel-heading"><div><h2>Ventas recientes</h2><p>Últimas operaciones del período</p></div><Link href="/ventas" className="text-link shrink-0">Ver todas</Link></div><SalesList sales={recent} /></section>
    </div>
  </AppShell>;
}
