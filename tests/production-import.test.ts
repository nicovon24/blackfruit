import assert from "node:assert/strict";
import test from "node:test";
import type { SourceWorkbook } from "../src/modules/imports/domain/import-types";
import { parseProductionWorkbook } from "../src/modules/production/domain/parse-production-import";
import { formatBusinessDate, parseBusinessDate } from "../src/lib/business-date";
import { parseSalesPeriod } from "../src/modules/sales/domain/sales-period";

const machines = [{ id: "m1", name: "Principal", trayCount: 4, archived: false }];
const products = [{ id: "p1", name: "Naranja", variant: "Con azúcar", active: true }];
function workbook(date = "11/10/2026", total = "0,875", trays = "1,2"): SourceWorkbook {
  return { sheets: [
    { name: "Ciclos", rows: [
      { number: 1, cells: ["codigo", "fecha", "maquina", "total_kg", "observaciones"].map((value) => ({ value })) },
      { number: 2, cells: ["C-1", date, "Principal", total, "Ejemplo"].map((value) => ({ value })) },
    ] },
    { name: "Pesajes", rows: [
      { number: 1, cells: ["codigo", "producto", "variante", "bandejas", "kg"].map((value) => ({ value })) },
      { number: 2, cells: ["C-1", "Naranja", "Con azúcar", trays, "0,875"].map((value) => ({ value })) },
    ] },
  ] };
}

test("two-sheet import preserves a grouped weighing and exact total", () => {
  const preview = parseProductionWorkbook(workbook(), machines, products);
  assert.equal(preview.valid, 1);
  assert.equal(preview.errors, 0);
  assert.equal(preview.records[0].input?.finishedOn, "2026-10-11");
  assert.deepEqual(preview.records[0].input?.trays.slice(0, 2).map((tray) => tray.resultKey), ["row-2", "row-2"]);
  assert.equal(preview.records[0].input?.results[0].kg, "0.875");
});

test("conflicts and invalid source data are review errors", () => {
  assert.equal(parseProductionWorkbook(workbook(), machines, products, new Set(["C-1"])).conflicts, 1);
  assert.match(parseProductionWorkbook(workbook("31/02/2026"), machines, products).records[0].errors.join(" "), /Fecha/);
  assert.match(parseProductionWorkbook(workbook("11/10/2026", "0,876"), machines, products).records[0].errors.join(" "), /total/);
  assert.match(parseProductionWorkbook(workbook("11/10/2026", "0,875", "1,1"), machines, products).records[0].errors.join(" "), /Bandejas/);
});

test("business dates use dd/mm/yyyy and reject impossible days", () => {
  assert.equal(formatBusinessDate("2026-09-07"), "07/09/2026");
  assert.equal(parseBusinessDate("07/09/2026"), "2026-09-07");
  assert.equal(parseBusinessDate("31/02/2026"), null);
  assert.equal(parseSalesPeriod({ view: "range", from: "2026-02-30", to: "2026-03-01" }, "2026-10").kind, "month");
});
