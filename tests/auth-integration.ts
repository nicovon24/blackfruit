import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { createAmountSale } from "../src/modules/sales/application/create-amount-sale";
import { moveSaleToTrash, restoreSale, SaleConflictError, updateAmountSale, voidSale } from "../src/modules/sales/application/manage-sale";
import { prismaAmountSaleWriter } from "../src/modules/sales/infrastructure/prisma-amount-sale-writer";
import { currentBusinessMonth, getSalesSummary, getSalesBreakdown, listSales } from "../src/modules/sales/infrastructure/prisma-sale-queries";
import { prismaSaleMutator } from "../src/modules/sales/infrastructure/prisma-sale-mutator";

if (process.env.NEON_BRANCH !== "dev/blackfruit") {
  throw new Error("La prueba de integración solo puede ejecutarse en dev/blackfruit.");
}

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const createdIds: string[] = [];
const createdSaleIds: string[] = [];

async function checkRole(role: "admin" | "user", expectedLocation?: string) {
  const email = `auth-qa-${randomUUID()}@example.invalid`;
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  const created = await auth.api.createUser({
    body: { email, password, name: "Auth QA", role, data: { emailVerified: true } },
  });
  createdIds.push(created.user.id);

  const signIn = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(signIn.status, 200, `Falló el login del rol ${role}: ${await signIn.text()}`);

  const cookie = signIn.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  assert.ok(cookie.includes("session_token"), "Falta la cookie de sesión");

  const dashboard = await fetch(`${baseUrl}/dashboard`, {
    headers: { cookie },
    redirect: "manual",
  });

  if (expectedLocation) {
    assert.equal(dashboard.status, 307);
    assert.equal(dashboard.headers.get("location"), expectedLocation);
    const imports = await fetch(`${baseUrl}/importar`, { headers: { cookie }, redirect: "manual" });
    assert.equal(imports.status, 307); assert.equal(imports.headers.get("location"), expectedLocation);
    const upload = await fetch(`${baseUrl}/api/imports/upload`, { method: "POST", headers: { cookie, origin: baseUrl } });
    assert.equal(upload.status, 403);
    return;
  }

  assert.equal(dashboard.status, 200);
  assert.ok((await dashboard.text()).includes("Resumen del negocio"));

  const month = currentBusinessMonth();
  const before = await getSalesSummary(month);
  const dailyBefore = await getSalesBreakdown(month);
  const requestKey = randomUUID();
  const saved = await createAmountSale(
    { occurredOn: `${month}-02`, amount: "3200.50" },
    created.user.id,
    requestKey,
    prismaAmountSaleWriter,
  );
  createdSaleIds.push(saved.id);
  const repeated = await createAmountSale(
    { occurredOn: `${month}-02`, amount: "3200.50" },
    created.user.id,
    requestKey,
    prismaAmountSaleWriter,
  );
  assert.equal(repeated.id, saved.id, "Un reintento duplicó la venta");

  const after = await getSalesSummary(month);
  assert.equal(after.count, before.count + 1);
  assert.equal(Number(after.total) - Number(before.total), 3200.5);
  assert.equal(after.identifiedCustomers, before.identifiedCustomers);
  const dailyAfter = await getSalesBreakdown(month);
  assert.equal(Number(dailyAfter.daily[1].total) - Number(dailyBefore.daily[1].total), 3200.5);
  assert.ok((await listSales(50, month)).some((sale) => sale.id === saved.id));
  assert.ok(!(await listSales(50, "1999-01")).some((sale) => sale.id === saved.id));

  const detail = await fetch(`${baseUrl}/ventas/${saved.id}`, { headers: { cookie } });
  assert.equal(detail.status, 200);
  assert.ok((await detail.text()).includes("3.200,50"));

  await updateAmountSale(saved.id, 1, {
    occurredOn: `${month}-02`, amount: "4000.50", notes: "Editada en QA",
  }, created.user.id, prismaSaleMutator);
  await assert.rejects(
    updateAmountSale(saved.id, 1, { occurredOn: `${month}-02`, amount: "1" }, created.user.id, prismaSaleMutator),
    SaleConflictError,
  );
  const edited = await getSalesSummary(month);
  assert.equal(edited.count, before.count + 1);
  assert.equal(Number(edited.total) - Number(before.total), 4000.5);

  await moveSaleToTrash(saved.id, 2, created.user.id, prismaSaleMutator);
  assert.deepEqual(await getSalesSummary(month), before);
  await restoreSale(saved.id, 3, created.user.id, prismaSaleMutator);
  assert.equal((await getSalesSummary(month)).count, before.count + 1);

  await voidSale(saved.id, 4, created.user.id, prismaSaleMutator);
  assert.deepEqual(await getSalesSummary(month), before);
  assert.deepEqual(await getSalesBreakdown(month), dailyBefore);
  await moveSaleToTrash(saved.id, 5, created.user.id, prismaSaleMutator);
  await restoreSale(saved.id, 6, created.user.id, prismaSaleMutator);
  assert.equal((await prisma.sale.findUniqueOrThrow({ where: { id: saved.id } })).status, "void");
  assert.deepEqual(await getSalesSummary(month), before);
  assert.equal(await prisma.auditEvent.count({ where: { entityType: "sale", entityId: saved.id } }), 7);

  const signOut = await fetch(`${baseUrl}/api/auth/sign-out`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", origin: baseUrl },
    body: "{}",
  });
  assert.equal(signOut.status, 200);

  const afterSignOut = await fetch(`${baseUrl}/dashboard`, {
    headers: { cookie },
    redirect: "manual",
  });
  assert.equal(afterSignOut.status, 307);
  assert.equal(afterSignOut.headers.get("location"), "/login");
}

async function main() {
  try {
    const unauthenticated = await fetch(`${baseUrl}/api/imports/upload`, { method: "POST", headers: { origin: baseUrl } });
    assert.equal(unauthenticated.status, 401);
    await checkRole("admin");
    await checkRole("user", "/acceso-denegado");
    process.stdout.write("Integración de acceso y ciclo de venta con auditoría e indicadores: correcta.\n");
  } finally {
    for (const id of createdSaleIds) {
      await prisma.auditEvent.deleteMany({ where: { entityType: "sale", entityId: id } });
      await prisma.sale.delete({ where: { id } });
    }
    for (const id of createdIds) {
      await prisma.user.delete({ where: { id } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
