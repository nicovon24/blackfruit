import { TrashButton } from "@/components/shared/trash-button";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { listCustomerOptions } from "@/modules/customers/infrastructure/prisma-customers";
import { listProductionProducts } from "@/modules/production/infrastructure/prisma-cycles";
import { getSample } from "@/modules/samples/infrastructure/prisma-samples";
import { SampleForm } from "../sample-form";

export default async function SampleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("samples:read");
  await requirePagePermission("customers:read");
  const { id } = await params;
  const [sample, customers, products] = await Promise.all([getSample(id), listCustomerOptions(), listProductionProducts()]);
  if (!sample) notFound();
  return <AppShell user={user} section="Muestras / Detalle">
    <Link href="/muestras" className="text-sm text-primary hover:underline">← Volver a muestras</Link>
    <div className="mt-6"><PageHeading title={sample.recipientName} description={`Muestra ${sample.status === "delivered" ? "entregada" : "pendiente"} · ${sample.sampleOn.split("-").reverse().join("/")}`} /></div>
    {sample.source.length > 0 && <section className="panel mb-6 p-5"><h2 className="font-semibold">Procedencia conservada</h2><ul className="mt-2 text-sm text-muted-foreground">{sample.source.map((row, index) => <li key={index}>{row.fileName} · {row.sheet} · fila {row.rowNumber}</li>)}</ul></section>}
    <div className="mb-5 flex justify-end"><TrashButton type="samples" id={sample.id} version={sample.version} back="/muestras" /></div>
    <SampleForm key={`${sample.id}-${sample.version}`} products={products} customers={customers} today={sample.sampleOn} requestKey={randomUUID()} initial={sample} />
  </AppShell>;
}
