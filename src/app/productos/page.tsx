import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { listCatalogProducts } from "@/modules/catalog/infrastructure/prisma-products";
import { ProductDialog } from "@/components/shared/product-dialog";
import { ProductRowActions } from "./product-row-actions";

type Query = { q?: string; status?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requirePagePermission("catalog:read");
  const query = await searchParams;
  const search = (query.q ?? "").trim().slice(0, 100);
  const status = query.status === "active" || query.status === "archived" ? query.status : "all";
  const page = /^\d+$/.test(query.page ?? "") ? Math.min(Math.max(Number(query.page), 1), 10000) : 1;
  const catalog = await listCatalogProducts(search, status, page);
  const products = catalog.items;
  const pageHref = (number: number) => `/productos?${new URLSearchParams({ ...(search ? { q: search } : {}), ...(status !== "all" ? { status } : {}), page: String(number) })}`;
  return <AppShell user={user} section="Productos">
    <PageHeading title="Productos" description="Administrá las combinaciones que usás en ventas, producción y muestras." actions={<ProductDialog contextual={false} />} />
    <section className="panel overflow-hidden" aria-label="Catálogo"><div className="border-b p-5"><h2 className="font-semibold">Catálogo</h2><p className="mt-1 text-sm text-muted-foreground">{catalog.count} combinaciones para esta búsqueda. Archivar deja de ofrecer una opción nueva y conserva el historial.</p><form action="/productos" className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-48 flex-1 space-y-1 text-sm">Buscar producto o variante<input name="q" type="search" defaultValue={search} maxLength={100} className="block h-11 w-full rounded-lg border border-input bg-background px-3" /></label><label className="space-y-1 text-sm">Estado<select name="status" defaultValue={status} className="block h-11 min-w-36 rounded-lg border border-input bg-background px-3"><option value="all">Todos</option><option value="active">Activos</option><option value="archived">Archivados</option></select></label><Button type="submit" variant="outline">Aplicar</Button>{(search || status !== "all") && <Link href="/productos" className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">Limpiar</Link>}</form></div>
      {products.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{search || status !== "all" ? "No hay productos para estos filtros. Probá otra búsqueda o estado." : "Todavía no hay productos. Agregá tus combinaciones habituales, como naranja con azúcar o sin azúcar."}</p> : <><ul className="divide-y lg:hidden">{products.map((product) => <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><strong>{product.name}{product.variant ? ` · ${product.variant}` : ""}</strong><p className="mt-1 text-sm text-muted-foreground">{product.unitLabel ?? "Sin unidad habitual"} · {product.active ? "Activo" : "Archivado"}</p></div><ProductRowActions product={product} /></li>)}</ul><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-lg text-left text-sm"><thead><tr className="border-b bg-muted/40 text-muted-foreground"><th className="p-4">Producto</th><th>Variante</th><th>Unidad</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-b last:border-0"><td className="p-4 font-medium">{product.name}</td><td>{product.variant ?? "—"}</td><td>{product.unitLabel ?? "—"}</td><td>{product.active ? "Activo" : "Archivado"}</td><td><ProductRowActions product={product} /></td></tr>)}</tbody></table></div></>}
      {(page > 1 || catalog.hasNext) && <nav aria-label="Páginas del catálogo" className="flex items-center justify-end gap-4 border-t p-4 text-sm">{page > 1 && <Link href={pageHref(page - 1)} className="inline-flex min-h-11 items-center text-primary hover:underline">Anterior</Link>}<span>Página {page}</span>{catalog.hasNext && <Link href={pageHref(page + 1)} className="inline-flex min-h-11 items-center text-primary hover:underline">Siguiente</Link>}</nav>}
    </section>
  </AppShell>;
}
