import { randomUUID } from "node:crypto";
import Link from "next/link";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { SaleForm } from "./sale-form";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { listCustomerOptions } from "@/modules/customers/infrastructure/prisma-customers";

export default async function NewSalePage() {
  const user = await requirePagePermission("sales:write");
  await requirePagePermission("customers:read");
  const customers = await listCustomerOptions();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <AppShell user={user} section="Ventas / Nueva venta"><div className="mx-auto max-w-2xl">
      <Link href="/ventas" className="text-sm text-primary hover:underline">← Volver a ventas</Link>
      <div className="mt-6"><PageHeading title="Nueva venta" description="Un registro simple para seguir tus ventas." /></div>
      <section className="panel">
        <div className="border-b bg-muted/40 px-6 py-4 text-sm font-medium">Venta por importe <span className="ml-2 font-normal text-muted-foreground">· ARS</span></div>
        <div className="p-6 sm:p-8">
        <SaleForm today={today} requestKey={randomUUID()} customers={customers} />
        </div>
      </section>
    </div></AppShell>
  );
}
