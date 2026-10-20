"use client";

import { useTheme } from "next-themes";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CanvasTexture, Group, MathUtils, PerspectiveCamera, RepeatWrapping, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Focus, Maximize2, Minimize2, Minus, Plus } from "lucide-react";

export type SceneTray = { position: number; productId: string | null; label: string };
type PieceName = "door" | "leftPanel" | "rightPanel" | "roof" | "rearPanel";
type Pieces = Record<PieceName, boolean>;
type Point = [number, number, number];
const allPieces: Pieces = { door: true, leftPanel: true, rightPanel: true, roof: true, rearPanel: true };
const initialCameraPosition: Point = [4.2, 3.1, 6.2];
const panelPreferenceKey = "blackfruit:production:team-panel-visible";

function fruitColor(label: string) {
  const name = label.toLocaleLowerCase("es");
  if (name.includes("naranja")) return { rind: "#bb6d26", face: "#efa24b" };
  if (name.includes("pomelo")) return { rind: "#bb6470", face: "#e1a1a4" };
  if (name.includes("manzana")) return { rind: "#bba761", face: "#e9d8a5" };
  if (name.includes("banana")) return { rind: "#bb9c46", face: "#e8cc78" };
  return { rind: "#7c975c", face: "#afc28e" };
}

function useBrushedSteel() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#d0d4d2"; ctx.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y += 2) { ctx.fillStyle = y % 4 === 0 ? "#c3cac9" : "#e0e3e0"; ctx.fillRect(0, y, 128, 0.5); }
    }
    const result = new CanvasTexture(canvas); result.wrapS = RepeatWrapping; result.wrapT = RepeatWrapping; return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function CabinetBox({ position, args, color = "#ccd1cf", brushed, roughness = 0.34, shadow = true }: { position: Point; args: Point; color?: string; brushed?: CanvasTexture; roughness?: number; shadow?: boolean }) {
  return <mesh position={position} castShadow={shadow} receiveShadow={shadow}><boxGeometry args={args} /><meshStandardMaterial map={brushed} color={color} metalness={0.48} roughness={roughness} /></mesh>;
}

