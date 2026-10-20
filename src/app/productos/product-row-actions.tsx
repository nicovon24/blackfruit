"use client";

import { DialogFrame } from "@/components/shared/dialog-frame";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeProductActiveAction, updateProductAction, type ProductActionState } from "@/app/productos/actions";
import { useUnsavedChangesGuard } from "@/components/shared/use-unsaved-changes-guard";

type Product = { id: string; name: string; variant: string | null; unitLabel: string | null; active: boolean; version: number };

export function ProductRowActions({ product }: { product: Product }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [values, setValues] = useState({ name: product.name, variant: product.variant ?? "", unitLabel: product.unitLabel ?? "" });
  const [changing, startTransition] = useTransition();
  const [changeError, setChangeError] = useState("");
  const [state, action, pending] = useActionState(async (previous: ProductActionState, form: FormData) => {
    const result = await updateProductAction(product.id, product.version, previous, form);
    if (result.completed) { setDirty(false); setOpen(false); router.refresh(); }
    return result;
  }, {} as ProductActionState);
  useUnsavedChangesGuard(open && dirty, "Hay cambios del producto sin guardar. ¿Querés descartarlos?");
  return <div className="flex flex-wrap items-center gap-2"><Dialog.Root open={open} onOpenChange={(value) => { if (!value && dirty && !window.confirm("Hay cambios del producto sin guardar. ¿Querés descartarlos?")) return; setOpen(value); setDirty(false); }}><Dialog.Trigger asChild><Button size="sm" variant="outline">Editar</Button></Dialog.Trigger><DialogFrame title="Editar producto" description="Los registros históricos conservarán su descripción original." size="simple" layer="nested" ><form action={action} className="grid gap-4" aria-busy={pending} onChangeCapture={() => setDirty(true)}>{([{ key: "name", label: "Producto", max: 100 }, { key: "variant", label: "Variante (opcional)", max: 100 }, { key: "unitLabel", label: "Unidad habitual (opcional)", max: 40 }] as const).map(({ key, label, max }) => <div key={key} className="space-y-2"><Label htmlFor={`edit-${product.id}-${key}`}>{label}</Label><Input id={`edit-${product.id}-${key}`} name={key} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} maxLength={max} required={key === "name"} aria-invalid={state.field === key} />{state.field === key && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>)}{state.message && !state.field && <p role="alert" className="text-sm text-destructive">{state.message}</p>}<Button disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</Button></form></DialogFrame></Dialog.Root><Button size="sm" variant="outline" type="button" disabled={changing} onClick={() => { setChangeError(""); startTransition(async () => { try { const result = await changeProductActiveAction(product.id, !product.active, product.version); if (result.message) setChangeError(result.message); else router.refresh(); } catch { setChangeError("No se pudo cambiar el estado. Recargá la página."); } }); }}>{changing ? "Guardando…" : product.active ? "Archivar" : "Reactivar"}</Button>{changeError && <p role="alert" className="w-full text-sm text-destructive">{changeError}</p>}</div>;
}
