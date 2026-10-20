"use client";

import { Textarea } from "@/components/ui/textarea";

import { NativeSelect } from "@/components/ui/native-select";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomerPicker } from "@/components/shared/customer-picker";
import { BusinessDateField } from "@/components/shared/business-date-field";
import { ProductDialog } from "@/components/shared/product-dialog";
import { useUnsavedChangesGuard } from "@/components/shared/use-unsaved-changes-guard";
import { useFormErrorFocus } from "@/components/shared/use-form-error-focus";
import type { CustomerOption } from "@/modules/customers/domain/customer-selection";
import type { ProductChoice } from "@/modules/production/domain/cycle";
import type { SampleView } from "@/modules/samples/infrastructure/prisma-samples";
import { saveSampleAction, type SampleActionState } from "./actions";

type Line = { key: string; productId: string | null; productName: string; variant: string; quantity: string; unitLabel: string; manual: boolean };
type ReviewSuggestion = { id: string; recipientName: string; sampleOn: string; lines: Array<{ productName: string; variant: string | null; quantity: string; unitLabel: string }> };

export function SampleForm({ products, customers, today, requestKey, initial, review, preselectedCustomerId, onSaved, onCancel, onDirtyChange }: { products: ProductChoice[]; customers: CustomerOption[]; today: string; requestKey: string; initial?: SampleView; review?: ReviewSuggestion; preselectedCustomerId?: string; onSaved?: (id: string) => void; onCancel?: () => void; onDirtyChange?: (dirty: boolean) => void }) {
  const router = useRouter();
  const [recipientName, setRecipientName] = useState(initial?.recipientName ?? review?.recipientName ?? "");
  const [sampleOn, setSampleOn] = useState(initial?.sampleOn ?? review?.sampleOn ?? today);
  const [status, setStatus] = useState<"" | "pending" | "delivered">(initial?.status ?? (review ? "" : "pending"));
  const [dirty, setDirty] = useState(false);
  const [deliveredOn, setDeliveredOn] = useState(initial?.deliveredOn ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(() => {
    const saved = initial?.lines.map((line) => ({ key: crypto.randomUUID(), productId: line.productId, productName: line.productName, variant: line.variant ?? "", quantity: line.quantity, unitLabel: line.unitLabel, manual: !line.productId }));
    const suggested = review?.lines.map((line) => ({ key: crypto.randomUUID(), productId: null, productName: line.productName, variant: line.variant ?? "", quantity: line.quantity, unitLabel: line.unitLabel, manual: true }));
    return saved?.length ? saved : suggested?.length ? suggested : [{ key: "first", productId: null, productName: "", variant: "", quantity: "", unitLabel: "", manual: false }];
  });
  const [state, action, pending] = useActionState(async (previous: SampleActionState, formData: FormData) => {
    const result = await saveSampleAction(previous, formData);
    if (result.savedId) { setDirty(false); onDirtyChange?.(false); if (onSaved) onSaved(result.savedId); else router.push(`/muestras/${result.savedId}`); router.refresh(); }
    return result;
  }, {});
  const formRef = useFormErrorFocus(state);

  useUnsavedChangesGuard(dirty && !onCancel, "Hay cambios de la muestra sin guardar. ¿Querés descartarlos?");

  function updateLine(key: string, update: Partial<Line>) { setLines(lines.map((line) => line.key === key ? { ...line, ...update } : line)); }
  return <form ref={formRef} action={action} aria-busy={pending} className="space-y-6" onChangeCapture={() => { setDirty(true); onDirtyChange?.(true); }}>
    <input type="hidden" name="requestKey" value={requestKey} />
    <input type="hidden" name="lines" value={JSON.stringify(lines.map(({ productId, productName, variant, quantity, unitLabel }) => ({ productId, productName, variant, quantity, unitLabel })))} />
    {initial && <><input type="hidden" name="id" value={initial.id} /><input type="hidden" name="version" value={initial.version} /></>}
    {review && <input type="hidden" name="reviewId" value={review.id} />}
    <section className="panel form-section grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
      <div className="space-y-2"><Label htmlFor="sample-recipient">Destinatario</Label><Input id="sample-recipient" name="recipientName" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} maxLength={160} required />{state.field === "recipientName" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="sample-date">Fecha de la muestra</Label><BusinessDateField id="sample-date" name="sampleOn" value={sampleOn} onChange={setSampleOn} required invalid={state.field === "sampleOn"} />{state.field === "sampleOn" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="sample-status">Estado</Label><NativeSelect id="sample-status" name="status" value={status} required aria-invalid={state.field === "status"} onChange={(event) => { const next = event.target.value as "" | "pending" | "delivered"; setStatus(next); if (next !== "delivered") setDeliveredOn(""); }} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">{review && <option value="">Elegí el estado conocido</option>}<option value="pending">Pendiente</option><option value="delivered">Entregada</option></NativeSelect>{review && <p className="text-xs text-muted-foreground">La planilla no confirma una entrega. Elegí el estado solo después de revisarlo.</p>}{state.field === "status" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
      {status === "delivered" && <div className="space-y-2"><Label htmlFor="sample-delivered">Fecha de entrega (opcional)</Label><BusinessDateField id="sample-delivered" name="deliveredOn" value={deliveredOn} onChange={setDeliveredOn} invalid={state.field === "deliveredOn"} /><p className="text-xs text-muted-foreground">Dejala vacía si no conocés el día exacto.</p>{state.field === "deliveredOn" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>}
      <div className="sm:col-span-2"><CustomerPicker customers={customers} defaultValue={initial?.customerId ?? preselectedCustomerId ?? ""} error={state} context="muestra" onSelect={(customer) => { if (!recipientName.trim()) setRecipientName(customer.name); }} /><p className="mt-2 text-xs text-muted-foreground">Vinculá el contacto solo si sabés que es esa persona. El nombre escrito no establece identidad.</p></div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="sample-notes">Observaciones (opcional)</Label><Textarea id="sample-notes" name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={3} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />{state.field === "notes" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
    </section>
    <section className="panel form-section p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Productos y cantidades</h2><p className="mt-1 text-sm text-muted-foreground">Escribí una unidad por línea; las cantidades no se convierten automáticamente.</p></div><div className="flex flex-wrap gap-2"><ProductDialog /><Button type="button" variant="outline" onClick={() => { setDirty(true); onDirtyChange?.(true); setLines([...lines, { key: crypto.randomUUID(), productId: null, productName: "", variant: "", quantity: "", unitLabel: "", manual: false }]); }}>Agregar línea</Button></div></div>
      <div className="mt-4 space-y-4">{lines.map((line, index) => <div key={line.key} className="rounded-lg border bg-muted/20 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-medium">Línea {index + 1}</h3>{lines.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => { setDirty(true); onDirtyChange?.(true); setLines(lines.filter((item) => item.key !== line.key)); }}>Quitar</Button>}</div><div className="grid gap-3 sm:grid-cols-3"><div className="space-y-2 sm:col-span-3"><Label htmlFor={`product-${line.key}`}>Producto del catálogo</Label><NativeSelect id={`product-${line.key}`} value={line.manual ? "manual" : line.productId ?? ""} onChange={(event) => updateLine(line.key, { productId: event.target.value && event.target.value !== "manual" ? event.target.value : null, manual: event.target.value === "manual", productName: event.target.value === "manual" ? line.productName : "", variant: event.target.value === "manual" ? line.variant : "" })} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Elegí un producto</option><option value="manual">Otro producto · escribir nombre</option>{products.filter((product) => product.active || product.id === line.productId).map((product) => <option key={product.id} value={product.id}>{product.name}{product.variant ? ` · ${product.variant}` : ""}</option>)}</NativeSelect></div>{line.manual && <><div className="space-y-2 sm:col-span-2"><Label htmlFor={`name-${line.key}`}>Nombre del producto</Label><Input id={`name-${line.key}`} value={line.productName} onChange={(event) => updateLine(line.key, { productName: event.target.value })} maxLength={160} placeholder="Ej. Banana" /></div><div className="space-y-2"><Label htmlFor={`variant-${line.key}`}>Variante (opcional)</Label><Input id={`variant-${line.key}`} value={line.variant} onChange={(event) => updateLine(line.key, { variant: event.target.value })} maxLength={100} /></div></>}<div className="space-y-2"><Label htmlFor={`quantity-${line.key}`}>Cantidad</Label><Input id={`quantity-${line.key}`} type="number" min="0.001" step="0.001" inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} placeholder="Ej. 0.250" /></div><div className="space-y-2"><Label htmlFor={`unit-${line.key}`}>Unidad</Label><Input id={`unit-${line.key}`} value={line.unitLabel} onChange={(event) => updateLine(line.key, { unitLabel: event.target.value })} maxLength={40} placeholder="Ej. kg, paquetes" /></div></div></div>)}{state.field === "lines" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
    </section>
    <div className="form-actions">{state.message && !state.field && <p role="alert" className="text-sm text-destructive">{state.message}</p>}<p className="text-sm text-muted-foreground">Las muestras no suman ingresos ni ventas.</p><div className="flex gap-2">{onCancel ? <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>Cancelar</Button> : <Button asChild variant="outline"><Link href="/muestras">Cancelar</Link></Button>}<Button type="submit" disabled={pending}>{pending ? "Guardando…" : initial ? "Guardar muestra" : "Registrar muestra"}</Button></div></div>
  </form>;
}
