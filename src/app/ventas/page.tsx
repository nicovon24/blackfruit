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
    <section className="panel" aria-label="Listado de ventas"><form action="/ventas" className="flex flex-wrap items-end gap-3 border-b p-4"><label className="min-w-52 flex-1 space-y-1 text-sm">Buscar ventas<input name="q" defaultValue={term} maxLength={100} placeholder="Cliente, origen, canal o fecha dd/mm/aaaa" className="block h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" /></label><label className="space-y-1 text-sm">Estado<select name="status" defaultValue={selectedStatus} className="field-select block"><option value="all">Todos</option><option value="confirmed">Confirmadas</option><option value="void">Anuladas</option></select></label><Button type="submit" variant="outline">Buscar</Button></form><SalesList sales={sales.items} /><nav aria-label="Páginas de ventas" className="flex justify-end gap-4 border-t p-4 text-sm">{page > 1 && <Link href={href(page - 1)} className="text-primary hover:underline">Anterior</Link>}<span>Página {page}</span>{sales.hasNext && <Link href={href(page + 1)} className="text-primary hover:underline">Siguiente</Link>}</nav></section>
  </AppShell>;
}
