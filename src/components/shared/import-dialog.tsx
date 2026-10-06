"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportWizard } from "@/app/importar/import-wizard";
import { loadImportEditor } from "@/app/importar/editor-actions";
import { formatArs } from "@/lib/format-money";

export function ImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadImportEditor>> | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ pending: false, hasDraft: false });

  const load = useCallback(async () => {
    setError("");
    try { setData(await loadImportEditor()); }
    catch { setError("No pudimos abrir la importación. Intentá nuevamente."); }
  }, []);

  function changeOpen(value: boolean) {
    if (!value && progress.pending) return;
    if (!value && progress.hasDraft && !window.confirm("Hay una importación sin confirmar. ¿Querés descartar esta revisión y cerrar?")) return;
    setOpen(value);
    if (value) {
      setData(null);
      setProgress({ pending: false, hasDraft: false });
      void load();
    }
  }

  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger asChild><Button type="button" variant="outline"><Upload size={16} aria-hidden="true" />Importar Excel</Button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-30 bg-[#1b1610]/45 backdrop-blur-[3px]" />
      <Dialog.Content className="fixed top-1/2 left-1/2 z-40 max-h-[92dvh] w-[calc(100%-24px)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-background shadow-xl" aria-describedby="import-dialog-description">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-background px-5 py-4 sm:px-7 sm:py-5">
          <div><Dialog.Title className="text-xl font-semibold tracking-tight">Importar ventas</Dialog.Title><Dialog.Description id="import-dialog-description" className="mt-1 text-sm text-muted-foreground">Cargá la planilla y revisá cada operación antes de guardarla.</Dialog.Description></div>
          <Dialog.Close asChild><Button type="button" variant="ghost" className="size-11 shrink-0 p-0" aria-label="Cerrar importación"><X size={20} aria-hidden="true" /></Button></Dialog.Close>
        </header>
        <div className="space-y-5 p-3 sm:p-6">
          {error ? <div role="alert" className="space-y-3 rounded-lg border bg-white p-5"><p className="text-sm text-destructive">{error}</p><Button type="button" variant="outline" onClick={() => void load()}>Reintentar</Button></div> : !data ? <p role="status" className="py-12 text-center text-muted-foreground">Cargando importación…</p> : <>
            <ImportWizard customers={data.customers} onStateChange={setProgress} onConfirmed={() => { router.refresh(); void load(); }} />
            <details className="rounded-lg border bg-white p-4 sm:p-5"><summary className="cursor-pointer text-sm font-medium">Últimas importaciones confirmadas ({data.history.length})</summary>{data.history.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Todavía no hay importaciones confirmadas.</p> : <ul className="mt-3 divide-y">{data.history.map((batch) => <li key={batch.id} className="py-3 text-sm"><p className="font-medium">{batch.fileName}</p><p className="mt-1 text-muted-foreground">{batch.confirmedOn} · {batch.result.sales} ventas · {formatArs(batch.result.total)} · {batch.result.samples} muestras · {batch.result.excluded} exclusiones · {batch.result.duplicates} ya importadas</p></li>)}</ul>}</details>
          </>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
