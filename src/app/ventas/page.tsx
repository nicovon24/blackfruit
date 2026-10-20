import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchField } from "@/components/shared/search-field";
import { NativeSelect } from "@/components/ui/native-select";
import Link from "next/link";
import { SaleDialog } from "@/components/shared/sale-dialog";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { SalesList } from "@/components/shared/sales-list";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { listSalesPage } from "@/modules/sales/infrastructure/prisma-sale-queries";

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; status?: string; page?: string }> }) {
  const user = await requirePagePermission("sales:read");
  const { error, q = "", status = "all", page: rawPage } = await searchParams;
  const page = /^\d+$/.test(rawPage ?? "") ? Math.min(Math.max(Number(rawPage), 1), 10000) : 1;
  const term = q.trim().slice(0, 100);
  const selectedStatus = ["all", "confirmed", "void"].includes(status) ? status : "all";
  const sales = await listSalesPage(page, term, selectedStatus);
  const href = (number: number) => `/ventas?${new URLSearchParams({ ...(term ? { q: term } : {}), ...(selectedStatus !== "all" ? { status: selectedStatus } : {}), page: String(number) })}`;
  return <AppShell user={user} section="Ventas">
    <PageHeading title="Ventas" description="Cada operación, con su historia y sus detalles." actions={<><Button asChild variant="outline"><Link href="/papelera?type=sales"><Trash2 size={16} aria-hidden="true" />Ver papelera</Link></Button><SaleDialog /></>} />
    {error === "conflict" && <p role="alert" className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">La venta cambió. Abrí su detalle actualizado antes de volver a intentarlo.</p>}
    <section className="panel" aria-label="Listado de ventas"><form action="/ventas" className="filter-toolbar sales-filter-toolbar"><SearchField label="Buscar ventas" defaultValue={term} placeholder="Cliente, origen o canal" hint="También podés buscar por fecha: dd/mm/aaaa." /><label className="space-y-1 text-sm">Estado<NativeSelect name="status" defaultValue={selectedStatus} className="field-select block"><option value="all">Todos</option><option value="confirmed">Confirmadas</option><option value="void">Anuladas</option></NativeSelect></label><Button type="submit" variant="outline">Buscar</Button></form>{sales.items.length === 0 && (term || selectedStatus !== "all" || page > 1) ? <EmptyState filtered title="No hay ventas para esta consulta" description="Probá con otra búsqueda o revisá los filtros." action={<Button asChild variant="outline"><Link href="/ventas">Ver todas las ventas</Link></Button>} /> : <SalesList sales={sales.items} />}<Pagination page={page} previous={page > 1 ? href(page - 1) : undefined} next={sales.hasNext ? href(page + 1) : undefined} label="Páginas de ventas" /></section>
  </AppShell>;
}
