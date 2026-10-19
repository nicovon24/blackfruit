import { formatBusinessDate } from "@/lib/business-date";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { countUnreviewedSampleRows, listSampleReviews } from "@/modules/samples/infrastructure/prisma-sample-reviews";
import { ignoreSampleReviewAction, prepareHistoricalSamplesAction } from "./actions";

export default async function SampleReviewsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const user = await requirePagePermission("imports:read");
  await requirePagePermission("samples:read");
  const query = await searchParams;
  const page = /^\d+$/.test(query.page ?? "") ? Math.min(Math.max(Number(query.page), 1), 10000) : 1;
  const status = query.status === "pending" || query.status === "conflict" || query.status === "converted" || query.status === "ignored" ? query.status : undefined;
  const [unreviewed, reviews] = await Promise.all([countUnreviewedSampleRows(), listSampleReviews(page, status)]);
  const pageHref = (number: number) => `/muestras/revision?${new URLSearchParams({ ...(status ? { status } : {}), page: String(number) })}`;
  const statusLabel: Record<string, string> = { pending: "Pendiente de revisión", conflict: "Conflicto de origen", converted: "Convertida", ignored: "Ignorada" };
  return <AppShell user={user} section="Muestras / Importadas">
    <Link href="/muestras" className="text-sm text-primary hover:underline">← Volver a muestras</Link>
    <div className="mt-6"><PageHeading title="Muestras importadas" description="Conservá el origen y completá solo los datos que conocés." /></div>
    <section className="panel p-5 sm:p-6"><h2 className="font-semibold">Filas históricas</h2><p className="mt-2 text-sm text-muted-foreground">{unreviewed} filas de muestra conservadas esperan incorporarse a esta cola. Prepararlas no cambia su estado de entrega ni vincula personas por nombre.</p>{unreviewed > 0 && <form action={prepareHistoricalSamplesAction} className="mt-4"><Button type="submit" variant="outline">Preparar filas para revisión</Button></form>}</section>
    <section className="mt-6 space-y-3" aria-label="Revisiones de muestras"><form action="/muestras/revision" className="panel flex flex-wrap items-end gap-3 p-4"><label className="space-y-1 text-sm">Mostrar<select name="status" defaultValue={status ?? "all"} className="block h-11 min-w-44 rounded-lg border border-input bg-background px-3"><option value="all">Todas</option><option value="pending">Pendientes</option><option value="conflict">Con conflicto</option><option value="converted">Convertidas</option><option value="ignored">Ignoradas</option></select></label><Button type="submit" variant="outline">Aplicar</Button></form>{reviews.items.length === 0 && <div className="panel p-6 text-sm text-muted-foreground">{page > 1 ? "No hay más revisiones en esta página." : status ? "No hay revisiones con este estado." : "No hay revisiones todavía."}</div>}{reviews.items.map((review) => <article key={review.id} className="panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{review.recipientName || "Destinatario desconocido"}</h2><p className="mt-1 text-sm text-muted-foreground">{formatBusinessDate(review.sampleOn) || "Fecha desconocida"} · {statusLabel[review.status] ?? review.status}</p><p className="mt-2 text-xs text-muted-foreground">{review.sources.map((source) => `${source.fileName} · ${source.sheet} · fila ${source.rowNumber}`).join("; ")}</p></div><div className="flex gap-2">{review.sampleId ? <Button asChild variant="outline" size="sm"><Link href={`/muestras/${review.sampleId}`}>Ver muestra</Link></Button> : <Button asChild variant="outline" size="sm"><Link href={`/muestras/revision/${review.id}`}>Revisar</Link></Button>}{(review.status === "pending" || review.status === "conflict") && !review.sampleId && <form action={ignoreSampleReviewAction.bind(null, review.id)}><Button type="submit" variant="ghost" size="sm">Ignorar</Button></form>}</div></div></article>)}{(page > 1 || reviews.hasNext) && <nav aria-label="Páginas de revisiones" className="flex items-center justify-end gap-4 text-sm">{page > 1 && <Link href={pageHref(page - 1)} className="inline-flex min-h-11 items-center text-primary hover:underline">Anterior</Link>}<span>Página {page}</span>{reviews.hasNext && <Link href={pageHref(page + 1)} className="inline-flex min-h-11 items-center text-primary hover:underline">Siguiente</Link>}</nav>}</section>
  </AppShell>;
}
