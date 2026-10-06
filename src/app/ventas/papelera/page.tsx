import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatArs } from "@/lib/format-money";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { listTrashedSales } from "@/modules/sales/infrastructure/prisma-sale-queries";
import { permanentlyDeleteSaleAction, restoreSaleAction } from "../[id]/actions";
import { ConfirmSaleAction } from "@/components/shared/confirm-sale-action";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { SaleStatus } from "@/components/shared/sale-status";
import { Trash2, RotateCcw } from "lucide-react";

export default async function TrashPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requirePagePermission("sales:read");
  const { error } = await searchParams;
  const deleted = await listTrashedSales();

  return (
    <AppShell user={user} section="Papelera">
      <Link href="/ventas" className="text-sm text-primary hover:underline">← Volver a ventas</Link>
      <div className="mt-6"><PageHeading title="Papelera" description="Restaurá una venta o eliminála definitivamente." /></div>
      {error === "conflict" && <p role="alert" className="mt-4 text-sm text-destructive">La venta cambió. Recargá la página antes de intentar de nuevo.</p>}
      {deleted.length === 0 ? <div className="panel empty-state"><Trash2 size={28} strokeWidth={1.3} aria-hidden="true" /><h3>La papelera está vacía.</h3><p>Las ventas que elimines aparecerán acá para que puedas restaurarlas.</p></div> :
        <ul className="mt-8 space-y-3">{deleted.map((sale) => <li key={sale.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5">
          <div><p className="font-semibold">{sale.occurredOn.split("-").reverse().join("/")} · {formatArs(sale.total)}</p><div className="mt-2"><SaleStatus status={sale.status} /></div></div>
          <div className="flex flex-wrap items-center gap-2"><form action={restoreSaleAction.bind(null, sale.id)}><input type="hidden" name="version" value={sale.version} /><input type="hidden" name="presentation" value="dialog" /><Button type="submit" variant="outline"><RotateCcw size={15} aria-hidden="true" />Restaurar</Button></form><ConfirmSaleAction label="Eliminar definitivamente" description="Se borrarán esta venta y sus productos. No podrás restaurarla. La acción quedará en el historial de auditoría." action={permanentlyDeleteSaleAction.bind(null, sale.id)} version={sale.version} /></div>
        </li>)}</ul>}
    </AppShell>
  );
}
