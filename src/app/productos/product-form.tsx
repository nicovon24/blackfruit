"use client";

import { useActionState, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useFormErrorFocus } from "@/components/shared/use-form-error-focus";
import { useUnsavedChangesGuard } from "@/components/shared/use-unsaved-changes-guard";
import { createProductAction, type ProductActionState } from "./actions";

export function ProductForm({ initialRequestKey, onCreated }: { initialRequestKey: string; onCreated?: () => void }) {
  const router = useRouter();
  const id = useId();
  const [requestKey, setRequestKey] = useState(initialRequestKey);
  const [values, setValues] = useState({ name: "", variant: "", unitLabel: "" });
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(dirty && !onCreated, "Hay datos del producto sin guardar. ¿Querés descartarlos?");
  const [state, action, pending] = useActionState(async (previous: ProductActionState, form: FormData) => {
    const result = await createProductAction(previous, form);
    if (result.completed) { setDirty(false); setValues({ name: "", variant: "", unitLabel: "" }); setRequestKey(crypto.randomUUID()); router.refresh(); onCreated?.(); }
    return result;
  }, {});
  const formRef = useFormErrorFocus(state);
  return <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2" aria-busy={pending} onChangeCapture={() => setDirty(true)}>
    <input type="hidden" name="requestKey" value={requestKey} />
    {([{ key: "name", label: "Producto", placeholder: "Ej. Naranja", max: 100 }, { key: "variant", label: "Variante (opcional)", placeholder: "Ej. Con azúcar", max: 100 }, { key: "unitLabel", label: "Unidad habitual (opcional)", placeholder: "Ej. kg", max: 40 }] as const).map(({ key, label, placeholder, max }) => <FormField key={key} id={`${id}-${key}`} label={label} className={key === "name" ? "sm:col-span-2" : ""} error={state.field === key ? state.message : undefined}><Input id={`${id}-${key}`} name={key} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} maxLength={max} placeholder={placeholder} required={key === "name"} aria-invalid={state.field === key} aria-describedby={state.field === key ? `${id}-${key}-error` : undefined} /></FormField>)}
    {state.message && !state.field && <p role="alert" className="text-sm text-destructive sm:col-span-2">{state.message}</p>}
    {state.completed && <p role="status" className="text-sm text-success sm:col-span-2">Producto agregado.</p>}
    <div className="form-actions sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Agregar al catálogo"}</Button></div>
  </form>;
}
