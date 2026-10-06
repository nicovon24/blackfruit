"use client";

import { useState } from "react";
import { SaleDialog } from "./sale-dialog";
import { ArrowUpRight, Search, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatArs } from "@/lib/format-money";
import type { SaleListItem } from "@/modules/sales/infrastructure/prisma-sale-queries";
import { SaleStatus } from "./sale-status";

export function SalesList({ sales, searchable = false }: { sales: SaleListItem[]; searchable?: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  const filtered = sales.filter((sale) => (status === "all" || sale.status === status) && normalize(`${sale.occurredOn.split("-").reverse().join("/")} ${sale.channel ?? ""} ${sale.customerName ?? ""} ${sale.sourceName ?? ""} ${sale.total} ${formatArs(sale.total)}`).includes(normalize(query.trim())));
  const hasFilters = query !== "" || status !== "all";
  return <div>
    {searchable && <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3"><p className="text-sm text-muted-foreground">Buscá en las últimas 50 ventas. Las anteriores no aparecen en esta vista.</p>{hasFilters && <Button type="button" variant="ghost" onClick={() => { setQuery(""); setStatus("all"); }}>Limpiar filtros</Button>}</div>}
    {searchable && <div className="sales-toolbar"><div className="relative flex-1"><Search size={17} className="pointer-events-none absolute top-3.5 left-3 text-muted-foreground" aria-hidden="true" /><Input aria-label="Buscar ventas" placeholder="Buscar por cliente, fecha, canal o importe…" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10" /></div><select aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value)} className="field-select"><option value="all">Todos los estados</option><option value="confirmed">Confirmadas</option><option value="void">Anuladas</option></select></div>}
    {filtered.length === 0 ? <div className="empty-state"><ShoppingBag size={27} strokeWidth={1.3} aria-hidden="true" /><h3>{sales.length ? "No encontramos ventas" : "Tu próxima venta empieza acá"}</h3><p>{sales.length ? "Probá con otra búsqueda o cambiá el estado." : "Registrá fecha e importe para empezar a ver tus resultados."}</p>{!sales.length && <SaleDialog className="text-link mt-3">Registrar primera venta <ArrowUpRight size={15} aria-hidden="true" /></SaleDialog>}</div> : <>
      <table className="sales-table"><caption className="sr-only">Ventas registradas</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Cliente / origen</th><th scope="col">Estado</th><th scope="col" className="text-right">Total</th><th scope="col"><span className="sr-only">Detalle</span></th></tr></thead><tbody>{filtered.map((sale) => <tr key={sale.id}><td><SaleDialog id={sale.id} className="font-medium hover:text-primary hover:underline">{sale.occurredOn.split("-").reverse().join("/")}</SaleDialog></td><td><p>{sale.customerName ?? sale.sourceName ?? "Sin cliente"}</p>{!sale.customerName && sale.sourceName && <p className="text-xs text-muted-foreground">Nombre de origen · Sin vincular</p>}<p className="mt-1 text-xs text-muted-foreground">{sale.channel ?? "Sin canal"}</p></td><td><SaleStatus status={sale.status} /></td><td className="text-right font-semibold tabular-nums">{formatArs(sale.total)}</td><td><SaleDialog id={sale.id} className="detail-link"><ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only">Ver venta del {sale.occurredOn}</span></SaleDialog></td></tr>)}</tbody></table>
      <ul className="sales-mobile">{filtered.map((sale) => <li key={sale.id}><SaleDialog id={sale.id} className="block w-full p-[18px] text-left"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{sale.occurredOn.split("-").reverse().join("/")}</span><span className="font-semibold tabular-nums">{formatArs(sale.total)}</span></div><div className="mt-3 flex items-start justify-between gap-3"><span className="min-w-0 break-words text-sm">{sale.customerName ?? sale.sourceName ?? "Sin cliente"}{!sale.customerName && sale.sourceName && <span className="mt-1 block text-xs text-muted-foreground">Nombre de origen · Sin vincular</span>}<span className="mt-1 block text-xs text-muted-foreground">{sale.channel ?? "Sin canal"}</span></span><SaleStatus status={sale.status} /></div></SaleDialog></li>)}</ul>
    </>}
    {searchable && <p className="border-t px-5 py-3 text-xs text-muted-foreground" role="status">{filtered.length} de {sales.length} operaciones · Últimas 50 ventas registradas</p>}
  </div>;
}
