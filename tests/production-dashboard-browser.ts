import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { createProduct } from "../src/modules/catalog/infrastructure/prisma-products";
import { createMachine } from "../src/modules/production/infrastructure/prisma-machines";
import { saveCycle } from "../src/modules/production/infrastructure/prisma-cycles";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("Solo se permite dev/blackfruit.");
const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3000";

async function main() {
  const marker = randomUUID().slice(0, 8);
  const email = `dashboard-${randomUUID()}@example.invalid`;
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  const finishedCode = `QA-final-${marker}`;
  const draftCode = `QA-borrador-${marker}`;
  let actorId = "";
  let machineId = "";
  let productId = "";
  const cycleIds: string[] = [];
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  const confirmations: string[] = [];
  page.on("dialog", (dialog) => { confirmations.push(dialog.message()); void dialog.accept(); });
  try {
    const actor = await auth.api.createUser({ body: { email, password, name: "Dashboard QA", role: "admin", data: { emailVerified: true } } });
    actorId = actor.user.id;
    machineId = await createMachine({ name: `Máquina QA ${marker}`, trayCount: 2, model: null, notes: null }, actorId, randomUUID());
    productId = await createProduct({ name: `Producto QA ${marker}` }, actorId, randomUUID());
    const trays = [
      { position: 1, productId, resultKey: "weight" },
      { position: 2, productId: null, resultKey: null },
    ];
    cycleIds.push(await saveCycle({ code: finishedCode, machineId, finishedOn: "2026-10-20", status: "finished", notes: "", trays, results: [{ key: "weight", kg: "0.875" }] }, actorId, randomUUID()));
    cycleIds.push(await saveCycle({ code: draftCode, machineId, finishedOn: "", status: "draft", notes: "", trays, results: [{ key: "weight", kg: null }] }, actorId, randomUUID()));

    await page.goto(`${baseUrl}/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL("**/dashboard");
    await page.goto(`${baseUrl}/produccion?machine=${machineId}`);
    const finished = page.getByRole("row").filter({ hasText: finishedCode });
    await finished.waitFor();
    assert.match(await finished.innerText(), /0,88 kg/);
    assert.match(await page.getByText("Kilos finales").locator("..").innerText(), /0,88 kg/);
    await mkdir("tmp/ui-review/after", { recursive: true });
    await page.screenshot({ path: "tmp/ui-review/after/production-dashboard-desktop.png", fullPage: true });
    await finished.getByRole("button", { name: `Enviar el ciclo ${finishedCode} a papelera` }).click();
    await finished.waitFor({ state: "hidden" });
    assert.match(confirmations[0], new RegExp(finishedCode));
    assert.ok((await prisma.productionCycle.findUniqueOrThrow({ where: { id: cycleIds[0] } })).deletedAt);

    await page.setViewportSize({ width: 375, height: 812 });
    const draft = page.getByRole("listitem").filter({ hasText: draftCode });
    await draft.waitFor();
    await page.screenshot({ path: "tmp/ui-review/after/production-dashboard-mobile.png", fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await draft.getByRole("button", { name: `Enviar el ciclo ${draftCode} a papelera` }).click();
    await draft.waitFor({ state: "hidden" });
    assert.match(confirmations[1], new RegExp(draftCode));
    assert.ok((await prisma.productionCycle.findUniqueOrThrow({ where: { id: cycleIds[1] } })).deletedAt);
    process.stdout.write("Dashboard: redondeo y papelera correctos en escritorio y celular.\n");
  } finally {
    await context.close();
    await browser.close();
    if (cycleIds.length) {
      await prisma.productionTray.deleteMany({ where: { cycleId: { in: cycleIds } } });
      await prisma.productionResult.deleteMany({ where: { cycleId: { in: cycleIds } } });
      await prisma.productionCycle.deleteMany({ where: { id: { in: cycleIds } } });
    }
    if (machineId) await prisma.productionMachine.deleteMany({ where: { id: machineId } });
    if (productId) await prisma.product.deleteMany({ where: { id: productId } });
    if (actorId) {
      await prisma.auditEvent.deleteMany({ where: { actorUserId: actorId } });
      await prisma.user.deleteMany({ where: { id: actorId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