function TrayLabel({ text, y }: { text: string; y: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 72;
    const ctx = canvas.getContext("2d");
    if (ctx) { ctx.fillStyle = "#27302b"; ctx.fillRect(0, 0, 512, 72); ctx.fillStyle = "#f6efe0"; ctx.font = "600 27px system-ui"; ctx.fillText(text.length > 28 ? `${text.slice(0, 27)}…` : text, 16, 47); }
    return new CanvasTexture(canvas);
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={[0.56, y - 0.025, 0.84]} scale={[0.73, 0.1, 1]}><spriteMaterial map={texture} transparent depthTest={false} /></sprite>;
}

function FruitSlices({ label, y }: { label: string; y: number }) {
  const { rind, face } = fruitColor(label);
  return <group>{Array.from({ length: 8 }, (_, i) => { const x = -0.69 + (i % 4) * 0.46; const z = -0.34 + Math.floor(i / 4) * 0.62; return <group key={i} position={[x, y + 0.045, z]}><mesh castShadow><cylinderGeometry args={[0.125, 0.125, 0.025, 18]} /><meshStandardMaterial color={rind} roughness={0.85} /></mesh><mesh position={[0, 0.014, 0]}><cylinderGeometry args={[0.106, 0.106, 0.004, 18]} /><meshStandardMaterial color={face} roughness={0.92} /></mesh><mesh position={[0, 0.018, 0]}><cylinderGeometry args={[0.028, 0.028, 0.005, 12]} /><meshStandardMaterial color="#f4dfb2" roughness={0.95} /></mesh></group>; })}</group>;
}

function Tray({ tray, count, selected, exploded, reducedMotion, onSelect, onHover }: { tray: SceneTray; count: number; selected: boolean; exploded: boolean; reducedMotion: boolean; onSelect: (position: number) => void; onHover: (position: number | null) => void }) {
  const group = useRef<Group>(null);
  const y = count === 1 ? 1.65 : 2.78 - ((tray.position - 1) * 2.31) / (count - 1);
  const thickness = Math.min(0.035, 0.7 / count);
  useFrame((state, delta) => { if (group.current) { const target = exploded ? 0.16 + Math.min(tray.position - 1, 25) * 0.035 : 0; group.current.position.z = reducedMotion ? target : MathUtils.damp(group.current.position.z, target, 6, delta); if (!reducedMotion && Math.abs(group.current.position.z - target) > 0.001) state.invalidate(); } });
  const loaded = Boolean(tray.productId);
  const color = selected ? "#e98b38" : loaded ? fruitColor(tray.label).rind : "#b6c4c0";
  return <group ref={group} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(tray.position); }} onPointerOver={(event) => { event.stopPropagation(); onHover(tray.position); document.body.style.cursor = "pointer"; }} onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }}>
    <mesh position={[0, y, 0]} castShadow={count <= 32}><boxGeometry args={[1.95, thickness, 1.44]} /><meshStandardMaterial color={color} metalness={0.65} roughness={0.42} transparent opacity={selected ? 0.95 : 0.78} emissive={selected ? "#7c3d12" : "#000000"} /></mesh>
    <CabinetBox position={[0, y - 0.008, 0.75]} args={[2.02, Math.max(0.018, thickness), 0.065]} color={selected ? "#f5b273" : "#8e9998"} />
    {count <= 32 && <>{[-0.94, 0.94].map((x) => <CabinetBox key={x} position={[x, y + 0.008, 0]} args={[0.036, 0.03, 1.48]} color="#dce0db" />)}{[-0.46, -0.16, 0.14, 0.44].map((z) => <CabinetBox key={z} position={[0, y + 0.015, z]} args={[1.86, 0.015, 0.018]} color="#e0e1dc" />)}{loaded && <FruitSlices label={tray.label} y={y} />}</>}
    {count <= 24 && <TrayLabel text={`${String(tray.position).padStart(2, "0")} · ${tray.label}`} y={y} />}
  </group>;
}

function CameraControl({ zoom, focus, selectedPosition, fullscreen }: { zoom: { serial: number; direction: -1 | 1 }; focus: { serial: number; position: number; count: number }; selectedPosition: number | null; fullscreen: boolean }) {
  const { camera, gl, invalidate, size } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => { const orbit = new OrbitControls(camera, gl.domElement); const requestFrame = () => invalidate(); orbit.enableDamping = true; orbit.minDistance = 2.7; orbit.maxDistance = 13; orbit.maxPolarAngle = Math.PI * 0.94; orbit.target.set(0, 1.55, 0); orbit.addEventListener("change", requestFrame); orbit.update(); controls.current = orbit; return () => { orbit.removeEventListener("change", requestFrame); orbit.dispose(); controls.current = null; }; }, [camera, gl, invalidate]);
  useEffect(() => { if (!zoom.serial) return; const target = controls.current?.target ?? new Vector3(0, 1.55, 0); const direction = camera.position.clone().sub(target); direction.multiplyScalar(zoom.direction === 1 ? 0.8 : 1.25); direction.clampLength(2.7, 13); camera.position.copy(target.clone().add(direction)); controls.current?.update(); }, [camera, zoom]);
  useEffect(() => { if (!focus.serial) return; const y = focus.count === 1 ? 1.65 : 2.78 - ((focus.position - 1) * 2.31) / (focus.count - 1); controls.current?.target.set(0, y, 0); camera.position.set(0.5, y + 0.45, 3.5); controls.current?.update(); }, [camera, focus]);
  useEffect(() => { if (selectedPosition !== null) return; controls.current?.target.set(0, 1.55, 0); camera.position.set(...initialCameraPosition); controls.current?.update(); }, [camera, selectedPosition]);
  useEffect(() => { if (!(camera instanceof PerspectiveCamera)) return; const aspect = size.height ? size.width / size.height : 1; const fov = fullscreen ? Math.min(100, 45 / Math.min(1, aspect)) : 35; camera.setFocalLength(camera.getFilmHeight() / (2 * Math.tan(MathUtils.degToRad(fov / 2)))); if (selectedPosition === null) { const offset = fullscreen && aspect < 0.8 ? -0.65 : 0; controls.current?.target.set(offset, 1.55, 0); camera.position.set(initialCameraPosition[0] + offset, initialCameraPosition[1], initialCameraPosition[2]); controls.current?.update(); } invalidate(); }, [camera, fullscreen, invalidate, selectedPosition, size.height, size.width]);
  useFrame(() => controls.current?.update());
  return null;
}

