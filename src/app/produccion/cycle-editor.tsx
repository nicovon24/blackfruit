"use client";

import { useActionState, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductDialog } from "@/components/shared/product-dialog";
import { BusinessDateField } from "@/components/shared/business-date-field";
import { useUnsavedChangesGuard } from "@/components/shared/use-unsaved-changes-guard";
import { useFormErrorFocus } from "@/components/shared/use-form-error-focus";
import { kgTotal, type ProductChoice } from "@/modules/production/domain/cycle";
import { reconfigureTrays } from "@/modules/production/domain/reconfigure-trays";
import type { CycleView } from "@/modules/production/infrastructure/prisma-cycles";
import type { MachineView } from "@/modules/production/infrastructure/prisma-machines";
import { saveCycleAction, type CycleActionState } from "./cycle-actions";
import { MachineVisualBoundary } from "./machine-visual-boundary";

const MachineCanvas = dynamic(() => import("./machine-canvas").then((module) => module.MachineCanvas), { ssr: false, loading: () => <p role="status" className="p-6 text-sm text-muted-foreground">Preparando el deshidratador 3D…</p> });
type TrayState = { position: number; productId: string | null; resultKey: string | null };
type EditorProps = { machines: MachineView[]; products: ProductChoice[]; today: string; requestKey: string; initial?: CycleView; initialMachineId?: string; dashboardHref?: string };

function safeTotal(values: Array<string | null>) {
  try { return kgTotal(values); } catch { return "—"; }
}

function productColor(name: string) {
  const label = name.toLocaleLowerCase("es");
  if (label.includes("naranja")) return "#bd7335";
  if (label.includes("pomelo")) return "#b55861";
  if (label.includes("manzana")) return "#a79c5f";
  if (label.includes("banana")) return "#b99e4e";
  return "#748a5a";
}

