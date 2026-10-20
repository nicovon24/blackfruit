import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchField } from "@/components/shared/search-field";
import { Table } from "@/components/ui/table";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { listCustomers } from "@/modules/customers/infrastructure/prisma-customers";
import { CustomerDialog } from "@/components/shared/customer-dialog";
import { CustomerRowActions } from "./customer-row-actions";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requirePagePermission("customers:read");
  const { q = "", page: rawPage } = await searchParams;
  const term = q.trim().slice(0, 100);
  const page = /^\d+$/.test(rawPage ?? "") ? Math.min(Math.max(Number(rawPage), 1), 10000) : 1;
  const result = await listCustomers(page, term);
  const href = (number: number) => `/clientes?${new URLSearchParams({ ...(term ? { q: term } : {}), page: String(number) })}`;
  return <AppShell user={user} section="Clientes">
    <PageHeading title="Clientes" description="Registrá personas una vez y reutilizalas en ventas y muestras." actions={<CustomerDialog />} />
    <section className="panel overflow-hidden" aria-label="Agenda de clientes"><div ><h2 className="px-5 pt-5 text-lg font-semibold">Agenda</h2><form action="/clientes" className="filter-toolbar"><SearchField label="Buscar cliente" defaultValue={term} placeholder="Nombre, teléfono o email" /><Button variant="outline">Buscar</Button></form></div>
      {result.items.length === 0 ? <EmptyState title={term ? "Sin coincidencias" : page > 1 ? "No hay más clientes en esta página" : "Tu agenda empieza acá"} description={term ? "Probá otro nombre, teléfono o email." : "Registrá un cliente para reutilizarlo en tus operaciones."} filtered={!!term} action={!term && page === 1 ? <CustomerDialog /> : undefined} /> : <><ul className="divide-y md:hidden">{result.items.map((customer) => <li key={customer.id} className="p-4"><strong>{customer.name}</strong><p className="mt-1 text-sm text-muted-foreground">{customer.phone || "Sin teléfono"} · {customer.email || "Sin email"}</p><div className="mt-3"><CustomerRowActions customer={customer} /></div></li>)}</ul><div className="hidden overflow-x-auto md:block"><Table className="w-full text-left text-sm"><thead><tr className="border-b bg-muted/40"><th className="px-5 py-3">Nombre</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr></thead><tbody>{result.items.map((customer) => <tr key={customer.id} className="border-b last:border-0"><td className="px-5 py-4 font-medium">{customer.name}</td><td>{customer.phone || "—"}</td><td>{customer.email || "—"}</td><td className="p-3"><CustomerRowActions customer={customer} /></td></tr>)}</tbody></Table></div></>}
      <Pagination page={page} previous={page > 1 ? href(page - 1) : undefined} next={result.hasNext ? href(page + 1) : undefined} label="Páginas de clientes" />
    </section>
  </AppShell>;
}