function Machine({ trays, selectedPosition, doorOpen, exploded, pieces, reducedMotion, onSelect, onHover }: { trays: SceneTray[]; selectedPosition: number | null; doorOpen: boolean; exploded: boolean; pieces: Pieces; reducedMotion: boolean; onSelect: (position: number) => void; onHover: (position: number | null) => void }) {
  const door = useRef<Group>(null);
  const brushed = useBrushedSteel();
  useFrame((state, delta) => { if (door.current) { const target = doorOpen ? -1.93 : 0; door.current.rotation.y = reducedMotion ? target : MathUtils.damp(door.current.rotation.y, target, 5, delta); if (!reducedMotion && Math.abs(door.current.rotation.y - target) > 0.001) state.invalidate(); } });
  return <group>
    <CabinetBox position={[0, 0.2, 0]} args={[2.2, 0.17, 1.75]} brushed={brushed} />
    {[-0.85, 0.85].map((x) => [-0.6, 0.6].map((z) => <CabinetBox key={`${x}-${z}`} position={[x, 0.06, z]} args={[0.18, 0.15, 0.16]} color="#424d4c" />))}
    {pieces.roof && <group><CabinetBox position={[0, 3.08, 0]} args={[2.2, 0.17, 1.78]} brushed={brushed} /><CabinetBox position={[0, 3.23, -0.27]} args={[1.45, 0.16, 0.82]} color="#4a5250" /><CabinetBox position={[-0.2, 3.25, 0.15]} args={[0.68, 0.13, 0.035]} color="#16221e" /><mesh position={[-0.2, 3.25, 0.175]}><planeGeometry args={[0.6, 0.08]} /><meshBasicMaterial color="#d7a85d" /></mesh>{[0.42, 0.69].map((x) => <group key={x} position={[x, 3.35, -0.2]}><mesh><cylinderGeometry args={[0.08, 0.08, 0.12, 24]} /><meshStandardMaterial color="#202a28" metalness={0.6} roughness={0.4} /></mesh><mesh position={[0, 0.067, 0]}><cylinderGeometry args={[0.05, 0.05, 0.012, 24]} /><meshStandardMaterial color="#c5ad79" metalness={0.5} /></mesh></group>)}</group>}
    {pieces.rearPanel && <group><CabinetBox position={[0, 1.65, -0.84]} args={[2.08, 2.75, 0.08]} color="#8b9794" />{[0.18, 0.32, 0.46].map((radius) => <mesh key={radius} position={[0, 1.6, -0.79]}><torusGeometry args={[radius, 0.012, 6, 48]} /><meshStandardMaterial color="#424d4c" metalness={0.7} /></mesh>)}{Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0, 1.6, -0.775]} rotation={[0, 0, (i * Math.PI) / 6]}><boxGeometry args={[0.9, 0.012, 0.012]} /><meshStandardMaterial color="#57615e" metalness={0.75} /></mesh>)}</group>}
    {pieces.leftPanel && <CabinetBox position={[-1.07, 1.64, 0]} args={[0.07, 2.82, 1.72]} brushed={brushed} />}
    {pieces.rightPanel && <group><CabinetBox position={[1.07, 1.64, 0]} args={[0.07, 2.82, 1.72]} brushed={brushed} />{Array.from({ length: 11 }, (_, i) => <CabinetBox key={i} position={[1.12, 2.58 - i * 0.045, -0.3]} args={[0.012, 0.018, 0.37]} color="#576261" shadow={false} />)}</group>}
    {[-1.03, 1.03].map((x) => <CabinetBox key={x} position={[x, 1.62, 0.86]} args={[0.1, 2.79, 0.12]} color="#c8cfcc" />)}
    {trays.map((tray) => <Tray key={tray.position} tray={tray} count={trays.length} selected={selectedPosition === tray.position} exploded={exploded} reducedMotion={reducedMotion} onSelect={onSelect} onHover={onHover} />)}
    {pieces.door && <group ref={door} position={[-1.12, 0, 0.92]}>
      <CabinetBox position={[0.28, 1.65, 0]} args={[0.56, 2.95, 0.09]} brushed={brushed} /><CabinetBox position={[1.95, 1.65, 0]} args={[0.55, 2.95, 0.09]} brushed={brushed} />
      <CabinetBox position={[1.11, 0.3, 0]} args={[1.2, 0.26, 0.09]} brushed={brushed} /><CabinetBox position={[1.11, 3.01, 0]} args={[1.2, 0.24, 0.09]} brushed={brushed} />
      <mesh position={[1.11, 1.65, 0.02]}><boxGeometry args={[1.19, 2.48, 0.025]} /><meshPhysicalMaterial color="#b9cfca" roughness={0.12} metalness={0.04} transparent opacity={0.22} transmission={0.16} depthWrite={false} /></mesh>
      <CabinetBox position={[1.11, 0.41, 0.055]} args={[1.24, 0.045, 0.06]} color="#48524e" /><CabinetBox position={[1.11, 2.89, 0.055]} args={[1.24, 0.045, 0.06]} color="#48524e" />
      <CabinetBox position={[1.94, 1.65, 0.16]} args={[0.07, 0.58, 0.1]} color="#27312d" />
    </group>}
  </group>;
}

