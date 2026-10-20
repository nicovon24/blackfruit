"use client";

import { Textarea } from "@/components/ui/textarea";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUnsavedChangesGuard } from "@/components/shared/use-unsaved-changes-guard";
import type { MachineView } from "@/modules/production/infrastructure/prisma-machines";
import { MAX_MACHINE_TRAYS } from "@/modules/production/domain/machine";
import { manageMachineAction, saveMachineAction, type MachineActionState } from "./actions";

const initialState: MachineActionState = {};

export function MachineForm({ machine, initialRequestKey }: { machine?: MachineView; initialRequestKey?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [requestKey, setRequestKey] = useState(initialRequestKey ?? "");
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(dirty, "Hay cambios de la máquina sin guardar. ¿Querés descartarlos?");
  const [state, action, pending] = useActionState(async (previous: MachineActionState, formData: FormData) => {
    const result = await saveMachineAction(previous, formData);
    if (result.completed) {
      setDirty(false);
      if (!machine) {
        formRef.current?.reset();
        setRequestKey(crypto.randomUUID());
      }
      router.refresh();
    }
    return result;
  }, initialState);

  return <form ref={formRef} action={action} className="space-y-4" aria-busy={pending} onChangeCapture={() => setDirty(true)}>
    <input type="hidden" name="mode" value={machine ? "update" : "create"} />
    {machine ? <><input type="hidden" name="id" value={machine.id} /><input type="hidden" name="version" value={machine.version} /></> : <input type="hidden" name="requestKey" value={requestKey} />}
    <div className="space-y-2"><Label htmlFor={`machine-name-${machine?.id ?? "new"}`}>Nombre</Label><Input id={`machine-name-${machine?.id ?? "new"}`} name="name" maxLength={100} required defaultValue={machine?.name ?? ""} placeholder="Ej. Deshidratador principal" />{state.field === "name" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor={`machine-trays-${machine?.id ?? "new"}`}>Cantidad de bandejas</Label><Input id={`machine-trays-${machine?.id ?? "new"}`} name="trayCount" type="number" min={1} max={MAX_MACHINE_TRAYS} step={1} required defaultValue={machine?.trayCount ?? 16} />{state.field === "trayCount" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor={`machine-model-${machine?.id ?? "new"}`}>Marca o modelo (opcional)</Label><Input id={`machine-model-${machine?.id ?? "new"}`} name="model" maxLength={100} defaultValue={machine?.model ?? ""} />{state.field === "model" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
    </div>
    <div className="space-y-2"><Label htmlFor={`machine-notes-${machine?.id ?? "new"}`}>Observaciones (opcional)</Label><Textarea id={`machine-notes-${machine?.id ?? "new"}`} name="notes" maxLength={2000} rows={2} defaultValue={machine?.notes ?? ""} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />{state.field === "notes" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div>
    {state.message && !state.field && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
    {state.completed && <p role="status" className="text-sm text-olive">Máquina guardada.</p>}
    <Button type="submit" disabled={pending}>{pending ? "Guardando…" : machine ? "Guardar cambios" : "Agregar máquina"}</Button>
  </form>;
}

export function ManageMachineButton({ machine, operation, label }: { machine: MachineView; operation: "archive" | "restore" | "delete"; label: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(manageMachineAction, initialState);
  useEffect(() => { if (state.completed) router.refresh(); }, [state, router]);
  return <form action={action} onSubmit={(event) => { if (operation === "delete" && !window.confirm(`¿Eliminar ${machine.name}? Esta acción se permite solo si no tiene ciclos.`)) event.preventDefault(); }}>
    <input type="hidden" name="id" value={machine.id} /><input type="hidden" name="version" value={machine.version} /><input type="hidden" name="operation" value={operation} />
    <Button type="submit" variant={operation === "delete" ? "destructive" : "outline"} size="sm" disabled={pending}>{pending ? "Procesando…" : label}</Button>
    {state.message && <p role="alert" className="mt-2 text-sm text-destructive">{state.message}</p>}
  </form>;
}
