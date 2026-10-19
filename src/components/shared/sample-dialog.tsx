"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { FlaskConical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadSampleEditor } from "@/app/muestras/editor-actions";
import { SampleForm } from "@/app/muestras/sample-form";

export function SampleDialog({ children, customerId }: { children?: ReactNode; customerId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadSampleEditor>> | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  function changeOpen(next: boolean) {
    if (!next && (pending || document.querySelector('[data-sample-dialog] form[aria-busy="true"]'))) return;
    if (!next && dirty && !window.confirm("Hay cambios de la muestra sin guardar. ¿Querés descartarlos?")) return;
    setOpen(next); setDirty(false);
    if (next) { setData(null); void load(); }
  }
  async function load() { setPending(true); setError(""); try { setData(await loadSampleEditor(customerId)); } catch { setError("No pudimos abrir el formulario. Intentá otra vez."); } finally { setPending(false); } }
  return <>
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>{children ? <button type="button" className="inline-flex min-h-11 items-center text-primary hover:underline">{children}</button> : <Button type="button"><FlaskConical size={16} aria-hidden="true" />Registrar muestra</Button>}</Dialog.Trigger>
      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-[#1b1610]/45" /><Dialog.Content data-sample-dialog className="fixed inset-x-3 top-1/2 z-60 mx-auto max-h-[94dvh] max-w-3xl -translate-y-1/2 overflow-y-auto rounded-xl border bg-background shadow-xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-background px-5 py-4"><div><Dialog.Title className="text-xl font-semibold">Registrar muestra</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted-foreground">Destinatario, fecha, productos y estado de entrega.</Dialog.Description></div><Dialog.Close asChild><Button type="button" variant="ghost" className="size-11 p-0" aria-label="Cerrar ventana"><X size={19} /></Button></Dialog.Close></header>
        <div className="p-4 sm:p-6">{error ? <p role="alert" className="text-sm text-destructive">{error} <button type="button" onClick={() => void load()} className="underline">Reintentar</button></p> : data ? <SampleForm {...data} onSaved={() => { setOpen(false); setData(null); setDirty(false); setNotice("Muestra guardada."); router.refresh(); }} onCancel={() => changeOpen(false)} onDirtyChange={setDirty} /> : <p role="status" className="py-12 text-center text-sm text-muted-foreground">Cargando formulario…</p>}</div>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
    {notice && <div role="status" className="fixed right-4 bottom-4 z-50 rounded-lg border bg-background p-4 text-sm shadow-lg">{notice} <button type="button" onClick={() => setNotice("")} className="ml-3 underline">Cerrar</button></div>}
  </>;
}
