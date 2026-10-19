import type { SourceRow, SourceWorkbook } from "@/modules/imports/domain/import-types";
import { parseBusinessDate } from "@/lib/business-date";
import { kgTotal, parseKg, validateCycle, type CycleInput, type ProductChoice } from "./cycle";

type Machine = { id: string; name: string; trayCount: number; archived: boolean };
export type ProductionImportRecord = { code: string; row: number; machineName: string; finishedOn: string; totalKg: string; resultCount: number; errors: string[]; input?: CycleInput };
export type ProductionImportPreview = { records: ProductionImportRecord[]; valid: number; conflicts: number; errors: number };

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es").replace(/[\s-]+/g, "_"); }
function value(row: SourceRow, index: number) { const cell = row.cells[index]; if (cell?.formula) throw new Error(`La fila ${row.number} contiene una fórmula. Pegá el valor calculado.`); return String(cell?.value ?? "").trim(); }
function sheetAndColumns(workbook: SourceWorkbook, name: string, names: string[]) {
  const sheet = workbook.sheets.find((candidate) => normalize(candidate.name) === normalize(name));
  if (!sheet) throw new Error(`Falta la hoja «${name}».`);
  const header = sheet.rows.find((row) => row.cells.some((cell) => cell.value !== null));
  if (!header) throw new Error(`La hoja «${name}» está vacía.`);
  const columns = Object.fromEntries(names.map((key) => [key, header.cells.findIndex((cell) => normalize(String(cell.value ?? "")) === key)])) as Record<string, number>;
  const missing = names.filter((key) => columns[key] < 0);
  if (missing.length) throw new Error(`En «${name}» faltan columnas: ${missing.join(", ")}.`);
  return { sheet, columns, rows: sheet.rows.filter((row) => row.number > header.number && row.cells.some((cell) => cell.value !== null)) };
}
function dateValue(text: string) {
  const iso = parseBusinessDate(text) ?? (/^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null);
  if (!iso) return null;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10) === iso ? iso : null;
}
function weight(text: string) { return parseKg(text.replace(",", ".")); }

export function parseProductionWorkbook(workbook: SourceWorkbook, machines: Machine[], products: ProductChoice[], existingCodes: ReadonlySet<string> = new Set()): ProductionImportPreview {
  const cycles = sheetAndColumns(workbook, "Ciclos", ["codigo", "fecha", "maquina", "total_kg", "observaciones"]);
  const weights = sheetAndColumns(workbook, "Pesajes", ["codigo", "producto", "variante", "bandejas", "kg"]);
  const weightsByCode = new Map<string, SourceRow[]>();
  for (const row of weights.rows) { const code = value(row, weights.columns.codigo); weightsByCode.set(code, [...(weightsByCode.get(code) ?? []), row]); }
  const seenCodes = new Set<string>();
  const records = cycles.rows.map((row): ProductionImportRecord => {
    const errors: string[] = [];
    let code = "", date = "", machineName = "", totalKg = "";
    try {
      code = value(row, cycles.columns.codigo);
      date = dateValue(value(row, cycles.columns.fecha)) ?? "";
      machineName = value(row, cycles.columns.maquina);
      totalKg = weight(value(row, cycles.columns.total_kg)) ?? "";
      if (!date) errors.push("Fecha inválida; usá dd/mm/aaaa.");
      if (!totalKg) errors.push("Total de kilos inválido.");
    } catch (error) { errors.push(error instanceof Error ? error.message : "Datos inválidos."); }
    if (!code) errors.push("Falta el código de ciclo.");
    if (seenCodes.has(code)) errors.push("El código está repetido dentro del archivo.");
    seenCodes.add(code);
    if (existingCodes.has(code)) errors.push("El código ya existe. Revisá este ciclo; no se sobrescribirá.");
    const matchingMachines = machines.filter((machine) => !machine.archived && normalize(machine.name) === normalize(machineName));
    if (matchingMachines.length !== 1) errors.push(matchingMachines.length ? "Hay más de una máquina con ese nombre." : "La máquina no existe o está archivada.");
    const machine = matchingMachines[0];
    const resultRows = weightsByCode.get(code) ?? [];
    if (!resultRows.length) errors.push("El ciclo no tiene pesajes en la hoja Pesajes.");
    const trays: CycleInput["trays"] = machine ? Array.from({ length: machine.trayCount }, (_, index) => ({ position: index + 1, productId: null, resultKey: null })) : [];
    const results: CycleInput["results"] = [];
    const used = new Set<number>();
    for (const resultRow of resultRows) {
      try {
        const name = value(resultRow, weights.columns.producto);
        const variant = value(resultRow, weights.columns.variante);
        const matches = products.filter((product) => product.active && normalize(product.name) === normalize(name) && normalize(product.variant ?? "") === normalize(variant));
        if (matches.length !== 1) throw new Error(matches.length ? `Producto ambiguo en Pesajes, fila ${resultRow.number}.` : `Producto no encontrado en Pesajes, fila ${resultRow.number}.`);
        const positions = value(resultRow, weights.columns.bandejas).split(",").map((part) => Number(part.trim()));
        if (!positions.length || new Set(positions).size !== positions.length || positions.some((position) => !Number.isInteger(position) || position < 1 || !machine || position > machine.trayCount || used.has(position))) throw new Error(`Bandejas inválidas o repetidas en Pesajes, fila ${resultRow.number}.`);
        const kg = weight(value(resultRow, weights.columns.kg));
        if (kg === null) throw new Error(`Falta el peso en Pesajes, fila ${resultRow.number}.`);
        const key = `row-${resultRow.number}`;
        for (const position of positions) { used.add(position); trays[position - 1] = { position, productId: matches[0].id, resultKey: key }; }
        results.push({ key, kg });
      } catch (error) { errors.push(error instanceof Error ? error.message : `Error en Pesajes, fila ${resultRow.number}.`); }
    }
    let input: CycleInput | undefined;
    if (!errors.length && machine) {
      const candidate: CycleInput = { code, machineId: machine.id, finishedOn: date, status: "finished", notes: value(row, cycles.columns.observaciones), trays, results };
      try {
        const validated = validateCycle(candidate, machine, products);
        if (kgTotal(validated.results.map((result) => result.kg)) !== totalKg) errors.push("El total del ciclo no coincide con la suma de Pesajes.");
        else input = candidate;
      } catch (error) { errors.push(error instanceof Error ? error.message : "Ciclo inválido."); }
    }
    return { code, row: row.number, machineName, finishedOn: date, totalKg, resultCount: resultRows.length, errors, input };
  });
  const cycleCodes = new Set(records.map((record) => record.code));
  for (const code of weightsByCode.keys()) if (!cycleCodes.has(code)) records.push({ code, row: weightsByCode.get(code)![0].number, machineName: "", finishedOn: "", totalKg: "", resultCount: weightsByCode.get(code)!.length, errors: ["Pesajes referencia un ciclo que falta en la hoja Ciclos."] });
  return { records, valid: records.filter((record) => record.errors.length === 0).length, conflicts: records.filter((record) => record.errors.some((error) => error.includes("ya existe"))).length, errors: records.filter((record) => record.errors.length > 0).length };
}
