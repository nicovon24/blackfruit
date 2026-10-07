"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Upload, CheckCircle2, ArrowLeft, FileSpreadsheet, Trash2, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomerOption } from "@/modules/customers/domain/customer-selection";
import type { ImportMapping, ImportPreview, ImportSummary, RowDecision, SourceWorkbook } from "@/modules/imports/domain/import-types";
import { formatArs } from "@/lib/format-money";
import { previewImportAction, confirmImportAction } from "./actions";

type UploadResult = { id: string; fileName: string; workbook: SourceWorkbook; mapping: ImportMapping };
const columnLabel = (number: number): string => number > 26 ? "A" + String.fromCharCode(64 + number - 26) : String.fromCharCode(64 + number);

function Summary({ summary }: { summary: ImportSummary }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
    ["Ventas a importar", `${summary.sales} · ${formatArs(summary.total)}`],
    ["Unidades", new Intl.NumberFormat("es-AR").format(Number(summary.units))],
    ["Muestras (fuera de ventas)", `${summary.samples} · ${formatArs(summary.sampleTotal)}`],
    ["Excluidas / ya importadas", `${summary.excluded} / ${summary.duplicates}`],
  ].map(([label, value]) => <div key={label} className="rounded-lg border bg-white p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-base font-semibold tabular-nums">{value}</p></div>)}</div>;
}

