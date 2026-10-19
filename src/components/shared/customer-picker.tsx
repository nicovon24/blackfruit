"use client";

import { useEffect, useId, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomerOption } from "@/modules/customers/domain/customer-selection";
import { searchCustomersAction } from "@/app/clientes/actions";

export function CustomerPicker({ customers, defaultValue = "", error, context = "venta", onSelect }: { customers: CustomerOption[]; defaultValue?: string; error: { field?: string; message?: string }; context?: "venta" | "muestra"; onSelect?: (customer: CustomerOption) => void }) {
  const id = useId();
  const [selected, setSelected] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState(customers);
  const [searching, setSearching] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const person = context === "muestra" ? "contacto" : "cliente";
  const people = context === "muestra" ? "contactos" : "clientes";
  const matches = options.filter((customer) => customer.name.trim().toLocaleLowerCase("es") === name.trim().toLocaleLowerCase("es"));
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchCustomersAction(query, selected && selected !== "new" ? selected : undefined).then((rows) => { if (active) setOptions(rows); }).finally(() => { if (active) setSearching(false); });
    }, query ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, selected]);
  const fieldError = (field: string) => error.field === field ? <p id={`${id}-${field}-error`} role="alert" className="text-sm text-destructive">{error.message}</p> : null;
  return <div className="space-y-3">
    <Label htmlFor={`${id}-select`}>{context === "muestra" ? "Contacto" : "Cliente"} <span className="font-normal text-muted-foreground">(opcional)</span></Label>
    <div className="grid gap-2"><Input aria-label={`Buscar ${people}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${person} por nombre, teléfono o email`} autoComplete="off" /><span role="status" className="text-xs text-muted-foreground">{searching ? "Buscando…" : query && options.length === 0 ? "Sin coincidencias" : ""}</span></div>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><select id={`${id}-select`} name="customerId" value={selected} onChange={(event) => { setSelected(event.target.value); const customer = options.find((item) => item.id === event.target.value); if (customer) onSelect?.(customer); }} className="field-select w-full flex-1" aria-invalid={error.field === "customerId"} aria-describedby={error.field === "customerId" ? `${id}-customerId-error` : undefined}><option value="">Sin {person}</option>{options.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone || customer.email || customer.id.slice(0, 8)}</option>)}{selected === "new" && <option value="new">Crear {person} nuevo</option>}</select><Button type="button" variant="outline" onClick={() => setSelected(selected === "new" ? defaultValue : "new")} aria-expanded={selected === "new"} aria-controls={`${id}-new`}><UserPlus size={16} aria-hidden="true" />{selected === "new" ? "Cancelar creación" : `Crear ${person}`}</Button></div>
    {fieldError("customerId")}
    {selected === "new" && <fieldset id={`${id}-new`} className="space-y-4 rounded-lg border bg-muted/30 p-4"><legend className="px-1 text-sm font-medium">Nuevo {person}</legend>
      <div className="space-y-2"><Label htmlFor={`${id}-name`}>Nombre del {person}</Label><Input id={`${id}-name`} name="customerName" value={name} onChange={(event) => setName(event.target.value)} required maxLength={160} autoComplete="off" aria-invalid={error.field === "customerName"} aria-describedby={error.field === "customerName" ? `${id}-customerName-error` : undefined} />{fieldError("customerName")}</div>
      {matches.length > 0 && <p className="text-sm text-primary">Ya hay {matches.length} {people} con ese nombre. Revisá el selector; creá otro solo si es una persona diferente.</p>}
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`${id}-phone`}>Teléfono (opcional)</Label><Input id={`${id}-phone`} name="customerPhone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} aria-invalid={error.field === "customerPhone"} aria-describedby={error.field === "customerPhone" ? `${id}-customerPhone-error` : undefined} />{fieldError("customerPhone")}</div><div className="space-y-2"><Label htmlFor={`${id}-email`}>Email del {person} (opcional)</Label><Input id={`${id}-email`} name="customerEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} aria-invalid={error.field === "customerEmail"} aria-describedby={error.field === "customerEmail" ? `${id}-customerEmail-error` : undefined} />{fieldError("customerEmail")}</div></div>
      <p className="text-xs leading-5 text-muted-foreground">El {person} se crea al guardar la {context}.</p>
    </fieldset>}
  </div>;
}
