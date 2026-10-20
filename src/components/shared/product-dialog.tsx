"use client";

import { DialogFrame } from "@/components/shared/dialog-frame";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/app/productos/product-form";
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

export function ProductDialog({ contextual = true }: { contextual?: boolean }) {
  const [open, setOpen] = useState(false);
  const [requestKey, setRequestKey] = useState("");
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(open && dirty, "Hay datos del producto sin guardar. ¿Querés descartarlos?");
  return <Dialog.Root open={open} onOpenChange={(value) => { if (!value && dirty && !window.confirm("Hay datos del producto sin guardar. ¿Querés descartarlos?")) return; setOpen(value); setDirty(false); if (value) setRequestKey(crypto.randomUUID()); }}>
    <Dialog.Trigger asChild><Button type="button" variant={contextual ? "outline" : "default"}>Agregar producto</Button></Dialog.Trigger>
    <DialogFrame title="Agregar producto" description="Agregá una combinación al catálogo para futuros ciclos y muestras." size="simple" layer="top" onChangeCapture={() => setDirty(true)}>{requestKey && <ProductForm key={requestKey} initialRequestKey={requestKey} onCreated={() => { setDirty(false); setOpen(false); }} />}</DialogFrame>
  </Dialog.Root>;
}
