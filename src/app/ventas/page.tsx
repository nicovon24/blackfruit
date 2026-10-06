import Link from "next/link";
import { SaleDialog } from "@/components/shared/sale-dialog";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { SalesList } from "@/components/shared/sales-list";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { listSales } from "@/modules/sales/infrastructure/prisma-sale-queries";

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requirePagePermission("sales:read");
  const sales = await listSales(50);
  const { error } = await searchParams;
  return <AppShell user={user} section="Ventas">
    <PageHeading title="Ventas" description="Cada operación, con su historia y sus detalles." actions={<><Button asChild variant="outline"><Link href="/ventas/papelera"><Trash2 size={16} aria-hidden="true" />Ver papelera</Link></Button><SaleDialog /></>} />
    {error === "conflict" && <p role="alert" className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">La venta cambió. Abrí su detalle actualizado antes de volver a intentarlo.</p>}
    <section className="panel" aria-label="Listado de ventas"><SalesList sales={sales} searchable /></section>
  </AppShell>;
}
