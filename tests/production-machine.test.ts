import assert from "node:assert/strict";
import test from "node:test";
import { MachineValidationError, validateMachine } from "../src/modules/production/domain/machine";

test("machine allows independent names and sixteen trays", () => {
  assert.deepEqual(validateMachine({ name: "  Máquina A  ", trayCount: "16", model: "  Modelo X  " }), { name: "Máquina A", trayCount: 16, model: "Modelo X", notes: null });
  assert.equal(validateMachine({ name: "Máquina grande", trayCount: "128" }).trayCount, 128);
});

test("machine rejects invalid tray counts and oversized fields", () => {
  for (const trayCount of ["", "0", "-1", "1.5", "129", "1e2", " 16 "]) {
    assert.throws(() => validateMachine({ name: "A", trayCount }), MachineValidationError);
  }
  assert.throws(() => validateMachine({ name: "  ", trayCount: "16" }), MachineValidationError);
  assert.throws(() => validateMachine({ name: "A", trayCount: "16", notes: "x".repeat(2001) }), MachineValidationError);
});
