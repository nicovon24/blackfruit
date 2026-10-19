import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { listCustomers } from "@/modules/customers/infrastructure/prisma-customers";
import { CustomerDialog } from "@/components/shared/customer-dialog";
import { TrashButton } from "@/components/shared/trash-button";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requirePagePermission("customers:read");
  const { q = "", page: rawPage } = await searchParams;
  const term = q.trim().slice(0, 100);
  const page = /^\d+$/.test(rawPage ?? "") ? Math.min(Math.max(Number(rawPage), 1), 10000) : 1;
  const result = await listCustomers(page, term);
  const href = (number: number) => `/clientes?${new URLSearchParams({ ...(term ? { q: term } : {}), page: String(number) })}`;
  return <AppShell user={user} section="Clientes">
    <PageHeading title="Clientes" description="Registrá personas una vez y reutilizalas en ventas y muestras." actions={<CustomerDialog />} />
    <section className="panel overflow-hidden" aria-label="Agenda de clientes"><div className="border-b p-5"><h2 className="mb-4 text-lg font-semibold">Agenda</h2><form action="/clientes" className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="customer-search">Buscar cliente</label><input id="customer-search" name="q" defaultValue={term} maxLength={100} placeholder="Nombre, teléfono o email" className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm" /><Button variant="outline">Buscar</Button></form></div>
      {result.items.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{term ? "No encontramos clientes con esa búsqueda." : "Todavía no hay clientes registrados."}</p> : <><ul className="divide-y md:hidden">{result.items.map((customer) => <li key={customer.id} className="p-4"><strong>{customer.name}</strong><p className="mt-1 text-sm text-muted-foreground">{customer.phone || "Sin teléfono"} · {customer.email || "Sin email"}</p><div className="mt-3"><TrashButton type="customers" id={customer.id} version={customer.version} /></div></li>)}</ul><div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-muted/40"><th className="px-5 py-3">Nombre</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr></thead><tbody>{result.items.map((customer) => <tr key={customer.id} className="border-b last:border-0"><td className="px-5 py-4 font-medium">{customer.name}</td><td>{customer.phone || "—"}</td><td>{customer.email || "—"}</td><td className="p-3"><TrashButton type="customers" id={customer.id} version={customer.version} /></td></tr>)}</tbody></table></div></>}
      <nav aria-label="Páginas de clientes" className="flex justify-end gap-4 p-4 text-sm">{page > 1 && <a href={href(page - 1)} className="text-primary hover:underline">Anterior</a>}<span>Página {page}</span>{result.hasNext && <a href={href(page + 1)} className="text-primary hover:underline">Siguiente</a>}</nav>
    </section>
  </AppShell>;
}
