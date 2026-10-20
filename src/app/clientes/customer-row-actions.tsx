"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { DialogFrame } from "@/components/shared/dialog-frame";
import { TrashButton } from "@/components/shared/trash-button";
import { useUnsavedChangesGuard } from "@/components/shared/use-unsaved-changes-guard";
import { CustomerForm } from "./customer-form";

type Customer = { id: string; version: number; name: string; phone: string | null; email: string | null };

export function CustomerRowActions({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(open && dirty, "Hay cambios del cliente sin guardar. ¿Querés descartarlos?");
  function changeOpen(next: boolean) {
    if (!next && dirty && !window.confirm("Hay cambios del cliente sin guardar. ¿Querés descartarlos?")) return;
    setDirty(false);
    setOpen(next);
  }
  return <div className="flex flex-wrap items-center gap-2">
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild><Button type="button" size="sm" variant="outline">Editar</Button></Dialog.Trigger>
      <DialogFrame title="Editar cliente" description="Actualizá sus datos de contacto para reutilizarlos en ventas y muestras." size="simple" layer="nested" onChangeCapture={() => setDirty(true)}>
        <CustomerForm key={`${customer.id}-${customer.version}`} initial={customer} onSaved={() => { setDirty(false); setOpen(false); }} onCancel={() => changeOpen(false)} />
      </DialogFrame>
    </Dialog.Root>
    <TrashButton type="customers" id={customer.id} version={customer.version} />
  </div>;
}
