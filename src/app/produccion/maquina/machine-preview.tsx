"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MachineView } from "@/modules/production/infrastructure/prisma-machines";
import { MachineVisualBoundary } from "../machine-visual-boundary";

const MachineCanvas = dynamic(() => import("../machine-canvas").then((module) => module.MachineCanvas), { ssr: false, loading: () => <p role="status" className="p-6 text-sm text-muted-foreground">Preparando el deshidratador 3D…</p> });

export function MachinePreview({ machine }: { machine: MachineView }) {
  const [selected, setSelected] = useState<number | null>(1);
  const [tab, setTab] = useState<"tray" | "machine">("tray");
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!window.matchMedia("(min-width: 768px)").matches) { setWebgl(false); return; }
      try { const canvas = document.createElement("canvas"); setWebgl(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"))); }
      catch { setWebgl(false); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const trays = Array.from({ length: machine.trayCount }, (_, index) => ({ position: index + 1, productId: null, label: "Vacía" }));
  function show3d() { try { const canvas = document.createElement("canvas"); setWebgl(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"))); } catch { setWebgl(false); } }
  const panel = <div>
    <div role="group" aria-label="Opciones del panel" className="flex border-b border-border"><button type="button" aria-pressed={tab === "tray"} onClick={() => setTab("tray")} className={`flex-1 border-b-2 pb-3 text-xs ${tab === "tray" ? "border-success" : "border-transparent text-muted-foreground"}`}>Bandeja</button><button type="button" aria-pressed={tab === "machine"} onClick={() => setTab("machine")} className={`flex-1 border-b-2 pb-3 text-xs ${tab === "machine" ? "border-success" : "border-transparent text-muted-foreground"}`}>Equipo</button></div>
    {tab === "tray" ? <div className="pt-5">
      <p className="text-[11px] tracking-wide text-muted-foreground">{selected === null ? "VISTA GENERAL" : "BANDEJA SELECCIONADA"}</p>
      <h3 className="mt-1 font-serif text-2xl">{selected === null ? "Todas las bandejas" : `Bandeja ${String(selected).padStart(2, "0")}`}</h3>
      <p className="mt-3 text-sm text-muted-foreground">{selected === null ? "Elegí una bandeja para verla en detalle." : "Vacía. Registrá un ciclo para cargar productos y resultados."}</p>
      {selected !== null && <div className="mt-5 flex justify-between gap-2"><button type="button" disabled={selected <= 1} onClick={() => setSelected(selected - 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Anterior</button><button type="button" disabled={selected >= trays.length} onClick={() => setSelected(selected + 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Siguiente</button></div>}
      <p className="mb-2 mt-5 text-xs text-muted-foreground">Todas las bandejas</p>
      <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Bandejas de la máquina">{trays.map((tray) => <button key={tray.position} type="button" aria-label={`Seleccionar bandeja ${tray.position}`} aria-pressed={selected === tray.position} onClick={() => setSelected(selected === tray.position ? null : tray.position)} className={`min-h-9 rounded-lg border px-1 text-xs ${selected === tray.position ? "bg-success text-surface" : "border-dashed text-muted-foreground hover:bg-muted"}`}>{String(tray.position).padStart(2, "0")}</button>)}</div>
    </div> : <div className="pt-5"><h3 className="font-serif text-2xl">{machine.name}</h3><p className="mt-3 text-sm text-muted-foreground">{machine.trayCount} bandejas{machine.model ? ` · ${machine.model}` : ""}</p><p className="mt-4 text-xs text-muted-foreground">Esta vista previa no contiene datos de producción.</p><Link href="/produccion/maquinas" className="mt-4 inline-block text-sm text-primary hover:underline">Gestionar máquinas</Link></div>}
  </div>;
  return <section className="panel overflow-hidden" aria-label="Vista previa de la máquina">
    {webgl ? <MachineVisualBoundary fallback={<div className="p-5"><p role="status" className="mb-4 text-sm text-muted-foreground">El 3D no pudo cargarse. Podés consultar las bandejas desde el panel.</p>{panel}</div>}><MachineCanvas onContextLost={() => setWebgl(false)} trays={trays} selectedPosition={selected} onSelect={(position) => { setSelected(position); setTab("tray"); }} title={machine.name} subtitle="VISTA PREVIA · SIN CICLO" totalKg={null} sidePanel={panel} /></MachineVisualBoundary> : <div className="p-6 text-sm text-muted-foreground">{webgl === false ? "El 3D no está disponible en este dispositivo. Podés elegir una bandeja desde la lista." : "Comprobando compatibilidad 3D…"}</div>}
    {!webgl && <div className="border-t p-5">{webgl === false && <button type="button" onClick={show3d} className="mb-4 min-h-11 rounded-lg border border-input px-4 text-sm text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Mostrar 3D</button>}{panel}</div>}
  </section>;
}
