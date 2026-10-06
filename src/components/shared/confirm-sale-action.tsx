"use client";

import { useState } from "react";
import { AlertDialog } from "radix-ui";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

function ConfirmSubmit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} variant="destructive">{pending ? "Procesando…" : "Confirmar"}</Button>;
}

export function ConfirmSaleAction({ label, description, action, version, onComplete, onOpenChange }: { label: string; description: string; action: (form: FormData) => Promise<void>; version: number; onComplete?: () => void; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  function changeOpen(value: boolean) {
    setOpen(value);
    onOpenChange?.(value);
  }
  return <AlertDialog.Root open={open} onOpenChange={changeOpen}>
    <AlertDialog.Trigger asChild><Button type="button" variant="outline">{label}</Button></AlertDialog.Trigger>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="fixed inset-0 z-40 bg-[#1b1610]/45 backdrop-blur-[3px]" />
      <AlertDialog.Content onEscapeKeyDown={(event) => { event.preventDefault(); event.stopPropagation(); changeOpen(false); }} className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-6 shadow-xl">
        <AlertDialog.Title className="text-xl font-semibold tracking-tight">{label}</AlertDialog.Title>
        <AlertDialog.Description className="mt-3 text-sm leading-6 text-muted-foreground">{description}</AlertDialog.Description>
        <div className="mt-6 flex justify-end gap-3">
          <AlertDialog.Cancel asChild><Button type="button" variant="outline">Cancelar</Button></AlertDialog.Cancel>
          <form action={async (form) => { await action(form); changeOpen(false); onComplete?.(); }}>
            {onComplete && <input type="hidden" name="presentation" value="dialog" />}
            <input type="hidden" name="version" value={version} />
            <ConfirmSubmit />
          </form>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>;
}
