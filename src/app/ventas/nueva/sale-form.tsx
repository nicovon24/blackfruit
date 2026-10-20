"use client";

import { Textarea } from "@/components/ui/textarea";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAmountSaleAction, type SaleFormState } from "./actions";
import { CustomerPicker } from "@/components/shared/customer-picker";
import { BusinessDateField } from "@/components/shared/business-date-field";
import { useUnsavedChangesGuard } from "@/components/shared/use-unsaved-changes-guard";
import type { CustomerOption } from "@/modules/customers/domain/customer-selection";

const initialState: SaleFormState = {};

export function SaleForm({ today, requestKey, customers, onSaved, onCancel }: { today: string; requestKey: string; customers: CustomerOption[]; onSaved?: (id: string) => void; onCancel?: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const errorId = useId();
  const [values, setValues] = useState({ occurredOn: today, amount: "", channel: "", notes: "" });
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(dirty && !onCancel, "Hay cambios en la venta sin guardar. ¿Querés descartarlos?");
  const [state, action, pending] = useActionState(async (previous: SaleFormState, form: FormData) => {
    const result = await createAmountSaleAction(previous, form);
    if (result.saleId) { setDirty(false); if (onSaved) onSaved(result.saleId); else router.push(`/ventas/${result.saleId}`); router.refresh(); }
    return result;
  }, initialState);

  useEffect(() => {
    if (!pending && state.field) {
      const field = formRef.current?.elements.namedItem(state.field);
      if (field instanceof HTMLElement) field.focus();
    }
  }, [state, pending]);

  return (
    <form ref={formRef} action={action} aria-busy={pending} className="space-y-5" onChangeCapture={() => setDirty(true)}>
      <input type="hidden" name="requestKey" value={requestKey} />
      <div className="space-y-2">
        <Label htmlFor="occurredOn">Fecha de la venta</Label>
        <BusinessDateField id="occurredOn" name="occurredOn" value={values.occurredOn} onChange={(occurredOn) => setValues((current) => ({ ...current, occurredOn }))} required invalid={state.field === "occurredOn"} />
        {state.field === "occurredOn" && <p id={`${errorId}-occurredOn`} role="alert" className="text-sm text-destructive">{state.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Importe total (ARS)</Label>
        <Input id="amount" name="amount" value={values.amount} onChange={(event) => setValues({ ...values, amount: event.target.value })} type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="Ej. 3200" required aria-invalid={state.field === "amount"} aria-describedby={state.field === "amount" ? `${errorId}-amount` : undefined} />
        {state.field === "amount" && <p id={`${errorId}-amount`} role="alert" className="text-sm text-destructive">{state.message}</p>}
      </div>
      <CustomerPicker customers={customers} error={state} />
      <div className="space-y-2">
        <Label htmlFor="channel">Canal <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Input id="channel" name="channel" value={values.channel} onChange={(event) => setValues({ ...values, channel: event.target.value })} maxLength={80} placeholder="Ej. Instagram" aria-invalid={state.field === "channel"} aria-describedby={state.field === "channel" ? `${errorId}-channel` : undefined} />
        {state.field === "channel" && <p id={`${errorId}-channel`} role="alert" className="text-sm text-destructive">{state.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Textarea id="notes" name="notes" value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} maxLength={2000} rows={3} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-invalid={state.field === "notes"} aria-describedby={state.field === "notes" ? `${errorId}-notes` : undefined} />
        {state.field === "notes" && <p id={`${errorId}-notes`} role="alert" className="text-sm text-destructive">{state.message}</p>}
      </div>
      <p className="text-sm text-muted-foreground">Podés registrar una venta sin cliente y vincularla más adelante.</p>
      {state.message && !state.field && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
      <div className="form-actions">{onCancel ? <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>Cancelar</Button> : <Button asChild variant="outline"><Link href="/ventas">Cancelar</Link></Button>}<Button disabled={pending} type="submit"><Check size={16} aria-hidden="true" />{pending ? "Guardando…" : "Guardar venta"}</Button></div>
    </form>
  );
}