export function ImportWizard({ customers, onStateChange, onConfirmed }: { customers: CustomerOption[]; onStateChange?: (state: { pending: boolean; hasDraft: boolean }) => void; onConfirmed?: () => void }) {
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [mapping, setMapping] = useState<ImportMapping | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [decisions, setDecisions] = useState<RowDecision[]>([]);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => { onStateChange?.({ pending, hasDraft: Boolean(upload && !result) }); }, [pending, upload, result, onStateChange]);

  async function selectFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    try {
      const response = await fetch("/api/imports/upload", { method: "POST", body: new FormData(event.currentTarget) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUpload(data); setMapping(data.mapping); setPreview(null); setDecisions([]); setResult(null); setConfirmed(false);
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos cargar el archivo."); }
    finally { setPending(false); }
  }
  async function review() {
    if (!upload || !mapping) return;
    setError(""); setPending(true);
    try {
      const response = await previewImportAction(upload.id, { mapping, decisions });
      if (!response.preview) throw new Error(response.error);
      setPreview(response.preview); setDecisions(response.preview.operations.map((op) => ({ key: op.key, kind: op.kind, customerId: op.customerId, amount: op.amountOverride }))); setDirty(false); setConfirmed(false); setPage(0);
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos revisar el archivo."); }
    finally { setPending(false); }
  }
  async function confirm() {
    if (!upload || !preview || dirty || !confirmed) return;
    setPending(true); setError("");
    try {
      const response = await confirmImportAction(upload.id, preview.hash);
      if (!response.result) throw new Error(response.error);
      setResult(response.result);
      onConfirmed?.();
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos confirmar. Podés reintentar este lote."); }
    finally { setPending(false); }
  }
  function decide(key: string, patch: Partial<RowDecision>) { setDecisions((current) => current.map((decision) => decision.key === key ? { ...decision, ...patch } : decision)); setDirty(true); setConfirmed(false); }
  function changeMapping(patch: Partial<ImportMapping>) { if (mapping) setMapping({ ...mapping, ...patch }); setPreview(null); setDecisions([]); setConfirmed(false); }

  if (result) return <section className="panel p-6"><CheckCircle2 className="mb-4 text-[var(--olive)]" size={32} aria-hidden="true" /><h2 className="text-xl font-semibold">Importación confirmada</h2><p className="mt-2 mb-6 text-sm text-muted-foreground">{upload?.fileName} · Los importes y las unidades coinciden con lo guardado.</p><Summary summary={result} /><p className="mt-4 text-sm text-muted-foreground">Las muestras y exclusiones se conservaron con su procedencia. Los nombres sin cliente vinculado no suman como compradores.</p><div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link href="/ventas">Ver ventas</Link></Button><Button asChild variant="outline"><Link href="/dashboard">Ver dashboard</Link></Button><Button variant="outline" onClick={() => { setUpload(null); setMapping(null); setResult(null); setPreview(null); }}>Importar otro archivo</Button></div></section>;
  if (!upload || !mapping) return <section className="panel p-6 sm:p-8"><div className="mb-6 flex items-center gap-3"><FileSpreadsheet className="text-primary" aria-hidden="true" /><div><h2 className="text-lg font-semibold">1. Elegí tu archivo</h2><p className="mt-1 text-sm text-muted-foreground">En Google Sheets: Archivo → Descargar → Microsoft Excel (.xlsx).</p></div></div><a href="/ejemplo-importacion.csv" download="ejemplo-importacion.csv" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"><Download size={16} aria-hidden="true" />Descargar archivo de ejemplo (CSV)</a><form onSubmit={selectFile} className="space-y-5"><label className="block rounded-lg border border-dashed border-input bg-muted/30 p-6"><span className="mb-3 block text-sm font-medium">Archivo de ventas</span><input type="file" name="file" accept=".xlsx,.csv" required className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-white file:px-3 file:py-2" /><span className="mt-3 block text-xs leading-5 text-muted-foreground">XLSX o CSV · Hasta 2 MB. Excel conserva los colores de muestras; CSV requiere revisar la clasificación manualmente.</span></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={pending} type="submit"><Upload size={16} aria-hidden="true" />{pending ? "Leyendo archivo…" : "Cargar archivo"}</Button></form></section>;

  const selectedSheet = upload.workbook.sheets.find((sheet) => sheet.name === mapping.sheet)!;
  const maxColumns = Math.max(1, ...selectedSheet.rows.map((row) => row.cells.length));
  const column = (key: keyof Pick<ImportMapping, "date" | "name" | "total" | "notes" | "channel" | "type" | "reference" | "product" | "quantity" | "unitPrice">, label: string) => <label className="space-y-2 text-sm" key={key}><span>{label}</span><select className="field-select block w-full" value={mapping[key]} onChange={(event) => changeMapping({ [key]: Number(event.target.value) })}><option value={0}>Sin columna</option>{Array.from({ length: maxColumns }, (_, i) => <option key={i} value={i + 1}>{columnLabel(i + 1)} · {String(selectedSheet.rows.find((row) => row.number === mapping.firstRow - 1)?.cells[i]?.value ?? "").slice(0, 40)}</option>)}</select></label>;
  return <div className="space-y-5">
    <section className="panel p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">2. Revisá la hoja y las columnas</h2><p className="mt-1 text-sm text-muted-foreground">{upload.fileName} · Todavía no se guardaron ventas.</p></div><Button variant="outline" disabled={pending} onClick={() => { setUpload(null); setMapping(null); }}><ArrowLeft size={16} />Cambiar archivo</Button></div>
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-2 text-sm">Hoja<select className="field-select block w-full" value={mapping.sheet} onChange={(event) => changeMapping({ sheet: event.target.value, lastRow: upload.workbook.sheets.find((sheet) => sheet.name === event.target.value)?.rows.at(-1)?.number ?? 1 })}>{upload.workbook.sheets.map((sheet) => <option key={sheet.name}>{sheet.name}</option>)}</select></label>
        <label className="space-y-2 text-sm">Formato<select className="field-select block w-full" value={mapping.mode} onChange={(event) => changeMapping({ mode: event.target.value as ImportMapping["mode"] })}><option value="blackfruit">BlackFruit · 6 productos por fila</option><option value="amount">Una venta por importe por fila</option><option value="lines">Varias líneas por referencia</option></select></label>
        <label className="space-y-2 text-sm">Separador decimal<select className="field-select block w-full" value={mapping.decimal} onChange={(event) => changeMapping({ decimal: event.target.value as "," | "." })}><option value=".">Punto · 3200.50</option><option value=",">Coma · 3200,50</option></select></label>
        <label className="space-y-2 text-sm">Primera fila de datos<Input type="number" min={1} max={1000} value={mapping.firstRow} onChange={(event) => changeMapping({ firstRow: Number(event.target.value) })} /></label>
        <label className="space-y-2 text-sm">Última fila de datos<Input type="number" min={1} max={1000} value={mapping.lastRow} onChange={(event) => changeMapping({ lastRow: Number(event.target.value) })} /></label>
        <label className="space-y-2 text-sm">Nombre de la fuente<Input value={mapping.source} maxLength={120} onChange={(event) => changeMapping({ source: event.target.value })} /></label>
        {column("date", "Fecha · DD/MM/AAAA o AAAA-MM-DD")}{column("name", "Nombre de origen (opcional)")}{column("total", mapping.mode === "lines" ? "Subtotal de cada línea (opcional)" : "Total de la operación")}{column("channel", "Canal (opcional)")}{column("notes", "Notas (opcional)")}{column("type", "Tipo: venta / muestra (opcional)")}{column("reference", mapping.mode === "lines" ? "Referencia para agrupar (obligatoria)" : "Referencia externa (opcional)")}
        {mapping.mode === "lines" && <>{column("product", "Producto")}{column("quantity", "Cantidad")}{column("unitPrice", "Precio unitario aplicado")}</>}
      </fieldset>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Mantené el mismo nombre de fuente para futuras cargas de esta planilla: permite detectar filas ya importadas. Los subtotales deben quedar fuera del rango de operaciones.</p>
      {mapping.mode === "blackfruit" && <details className="mt-5 rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">Revisar los seis productos y precios aplicados</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">{mapping.products.map((product, index) => <label key={index} className="space-y-2 text-sm"><span>{columnLabel(product.column)} · {product.name} · {product.variant}</span><Input aria-label={`Precio ${product.name} ${product.variant}`} value={product.price} onChange={(event) => changeMapping({ products: mapping.products.map((p, i) => i === index ? { ...p, price: event.target.value } : p) })} /></label>)}</div></details>}
      <Button className="mt-5" disabled={pending} onClick={review}>{pending ? "Revisando…" : preview ? "Actualizar revisión" : "Revisar archivo"}</Button>
    </section>
    {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      {preview && <section className="space-y-5" aria-label="Revisión de importación"><div><h2 className="text-xl font-semibold">3. Revisá y confirmá</h2><p className="mt-2 text-sm text-muted-foreground">{mapping.sheet} · {preview.summary.rows} filas. Elegí clientes, corregí montos y clasificá las muestras. Borrar una fila la excluye y conserva su origen; en grupos se excluyen todas sus líneas.</p></div><Summary summary={preview.summary} />
      {dirty && <p role="status" className="rounded-lg bg-accent p-4 text-sm">Hay cambios sin revisar. Pulsá «Actualizar revisión» para recalcular los totales.</p>}
      {preview.summary.errors > 0 && <p role="alert" className="text-sm text-destructive">Hay {preview.summary.errors} errores en ventas seleccionadas. Corregí el archivo o excluí esas operaciones y actualizá la revisión.</p>}
      <ul className="space-y-3">{preview.operations.slice(page * 40, (page + 1) * 40).map((op) => {
        const decision = decisions.find((item) => item.key === op.key)!;
        return <li key={op.key} className="panel p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{mapping.sheet} · Fila{op.rows.length > 1 ? "s" : ""} {op.rows.map((row) => row.number).join(", ")}</p><h3 className="mt-1 font-medium">{op.name || "Sin nombre de origen"}</h3><p className="mt-1 text-xs text-muted-foreground">{op.date || "Fecha a revisar"} · {op.lines.length} líneas {op.marker && `· ${op.marker}`}</p></div><strong className="tabular-nums">{formatArs(op.total)}</strong></div>
          {op.duplicate ? <p className="mt-3 text-sm text-[var(--olive)]">Ya importada · No se volverá a crear.</p> : <div className="mt-4 space-y-3"><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs text-muted-foreground">Tratamiento<select aria-label={`Tratamiento fila ${op.rows[0].number}`} className="field-select block w-full" value={decision.kind} disabled={pending} onChange={(event) => { const kind = event.target.value as RowDecision["kind"]; decide(op.key, { kind, ...(kind === "sale" ? {} : { amount: "", customerId: "" }) }); }}><option value="sale">Importar como venta</option><option value="sample">Conservar como muestra</option><option value="excluded">Excluir expresamente</option></select></label><label className="space-y-1 text-xs text-muted-foreground">Cliente<select aria-label={`Cliente fila ${op.rows[0].number}`} className="field-select block w-full" value={decision.customerId} disabled={pending || decision.kind !== "sale"} onChange={(event) => decide(op.key, { customerId: event.target.value })}><option value="">Conservar nombre sin vincular</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone || customer.email || customer.id.slice(0, 8)}</option>)}</select></label></div><div className="flex flex-wrap items-end gap-3"><label className="max-w-48 space-y-1 text-xs text-muted-foreground">Monto corregido (ARS)<Input aria-label={`Monto corregido fila ${op.rows[0].number}`} inputMode="decimal" placeholder="Ej.: 1000.00" value={decision.amount ?? ""} disabled={pending || decision.kind !== "sale"} onChange={(event) => decide(op.key, { amount: event.target.value })} /></label><Button type="button" variant="outline" disabled={pending} onClick={() => decide(op.key, decision.kind === "excluded" ? { kind: "sale" } : { kind: "excluded", amount: "", customerId: "" })}>{decision.kind === "excluded" ? <><RotateCcw size={15} aria-hidden="true" />Recuperar fila</> : <><Trash2 size={15} aria-hidden="true" />Borrar fila{op.rows.length > 1 ? "s del grupo" : ""}</>}</Button></div>{decision.kind === "sale" && <p className="text-xs text-muted-foreground">Dejalo vacío para usar el monto del archivo. Si lo corregís, esta operación se guardará por importe; sus productos originales quedarán en la procedencia. Usá punto para centavos.</p>}</div>}
          {!!op.errors.length && !op.duplicate && <ul className="mt-3 space-y-1 text-xs text-destructive">{op.errors.map((issue, i) => <li key={i}>Fila {issue.row} · {issue.field}: {issue.message}</li>)}</ul>}
          {op.lines.length > 0 && <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer py-1">Ver productos y precios históricos</summary><ul className="mt-2 space-y-2">{op.lines.map((line, index) => <li key={index}>{line.productName} {line.variant} · {line.quantity} × {formatArs(line.unitPrice)} = {formatArs(line.subtotal)}</li>)}</ul></details>}
        </li>;
      })}</ul>
      {preview.operations.length > 40 && <div className="flex items-center justify-between"><Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button><span className="text-sm">Página {page + 1} de {Math.ceil(preview.operations.length / 40)}</span><Button variant="outline" disabled={(page + 1) * 40 >= preview.operations.length} onClick={() => setPage(page + 1)}>Siguiente</Button></div>}
      <div className="panel p-5"><label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={confirmed} disabled={pending || dirty || preview.summary.errors > 0} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-5 shrink-0 accent-primary" />Revisé ventas, muestras, exclusiones y clientes. Confirmo los importes seleccionados.</label><div className="mt-5 flex flex-wrap gap-3">{dirty && <Button variant="outline" disabled={pending} onClick={review}>Actualizar revisión</Button>}<Button disabled={pending || dirty || !confirmed || preview.summary.errors > 0} onClick={confirm}>{pending ? "Procesando…" : `Confirmar importación (${preview.summary.sales} ventas)`}</Button></div></div>
    </section>}
  </div>;
}
