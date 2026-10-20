"use client";

import { NativeSelect } from "@/components/ui/native-select";

import { useEffect, useState } from "react";
import { searchCustomersAction } from "@/app/clientes/actions";
import type { CustomerOption } from "@/modules/customers/domain/customer-selection";
import { Input } from "@/components/ui/input";

export function ImportCustomerSelect({ customers, value, disabled, row, onChange }: { customers: CustomerOption[]; value: string; disabled: boolean; row: number; onChange: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState(customers);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    if (!query && (!value || customers.some((customer) => customer.id === value))) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchCustomersAction(query, value || undefined).then((rows) => { if (active) setOptions(rows); }).catch(() => { if (active) setOptions(customers); }).finally(() => { if (active) setSearching(false); });
    }, query ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, value, customers]);
  return <div className="space-y-1 text-xs text-muted-foreground"><label htmlFor={`import-customer-${row}`}>Cliente</label><Input id={`import-customer-${row}`} placeholder="Buscar nombre, teléfono o email" value={query} onChange={(event) => { const next = event.target.value; setQuery(next); if (!next) setOptions(customers); }} disabled={disabled} /><NativeSelect aria-label={`Cliente fila ${row}`} className="field-select block w-full" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">Conservar nombre sin vincular</option>{options.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone || customer.email || customer.id.slice(0, 8)}</option>)}</NativeSelect><span role="status">{searching ? "Buscando…" : query && options.length === 0 ? "Sin coincidencias" : ""}</span></div>;
}
