import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedLoginEmail } from "../src/modules/auth/domain/login-allowlist";

const configured = "owner@example.invalid, sibling@example.invalid";

test("solo dos correos completos pueden entrar con lista configurada", () => {
  assert.equal(isAllowedLoginEmail(" OWNER@example.invalid ", configured, true), true);
  assert.equal(isAllowedLoginEmail("sibling@example.invalid", configured, true), true);
  assert.equal(isAllowedLoginEmail("other@example.invalid", configured, true), false);
  assert.equal(isAllowedLoginEmail("owner@example.invalid.attacker.test", configured, true), false);
});

test("producción cierra el acceso si faltan los dos correos o la lista es inválida", () => {
  for (const value of [undefined, "", "owner@example.invalid", "owner@example.invalid,OWNER@example.invalid", "owner@example.invalid,not-an-email"]) {
    assert.equal(isAllowedLoginEmail("owner@example.invalid", value, true), false);
  }
  assert.equal(isAllowedLoginEmail("qa@example.invalid", undefined, false), true);
});
