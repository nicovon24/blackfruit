"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
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
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-70 bg-[#1b1610]/45" /><Dialog.Content onChangeCapture={() => setDirty(true)} className="fixed left-1/2 top-1/2 z-80 max-h-[90dvh] w-[calc(100%-24px)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-background p-5 shadow-xl sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><Dialog.Title className="text-xl font-semibold">Agregar producto</Dialog.Title><Dialog.Close asChild><Button type="button" variant="ghost" aria-label="Cerrar" className="size-11 p-0"><X size={18} aria-hidden="true" /></Button></Dialog.Close></div><Dialog.Description className="mb-5 text-sm text-muted-foreground">Agregá una combinación al catálogo para futuros ciclos y muestras.</Dialog.Description>{requestKey && <ProductForm key={requestKey} initialRequestKey={requestKey} onCreated={() => { setDirty(false); setOpen(false); }} />}</Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
