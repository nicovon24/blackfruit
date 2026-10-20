import assert from "node:assert/strict";
import test from "node:test";
import { formatDashboardKg } from "../src/lib/format-dashboard-kg";

test("dashboard rounds kilos to two decimals without floating point drift", () => {
  assert.equal(formatDashboardKg("1.005"), "1,01");
  assert.equal(formatDashboardKg("0.875"), "0,88");
  assert.equal(formatDashboardKg("1.000"), "1");
  assert.equal(formatDashboardKg("0.000"), "0");
  assert.equal(formatDashboardKg("1234.004"), "1.234");
  assert.equal(formatDashboardKg("-0.005"), "-0,01");
  assert.equal(formatDashboardKg("+0.004"), "0");
  assert.equal(formatDashboardKg("2.500"), "2,5");
});
