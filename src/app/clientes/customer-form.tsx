"use client";

import { useActionState, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useFormErrorFocus } from "@/components/shared/use-form-error-focus";
import { createCustomerAction, updateCustomerAction, type CustomerFormState } from "./actions";

type ExistingCustomer = { id: string; version: number; name: string; phone: string | null; email: string | null };

export function CustomerForm({ requestKey, initial, onSaved, onCancel }: { requestKey?: string; initial?: ExistingCustomer; onSaved?: () => void; onCancel?: () => void }) {
  const router = useRouter();
  const id = useId();
  const [values, setValues] = useState({ name: initial?.name ?? "", phone: initial?.phone ?? "", email: initial?.email ?? "" });
  const [state, action, pending] = useActionState(async (previous: CustomerFormState, form: FormData) => {
    const result = initial ? await updateCustomerAction(initial.id, initial.version, previous, form) : await createCustomerAction(previous, form);
    if (result.savedId) { router.refresh(); onSaved?.(); }
    return result;
  }, {} as CustomerFormState);
  const formRef = useFormErrorFocus(state);
  return <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2" aria-busy={pending}>
    {!initial && <input type="hidden" name="requestKey" value={requestKey} />}
    {([{ key: "name", label: "Nombre", field: "customerName", max: 160, type: "text" }, { key: "phone", label: "Teléfono (opcional)", field: "customerPhone", max: 40, type: "tel" }, { key: "email", label: "Email (opcional)", field: "customerEmail", max: 254, type: "email" }] as const).map(({ key, label, field, max, type }) => <FormField key={key} id={`${id}-${key}`} label={label} error={state.field === field ? state.message : undefined} className={key === "name" ? "sm:col-span-2" : ""}><Input id={`${id}-${key}`} name={key} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} type={type} maxLength={max} required={key === "name"} aria-invalid={state.field === field} aria-describedby={state.field === field ? `${id}-${key}-error` : undefined} /></FormField>)}
    {state.message && !["customerName", "customerPhone", "customerEmail"].includes(state.field ?? "") && <p role="alert" className="text-sm text-destructive sm:col-span-2">{state.message}</p>}
    <div className="form-actions sm:col-span-2">{onCancel && <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancelar</Button>}<Button type="submit" disabled={pending}>{pending ? "Guardando…" : initial ? "Guardar cambios" : "Guardar cliente"}</Button></div>
  </form>;
}
