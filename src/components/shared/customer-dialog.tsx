"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/app/clientes/customer-form";
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

export function CustomerDialog() {
  const [open, setOpen] = useState(false);
  const [requestKey, setRequestKey] = useState("");
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(open && dirty, "Hay datos del cliente sin guardar. ¿Querés descartarlos?");
  return <Dialog.Root open={open} onOpenChange={(value) => {
    if (!value && dirty && !window.confirm("Hay datos del cliente sin guardar. ¿Querés descartarlos?")) return;
    setOpen(value); setDirty(false); if (value) setRequestKey(crypto.randomUUID());
  }}>
    <Dialog.Trigger asChild><Button type="button">Nuevo cliente</Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/45" /><Dialog.Content onChangeCapture={() => setDirty(true)} className="fixed left-1/2 top-1/2 z-60 max-h-[90dvh] w-[calc(100%-24px)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-background p-5 shadow-xl sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3"><Dialog.Title className="text-xl font-semibold">Nuevo cliente</Dialog.Title><Dialog.Close asChild><Button type="button" variant="ghost" aria-label="Cerrar" className="size-11 p-0"><X size={18} aria-hidden="true" /></Button></Dialog.Close></div>
      <Dialog.Description className="mb-5 text-sm text-muted-foreground">Guardá sus datos para reutilizarlos en ventas y muestras.</Dialog.Description>
      {requestKey && <CustomerForm key={requestKey} requestKey={requestKey} onSaved={() => { setDirty(false); setOpen(false); }} />}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
