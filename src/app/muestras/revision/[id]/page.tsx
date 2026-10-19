import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { listCustomerOptions } from "@/modules/customers/infrastructure/prisma-customers";
import { listProductionProducts } from "@/modules/production/infrastructure/prisma-cycles";
import { getSampleReview } from "@/modules/samples/infrastructure/prisma-sample-reviews";
import { SampleForm } from "../../sample-form";

export default async function SampleReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("imports:read");
  await requirePagePermission("samples:read");
  await requirePagePermission("customers:read");
  const { id } = await params;
  const [review, customers, products] = await Promise.all([getSampleReview(id), listCustomerOptions(), listProductionProducts()]);
  if (!review) notFound();
  return <AppShell user={user} section="Muestras / Revisión">
    <Link href="/muestras/revision" className="text-sm text-primary hover:underline">← Volver a importadas</Link>
    <div className="mt-6"><PageHeading title="Revisar muestra de origen" description="Completá los campos desconocidos y comprobá la procedencia antes de incorporarla." /></div>
    <section className="panel mb-6 p-5"><h2 className="font-semibold">Procedencia</h2>{review.status === "conflict" && <p role="alert" className="mt-2 text-sm text-destructive">El mismo origen apareció con contenido diferente. Revisá las filas; no se creará otra muestra automáticamente.</p>}<ul className="mt-3 space-y-3">{review.rows.map((row, index) => <li key={index} className="rounded-lg border p-3 text-sm"><p>{row.fileName} · {row.sheet} · fila {row.rowNumber}</p><details className="mt-2"><summary className="cursor-pointer text-primary">Ver datos conservados</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted p-3 text-xs">{JSON.stringify(row.raw, null, 2)}</pre></details></li>)}</ul></section>
    {review.status === "pending" ? <SampleForm review={{ id: review.id, recipientName: review.recipientName, sampleOn: review.sampleOn, lines: review.lines }} products={products} customers={customers} today="" requestKey={randomUUID()} /> : review.sampleId ? <Link href={`/muestras/${review.sampleId}`} className="text-primary hover:underline">Ver muestra creada</Link> : <p className="text-sm text-muted-foreground">Esta revisión no se puede convertir mientras esté en estado {review.status}.</p>}
  </AppShell>;
}
