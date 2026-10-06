import { createHash } from "node:crypto";
import { ImportValidationError, type ImportMapping, type ImportOperation, type ImportConfig, type SourceCell, type SourceRow, type SourceWorkbook } from "./import-types";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b, "en")).map(([key, v]) => [key, canonical(v)]));
  return value;
}
export const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const valueAt = (row: SourceRow, column: number) => column ? row.cells[column - 1]?.value ?? null : null;
const textAt = (row: SourceRow, column: number) => String(valueAt(row, column) ?? "").trim();
export function fixed(value: bigint, places = 2) { const base = BigInt(10 ** places); return `${value / base}.${String(value % base).padStart(places, "0")}`; }
export function scaled(value: SourceCell["value"], decimal: "," | ".", places = 2): bigint {
  let text = String(value ?? "").trim().replace(/^(?:ARS|\$)\s*/i, "");
  if (typeof value !== "number" && decimal === ",") {
    if (text.includes(".") && !/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(text)) throw new Error("Separador decimal incorrecto; revisá el mapeo.");
    text = text.replaceAll(".", "").replace(",", ".");
  } else if (text.includes(",")) {
    if (!/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(text)) throw new Error("Separador decimal incorrecto; revisá el mapeo.");
    text = text.replaceAll(",", "");
  }
  if (!new RegExp(`^\\d{1,${places === 3 ? 9 : 12}}(?:\\.\\d{1,${places}})?$`).test(text)) throw new Error(`Ingresá un número positivo dentro del rango permitido y con hasta ${places} decimales.`);
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * BigInt(10 ** places) + BigInt(fraction.padEnd(places, "0"));
}
function localDate(value: SourceCell["value"]) {
  let text = String(value ?? "").trim();
  if (typeof value === "number" && Number.isInteger(value) && value > 20000 && value < 100000) text = new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) { const [day, month, year] = text.split("/"); text = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`; }
  const date = new Date(`${text}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== text) throw new Error("Usá fecha DD/MM/AAAA o AAAA-MM-DD.");
  return text;
}

export function proposeMapping(workbook: SourceWorkbook, source = "blackfruit-ventas"): ImportMapping {
  const sheet = workbook.sheets[0];
  const header = sheet.rows.find((row) => row.cells.some((cell) => /manzanas.*sin a/i.test(String(cell.value))));
  const products = ["Manzana", "Manzana", "Naranja", "Naranja", "Pomelo", "Pomelo"].map((fruit, index) => ({ column: index + 4, name: `${fruit} deshidratada`, variant: index % 2 ? "Sin azúcar" : "Con azúcar", price: String(valueAt(sheet.rows.find((row) => row.number === [3, 7, 4, 8, 5, 9][index]) ?? { number: 0, cells: [] }, 14) ?? (index < 2 ? 3200 : 2500)) }));
  let last = sheet.rows.at(-1)?.number ?? 1;
  if (header) last = sheet.rows.filter((row) => row.number > header.number && (textAt(row, 2) || textAt(row, 3))).at(-1)?.number ?? last;
  return { source, sheet: sheet.name, mode: header ? "blackfruit" : "amount", firstRow: header ? header.number + 1 : 2, lastRow: last, decimal: ".", date: header ? 2 : 1, name: header ? 3 : 2, total: header ? 10 : 3, notes: header ? 11 : 0, channel: 0, type: 0, reference: 0, product: 0, quantity: 0, unitPrice: 0, products };
}

