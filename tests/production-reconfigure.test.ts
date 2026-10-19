import assert from "node:assert/strict";
import test from "node:test";
import { reconfigureTrays } from "../src/modules/production/domain/reconfigure-trays";

const trays = [
  { position: 1, productId: "orange", resultKey: "orange" },
  { position: 2, productId: "orange", resultKey: "orange" },
  { position: 3, productId: "apple", resultKey: "apple" },
];
const weights = { orange: "1.250", apple: "0" };
const key = () => "new";

test("same product is a no-op and preserves measured group", () => {
  const result = reconfigureTrays(trays, weights, { kind: "product", position: 1, productId: "orange" }, key);
  assert.equal(result.changed, false);
  assert.equal(result.weights.orange, "1.250");
});

test("partial group change invalidates the old measured result but preserves unrelated zero", () => {
  const result = reconfigureTrays(trays, weights, { kind: "product", position: 1, productId: "apple" }, key);
  assert.deepEqual(result.affected, [{ positions: [1, 2], kg: "1.250" }]);
  assert.equal(result.weights.orange, "");
  assert.equal(result.weights.apple, "0");
  assert.equal(result.weights[result.trays[0].resultKey!], "");
});

test("separating a measured group makes both results pending", () => {
  const result = reconfigureTrays(trays, weights, { kind: "separate", positions: [1] }, key);
  assert.equal(result.affected.length, 1);
  assert.equal(result.weights.orange, "");
  assert.equal(result.weights[result.trays[0].resultKey!], "");
  assert.equal(result.weights.apple, "0");
});

test("grouping measured individual and group results never carries their weights forward", () => {
  const sameProduct = trays.map((tray) => tray.position === 3 ? { ...tray, productId: "orange" } : tray);
  const result = reconfigureTrays(sameProduct, weights, { kind: "group", positions: [2, 3] }, key);
  assert.deepEqual(result.affected.map((item) => item.kg), ["1.250", "0"]);
  assert.equal(result.weights.orange, "");
  assert.equal(result.weights[result.trays[1].resultKey!], "");
});
