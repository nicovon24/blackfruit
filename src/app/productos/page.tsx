import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchField } from "@/components/shared/search-field";
import { Table } from "@/components/ui/table";
import { NativeSelect } from "@/components/ui/native-select";
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
    <section className="panel overflow-hidden" aria-label="Catálogo"><div className="border-b p-5"><h2 className="font-semibold">Catálogo</h2><p className="mt-1 text-sm text-muted-foreground">{catalog.count} combinaciones para esta búsqueda. Archivar deja de ofrecer una opción nueva y conserva el historial.</p><form action="/productos" className="filter-toolbar -mx-5 -mb-5 mt-4"><SearchField label="Buscar producto" defaultValue={search} placeholder="Producto o variante" /><label className="space-y-1 text-sm">Estado<NativeSelect name="status" defaultValue={status} className="block h-11 min-w-36 rounded-lg border border-input bg-background px-3"><option value="all">Todos</option><option value="active">Activos</option><option value="archived">Archivados</option></NativeSelect></label><Button type="submit" variant="outline">Aplicar</Button>{(search || status !== "all") && <Link href="/productos" className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">Limpiar</Link>}</form></div>
      {products.length === 0 ? <EmptyState title={search || status !== "all" ? "No hay productos para estos filtros" : page > 1 ? "No hay más productos en esta página" : "Prepará tu catálogo"} description="Agregá las combinaciones que usás en tu negocio o probá otros filtros." filtered={!!search || status !== "all"} action={search || status !== "all" ? <Button asChild variant="outline"><Link href="/productos">Quitar filtros</Link></Button> : page === 1 ? <ProductDialog contextual={false} /> : undefined} /> : <><ul className="divide-y lg:hidden">{products.map((product) => <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><strong>{product.name}{product.variant ? ` · ${product.variant}` : ""}</strong><p className="mt-1 text-sm text-muted-foreground">{product.unitLabel ?? "Sin unidad habitual"} · {product.active ? "Activo" : "Archivado"}</p></div><ProductRowActions product={product} /></li>)}</ul><div className="hidden overflow-x-auto lg:block"><Table className="w-full min-w-lg text-left text-sm"><thead><tr className="border-b bg-muted/40 text-muted-foreground"><th className="p-4">Producto</th><th>Variante</th><th>Unidad</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-b last:border-0"><td className="p-4 font-medium">{product.name}</td><td>{product.variant ?? "—"}</td><td>{product.unitLabel ?? "—"}</td><td><span className="status-badge" data-tone={product.active ? "success" : undefined}>{product.active ? "Activo" : "Archivado"}</span></td><td><ProductRowActions product={product} /></td></tr>)}</tbody></Table></div></>}
      <Pagination page={page} previous={page > 1 ? pageHref(page - 1) : undefined} next={catalog.hasNext ? pageHref(page + 1) : undefined} label="Páginas del catálogo" />
    </section>
  </AppShell>;
}