export function parseImport(workbook: SourceWorkbook, config: ImportConfig): ImportOperation[] {
  const m = config.mapping;
  const sheet = workbook.sheets.find((item) => item.name === m.sheet);
  if (!sheet || !m.source?.trim() || m.source.length > 120 || !["blackfruit", "amount", "lines"].includes(m.mode) || ![",", "."].includes(m.decimal)) throw new ImportValidationError("Revisá la fuente, hoja y formato del archivo.");
  if (!Number.isInteger(m.firstRow) || !Number.isInteger(m.lastRow) || m.firstRow < 1 || m.lastRow < m.firstRow || m.lastRow > 1000) throw new ImportValidationError("Elegí un rango de filas válido (hasta 1.000).");
  const columns = [m.date, m.name, m.total, m.notes, m.channel, m.type, m.reference, m.product, m.quantity, m.unitPrice];
  if (columns.some((column) => !Number.isInteger(column) || column < 0 || column > 32) || !m.date || (m.mode !== "lines" && !m.total) || (m.mode === "lines" && (!m.reference || !m.product || !m.quantity || !m.unitPrice))) throw new ImportValidationError("Completá las columnas obligatorias del formato elegido.");
  if (m.mode === "blackfruit" && (!Array.isArray(m.products) || m.products.length !== 6 || m.products.some((p) => !Number.isInteger(p.column) || p.column < 1 || p.column > 32 || !p.name?.trim() || p.name.length > 160 || p.variant.length > 80))) throw new ImportValidationError("Revisá las seis columnas de productos.");
  const groups = new Map<string, SourceRow[]>();
  for (const row of sheet.rows.filter((row) => row.number >= m.firstRow && row.number <= m.lastRow)) {
    if (row.cells.every((cell) => cell.value === null || cell.value === "")) continue;
    const key = m.mode === "lines" && textAt(row, m.reference) ? `ref:${textAt(row, m.reference)}` : `row:${row.number}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  if (!groups.size) throw new ImportValidationError("No hay filas en el rango seleccionado.");
  const decisionMap = new Map(config.decisions.map((decision) => [decision.key, decision]));
  if (decisionMap.size !== config.decisions.length || config.decisions.some((d) => !groups.has(d.key) || !["sale", "sample", "excluded"].includes(d.kind) || (d.amount !== undefined && typeof d.amount !== "string") || (d.amount?.trim() && d.kind !== "sale"))) throw new ImportValidationError("Las decisiones no corresponden a esta selección.");
  return [...groups].map(([key, rows]) => {
    const first = rows[0];
    const name = textAt(first, m.name);
    const markerCells = rows.flatMap((row) => [m.date, m.name].filter(Boolean).map((column) => row.cells[column - 1]));
    const marker = markerCells.some((cell) => cell?.color === "00FFFF") ? "Muestra (celeste)" : markerCells.some((cell) => cell?.color === "FF0000") ? "Falta cobrar (rojo)" : "";
    const sample = /muestra|regalo/i.test(`${name} ${textAt(first, m.type)}`) || marker.startsWith("Muestra");
    const decision = decisionMap.get(key);
    const amountOverride = decision?.amount?.trim() ?? "";
    let correctedTotal: bigint | null = null;
    if (amountOverride) {
      try {
        correctedTotal = scaled(amountOverride, ".");
        if (correctedTotal <= BigInt(0)) throw new Error("El monto corregido debe ser mayor que cero.");
      } catch (error) {
        throw new ImportValidationError(`Fila ${first.number}: ${error instanceof Error ? error.message : "Monto corregido inválido."}`);
      }
    }
    const op: ImportOperation = { key, rows, name, date: "", notes: textAt(first, m.notes), channel: textAt(first, m.channel), kind: decision?.kind ?? (sample ? "sample" : "sale"), customerId: decision?.customerId ?? "", marker, lines: [], total: "0.00", amountOverride, errors: [], duplicate: false, originKeys: [], rowHashes: [] };
    let total = BigInt(0);
    for (const row of rows) {
      const check = <T>(field: string, fn: () => T): T | undefined => { try { return fn(); } catch (error) { op.errors.push({ row: row.number, field, message: error instanceof Error ? error.message : "Dato inválido." }); } };
      const date = check("Fecha", () => localDate(valueAt(row, m.date)));
      if (row === first) op.date = date ?? "";
      else if (date !== op.date || textAt(row, m.name) !== op.name || textAt(row, m.channel) !== op.channel || textAt(row, m.type) !== textAt(first, m.type)) op.errors.push({ row: row.number, field: "Agrupación", message: "Las líneas deben compartir fecha, nombre, canal y tipo." });
      if (m.mode === "lines" && !textAt(row, m.reference)) op.errors.push({ row: row.number, field: "Referencia", message: "Una operación con líneas necesita una clave de agrupación." });
      let rowTotal = BigInt(0);
      const addLine = (productName: string, variant: string | null, quantityValue: SourceCell["value"], priceValue: SourceCell["value"], field: string) => check(field, () => {
        if (!productName || productName.length > 160) throw new Error("Completá el nombre de producto (hasta 160 caracteres).");
        const quantity = scaled(quantityValue, m.decimal, 3);
        const price = scaled(priceValue, m.decimal);
        const subtotal = (quantity * price + BigInt(500)) / BigInt(1000);
        if (quantity <= BigInt(0) || price <= BigInt(0) || subtotal <= BigInt(0)) throw new Error("Cantidad y precio deben ser mayores que cero.");
        if (subtotal > BigInt("99999999999999")) throw new Error("Importe fuera del rango admitido.");
        op.lines.push({ productName, variant, quantity: fixed(quantity, 3), unitPrice: fixed(price), subtotal: fixed(subtotal) }); rowTotal += subtotal;
      });
      if (correctedTotal === null) {
        if (m.mode === "blackfruit") for (const product of m.products) { const qty = valueAt(row, product.column); if (qty !== null && qty !== "" && Number(qty) !== 0) addLine(product.name, product.variant, qty, product.price, product.name + " · " + product.variant); }
        if (m.mode === "lines") addLine(textAt(row, m.product), null, valueAt(row, m.quantity), valueAt(row, m.unitPrice), "Producto / cantidad / precio");
        if (m.mode === "amount") rowTotal = check("Importe", () => scaled(valueAt(row, m.total), m.decimal)) ?? BigInt(0);
        else if (m.total && valueAt(row, m.total) !== null && valueAt(row, m.total) !== "") check("Total", () => { if (scaled(valueAt(row, m.total), m.decimal) !== rowTotal) throw new Error(`No coincide con el cálculo de productos: ${fixed(rowTotal)} ARS.`); });
      }
      total += rowTotal;
      const reference = textAt(row, m.reference);
      op.originKeys.push(digest([m.source.trim().toLowerCase(), m.sheet, reference ? `ref:${reference}${m.mode === "lines" ? `:line:${rows.indexOf(row)}` : ""}` : `row:${row.number}`]));
      op.rowHashes.push(digest(row.cells));
    }
    if (correctedTotal !== null) total = correctedTotal;
    if (op.kind === "sale" && total <= BigInt(0)) op.errors.push({ row: first.number, field: "Total", message: "Fila sin importe positivo: revisá o excluí expresamente." });
    if (total > BigInt("99999999999999")) op.errors.push({ row: first.number, field: "Total", message: "El total supera el máximo admitido." });
    if (op.notes.length > 2000 || op.channel.length > 80) op.errors.push({ row: first.number, field: "Notas / canal", message: "Máximo 2.000 caracteres en notas y 80 en canal." });
    op.total = fixed(total);
    return op;
  });
}
