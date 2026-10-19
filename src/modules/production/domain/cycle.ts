export type ProductChoice = { id: string; name: string; variant: string | null; active: boolean };
export type CycleTrayInput = { position: number; productId: string | null; resultKey: string | null };
export type CycleResultInput = { key: string; kg: string | null };
export type CycleInput = {
  code: string;
  machineId: string;
  finishedOn: string;
  status: "draft" | "finished";
  notes: string;
  trays: CycleTrayInput[];
  results: CycleResultInput[];
};

export type ValidCycleResult = {
  key: string;
  kind: "individual" | "group";
  productId: string;
  productName: string;
  variant: string | null;
  kg: string | null;
  positions: number[];
};

export type ValidCycle = {
  code: string;
  machineId: string;
  machineName: string;
  trayCount: number;
  finishedOn: Date | null;
  status: "draft" | "finished";
  notes: string | null;
  trays: Array<{ position: number; productId: string | null; productName: string | null; variant: string | null; resultKey: string | null }>;
  results: ValidCycleResult[];
};

export class CycleValidationError extends Error {
  constructor(public readonly field: string, message: string) { super(message); }
}

export class CycleConflictError extends Error {
  constructor(message = "El ciclo cambió. Recargá su detalle antes de guardar de nuevo.") { super(message); }
}

export function parseKg(value: string | null, field = "kg"): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new CycleValidationError(field, "Ingresá un peso válido.");
  if (value.trim() === "") return null;
  const text = value.trim();
  if (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/.test(text)) {
    throw new CycleValidationError(field, "Ingresá kilos no negativos con hasta tres decimales.");
  }
  const [whole, fraction = ""] = text.split(".");
  return `${whole}.${fraction.padEnd(3, "0")}`;
}

export function kgTotal(values: Array<string | null>): string {
  let grams = BigInt(0);
  for (const value of values) {
    if (value === null) continue;
    const parsed = parseKg(value);
    if (parsed === null) continue;
    const [whole, fraction] = parsed.split(".");
    grams += BigInt(whole) * BigInt(1000) + BigInt(fraction);
  }
  return `${grams / BigInt(1000)}.${String(grams % BigInt(1000)).padStart(3, "0")}`;
}

export function kgDifference(left: string, right: string): string {
  const toGrams = (value: string) => { const [whole, fraction] = parseKg(value)!.split("."); return BigInt(whole) * BigInt(1000) + BigInt(fraction); };
  const difference = toGrams(left) - toGrams(right);
  const absolute = difference < 0 ? -difference : difference;
  return `${difference < 0 ? "-" : "+"}${absolute / BigInt(1000)}.${String(absolute % BigInt(1000)).padStart(3, "0")}`;
}

function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CycleValidationError("finishedOn", "Ingresá una fecha válida.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new CycleValidationError("finishedOn", "Ingresá una fecha válida.");
  return date;
}

export function validateCycle(input: CycleInput, machine: { id: string; name: string; trayCount: number }, products: ProductChoice[]): ValidCycle {
  if (input.machineId !== machine.id) throw new CycleValidationError("machineId", "Elegí una máquina válida.");
  const code = input.code?.trim();
  if (!code || code.length > 64) throw new CycleValidationError("code", "Ingresá una identificación de hasta 64 caracteres.");
  if (input.status !== "draft" && input.status !== "finished") throw new CycleValidationError("status", "Elegí un estado válido.");
  const finishedOn = parseLocalDate(input.finishedOn);
  if (input.status === "finished" && !finishedOn) throw new CycleValidationError("finishedOn", "Indicá la fecha en que terminó la pasada.");
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > 2000) throw new CycleValidationError("notes", "Máximo 2000 caracteres.");
  if (!Array.isArray(input.trays) || input.trays.length !== machine.trayCount) throw new CycleValidationError("trays", "La cantidad de bandejas no coincide con la máquina.");
  if (!Array.isArray(input.results)) throw new CycleValidationError("results", "Los pesajes no son válidos.");

  const productById = new Map(products.map((product) => [product.id, product]));
  const positions = new Set<number>();
  const resultMembers = new Map<string, Array<{ position: number; product: ProductChoice }>>();
  const trays: ValidCycle["trays"] = [];
  for (const tray of input.trays) {
    if (!Number.isInteger(tray.position) || tray.position < 1 || tray.position > machine.trayCount || positions.has(tray.position)) {
      throw new CycleValidationError("trays", "La posición de una bandeja es inválida o está repetida.");
    }
    positions.add(tray.position);
    if (tray.productId === null || tray.productId === "") {
      if (tray.resultKey !== null && tray.resultKey !== "") throw new CycleValidationError("trays", "Una bandeja vacía no puede tener peso.");
      trays.push({ position: tray.position, productId: null, productName: null, variant: null, resultKey: null });
      continue;
    }
    const product = productById.get(tray.productId);
    if (!product) throw new CycleValidationError("trays", `El producto de la bandeja ${tray.position} no existe.`);
    if (!tray.resultKey || !/^[\w-]{1,80}$/.test(tray.resultKey)) throw new CycleValidationError("trays", `La bandeja ${tray.position} necesita un pesaje.`);
    trays.push({ position: tray.position, productId: product.id, productName: product.name, variant: product.variant, resultKey: tray.resultKey });
    const members = resultMembers.get(tray.resultKey) ?? [];
    members.push({ position: tray.position, product });
    resultMembers.set(tray.resultKey, members);
  }
  if (input.status === "finished" && resultMembers.size === 0) throw new CycleValidationError("trays", "Cargá al menos una bandeja para finalizar.");

  const weightByKey = new Map<string, string | null>();
  for (const result of input.results) {
    if (!result || typeof result.key !== "string" || !resultMembers.has(result.key) || weightByKey.has(result.key)) {
      throw new CycleValidationError("results", "Hay pesajes repetidos o sin bandejas.");
    }
    const kg = parseKg(result.kg, "results");
    if (input.status === "finished" && kg === null) throw new CycleValidationError("results", `Falta el peso del resultado ${result.key}.`);
    weightByKey.set(result.key, kg);
  }
  if (weightByKey.size !== resultMembers.size) throw new CycleValidationError("results", "Cada bandeja cargada necesita un resultado, aunque esté pendiente.");

  const results: ValidCycleResult[] = [];
  for (const [key, members] of resultMembers) {
    const first = members[0].product;
    if (members.some(({ product }) => product.id !== first.id)) throw new CycleValidationError("results", "Solo se pueden agrupar bandejas del mismo producto y variante.");
    results.push({ key, kind: members.length === 1 ? "individual" : "group", productId: first.id, productName: first.name, variant: first.variant, kg: weightByKey.get(key) ?? null, positions: members.map(({ position }) => position).sort((a, b) => a - b) });
  }
  trays.sort((a, b) => a.position - b.position);
  return { code, machineId: machine.id, machineName: machine.name, trayCount: machine.trayCount, finishedOn, status: input.status, notes, trays, results };
}
