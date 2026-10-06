import assert from "node:assert/strict";
import test from "node:test";
import { readWorkbook } from "../src/modules/imports/infrastructure/read-workbook";
import { parseImport, proposeMapping, scaled, fixed } from "../src/modules/imports/domain/parse-import";
import { reviewImport } from "../src/modules/imports/application/review-import";

test("CSV quoted names, decimal comma and grouped lines reconcile", async () => {
  const workbook = await readWorkbook(Buffer.from('Fecha;Nombre;Producto;Cantidad;Precio;Ref;Subtotal\n16/09/2026;"QA; cliente";Manzana;2;3200,50;A;6401,00\n16/09/2026;"QA; cliente";Naranja;1;2500;A;2500\n'), "ventas.csv");
  const mapping = { ...proposeMapping(workbook), mode: "lines" as const, decimal: "," as const, reference: 6, product: 3, quantity: 4, unitPrice: 5, total: 7 };
  const operations = parseImport(workbook, { mapping, decisions: [] });
  assert.equal(operations.length, 1); assert.equal(operations[0].total, "8901.00"); assert.equal(operations[0].lines.length, 2); assert.deepEqual(operations[0].errors, []);
  const excluded = parseImport(workbook, { mapping, decisions: [{ key: "ref:A", kind: "excluded", customerId: "" }] });
  assert.equal(excluded[0].rows.length, 2); assert.equal(excluded[0].kind, "excluded");
});

test("incorrect source total stays an explicit row error", async () => {
  const workbook = await readWorkbook(Buffer.from('Fecha,Nombre,Producto,Cantidad,Precio,Ref,Subtotal\n2026-09-16,QA,Manzana,2,3200,A,999\n'), "ventas.csv");
  const mapping = { ...proposeMapping(workbook), mode: "lines" as const, reference: 6, product: 3, quantity: 4, unitPrice: 5, total: 7 };
  const [operation] = parseImport(workbook, { mapping, decisions: [] });
  assert.equal(operation.errors[0].row, 2); assert.equal(operation.errors[0].field, "Total");
});

test("decimal parsing remains exact and rejects ambiguous formats", () => {
  assert.equal(fixed(scaled("1.234,56", ",")), "1234.56");
  assert.throws(() => scaled("12.34", ","));
  assert.equal(fixed(scaled(3200.5, ",")), "3200.50");
});

test("reviewed amount replaces zero and a line total without importing source lines", async () => {
  const amountWorkbook = await readWorkbook(Buffer.from("Fecha,Nombre,Importe\n2026-09-16,QA,0\n"), "amount.csv");
  const amountMapping = proposeMapping(amountWorkbook);
  const [corrected] = parseImport(amountWorkbook, { mapping: amountMapping, decisions: [{ key: "row:2", kind: "sale", customerId: "", amount: "1000.00" }] });
  assert.equal(corrected.total, "1000.00");
  assert.equal(corrected.lines.length, 0);
  assert.deepEqual(corrected.errors, []);

  const linesWorkbook = await readWorkbook(Buffer.from("Fecha,Nombre,Producto,Cantidad,Precio,Ref,Subtotal\n2026-09-16,QA,Manzana,2,3200,A,6400\n"), "lines.csv");
  const linesMapping = { ...proposeMapping(linesWorkbook), mode: "lines" as const, reference: 6, product: 3, quantity: 4, unitPrice: 5, total: 7 };
  const [lineCorrected] = parseImport(linesWorkbook, { mapping: linesMapping, decisions: [{ key: "ref:A", kind: "sale", customerId: "", amount: "1500.50" }] });
  assert.equal(lineCorrected.total, "1500.50");
  assert.equal(lineCorrected.lines.length, 0);
  assert.deepEqual(lineCorrected.errors, []);
  assert.throws(() => parseImport(amountWorkbook, { mapping: amountMapping, decisions: [{ key: "row:2", kind: "sale", customerId: "", amount: "0" }] }));
  assert.throws(() => parseImport(amountWorkbook, { mapping: amountMapping, decisions: [{ key: "row:2", kind: "sale", customerId: "", amount: "1.001" }] }));
});

test("a zero amount is valid for a reviewed sample but still invalid for a sale", async () => {
  const workbook = await readWorkbook(Buffer.from("Fecha,Nombre,Importe\n2026-09-16,Cliente QA,0\n"), "samples.csv");
  const mapping = proposeMapping(workbook);
  const lookup = { findOrigins: async () => [], findCustomerIds: async () => [] };
  const sample = await reviewImport(workbook, { mapping, decisions: [{ key: "row:2", kind: "sample", customerId: "" }] }, lookup);
  assert.equal(sample.operations[0].kind, "sample");
  assert.equal(sample.operations[0].total, "0.00");
  assert.deepEqual(sample.operations[0].errors, []);
  assert.equal(sample.summary.samples, 1);
  assert.equal(sample.summary.sampleTotal, "0.00");
  assert.equal(sample.summary.sales, 0);
  assert.equal(sample.summary.errors, 0);

  const sale = parseImport(workbook, { mapping, decisions: [{ key: "row:2", kind: "sale", customerId: "" }] })[0];
  assert.match(sale.errors[0]?.message ?? "", /importe positivo/);
});
