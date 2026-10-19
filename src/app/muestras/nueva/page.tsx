import { randomUUID } from "node:crypto";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { listCustomerOptions } from "@/modules/customers/infrastructure/prisma-customers";
import { listProductionProducts } from "@/modules/production/infrastructure/prisma-cycles";
import { SampleForm } from "../sample-form";

export default async function NewSamplePage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const user = await requirePagePermission("samples:read");
  await requirePagePermission("customers:read");
  const [customers, products] = await Promise.all([listCustomerOptions(), listProductionProducts()]);
  const requestedCustomer = (await searchParams).customer;
  const customerId = customers.find((customer) => customer.id === requestedCustomer)?.id;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <AppShell user={user} section="Muestras / Nueva">
    <Link href="/muestras" className="text-sm text-primary hover:underline">← Volver a muestras</Link>
    <div className="mt-6"><PageHeading title="Registrar muestra" description="Elegí destinatario, productos, cantidad, unidad y estado." /></div>
    <SampleForm products={products} customers={customers} today={today} requestKey={randomUUID()} preselectedCustomerId={customerId} />
  </AppShell>;
}
