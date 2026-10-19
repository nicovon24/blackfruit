"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUnsavedChangesGuard } from "@/components/shared/use-unsaved-changes-guard";
import { createProductAction, type ProductActionState } from "./actions";

export function ProductForm({ initialRequestKey, onCreated }: { initialRequestKey: string; onCreated?: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [requestKey, setRequestKey] = useState(initialRequestKey);
  const [values, setValues] = useState({ name: "", variant: "", unitLabel: "" });
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(dirty && !onCreated, "Hay datos del producto sin guardar. ¿Querés descartarlos?");
  const [state, action, pending] = useActionState(async (previous: ProductActionState, form: FormData) => {
    const result = await createProductAction(previous, form);
    if (result.completed) { setDirty(false); formRef.current?.reset(); setValues({ name: "", variant: "", unitLabel: "" }); setRequestKey(crypto.randomUUID()); router.refresh(); onCreated?.(); }
    return result;
  }, {});
  return <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-3" aria-busy={pending} onChangeCapture={() => setDirty(true)}>
    <input type="hidden" name="requestKey" value={requestKey} />
    <div className="space-y-2"><Label htmlFor="product-name">Producto</Label><Input id="product-name" name="name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} maxLength={100} placeholder="Ej. Naranja" required aria-invalid={state.field === "name"} />{state.field === "name" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="product-variant">Variante (opcional)</Label><Input id="product-variant" name="variant" value={values.variant} onChange={(event) => setValues({ ...values, variant: event.target.value })} maxLength={100} placeholder="Ej. Con azúcar" aria-invalid={state.field === "variant"} />{state.field === "variant" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
    <div className="space-y-2"><Label htmlFor="product-unit">Unidad habitual (opcional)</Label><Input id="product-unit" name="unitLabel" value={values.unitLabel} onChange={(event) => setValues({ ...values, unitLabel: event.target.value })} maxLength={40} placeholder="Ej. kg" aria-invalid={state.field === "unitLabel"} />{state.field === "unitLabel" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
    {state.message && !state.field && <p role="alert" className="text-sm text-destructive sm:col-span-3">{state.message}</p>}
    {state.completed && <p role="status" className="text-sm text-olive sm:col-span-3">Producto agregado.</p>}
    <Button type="submit" disabled={pending} className="sm:col-span-3 sm:w-fit">{pending ? "Guardando…" : "Agregar al catálogo"}</Button>
  </form>;
}
