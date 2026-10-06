import assert from "node:assert/strict";
import test from "node:test";
import { createAmountSale } from "../src/modules/sales/application/create-amount-sale";
import { SaleValidationError, validateAmountSale } from "../src/modules/sales/domain/amount-sale";
import { CustomerValidationError } from "../src/modules/customers/domain/customer-selection";

test("customer selection is optional, explicit and validated", () => {
  const sale = { occurredOn: "2026-09-16", amount: "100" };
  assert.deepEqual(validateAmountSale(sale).customer, { kind: "none" });
  assert.throws(() => validateAmountSale({ ...sale, customerId: "inventado" }), CustomerValidationError);
  assert.throws(() => validateAmountSale({ ...sale, customerId: "new", customerName: " " }), CustomerValidationError);
  assert.throws(() => validateAmountSale({ ...sale, customerId: "new", customerName: "QA", customerEmail: "incorrecto" }), CustomerValidationError);
  assert.deepEqual(validateAmountSale({ ...sale, customerId: "new", customerName: " QA " }).customer, { kind: "new", data: { name: "QA", email: null, phone: null } });
});

test("a local date and two decimal places remain exact", () => {
  const sale = validateAmountSale({ occurredOn: "2026-09-16", amount: "3200.5" });
  assert.equal(sale.occurredOn.toISOString(), "2026-09-16T00:00:00.000Z");
  assert.equal(sale.total, "3200.50");
  assert.equal(sale.channel, null);
});

test("invalid days and amounts never reach persistence", async () => {
  const badInputs = [
    { occurredOn: "2026-02-30", amount: "100" },
    { occurredOn: "2026-09-16", amount: "0" },
    { occurredOn: "2026-09-16", amount: "0.001" },
    { occurredOn: "2026-09-16", amount: "-100" },
    { occurredOn: "2026-09-16", amount: "1,500" },
  ];
  let writes = 0;
  for (const input of badInputs) {
    await assert.rejects(
      createAmountSale(input, "actor", "81eead57-6047-4560-87ad-c25c49cac078", {
        async create() { writes += 1; return { id: "sale", total: "100.00" }; },
      }),
      SaleValidationError,
    );
  }
  assert.equal(writes, 0);
});
