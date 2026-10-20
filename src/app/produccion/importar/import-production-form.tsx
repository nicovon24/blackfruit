"use client";

import { FileField } from "@/components/shared/file-field";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatBusinessDate } from "@/lib/business-date";
import { useUnsavedChangesGuard } from "@/components/shared/use-unsaved-changes-guard";
import { confirmProductionImportAction } from "./actions";

type Review = { id: string; fileName: string; confirmed: boolean; preview: { valid: number; conflicts: number; errors: number; records: Array<{ code: string; row: number; machineName: string; finishedOn: string; totalKg: string; resultCount: number; errors: string[] }> } };

export function ImportProductionForm() {
  const router = useRouter();
  const [review, setReview] = useState<Review | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [page, setPage] = useState(0);
  const [done, setDone] = useState(false);
  useUnsavedChangesGuard(Boolean(review && !done), "Hay una importación de producción sin confirmar. ¿Querés salir?");
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setReview(null);
    try {
      const response = await fetch("/api/production-imports/upload", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setReview(result); setPage(0); setConfirmed(false); setDone(result.confirmed);
    } catch (issue) { setError(issue instanceof Error ? issue.message : "No pudimos cargar el archivo."); }
    finally { setPending(false); }
  }
  async function confirm() {
    if (!review || !confirmed || review.preview.errors) return;
    setPending(true); setError("");
    try {
      const response = await confirmProductionImportAction(review.id);
      if (!response.result) throw new Error(response.error);
      setDone(true); router.refresh();
    } catch (issue) { setError(issue instanceof Error ? issue.message : "No pudimos confirmar el archivo."); }
    finally { setPending(false); }
  }
  const rows = review?.preview.records.slice(page * 25, page * 25 + 25) ?? [];
  return <div className="space-y-6">
    <section className="panel p-5 sm:p-6"><h2 className="text-lg font-semibold">1. Prepará la planilla</h2><p className="mt-2 text-sm text-muted-foreground">Una fila por ciclo en «Ciclos» y una fila por pesaje en «Pesajes». Una lista como «1,2» representa un único peso agrupado. Los productos y la máquina deben existir en el catálogo.</p><a href="/api/production-imports/template" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline">Descargar plantilla XLSX</a><form onSubmit={upload} className="mt-4 grid gap-4 sm:flex sm:items-end"><FileField accept=".xlsx" label="Archivo de producción" disabled={pending} hint="XLSX · Hasta 2 MB y 1.000 filas por hoja." /><Button disabled={pending} type="submit">{pending ? "Leyendo…" : "Cargar y revisar"}</Button></form><p className="mt-3 text-xs text-muted-foreground">Hasta 2 MB; máximo 1.000 filas por hoja. La carga no confirma ciclos automáticamente.</p></section>
    {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
    {review && <section className="panel overflow-hidden"><div className="border-b p-5"><h2 className="text-lg font-semibold">2. Revisá los ciclos</h2><p className="mt-2 text-sm text-muted-foreground">{review.fileName} · {review.preview.valid} listos · {review.preview.conflicts} conflictos · {review.preview.errors} con errores</p>{done && <p role="status" className="mt-2 text-sm font-medium text-[var(--olive)]">Este archivo ya fue confirmado. <Link href="/produccion" className="underline">Ver dashboard</Link></p>}</div><ul className="divide-y">{rows.map((row) => <li key={`${row.row}-${row.code}`} className="p-4 sm:px-5"><div className="flex flex-wrap justify-between gap-2"><strong>{row.code || `Fila ${row.row}`}</strong><span className="font-medium">{row.totalKg || "—"} kg</span></div><p className="mt-1 text-sm text-muted-foreground">{row.machineName || "Máquina pendiente"} · {formatBusinessDate(row.finishedOn) || "Fecha pendiente"} · {row.resultCount} pesaje(s)</p>{row.errors.length > 0 && <ul className="mt-2 space-y-1 text-sm text-destructive">{row.errors.map((issue, index) => <li key={index}>{issue}</li>)}</ul>}</li>)}</ul><nav className="flex items-center justify-end gap-4 border-t p-4 text-sm" aria-label="Páginas de revisión"><Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button><span>Página {page + 1}</span><Button variant="outline" disabled={(page + 1) * 25 >= review.preview.records.length} onClick={() => setPage(page + 1)}>Siguiente</Button></nav>
      {!done && <div className="border-t p-5"><label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-5 accent-primary" checked={confirmed} disabled={pending || review.preview.errors > 0} onChange={(event) => setConfirmed(event.target.checked)} />Revisé fechas, máquinas, bandejas, pesajes y totales. Confirmo estos ciclos.</label><Button className="mt-4" disabled={pending || !confirmed || review.preview.errors > 0} onClick={confirm}>{pending ? "Guardando…" : `Confirmar ${review.preview.valid} ciclo(s)`}</Button></div>}
    </section>}
  </div>;
}
