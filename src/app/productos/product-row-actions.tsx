"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
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
  return <div className="flex flex-wrap items-center gap-2"><Dialog.Root open={open} onOpenChange={(value) => { if (!value && dirty && !window.confirm("Hay cambios del producto sin guardar. ¿Querés descartarlos?")) return; setOpen(value); setDirty(false); }}><Dialog.Trigger asChild><Button size="sm" variant="outline">Editar</Button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/45" /><Dialog.Content className="fixed left-1/2 top-1/2 z-60 max-h-[90dvh] w-[calc(100%-24px)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-background p-5 shadow-xl sm:p-6"><div className="mb-3 flex items-center justify-between"><Dialog.Title className="text-xl font-semibold">Editar producto</Dialog.Title><Dialog.Close asChild><Button variant="ghost" type="button" aria-label="Cerrar" className="size-11 p-0"><X size={18} aria-hidden="true" /></Button></Dialog.Close></div><Dialog.Description className="mb-5 text-sm text-muted-foreground">Los registros históricos conservarán su descripción original.</Dialog.Description><form action={action} className="grid gap-4" aria-busy={pending} onChangeCapture={() => setDirty(true)}>{([{ key: "name", label: "Producto", max: 100 }, { key: "variant", label: "Variante (opcional)", max: 100 }, { key: "unitLabel", label: "Unidad habitual (opcional)", max: 40 }] as const).map(({ key, label, max }) => <div key={key} className="space-y-2"><Label htmlFor={`edit-${product.id}-${key}`}>{label}</Label><Input id={`edit-${product.id}-${key}`} name={key} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} maxLength={max} required={key === "name"} aria-invalid={state.field === key} />{state.field === key && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>)}{state.message && !state.field && <p role="alert" className="text-sm text-destructive">{state.message}</p>}<Button disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</Button></form></Dialog.Content></Dialog.Portal></Dialog.Root><Button size="sm" variant="outline" type="button" disabled={changing} onClick={() => { setChangeError(""); startTransition(async () => { try { const result = await changeProductActiveAction(product.id, !product.active, product.version); if (result.message) setChangeError(result.message); else router.refresh(); } catch { setChangeError("No se pudo cambiar el estado. Recargá la página."); } }); }}>{changing ? "Guardando…" : product.active ? "Archivar" : "Reactivar"}</Button>{changeError && <p role="alert" className="w-full text-sm text-destructive">{changeError}</p>}</div>;
}
