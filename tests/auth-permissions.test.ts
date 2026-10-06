import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission, permissions } from "../src/modules/auth/application/permissions";

test("an admin can use every declared private capability", () => {
  for (const permission of permissions) {
    assert.equal(hasPermission("admin", permission), true);
  }
});

test("missing, unknown and ordinary roles have no private access", () => {
  for (const role of [undefined, null, "", "user", "viewer", "administrator"]) {
    assert.equal(hasPermission(role, "dashboard:read"), false);
    assert.equal(hasPermission(role, "sales:write"), false);
  }
});

test("a comma separated role only grants access when admin is an exact role", () => {
  assert.equal(hasPermission("user, admin", "sales:write"), true);
  assert.equal(hasPermission("superadmin", "sales:write"), false);
});
