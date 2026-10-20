import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchField } from "@/components/shared/search-field";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { TrashButton } from "@/components/shared/trash-button";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { isTrashType, trashTypes, trashLabels } from "@/modules/trash/domain/trash";
import { listTrash } from "@/modules/trash/infrastructure/prisma-trash";

export default async function TrashPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string; page?: string }> }) {
  const query = await searchParams;
  const type = query.type && isTrashType(query.type) ? query.type : "sales";
  const user = await requirePagePermission(`${type}:read`);
  const q = (query.q ?? "").trim().slice(0, 100);
  const page = /^\d+$/.test(query.page ?? "") ? Math.min(Math.max(Number(query.page), 1), 10000) : 1;
  const result = await listTrash(type, page, q);
  const href = (n: number) => `/papelera?${new URLSearchParams({ type, q, page: String(n) })}`;
  return <AppShell user={user} section="Papelera">
    <PageHeading title="Papelera" description="Recuperá registros eliminados. Al restaurarlos, vuelven a sus listados y resúmenes con el estado que tenían." />
    <nav aria-label="Tipos de registros" className="section-tabs">{trashTypes.map((item) => <Link key={item} href={`/papelera?type=${item}`} aria-current={item === type ? "page" : undefined} >{trashLabels[item]}</Link>)}</nav>
    <section className="panel overflow-hidden" aria-label={`Papelera de ${trashLabels[type]}`}>
      <form action="/papelera" className="filter-toolbar"><input type="hidden" name="type" value={type} /><SearchField label="Buscar en papelera" defaultValue={q} placeholder="Nombre o identificación" /><Button variant="outline">Buscar</Button></form>
      {result.items.length === 0 ? <EmptyState title={q ? "Sin coincidencias" : page > 1 ? "No hay más registros en esta página" : "Esta papelera está vacía"} description={q ? "Probá otra búsqueda para encontrar el registro." : "Los registros que envíes a papelera aparecerán acá para restaurarlos."} filtered={!!q} /> : <ul className="divide-y">{result.items.map((item) => <li key={item.id} className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div className="min-w-0"><h2 className="break-words font-semibold">{item.label}</h2><p className="mt-1 text-sm text-muted-foreground">{item.detail}</p><p className="mt-1 text-sm text-muted-foreground">En papelera desde {new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(item.deletedAt))}{item.imported ? " · Origen de importación conservado" : ""}</p></div><TrashButton type={type} id={item.id} version={item.version} restore /></li>)}</ul>}
      <Pagination page={page} previous={page > 1 ? href(page - 1) : undefined} next={result.hasNext ? href(page + 1) : undefined} label="Páginas de papelera" />
    </section>
  </AppShell>;
}
