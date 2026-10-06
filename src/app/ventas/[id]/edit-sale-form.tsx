"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAmountSaleAction, type EditSaleState } from "./actions";
import { CustomerPicker } from "@/components/shared/customer-picker";
import type { CustomerOption } from "@/modules/customers/domain/customer-selection";

type Props = {
  id: string;
  version: number;
  occurredOn: string;
  amount: string;
  channel: string;
  notes: string;
  customerId: string | null;
  mode?: string;
  customers: CustomerOption[];
  onSaved?: () => void;
};

const initialState: EditSaleState = {};

export function EditSaleForm(props: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const errorId = useId();
  const [values, setValues] = useState({ occurredOn: props.occurredOn, amount: props.amount, channel: props.channel, notes: props.notes });
  const [state, action, pending] = useActionState(async (previous: EditSaleState, form: FormData) => {
    const result = await updateAmountSaleAction(props.id, previous, form);
    if (result.saved) { props.onSaved?.(); router.refresh(); }
    return result;
  }, initialState);

  useEffect(() => {
    if (!pending && state.field) {
      const field = formRef.current?.elements.namedItem(state.field);
      if (field instanceof HTMLElement) field.focus();
    }
  }, [state, pending]);

  return (
    <form ref={formRef} action={action} aria-busy={pending} className="grid gap-5 sm:grid-cols-2">
      <input type="hidden" name="version" value={props.version} />
      <div className="sm:col-span-2"><CustomerPicker key={`${props.id}-${props.version}`} customers={props.customers} defaultValue={props.customerId ?? ""} error={state} /></div>
      <div className="space-y-2"><Label htmlFor="edit-date">Fecha</Label><Input id="edit-date" name="occurredOn" type="date" value={values.occurredOn} onChange={(event) => setValues({ ...values, occurredOn: event.target.value })} required aria-invalid={state.field === "occurredOn"} aria-describedby={state.field === "occurredOn" ? `${errorId}-occurredOn` : undefined} />{state.field === "occurredOn" && <p id={`${errorId}-occurredOn`} role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="edit-amount">Importe (ARS)</Label><Input id="edit-amount" name="amount" readOnly={props.mode === "lines"} type="number" min="0.01" step="0.01" value={values.amount} onChange={(event) => setValues({ ...values, amount: event.target.value })} required aria-invalid={state.field === "amount"} aria-describedby={state.field === "amount" ? `${errorId}-amount` : undefined} />{state.field === "amount" && <p id={`${errorId}-amount`} role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="edit-channel">Canal (opcional)</Label><Input id="edit-channel" name="channel" maxLength={80} value={values.channel} onChange={(event) => setValues({ ...values, channel: event.target.value })} aria-invalid={state.field === "channel"} aria-describedby={state.field === "channel" ? `${errorId}-channel` : undefined} />{state.field === "channel" && <p id={`${errorId}-channel`} role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="edit-notes">Notas (opcional)</Label><textarea id="edit-notes" name="notes" maxLength={2000} rows={3} value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" aria-invalid={state.field === "notes"} aria-describedby={state.field === "notes" ? `${errorId}-notes` : undefined} />{state.field === "notes" && <p id={`${errorId}-notes`} role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
      {props.mode === "lines" && <p className="text-xs text-muted-foreground sm:col-span-2">El total conserva los productos y precios importados. Podés actualizar fecha, cliente, canal y notas.</p>}
      {state.message && !state.field && <p role="alert" className="text-sm text-destructive sm:col-span-2">{state.message}</p>}
      <Button disabled={pending} type="submit" className="sm:col-span-2 sm:justify-self-start">{pending ? "Guardando…" : "Guardar cambios"}</Button>
    </form>
  );
}
