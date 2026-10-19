"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCustomerAction, type CustomerFormState } from "./actions";

export function CustomerForm({ requestKey, onSaved }: { requestKey: string; onSaved?: () => void }) {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", phone: "", email: "" });
  const [state, action, pending] = useActionState(async (previous: CustomerFormState, form: FormData) => {
    const result = await createCustomerAction(previous, form);
    if (result.savedId) { router.refresh(); onSaved?.(); }
    return result;
  }, {} as CustomerFormState);
  return <form action={action} className="grid gap-4 sm:grid-cols-2" aria-busy={pending}>
    <input type="hidden" name="requestKey" value={requestKey} />
    {([{ key: "name", label: "Nombre", field: "customerName", max: 160, type: "text" }, { key: "phone", label: "Teléfono (opcional)", field: "customerPhone", max: 40, type: "tel" }, { key: "email", label: "Email (opcional)", field: "customerEmail", max: 254, type: "email" }] as const).map(({ key, label, field, max, type }) => <div key={key} className={`space-y-2 ${key === "name" ? "sm:col-span-2" : ""}`}><Label htmlFor={`customer-${key}`}>{label}</Label><Input id={`customer-${key}`} name={key} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} type={type} maxLength={max} required={key === "name"} aria-invalid={state.field === field} aria-describedby={state.field === field ? `customer-${key}-error` : undefined} />{state.field === field && <p id={`customer-${key}-error`} role="alert" className="text-sm text-destructive">{state.message}</p>}</div>)}
    {state.message && !["customerName", "customerPhone", "customerEmail"].includes(state.field ?? "") && <p role="alert" className="text-sm text-destructive sm:col-span-2">{state.message}</p>}
    <div className="flex justify-end sm:col-span-2"><Button disabled={pending}>{pending ? "Guardando…" : "Guardar cliente"}</Button></div>
  </form>;
}
