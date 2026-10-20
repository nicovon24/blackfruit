"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { changeTrashAction } from "@/app/papelera/actions";
import type { TrashType } from "@/modules/trash/domain/trash";

export function TrashButton({ type, id, version, restore = false, back, ariaLabel, subject }: { type: TrashType; id: string; version: number; restore?: boolean; back?: string; ariaLabel?: string; subject?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <div><Button type="button" variant="outline" aria-label={ariaLabel} disabled={pending} onClick={() => {
    if (!restore && !window.confirm(`¿Enviar ${subject ?? "este registro"} a la papelera? Podrás restaurarlo más adelante.`)) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await changeTrashAction(type, id, version, restore);
        if (result.error) { setError(result.error); return; }
        if (back) router.replace(back);
        else router.refresh();
      } catch { setError("No se pudo completar la operación. Volvé a intentarlo."); }
    });
  }}>{pending ? "Guardando…" : restore ? "Restaurar" : "Enviar a papelera"}</Button>{error && <p role="alert" className="mt-2 max-w-sm text-sm text-destructive">{error}</p>}</div>;
}
