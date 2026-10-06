import { digest, fixed, parseImport, scaled } from "../domain/parse-import";
import type { ImportOperation, ImportSummary, ImportPreview, SourceWorkbook, ImportConfig } from "../domain/import-types";

export interface ImportReviewLookup {
  findOrigins(keys: string[]): Promise<{ originKey: string | null; rowHash: string }[]>;
  findCustomerIds(ids: string[]): Promise<string[]>;
}

function summarize(operations: ImportOperation[]): ImportSummary {
  const sales = operations.filter((op) => op.kind === "sale" && !op.duplicate);
  const samples = operations.filter((op) => op.kind === "sample" && !op.duplicate);
  return {
    sales: sales.length, total: fixed(sales.reduce((sum, op) => sum + scaled(op.total, "."), BigInt(0))),
    units: fixed(sales.flatMap((op) => op.lines).reduce((sum, line) => sum + scaled(line.quantity, ".", 3), BigInt(0)), 3),
    samples: samples.length, sampleTotal: fixed(samples.reduce((sum, op) => sum + scaled(op.total, "."), BigInt(0))),
    excluded: operations.filter((op) => op.kind === "excluded" && !op.duplicate).length,
    duplicates: operations.filter((op) => op.duplicate).length,
    errors: sales.reduce((sum, op) => sum + op.errors.length, 0), rows: operations.reduce((sum, op) => sum + op.rows.length, 0),
  };
}

export async function reviewImport(workbook: SourceWorkbook, config: ImportConfig, lookup: ImportReviewLookup): Promise<ImportPreview> {
  const operations = parseImport(workbook, config);
  const known = await lookup.findOrigins(operations.flatMap((op) => op.originKeys));
  const existing = new Map(known.map((row) => [row.originKey, row.rowHash]));
  const selectedIds = [...new Set(operations.map((op) => op.customerId).filter(Boolean))];
  const validCustomers = new Set(await lookup.findCustomerIds(selectedIds));
  const seen = new Set<string>();
  for (const op of operations) {
    const matches = op.originKeys.map((key, i) => existing.get(key) === op.rowHashes[i]);
    op.duplicate = matches.every(Boolean);
    if (!op.duplicate && op.originKeys.some((key) => existing.has(key))) op.errors.push({ row: op.rows[0].number, field: "Procedencia", message: "Esta operación ya fue importada con otros datos. Excluí el grupo y revisá la venta existente." });
    if (op.customerId && !validCustomers.has(op.customerId)) op.errors.push({ row: op.rows[0].number, field: "Cliente", message: "El cliente seleccionado no existe." });
    if (op.kind === "sale" && !op.duplicate) for (const key of op.originKeys) { if (seen.has(key)) op.errors.push({ row: op.rows[0].number, field: "Referencia", message: "Referencia repetida dentro de esta selección." }); seen.add(key); }
  }
  const summary = summarize(operations);
  return { operations, summary, hash: digest({ config, operations, summary }) };
}
