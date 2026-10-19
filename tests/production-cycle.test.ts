import assert from "node:assert/strict";
import test from "node:test";
import { CycleValidationError, kgDifference, kgTotal, validateCycle, type CycleInput, type ProductChoice } from "../src/modules/production/domain/cycle";

const machine = { id: "machine-1", name: "Deshidratador A", trayCount: 4 };
const products: ProductChoice[] = [{ id: "orange", name: "Naranja", variant: "Con azúcar", active: true }, { id: "apple", name: "Manzana", variant: null, active: true }];

function input(): CycleInput {
  return {
    code: "P-01", machineId: machine.id, finishedOn: "2026-10-11", status: "finished", notes: "",
    trays: [
      { position: 1, productId: "orange", resultKey: "orange-group" },
      { position: 2, productId: "orange", resultKey: "orange-group" },
      { position: 3, productId: "apple", resultKey: "apple-individual" },
      { position: 4, productId: null, resultKey: null },
    ],
    results: [{ key: "orange-group", kg: "0.875" }, { key: "apple-individual", kg: "0" }],
  };
}

test("a group is counted once, zero is confirmed and empty trays are excluded", () => {
  const result = validateCycle(input(), machine, products);
  assert.equal(result.results.length, 2);
  assert.deepEqual(result.results[0].positions, [1, 2]);
  assert.equal(result.results[0].kind, "group");
  assert.equal(result.results[1].kind, "individual");
  assert.equal(result.results[1].kg, "0.000");
  assert.equal(kgTotal(result.results.map((row) => row.kg)), "0.875");
  assert.equal(kgDifference("1.250", "0.875"), "+0.375");
});

test("a finished cycle needs all weights but a draft preserves pending weights", () => {
  const incomplete = input();
  incomplete.results[0].kg = null;
  assert.throws(() => validateCycle(incomplete, machine, products), CycleValidationError);
  incomplete.status = "draft";
  assert.equal(validateCycle(incomplete, machine, products).results[0].kg, null);
});

test("overlap, mixed products, negative kilograms and invalid dates are rejected", () => {
  const mixed = input();
  mixed.trays[1].productId = "apple";
  assert.throws(() => validateCycle(mixed, machine, products), CycleValidationError);

  const duplicated = input();
  duplicated.trays[1].position = 1;
  assert.throws(() => validateCycle(duplicated, machine, products), CycleValidationError);

  for (const weight of ["-0.1", "1.0001", "1,5"]) {
    const bad = input();
    bad.results[0].kg = weight;
    assert.throws(() => validateCycle(bad, machine, products), CycleValidationError);
  }
  const badDate = input();
  badDate.finishedOn = "2026-02-30";
  assert.throws(() => validateCycle(badDate, machine, products), CycleValidationError);
});

test("sixteen-tray example totals 1.550 kg without splitting grouped kilograms", () => {
  const extendedProducts = [...products, { id: "banana", name: "Banana", variant: "Natural", active: true }];
  const sixteen: CycleInput = {
    code: "C-101", machineId: machine.id, finishedOn: "2026-10-12", status: "finished", notes: "",
    trays: Array.from({ length: 16 }, (_, index) => {
      const position = index + 1;
      if (position <= 4) return { position, productId: "orange", resultKey: "orange-group" };
      if (position === 5) return { position, productId: "apple", resultKey: "apple-tray" };
      if (position === 6) return { position, productId: "banana", resultKey: "banana-tray" };
      return { position, productId: null, resultKey: null };
    }),
    results: [{ key: "orange-group", kg: "1.250" }, { key: "apple-tray", kg: "0.300" }, { key: "banana-tray", kg: "0" }],
  };
  const valid = validateCycle(sixteen, { ...machine, trayCount: 16 }, extendedProducts);
  assert.equal(valid.results.length, 3);
  assert.deepEqual(valid.results[0].positions, [1, 2, 3, 4]);
  assert.equal(kgTotal(valid.results.map((result) => result.kg)), "1.550");
});