export function CycleEditor({ machines, products, today, requestKey, initial, initialMachineId, dashboardHref = "/produccion" }: EditorProps) {
  const router = useRouter();
  const defaultMachine = initial?.machineId ?? initialMachineId ?? machines[0]?.id ?? "";
  const defaultTrays = initial?.trays.map(({ position, productId, resultKey }) => ({ position, productId, resultKey })) ?? Array.from({ length: machines.find((machine) => machine.id === defaultMachine)?.trayCount ?? 0 }, (_, index) => ({ position: index + 1, productId: null, resultKey: null }));
  const defaultWeights = Object.fromEntries(initial?.results.map((result) => [result.key, result.kg ?? ""]) ?? []);
  const [machineId, setMachineId] = useState(defaultMachine);
  const [code, setCode] = useState(initial?.code ?? "");
  const [finishedOn, setFinishedOn] = useState(initial?.finishedOn ?? today);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [trays, setTrays] = useState<TrayState[]>(defaultTrays);
  const [weights, setWeights] = useState<Record<string, string>>(defaultWeights);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(1);
  const [checked, setChecked] = useState<number[]>([]);
  const [show3d, setShow3d] = useState(false);
  const [webglMessage, setWebglMessage] = useState("");
  const [groupMessage, setGroupMessage] = useState("");
  const [editing, setEditing] = useState(initial?.status !== "finished");
  const [undo, setUndo] = useState<{ trays: TrayState[]; weights: Record<string, string> } | null>(null);
  const [panelTab, setPanelTab] = useState<"tray" | "machine">("tray");
  const [baseline] = useState(() => JSON.stringify({ machineId: defaultMachine, code: initial?.code ?? "", finishedOn: initial?.finishedOn ?? today, notes: initial?.notes ?? "", trays: defaultTrays, weights: defaultWeights }));
  const dirty = JSON.stringify({ machineId, code, finishedOn, notes, trays, weights }) !== baseline;
  const [state, action, pending] = useActionState(async (previous: CycleActionState, formData: FormData) => {
    const cycle = JSON.parse(String(formData.get("cycle")));
    cycle.status = formData.get("targetStatus");
    formData.set("cycle", JSON.stringify(cycle));
    const result = await saveCycleAction(previous, formData);
    if (result.savedId) { router.push(`/produccion/${result.savedId}?${new URLSearchParams({ back: dashboardHref })}`); router.refresh(); }
    return result;
  }, {});
  const formRef = useFormErrorFocus(state);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { if (!window.matchMedia("(min-width: 768px)").matches) return; const canvas = document.createElement("canvas"); if (canvas.getContext("webgl2") || canvas.getContext("webgl")) setShow3d(true); else setWebglMessage("Este dispositivo no admite 3D. Usá la vista de bandejas."); }
      catch { setWebglMessage("No se pudo iniciar el 3D. Usá la tabla de bandejas."); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useUnsavedChangesGuard(dirty, "Tenés cambios sin guardar. ¿Querés salir y descartarlos?");

  const machine = initial ? { id: initial.machineId, name: initial.machineName, trayCount: initial.trayCount } : machines.find((item) => item.id === machineId);
  const productById = new Map(products.map((product) => [product.id, product]));
  const members = new Map<string, number[]>();
  for (const tray of trays) if (tray.resultKey) members.set(tray.resultKey, [...(members.get(tray.resultKey) ?? []), tray.position]);
  const selectedTray = trays.find((tray) => tray.position === selectedPosition);
  const selectedProduct = selectedTray?.productId ? productById.get(selectedTray.productId) : null;
  const selectedMembers = selectedTray?.resultKey ? members.get(selectedTray.resultKey) ?? [] : [];
  const totalKg = safeTotal([...members.keys()].map((key) => weights[key]?.trim() || null));
  const pendingWeights = [...members.keys()].filter((key) => !weights[key]?.trim()).length;
  const summaryValues = new Map<string, string[]>();
  for (const [key, positions] of members) {
    const tray = trays.find((item) => item.position === positions[0]);
    const product = tray?.productId ? productById.get(tray.productId) : null;
    if (!product) continue;
    const label = `${product.name}${product.variant ? ` · ${product.variant}` : ""}`;
    summaryValues.set(label, [...(summaryValues.get(label) ?? []), weights[key]?.trim() || ""]);
  }
  const summary = [...summaryValues].map(([label, values]) => ({ label, kg: safeTotal(values.map((value) => value || null)), color: productColor(label) }));

  function changeMachine(id: string) {
    const next = machines.find((item) => item.id === id);
    if (!next || id === machineId) return;
    if (trays.some((tray) => tray.productId) && !window.confirm("Cambiar de máquina descarta las cargas y pesajes de este borrador. ¿Continuar?")) return;
    setMachineId(id);
    setTrays(Array.from({ length: next.trayCount }, (_, index) => ({ position: index + 1, productId: null, resultKey: null })));
    setWeights({}); setSelectedPosition(1); setChecked([]); setGroupMessage("");
  }
  function changeProduct(position: number, productId: string) {
    applyChange({ kind: "product", position, productId: productId || null });
  }
  function applyChange(change: Parameters<typeof reconfigureTrays>[2]) {
    const result = reconfigureTrays(trays, weights, change, () => crypto.randomUUID());
    if (!result.changed) return;
    if (result.affected.length) {
      const description = result.affected.map(({ positions, kg }) => `bandeja${positions.length > 1 ? "s" : ""} ${positions.join(", ")}: ${kg} kg`).join("; ");
      if (!window.confirm(`Este cambio dejará pendientes los siguientes pesajes: ${description}. ¿Continuar?`)) return;
    }
    setUndo({ trays, weights }); setTrays(result.trays); setWeights(result.weights);
    if (change.kind === "product") setSelectedPosition(change.position);
    else if (change.positions.length) { setSelectedPosition(change.positions[0]); setChecked([]); }
    setPanelTab("tray");
    setGroupMessage(result.affected.length ? "Revisá los pesajes afectados antes de finalizar." : "Bandejas actualizadas.");
  }
  function groupSelected() {
    const selected = trays.filter((tray) => checked.includes(tray.position));
    if (selected.length < 2 || !selected[0].productId || selected.some((tray) => tray.productId !== selected[0].productId)) { setGroupMessage("Seleccioná al menos dos bandejas del mismo producto y variante."); return; }
    applyChange({ kind: "group", positions: checked });
  }
  function separateSelected() {
    if (!checked.length) { setGroupMessage("Seleccioná las bandejas que querés pesar individualmente."); return; }
    applyChange({ kind: "separate", positions: checked });
  }
  function changeWeight(key: string, value: string) { setWeights((old) => ({ ...old, [key]: value.replace(",", ".") })); }
  function showMachine() {
    try { const canvas = document.createElement("canvas"); if (canvas.getContext("webgl2") || canvas.getContext("webgl")) { setShow3d(true); setWebglMessage(""); } else setWebglMessage("Este dispositivo no admite 3D. Usá la tabla de bandejas."); }
    catch { setWebglMessage("No se pudo iniciar el 3D. Usá la tabla de bandejas."); }
  }

  const payload = JSON.stringify({ code, machineId, finishedOn, status: initial?.status ?? "draft", notes, trays, results: [...members.keys()].map((key) => ({ key, kg: weights[key]?.trim() || null })) });
  const productOptions = (currentId: string | null) => <><option value="">Vacía</option>{products.filter((item) => item.active || item.id === currentId).map((item) => <option key={item.id} value={item.id}>{item.name}{item.variant ? ` · ${item.variant}` : ""}</option>)}</>;
  const groupControls = <div className="border-b bg-muted/20 p-4 sm:p-5" aria-label="Selección de bandejas para pesaje"><p className="mb-3 text-sm font-medium">Seleccioná bandejas para pesarlas juntas o por separado</p><div className="grid grid-cols-4 gap-2 sm:grid-cols-8 xl:grid-cols-16">{trays.map((tray) => <label key={tray.position} className={`flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-lg border px-2 text-xs ${checked.includes(tray.position) ? "border-primary bg-accent" : "bg-white"}`}><input type="checkbox" aria-label={`Incluir bandeja ${tray.position}`} disabled={!editing || !tray.productId} checked={checked.includes(tray.position)} onChange={(event) => setChecked(event.target.checked ? [...checked, tray.position] : checked.filter((number) => number !== tray.position))} />{tray.position}</label>)}</div><div className="mt-3 flex flex-wrap items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={!editing} onClick={groupSelected}>Agrupar selección</Button><Button type="button" variant="outline" size="sm" disabled={!editing} onClick={separateSelected}>Pesar por separado</Button>{undo && editing && <Button type="button" variant="ghost" size="sm" onClick={() => { setTrays(undo.trays); setWeights(undo.weights); setUndo(null); setGroupMessage("Último cambio de bandejas deshecho."); }}>Deshacer cambio</Button>}<span className="text-xs text-muted-foreground">{checked.length} seleccionadas</span></div>{groupMessage && <p role="status" className="mt-3 text-sm text-muted-foreground">{groupMessage}</p>}</div>;
  const panel = <div>
    <div role="group" aria-label="Opciones del panel" className="flex border-b border-[#d9ddcf]"><button type="button" aria-pressed={panelTab === "tray"} onClick={() => setPanelTab("tray")} className={`flex-1 border-b-2 pb-3 text-xs ${panelTab === "tray" ? "border-[#48512c] text-[#273128]" : "border-transparent text-[#646c60]"}`}>Bandeja</button><button type="button" aria-pressed={panelTab === "machine"} onClick={() => setPanelTab("machine")} className={`flex-1 border-b-2 pb-3 text-xs ${panelTab === "machine" ? "border-[#48512c] text-[#273128]" : "border-transparent text-[#646c60]"}`}>Equipo</button></div>
    {panelTab === "tray" ? selectedPosition === null ? <section id="cycle-tray-panel" className="pt-5">
      <p className="text-[11px] tracking-wide text-[#646c60]">VISTA GENERAL</p>
      <h3 className="mt-1 font-serif text-2xl">Todas las bandejas</h3>
      <p className="mt-3 text-sm text-muted-foreground">Elegí una bandeja para consultar o editar su contenido.</p>
      <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6" role="group" aria-label="Bandejas del ciclo">{trays.map((tray) => <button key={tray.position} type="button" aria-label={`Seleccionar bandeja ${tray.position}`} aria-pressed={false} onClick={() => setSelectedPosition(tray.position)} className={`min-h-11 rounded border px-1 text-sm ${tray.productId ? "border-[#d9ddcf] bg-[#eef1e6] text-[#48512c]" : "border-dashed border-[#d9ddcf] text-[#646c60]"}`}>{String(tray.position).padStart(2, "0")}</button>)}</div>
    </section> : <section id="cycle-tray-panel" className="pt-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] tracking-wide text-[#646c60]">BANDEJA SELECCIONADA</p><h3 className="mt-1 font-serif text-2xl">Bandeja #{selectedPosition}</h3></div><span className="rounded bg-[#eef1e6] px-2 py-1 text-xs text-[#48512c]">{selectedProduct ? "Cargada" : "Vacía"}</span></div>
      {selectedTray && <div className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="selected-product">Qué hay en esta bandeja</Label><select id="selected-product" disabled={!editing} value={selectedTray.productId ?? ""} onChange={(event) => changeProduct(selectedTray.position, event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{productOptions(selectedTray.productId)}</select></div>{selectedTray.resultKey && <div className="space-y-2"><Label htmlFor="selected-kg">{selectedMembers.length > 1 ? `Peso conjunto · bandejas ${selectedMembers.join(", ")}` : "Cuánto produjo esta bandeja"}</Label><div className="flex items-center rounded-lg border border-input bg-background pr-3"><Input id="selected-kg" disabled={!editing} type="text" inputMode="decimal" value={weights[selectedTray.resultKey] ?? ""} onChange={(event) => changeWeight(selectedTray.resultKey!, event.target.value)} placeholder="Pendiente" className="border-0" /><span className="text-xs text-muted-foreground">kg</span></div><p className="text-xs text-muted-foreground">{selectedMembers.length > 1 ? "El peso pertenece al grupo; no se reparte entre bandejas." : "Un cero ingresado es un resultado confirmado."}</p></div>}</div>}
      <p className="mt-5 text-xs text-muted-foreground">{!initial ? dirty ? "Nuevo ciclo con cambios sin guardar." : "Nuevo ciclo todavía sin guardar." : dirty ? "Cambios sin guardar." : "Datos guardados."}</p><div className="mt-4 flex justify-between gap-2 border-t border-[#d9ddcf] pt-4"><Button type="button" variant="outline" size="sm" disabled={selectedPosition <= 1} onClick={() => setSelectedPosition(selectedPosition - 1)}>Anterior</Button><Button type="button" variant="outline" size="sm" disabled={selectedPosition >= trays.length} onClick={() => setSelectedPosition(selectedPosition + 1)}>Siguiente</Button></div>{show3d && <div className="mt-5"><p className="mb-2 text-xs text-muted-foreground">Todas las bandejas · {trays.filter((tray) => tray.productId).length} cargadas</p><div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="group" aria-label="Bandejas del ciclo">{trays.map((tray) => <button key={tray.position} type="button" aria-label={`Seleccionar bandeja ${tray.position}`} aria-pressed={selectedPosition === tray.position} onClick={() => setSelectedPosition(selectedPosition === tray.position ? null : tray.position)} className={`min-h-11 rounded border px-1 text-sm ${selectedPosition === tray.position ? "border-[#252e24] bg-[#252e24] text-white" : tray.productId ? "border-[#d9ddcf] bg-[#eef1e6] text-[#48512c]" : "border-dashed border-[#d9ddcf] text-[#646c60]"}`}>{String(tray.position).padStart(2, "0")}</button>)}</div></div>}
    </section> : <section id="cycle-machine-panel" className="pt-5"><h3 className="font-serif text-xl">Tu equipo</h3><p className="mt-2 text-sm font-medium">{machine?.name}</p><p className="mt-1 text-sm text-muted-foreground">{machine?.trayCount} bandejas</p>{initial ? <p className="mt-4 text-xs text-muted-foreground">Este ciclo conserva el nombre y la cantidad de bandejas de la máquina con la que se registró.</p> : <div className="mt-5 space-y-2"><Label htmlFor="panel-machine">Cambiar máquina</Label><select id="panel-machine" disabled={!editing} value={machineId} onChange={(event) => changeMachine(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{machines.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.trayCount} bandejas</option>)}</select><p className="text-xs text-muted-foreground">Si ya cargaste bandejas, se te pedirá confirmar el cambio.</p></div>}<p className="mt-5 text-xs text-muted-foreground">Usá los controles del visor para cambiar cámara, mostrar el interior o separar bandejas visualmente.</p><Link href="/produccion/maquinas" className="mt-4 inline-block text-sm text-primary hover:underline">Gestionar máquinas</Link></section>}
  </div>;

  return <form ref={formRef} action={action} className="space-y-5" aria-busy={pending}>
    <input type="hidden" name="cycle" value={payload} /><input type="hidden" name="requestKey" value={requestKey} />{initial && <><input type="hidden" name="id" value={initial.id} /><input type="hidden" name="version" value={initial.version} /></>}
    <section className="panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">{machine?.name ?? "Deshidratador"}</h2><p className="mt-1 text-sm text-muted-foreground">{machine?.trayCount ?? 0} bandejas · {code || "Identificación pendiente"} · {finishedOn || "Fecha pendiente"}</p></div>{show3d ? <Button type="button" variant="outline" onClick={() => setShow3d(false)}>Ver bandejas</Button> : <Button type="button" variant="outline" onClick={showMachine}>Ver máquina 3D</Button>}</div>
      {webglMessage && <p role="status" className="px-5 pt-4 text-sm text-muted-foreground">{webglMessage}</p>}
      {state.message && (state.field === "trays" || state.field === "results" || state.field === "status") && <p role="alert" className="px-5 pt-4 text-sm text-destructive">{state.message}</p>}
      {show3d && editing && <>{groupControls}<div className="border-b px-5 py-3"><ProductDialog /></div></>}
      {show3d ? <MachineVisualBoundary key={machineId} fallback={<div className="p-5"><p role="status" className="mb-4 text-sm text-muted-foreground">El 3D no pudo cargarse. Completá el ciclo desde la vista de bandejas.</p>{panel}</div>}><MachineCanvas onContextLost={() => { setShow3d(false); setWebglMessage("El 3D se interrumpió. Podés seguir desde la vista de bandejas."); }} trays={trays.map((tray) => ({ position: tray.position, productId: tray.productId, label: tray.productId ? `${productById.get(tray.productId)?.name ?? "Producto"}${productById.get(tray.productId)?.variant ? ` · ${productById.get(tray.productId)?.variant}` : ""}` : "Vacía" }))} selectedPosition={selectedPosition} onSelect={(position) => { setSelectedPosition(position); setPanelTab("tray"); }} title={code || machine?.name || "Deshidratador"} subtitle={initial?.status === "finished" ? editing ? "CORRECCIÓN EN CURSO" : "CICLO FINALIZADO" : "REGISTRO DE PASADA TERMINADA"} totalKg={totalKg} pendingWeights={pendingWeights} summary={summary} sidePanel={panel} /></MachineVisualBoundary> : <div className="p-5 lg:hidden">{panel}</div>}
      {!show3d && <div className="p-5">{editing && <>{groupControls}<div className="mb-3 mt-4"><ProductDialog /></div></>}
        <div className="lg:hidden" aria-label="Bandejas del ciclo">
          {trays.some((tray) => tray.productId) && <div className="grid gap-2">{trays.filter((tray) => tray.productId).map((tray) => { const product = productById.get(tray.productId!); const positions = tray.resultKey ? members.get(tray.resultKey) ?? [] : []; return <button key={tray.position} type="button" aria-pressed={selectedPosition === tray.position} onClick={() => { setSelectedPosition(tray.position); setPanelTab("tray"); document.getElementById("selected-product")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className={`min-h-14 rounded-lg border px-4 py-3 text-left ${selectedPosition === tray.position ? "border-primary bg-accent" : "bg-white"}`}><span className="block text-sm font-semibold">Bandeja {tray.position} · {product?.name}{product?.variant ? ` · ${product.variant}` : ""}</span><span className="mt-1 block text-xs text-muted-foreground">{positions.length > 1 ? `Grupo ${positions.join(", ")}` : "Individual"} · {weights[tray.resultKey!] === "" || weights[tray.resultKey!] === undefined ? "Peso pendiente" : `${weights[tray.resultKey!]} kg`}</span></button>; })}</div>}
          {trays.some((tray) => !tray.productId) && <div className="mt-4"><p className="mb-2 text-sm font-medium">Bandejas vacías</p><div className="grid grid-cols-4 gap-2">{trays.filter((tray) => !tray.productId).map((tray) => <button key={tray.position} type="button" aria-label={`Seleccionar bandeja vacía ${tray.position}`} aria-pressed={selectedPosition === tray.position} onClick={() => { setSelectedPosition(tray.position); setPanelTab("tray"); document.getElementById("selected-product")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className={`min-h-11 rounded-lg border border-dashed text-sm ${selectedPosition === tray.position ? "border-primary bg-accent" : "bg-white"}`}>{tray.position}</button>)}</div></div>}
        </div>
        <div className="hidden max-h-[520px] overflow-auto rounded-lg border lg:block" aria-label="Tabla de bandejas"><table className="w-full min-w-[610px] text-left text-sm"><thead className="sticky top-0 bg-background"><tr className="border-b text-muted-foreground"><th className="p-3">Agrupar</th><th>Bandeja</th><th>Producto y variante</th><th>Resultado</th><th>Peso kg</th></tr></thead><tbody>{trays.map((tray) => { const product = tray.productId ? productById.get(tray.productId) : null; const positions = tray.resultKey ? members.get(tray.resultKey) ?? [] : []; const first = positions[0] === tray.position; return <tr key={tray.position} className={`border-b last:border-0 ${selectedPosition === tray.position ? "bg-accent/60" : ""}`}><td className="p-3"><input type="checkbox" aria-label={`Agrupar bandeja ${tray.position}`} disabled={!editing || !tray.productId} checked={checked.includes(tray.position)} onChange={(event) => setChecked(event.target.checked ? [...checked, tray.position] : checked.filter((number) => number !== tray.position))} /></td><td><button type="button" className="font-medium text-primary hover:underline" aria-current={selectedPosition === tray.position ? "true" : undefined} onClick={() => setSelectedPosition(selectedPosition === tray.position ? null : tray.position)}>#{tray.position}</button></td><td><select aria-label={`Producto de bandeja ${tray.position}`} disabled={!editing} value={tray.productId ?? ""} onChange={(event) => changeProduct(tray.position, event.target.value)} className="h-11 w-full max-w-56 rounded border border-input bg-background px-2">{productOptions(tray.productId)}</select></td><td className="text-xs text-muted-foreground">{!product ? "Sin carga" : positions.length > 1 ? `Grupo: ${positions.join(", ")}` : "Individual"}</td><td>{product && tray.resultKey && first ? <Input aria-label={`Kilos ${positions.length > 1 ? `del grupo ${positions.join(", ")}` : `de bandeja ${tray.position}`}`} type="text" inputMode="decimal" disabled={!editing} value={weights[tray.resultKey] ?? ""} onChange={(event) => changeWeight(tray.resultKey!, event.target.value)} className="my-1 w-28" placeholder="Pendiente" /> : product ? <span className="text-xs text-muted-foreground">Ver grupo</span> : "—"}</td></tr>; })}</tbody></table></div>
       </div>}
    </section>
    <section className="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6"><div className="space-y-2"><Label htmlFor="cycle-code">Identificación del ciclo</Label><Input id="cycle-code" disabled={!editing} value={code} onChange={(event) => setCode(event.target.value)} maxLength={64} placeholder="Ej. 2026-10-11-A" required />{state.field === "code" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div><div className="space-y-2"><Label htmlFor="cycle-machine">Máquina</Label>{initial ? <Input id="cycle-machine" value={`${initial.machineName} · ${initial.trayCount} bandejas`} readOnly /> : <select id="cycle-machine" disabled={!editing} value={machineId} onChange={(event) => changeMachine(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{machines.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.trayCount} bandejas</option>)}</select>}{state.field === "machineId" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div><div className="space-y-2"><Label htmlFor="cycle-date">Fecha real de finalización</Label><BusinessDateField id="cycle-date" disabled={!editing} value={finishedOn} onChange={setFinishedOn} invalid={state.field === "finishedOn"} />{state.field === "finishedOn" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div><div className="space-y-2"><Label htmlFor="cycle-notes">Observaciones (opcional)</Label><Input id="cycle-notes" disabled={!editing} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} />{state.field === "notes" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}</div></section>
    <section className="panel sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 border-t bg-white/95 p-3 shadow-lg backdrop-blur-sm sm:gap-3 sm:p-5"><div className="min-w-0"><p className="text-sm font-semibold sm:text-base"><span className="hidden sm:inline">Total registrado: </span>{totalKg} kg</p><p className="text-xs text-muted-foreground sm:text-sm">{pendingWeights} {pendingWeights === 1 ? "pendiente" : "pendientes"} · {!initial ? "Nuevo" : dirty ? "Sin guardar" : "Guardado"}</p></div><div className="flex flex-wrap gap-2">{state.message && !state.field && <p role="alert" className="w-full text-sm text-destructive">{state.message}</p>}{editing ? <>{initial?.status !== "finished" && <Button type="submit" variant="outline" name="targetStatus" value="draft" disabled={pending}>{pending ? "Guardando…" : "Guardar borrador"}</Button>}<Button type="submit" name="targetStatus" value="finished" disabled={pending}>{pending ? "Guardando…" : initial?.status === "finished" ? "Guardar corrección" : "Guardar ciclo finalizado"}</Button>{initial?.status === "finished" && <Button type="button" variant="ghost" onClick={() => { if (!dirty || window.confirm("¿Descartar la corrección sin guardar?")) window.location.reload(); }}>Cancelar edición</Button>}</> : <Button type="button" onClick={() => setEditing(true)}>Editar registro</Button>}</div></section>
  </form>;
}
