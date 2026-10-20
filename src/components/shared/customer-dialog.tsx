"use client";

import { DialogFrame } from "@/components/shared/dialog-frame";

import { useState } from "react";
import { Dialog } from "radix-ui";
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
    <DialogFrame title="Nuevo cliente" description="Guardá sus datos para reutilizarlos en ventas y muestras." size="simple" layer="nested" onChangeCapture={() => setDirty(true)}>{requestKey && <CustomerForm key={requestKey} requestKey={requestKey} onSaved={() => { setDirty(false); setOpen(false); }} />}
    </DialogFrame>
  </Dialog.Root>;
}
