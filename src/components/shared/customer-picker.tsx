"use client";

import { useId, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomerOption } from "@/modules/customers/domain/customer-selection";

export function CustomerPicker({ customers, defaultValue = "", error }: { customers: CustomerOption[]; defaultValue?: string; error: { field?: string; message?: string } }) {
  const id = useId();
  const [selected, setSelected] = useState(defaultValue);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const matches = customers.filter((customer) => customer.name.trim().toLocaleLowerCase("es") === name.trim().toLocaleLowerCase("es"));
  const fieldError = (field: string) => error.field === field ? <p id={`${id}-${field}-error`} role="alert" className="text-sm text-destructive">{error.message}</p> : null;
  return <div className="space-y-3">
    <Label htmlFor={`${id}-select`}>Cliente <span className="font-normal text-muted-foreground">(opcional)</span></Label>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><select id={`${id}-select`} name="customerId" value={selected} onChange={(event) => setSelected(event.target.value)} className="field-select w-full flex-1" aria-invalid={error.field === "customerId"} aria-describedby={error.field === "customerId" ? `${id}-customerId-error` : undefined}><option value="">Sin cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone || customer.email || customer.id.slice(0, 8)}</option>)}{selected === "new" && <option value="new">Crear cliente nuevo</option>}</select><Button type="button" variant="outline" onClick={() => setSelected(selected === "new" ? defaultValue : "new")} aria-expanded={selected === "new"} aria-controls={`${id}-new`}><UserPlus size={16} aria-hidden="true" />{selected === "new" ? "Cancelar creación" : "Crear cliente"}</Button></div>
    {fieldError("customerId")}
    {selected === "new" && <fieldset id={`${id}-new`} className="space-y-4 rounded-lg border bg-muted/30 p-4"><legend className="px-1 text-sm font-medium">Nuevo cliente</legend>
      <div className="space-y-2"><Label htmlFor={`${id}-name`}>Nombre del cliente</Label><Input id={`${id}-name`} name="customerName" value={name} onChange={(event) => setName(event.target.value)} required maxLength={160} autoComplete="off" aria-invalid={error.field === "customerName"} aria-describedby={error.field === "customerName" ? `${id}-customerName-error` : undefined} />{fieldError("customerName")}</div>
      {matches.length > 0 && <p className="text-sm text-primary">Ya hay {matches.length} cliente(s) con ese nombre. Revisá el selector; creá otro solo si es una persona diferente.</p>}
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`${id}-phone`}>Teléfono (opcional)</Label><Input id={`${id}-phone`} name="customerPhone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} aria-invalid={error.field === "customerPhone"} aria-describedby={error.field === "customerPhone" ? `${id}-customerPhone-error` : undefined} />{fieldError("customerPhone")}</div><div className="space-y-2"><Label htmlFor={`${id}-email`}>Email del cliente (opcional)</Label><Input id={`${id}-email`} name="customerEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} aria-invalid={error.field === "customerEmail"} aria-describedby={error.field === "customerEmail" ? `${id}-customerEmail-error` : undefined} />{fieldError("customerEmail")}</div></div>
      <p className="text-xs leading-5 text-muted-foreground">El cliente se crea al guardar la venta.</p>
    </fieldset>}
  </div>;
}
