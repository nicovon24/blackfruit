export type SourceCell = { value: string | number | null; formula?: string; color?: string };
export type SourceRow = { number: number; cells: SourceCell[] };
export type SourceSheet = { name: string; rows: SourceRow[] };
export type SourceWorkbook = { sheets: SourceSheet[] };
export type ImportMapping = {
  source: string; sheet: string; mode: "blackfruit" | "amount" | "lines";
  firstRow: number; lastRow: number; decimal: "," | ".";
  date: number; name: number; total: number; notes: number; channel: number; type: number; reference: number;
  product: number; quantity: number; unitPrice: number;
  products: { column: number; name: string; variant: string; price: string }[];
};
export type RowDecision = { key: string; kind: "sale" | "sample" | "excluded"; customerId: string; amount?: string };
export type ImportConfig = { mapping: ImportMapping; decisions: RowDecision[] };
export type ImportLine = { productName: string; variant: string | null; quantity: string; unitPrice: string; subtotal: string };
export type ImportOperation = {
  key: string; rows: SourceRow[]; date: string; name: string; notes: string; channel: string;
  total: string; lines: ImportLine[]; kind: "sale" | "sample" | "excluded"; amountOverride: string;
  customerId: string; marker: string; duplicate: boolean; originKeys: string[]; rowHashes: string[];
  errors: { row: number; field: string; message: string }[];
};
export type ImportSummary = { sales: number; total: string; units: string; samples: number; sampleTotal: string; excluded: number; duplicates: number; errors: number; rows: number };
export type ImportPreview = { operations: ImportOperation[]; summary: ImportSummary; hash: string };
export class ImportValidationError extends Error {}
