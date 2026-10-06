import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { SaleStatus } from "@/components/shared/sale-status";
import { ConfirmSaleAction } from "@/components/shared/confirm-sale-action";
import { formatArs } from "@/lib/format-money";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { getSaleDetail } from "@/modules/sales/infrastructure/prisma-sale-queries";
import { trashSaleAction, voidSaleAction } from "./actions";
import { EditSaleForm } from "./edit-sale-form";
import { listCustomerOptions } from "@/modules/customers/infrastructure/prisma-customers";

export default async function SaleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requirePagePermission("sales:read");
  const { id } = await params;
  const { error } = await searchParams;
  const sale = await getSaleDetail(id);
  if (!sale) notFound();
  await requirePagePermission("customers:read");
  const customers = await listCustomerOptions();

  return (
    <AppShell user={user} section="Ventas / Detalle"><div className="mx-auto max-w-2xl">
      <Link href="/ventas" className="text-sm text-primary hover:underline">← Volver a ventas</Link>
      <div className="mt-6"><PageHeading title="Venta registrada" description="Consultá el detalle y mantené tu registro al día." /></div>
      {error === "conflict" && <p role="alert" className="mt-4 text-sm text-destructive">La venta cambió. Recargá la página antes de volver a intentarlo.</p>}
      <dl className="panel mt-6 grid grid-cols-2 gap-5 p-6 [&>div]:min-w-0 [&_dd]:break-words">
        <div className="col-span-2"><dt className="text-sm text-muted-foreground">Cliente</dt><dd className="mt-1 font-medium">{sale.customerName ?? "Sin cliente"}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Fecha</dt><dd className="mt-1 font-medium">{sale.occurredOn.split("-").reverse().join("/")}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Importe</dt><dd className="mt-1 text-2xl font-semibold">{formatArs(sale.total)}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Estado</dt><dd className="mt-2"><SaleStatus status={sale.status} /></dd></div>
        <div><dt className="text-sm text-muted-foreground">Canal</dt><dd className="mt-1 font-medium">{sale.channel ?? "Sin canal"}</dd></div>
        {sale.notes && <div className="col-span-2"><dt className="text-sm text-muted-foreground">Notas</dt><dd className="mt-1 whitespace-pre-wrap break-words">{sale.notes}</dd></div>}
      </dl>
      {sale.status === "confirmed" && <section className="panel mt-6 p-6">
        <h2 className="mb-5 text-xl font-semibold">Editar venta</h2>
        <EditSaleForm key={sale.version} mode={sale.mode} id={sale.id} version={sale.version} occurredOn={sale.occurredOn} amount={sale.total} channel={sale.channel ?? ""} notes={sale.notes ?? ""} customerId={sale.customerId} customers={customers} />
      </section>}
      <section className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6" aria-label="Acciones de la venta">
        {sale.status === "confirmed" && <ConfirmSaleAction key={`void-${sale.version}-${error}`} label="Anular venta" description="La operación quedará como anulada y dejará de sumar a tus indicadores. Se conservará en el listado para consultar su historia." action={voidSaleAction.bind(null, sale.id)} version={sale.version} />}
        <ConfirmSaleAction key={`trash-${sale.version}-${error}`} label="Enviar a papelera" description="La venta dejará de aparecer en el listado y en los indicadores. Podés restaurarla desde la papelera conservando su estado actual." action={trashSaleAction.bind(null, sale.id)} version={sale.version} />
      </section>
    </div></AppShell>
  );
}
