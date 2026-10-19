import assert from "node:assert/strict";
import test from "node:test";
import { SampleValidationError, validateSample, type SampleInput } from "../src/modules/samples/domain/sample";

function input(): SampleInput {
  return { recipientName: "Ana", sampleOn: "2026-10-11", status: "pending", deliveredOn: "", notes: "", customerId: "", lines: [{ productId: null, productName: "Naranja", variant: "Sin azúcar", quantity: "0.25", unitLabel: "kg" }] };
}

test("sample keeps product, unit and recipient without linking a contact by name", () => {
  const sample = validateSample(input(), []);
  assert.deepEqual(sample.customer, { kind: "none" });
  assert.equal(sample.lines[0].quantity, "0.250");
  assert.equal(sample.lines[0].unitLabel, "kg");
});

test("delivered status can have unknown delivery day", () => {
  const candidate = input();
  candidate.status = "delivered";
  assert.equal(validateSample(candidate, []).deliveredOn, null);
  candidate.deliveredOn = "2026-10-12";
  assert.equal(validateSample(candidate, []).deliveredOn?.toISOString().slice(0, 10), "2026-10-12");
});

test("invalid quantities, missing unit and impossible date are rejected", () => {
  for (const quantity of ["", "0", "-0.1", "0.0001", "1,5"]) {
    const candidate = input();
    candidate.lines[0].quantity = quantity;
    assert.throws(() => validateSample(candidate, []), SampleValidationError);
  }
  const noUnit = input();
  noUnit.lines[0].unitLabel = " ";
  assert.throws(() => validateSample(noUnit, []), SampleValidationError);
  const invalidDate = input();
  invalidDate.sampleOn = "2026-02-30";
  assert.throws(() => validateSample(invalidDate, []), SampleValidationError);
});
