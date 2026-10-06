"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaleForm } from "@/app/ventas/nueva/sale-form";
import { EditSaleForm } from "@/app/ventas/[id]/edit-sale-form";
import { loadSaleEditor } from "@/app/ventas/editor-actions";
import { trashSaleAction, voidSaleAction } from "@/app/ventas/[id]/actions";
import { ConfirmSaleAction } from "./confirm-sale-action";
import { SaleStatus } from "./sale-status";
import { formatArs } from "@/lib/format-money";

export function SaleDialog({ id, children, className }: { id?: string; children?: ReactNode; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadSaleEditor>> | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const confirmationOpenRef = useRef(false);
  function confirmOpenChange(value: boolean) {
    if (value) confirmationOpenRef.current = true;
    else window.setTimeout(() => { confirmationOpenRef.current = false; }, 0);
  }
  function changeOpen(value: boolean) {
    if (!value && confirmationOpenRef.current) return;
    if (!value && bodyRef.current?.querySelector('form[aria-busy="true"]')) return;
    if (!value && dirty && !window.confirm("Hay cambios sin guardar. ¿Querés descartarlos y cerrar la venta?")) return;
    setOpen(value);
    setDirty(false);
    if (value) { setData(null); void load(); }
  }
  async function load() {
    setError("");
    try { setData(await loadSaleEditor(id)); } catch { setError("No pudimos abrir la venta. Cerrá esta ventana e intentá nuevamente."); }
  }
  function done() { setDirty(false); setOpen(false); setData(null); setNotice("Venta guardada."); router.refresh(); }
  const sale = data?.sale;
  return <>
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>{children ? <button type="button" className={className}>{children}</button> : <Button type="button"><Plus size={17} aria-hidden="true" />Nueva venta</Button>}</Dialog.Trigger>
      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-30 bg-[#1b1610]/45 backdrop-blur-[3px]" /><Dialog.Content className="fixed top-1/2 left-1/2 z-40 max-h-[92dvh] w-[calc(100%-24px)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-white px-6 py-5"><div><Dialog.Title className="text-xl font-semibold tracking-tight">{id ? "Venta registrada" : "Nueva venta"}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted-foreground">{id ? "Consultá y actualizá los detalles de la operación." : "Registrá tu venta sin salir de esta pantalla."}</Dialog.Description></div><Dialog.Close asChild><Button type="button" variant="ghost" className="size-11 shrink-0 p-0" aria-label="Cerrar ventana"><X size={20} /></Button></Dialog.Close></header>
        <div ref={bodyRef} className="break-words p-5 sm:p-6" onChangeCapture={() => setDirty(true)}>{error ? <div role="alert" className="space-y-3"><p className="text-sm text-destructive">{error}</p><Button type="button" variant="outline" onClick={() => void load()}>Reintentar</Button></div> : !data ? <p role="status" className="py-12 text-center text-muted-foreground">Cargando…</p> : !id ? <SaleForm {...data} onSaved={done} onCancel={() => changeOpen(false)} /> : sale && <>
          <dl className="mb-6 grid grid-cols-2 gap-4 border-b pb-5 text-sm"><div><dt className="text-muted-foreground">Total</dt><dd className="mt-1 text-xl font-semibold">{formatArs(sale.total)}</dd></div><div><dt className="mb-2 text-muted-foreground">Estado</dt><dd><SaleStatus status={sale.status} /></dd></div><div><dt className="text-muted-foreground">Cliente</dt><dd className="mt-1 break-words">{sale.customerName ?? "Sin cliente"}</dd></div><div><dt className="text-muted-foreground">Fecha</dt><dd className="mt-1">{sale.occurredOn.split("-").reverse().join("/")}</dd></div></dl>
          {sale.status === "confirmed" && <EditSaleForm mode={sale.mode} key={sale.version} id={sale.id} version={sale.version} occurredOn={sale.occurredOn} amount={sale.total} channel={sale.channel ?? ""} notes={sale.notes ?? ""} customerId={sale.customerId} customers={data.customers} onSaved={done} />}
          {sale.source && <p className="mb-4 text-xs text-muted-foreground">Origen: {sale.source.sheet} · Fila {sale.source.rowNumber} · {sale.source.rawName || "Sin nombre"}</p>}
          {sale.lines.length > 0 && <section className="space-y-3"><h3 className="font-medium">Productos de la venta</h3><ul className="divide-y text-sm">{sale.lines.map((line, index) => <li key={index} className="py-3"><p>{line.productName} · {line.variant}</p><p className="mt-1 text-muted-foreground">{line.quantity} × {formatArs(line.unitPrice)} = <strong className="text-foreground">{formatArs(line.subtotal)}</strong></p></li>)}</ul></section>}
          {sale.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{sale.notes}</p>}
          <div className="mt-6 flex flex-wrap gap-2 border-t pt-5">{sale.status === "confirmed" && <ConfirmSaleAction key={`void-${sale.version}`} label="Anular venta" description="La venta dejará de sumar a los indicadores y conservará su historia." action={voidSaleAction.bind(null, sale.id)} version={sale.version} onOpenChange={confirmOpenChange} onComplete={() => { void load(); router.refresh(); }} />}<ConfirmSaleAction label="Enviar a papelera" description="Podés restaurar esta venta después, conservando su estado y cliente." action={trashSaleAction.bind(null, sale.id)} version={sale.version} onOpenChange={confirmOpenChange} onComplete={() => { setOpen(false); router.refresh(); }} /></div>
        </>}</div>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
    {notice && <div role="status" className="fixed right-4 bottom-4 z-20 flex items-center gap-4 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg">{notice}<button type="button" className="flex size-11 items-center justify-center" aria-label="Cerrar aviso" onClick={() => setNotice("")}><X size={16} aria-hidden="true" /></button></div>}
  </>;
}
