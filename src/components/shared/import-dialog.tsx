"use client";

import { DialogFrame } from "@/components/shared/dialog-frame";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Upload } from "lucide-react";
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
    <DialogFrame title="Importar ventas y muestras" description="Cargá la planilla y revisá cada operación antes de guardarla." size="import" layer="base" ><div className="space-y-5">
          {error ? <div role="alert" className="space-y-3 rounded-lg border bg-surface p-5"><p className="text-sm text-destructive">{error}</p><Button type="button" variant="outline" onClick={() => void load()}>Reintentar</Button></div> : !data ? <p role="status" className="py-12 text-center text-muted-foreground">Cargando importación…</p> : <>
            <ImportWizard customers={data.customers} onStateChange={setProgress} onConfirmed={() => { router.refresh(); void load(); }} />
            <details className="rounded-lg border bg-surface p-4 sm:p-5"><summary className="cursor-pointer text-sm font-medium">Últimas importaciones confirmadas ({data.history.length})</summary>{data.history.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Todavía no hay importaciones confirmadas.</p> : <ul className="mt-3 divide-y">{data.history.map((batch) => <li key={batch.id} className="py-3 text-sm"><p className="font-medium">{batch.fileName}</p><p className="mt-1 text-muted-foreground">{batch.confirmedOn} · {batch.result.sales} ventas · {formatArs(batch.result.total)} · {batch.result.samples} muestras · {batch.result.excluded} exclusiones · {batch.result.duplicates} ya importadas</p></li>)}</ul>}</details>
          </>}
        </div>
      </DialogFrame>
  </Dialog.Root>;
}