const tool = "inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const optionLabel = "inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm";
const optionInput = "size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function MachineCanvas({ trays, selectedPosition, onSelect, onContextLost, title = "Deshidratador", subtitle = "CICLO EN EDICIÓN", totalKg = null, pendingWeights = 0, summary = [], sidePanel }: { trays: SceneTray[]; selectedPosition: number | null; onSelect: (position: number | null) => void; onContextLost?: () => void; title?: string; subtitle?: string; totalKg?: string | null; pendingWeights?: number; summary?: Array<{ label: string; kg: string; color: string }>; sidePanel?: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const viewport = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [doorOpen, setDoorOpen] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [pieces, setPieces] = useState<Pieces>(allPieces);
  const [zoom, setZoom] = useState<{ serial: number; direction: -1 | 1 }>({ serial: 0, direction: 1 });
  const [focus, setFocus] = useState({ serial: 0, position: 1, count: trays.length });
  const [hover, setHover] = useState<number | null>(null);
  // This viewer is loaded with ssr: false; read the preference before its first paint.
  const [panelOpen, setPanelOpen] = useState(() => {
    try { return typeof window !== "undefined" && window.localStorage.getItem(panelPreferenceKey) === "true"; }
    catch { return false; }
  });
  const [fullscreen, setFullscreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => { const query = window.matchMedia("(prefers-reduced-motion: reduce)"); const update = () => setReducedMotion(query.matches); update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update); }, []);
  useEffect(() => { const update = () => setFullscreen(document.fullscreenElement === viewport.current); document.addEventListener("fullscreenchange", update); return () => document.removeEventListener("fullscreenchange", update); }, []);
  useEffect(() => { if (!fullscreen) return; const exitOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && document.fullscreenElement === viewport.current) void document.exitFullscreen(); }; document.addEventListener("keydown", exitOnEscape); return () => document.removeEventListener("keydown", exitOnEscape); }, [fullscreen]);
  useEffect(() => { return () => { document.body.style.cursor = ""; }; }, []);
  const selected = trays.find((tray) => tray.position === selectedPosition);
  async function toggleFullscreen() { try { if (document.fullscreenElement === viewport.current) await document.exitFullscreen(); else await viewport.current?.requestFullscreen(); } catch { setFullscreen(false); } }
  function selectTray(position: number) {
    onSelect(position === selectedPosition ? null : position);
  }
  const setPiece = (name: PieceName, value: boolean) => setPieces((old) => ({ ...old, [name]: value }));
  function changePanelVisibility(visible: boolean) {
    setPanelOpen(visible);
    try { window.localStorage.setItem(panelPreferenceKey, String(visible)); }
    catch { /* The panel still works when browser storage is unavailable. */ }
  }
  return <div className="overflow-hidden rounded-xl border border-border bg-muted text-foreground shadow-sm">
    {!fullscreen && <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border bg-surface px-4 py-2 sm:px-5">
      <p className="text-sm font-medium">Vista 3D · {trays.length} bandejas</p>
      {sidePanel && <label className={optionLabel}><input type="checkbox" className={optionInput} checked={panelOpen} aria-controls={panelId} onChange={(event) => changePanelVisibility(event.target.checked)} />Mostrar tu equipo</label>}
    </header>}
    <div className={sidePanel && panelOpen && !fullscreen ? "grid xl:grid-cols-[minmax(0,1fr)_300px]" : "grid"}>
      <div className="min-w-0"><div ref={viewport} className={`relative w-full overflow-hidden bg-[var(--machine-background)] ${fullscreen ? "h-dvh" : "h-[420px] md:h-[min(62vh,620px)]"}`}>
        <Canvas frameloop="demand" shadows="percentage" dpr={[1, 1.75]} camera={{ position: initialCameraPosition, fov: 35, near: 0.1, far: 80 }} gl={{ antialias: true, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); onContextLost?.(); }, { once: true }); }}>
          <color attach="background" args={[dark ? "#272c27" : "#eff1e9"]} />
          <hemisphereLight intensity={1.8} color="#fff8eb" groundColor="#64716b" />
          <directionalLight position={[4, 7, 5]} intensity={3.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
          <directionalLight position={[-4, 3, -2]} intensity={1.15} color="#d7ebef" />
          <pointLight position={[0, 2.8, 1.4]} intensity={0.8} color="#ffecc9" />
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}><planeGeometry args={[100, 100]} /><meshStandardMaterial color={dark ? "#272c27" : "#e9e8df"} roughness={0.94} /></mesh>
          <Machine trays={trays} selectedPosition={selectedPosition} doorOpen={doorOpen} exploded={exploded} pieces={pieces} reducedMotion={reducedMotion} onSelect={selectTray} onHover={setHover} />
          <CameraControl zoom={zoom} focus={focus} selectedPosition={selectedPosition} fullscreen={fullscreen} />
        </Canvas>
        {!fullscreen && <><div className="pointer-events-none absolute left-4 right-4 top-4 flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">{subtitle}</p><h2 className="mt-1 font-serif text-xl sm:text-2xl">{title}</h2></div><div className="text-right"><strong className="block text-2xl font-normal tabular-nums">{totalKg === null ? "—" : totalKg}</strong><span className="text-xs text-muted-foreground">{totalKg === null ? "Sin pesajes" : "kg registrados"}</span></div></div>
        {hover !== null && <p className="pointer-events-none absolute left-4 top-20 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow">Bandeja {hover} · {trays.find((tray) => tray.position === hover)?.label ?? "Vacía"}</p>}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2"><span className="min-w-0 rounded-lg bg-surface/95 px-3 py-2 text-xs shadow">{selected ? `Bandeja ${String(selected.position).padStart(2, "0")} · ${selected.label}` : "Vista general · tocá una bandeja para seleccionarla"}</span>{selected && <button type="button" className={`${tool} pointer-events-auto`} aria-label="Acercar bandeja" title="Acercar bandeja" onClick={() => setFocus((old) => ({ serial: old.serial + 1, position: selected.position, count: trays.length }))}><Focus size={18} aria-hidden="true" /></button>}</div></>}
        {fullscreen && <div role="group" aria-label="Controles de pantalla completa" className="absolute bottom-4 right-4 flex gap-2">
          <button type="button" className={tool} aria-label="Alejar" title="Alejar" onClick={() => setZoom((old) => ({ serial: old.serial + 1, direction: -1 }))}><Minus size={18} aria-hidden="true" /></button>
          <button type="button" className={tool} aria-label="Acercar" title="Acercar" onClick={() => setZoom((old) => ({ serial: old.serial + 1, direction: 1 }))}><Plus size={18} aria-hidden="true" /></button>
          <button type="button" className={tool} aria-label="Salir de pantalla completa" title="Salir de pantalla completa" onClick={toggleFullscreen}><Minimize2 size={18} aria-hidden="true" /></button>
        </div>}
      </div>
      {!fullscreen && <div role="group" className="flex items-center justify-center gap-2 border-t border-border px-3 py-3" aria-label="Controles del modelo">
        <button type="button" className={tool} aria-label="Alejar" title="Alejar" onClick={() => setZoom((old) => ({ serial: old.serial + 1, direction: -1 }))}><Minus size={18} aria-hidden="true" /></button>
        <button type="button" className={tool} aria-label="Acercar" title="Acercar" onClick={() => setZoom((old) => ({ serial: old.serial + 1, direction: 1 }))}><Plus size={18} aria-hidden="true" /></button>
        <button type="button" className={tool} aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"} title={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"} aria-pressed={fullscreen} onClick={toggleFullscreen}>{fullscreen ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}</button>
      </div>}
      {!fullscreen && <details className="border-t border-border px-4 text-sm">
        <summary className="min-h-11 cursor-pointer content-center text-success focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Piezas visibles</summary>
        <div className="flex flex-wrap gap-x-6 pb-3">
          {([ ["door", "Puerta"], ["leftPanel", "Pared izquierda"], ["rightPanel", "Pared derecha"], ["roof", "Techo y controles"], ["rearPanel", "Panel trasero"] ] as Array<[PieceName, string]>).map(([name, label]) => <label key={name} className={optionLabel}><input type="checkbox" className={optionInput} checked={pieces[name]} onChange={(event) => setPiece(name, event.target.checked)} />{label}</label>)}
        </div>
        <div className="flex flex-wrap gap-x-6 border-t border-border py-2">
          <label className={`${optionLabel} ${!pieces.door ? "cursor-not-allowed opacity-50" : ""}`}><input type="checkbox" className={optionInput} checked={doorOpen} disabled={!pieces.door} onChange={(event) => setDoorOpen(event.target.checked)} />Puerta abierta</label>
          <label className={optionLabel}><input type="checkbox" className={optionInput} checked={exploded} onChange={(event) => setExploded(event.target.checked)} />Bandejas separadas</label>
          <label className={optionLabel}><input type="checkbox" className={optionInput} checked={!pieces.rightPanel && !pieces.roof} onChange={(event) => { const visible = !event.target.checked; setPieces((old) => ({ ...old, rightPanel: visible, roof: visible })); }} />Ver interior</label>
        </div>
      </details>}
      {!fullscreen && <p className="border-t border-border bg-muted px-4 py-3 text-center text-xs text-muted-foreground">Arrastrá para girar · acercá con la rueda o dos dedos · tocá una bandeja</p>}
      </div>
      {sidePanel && !fullscreen && <aside id={panelId} aria-label="Tu equipo" hidden={!panelOpen} className="relative min-w-0 border-t border-border bg-surface p-5 xl:border-l xl:border-t-0"><p className="mb-4 text-sm font-medium">Tu equipo</p>{sidePanel}</aside>}
    </div>
    {!fullscreen && <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-surface px-5 py-4 text-xs"><strong className="mr-auto font-medium">Producción de este ciclo <span className="ml-2 font-normal text-muted-foreground">{trays.length} bandejas</span></strong>{summary.map((item) => <span key={item.label} className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.label} · {item.kg} kg</span>)}{pendingWeights > 0 && <span className="font-medium text-warning">{pendingWeights} {pendingWeights === 1 ? "pesaje pendiente" : "pesajes pendientes"}</span>}</footer>}
  </div>;
}
