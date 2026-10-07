import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { testOrigin } from "./test-origin";

if (process.env.NEON_BRANCH !== "dev/blackfruit") {
  throw new Error("La prueba de navegador solo puede ejecutarse en dev/blackfruit.");
}

async function main() {
  const email = `browser-qa-${randomUUID()}@example.invalid`;
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  let userId: string | undefined;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !/401 \(unauthorized\)/i.test(message.text())) errors.push(message.text());
  });

  try {
    const created = await auth.api.createUser({
      body: { email, password, name: "Browser QA", role: "admin", data: { emailVerified: true } },
    });
    userId = created.user.id;
    await mkdir("tmp", { recursive: true });

    await page.goto(`${testOrigin}/login`);
    await page.screenshot({ caret: "initial", path: "tmp/qa-login-desktop.png" });
    await page.getByLabel("Email").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "password");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Mostrar clave" }).click();
    assert.equal(await page.getByLabel("Contraseña").getAttribute("type"), "text");
    await page.getByRole("button", { name: "Ocultar clave" }).click();
    await page.getByLabel("Contraseña").fill("incorrect-password");
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Revisá el email" }).waitFor();
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL("**/dashboard");
    assert.equal(await page.getByText("Panel privado").count(), 1);
    await page.screenshot({ caret: "initial", path: "tmp/qa-dashboard-desktop.png" });

    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.screenshot({ caret: "initial", path: "tmp/qa-dashboard-mobile.png", fullPage: true });

    await page.getByRole("button", { name: "Nueva venta", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByLabel("Importe total (ARS)").fill("3200.50");
    await page.getByLabel("Canal").fill("Instagram");
    const customerName = `Cliente QA ${randomUUID()}`;
    await page.getByRole("button", { name: "Crear cliente", exact: true }).click();
    await page.getByLabel("Nombre del cliente").fill(customerName);
    await page.getByLabel("Teléfono (opcional)").fill("3510000000");
    await page.screenshot({ caret: "initial", path: "tmp/qa-sale-dialog-mobile.png", fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.getByRole("button", { name: "Guardar venta", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.ok(page.url().endsWith("/dashboard"));
    await page.reload();
    await page.getByRole("img", { name: "Importe diario" }).waitFor();
    await page.screenshot({ caret: "initial", path: "tmp/qa-dashboard-populated-mobile.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${testOrigin}/ventas`);
    await page.getByRole("textbox", { name: "Buscar ventas" }).fill("no-existe-qa");
    await page.getByText("No encontramos ventas").waitFor();
    await page.getByRole("textbox", { name: "Buscar ventas" }).fill(customerName);
    await page.getByRole("table").getByText("$ 3.200,50").waitFor();
    await page.getByRole("table").getByRole("button", { name: "Ver venta" }).click();
    await page.getByRole("dialog").getByText(customerName, { exact: true }).waitFor();
    await page.getByLabel("Importe (ARS)").fill("4000.50");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("table").getByText("$ 4.000,50").waitFor();
    await page.reload();
    await page.getByRole("textbox", { name: "Buscar ventas" }).fill(customerName);
    await page.getByRole("table").getByText("$ 4.000,50").waitFor();
    await page.getByRole("table").getByRole("button", { name: "Ver venta" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Anular venta", exact: true }).click();
    await page.getByRole("alertdialog").waitFor();
    await page.getByRole("alertdialog").press("Escape");
    await page.getByRole("alertdialog").waitFor({ state: "hidden" });
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Anular venta", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await page.getByRole("dialog").getByText("Anulada", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Enviar a papelera", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("link", { name: "Ver papelera" }).click();
    const qaTrashedSale = page.getByRole("listitem").filter({ hasText: "$ 4.000,50" });
    await qaTrashedSale.getByRole("button", { name: "Restaurar" }).click();
    await qaTrashedSale.waitFor({ state: "hidden" });
    assert.ok(page.url().endsWith("/ventas/papelera"));
    await page.goto(`${testOrigin}/ventas`);
    await page.getByRole("textbox", { name: "Buscar ventas" }).fill(customerName);
    await page.getByRole("table").getByText("Anulada", { exact: true }).waitFor();

    await page.goto(`${testOrigin}/dashboard`);
    assert.equal(await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Importar" }).count(), 0);
    await page.getByRole("button", { name: "Importar Excel" }).click();
    await page.getByRole("dialog", { name: "Importar ventas" }).waitFor();
    await page.getByLabel("Archivo de ventas").setInputFiles({ name: "qa-browser.csv", mimeType: "text/csv", buffer: Buffer.from("Fecha,Nombre,Importe\\n2026-09-16,QA importado,1500\\n2026-09-17,QA cero,0\\n".replaceAll("\\n", "\n")) });
    await page.getByRole("button", { name: "Cargar archivo", exact: true }).click();
    await page.getByLabel("Nombre de la fuente").fill(`qa-browser-${randomUUID()}`);
    const discard = page.waitForEvent("dialog").then(async (prompt) => { assert.match(prompt.message(), /descartar/i); await prompt.dismiss(); });
    await page.getByRole("button", { name: "Cerrar importación" }).click();
    await discard;
    assert.equal(await page.getByRole("dialog", { name: "Importar ventas" }).isVisible(), true);
    await page.getByRole("button", { name: "Revisar archivo", exact: true }).click();
    await page.getByLabel("Tratamiento fila 3").selectOption("excluded");
    await page.getByLabel("Cliente fila 2").selectOption({ label: `${customerName} · 3510000000` });
    await page.getByRole("button", { name: "Actualizar revisión", exact: true }).first().click();
    await page.getByRole("checkbox").check();
    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.screenshot({ caret: "initial", path: "tmp/qa-import-review-mobile.png", fullPage: true });
    await page.getByRole("button", { name: "Confirmar importación (1 ventas)", exact: true }).click();
    await page.getByRole("heading", { name: "Importación confirmada" }).waitFor();
    await page.reload();
    await page.getByRole("button", { name: "Importar Excel" }).click();
    await page.getByText("Últimas importaciones confirmadas (1)").waitFor();

    await page.goto(`${testOrigin}/dashboard`);
    assert.equal(await page.locator(".app-topbar").getByRole("button", { name: "Salir" }).count(), 0);
    assert.equal(await page.locator(".app-sidebar").getByRole("button", { name: "Salir" }).count(), 1);
    await page.getByRole("button", { name: "Salir" }).click();
    await page.waitForURL("**/login");
    await page.screenshot({ caret: "initial", path: "tmp/qa-login-mobile.png", fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.setViewportSize({ width: 320, height: 740 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    assert.deepEqual(errors, []);
    process.stdout.write("Login, popups, clientes, ciclo de venta e importación desde Chrome: correcto.\n");
  } finally {
    await context.close();
    await browser.close();
    if (userId) {
      const customerAudits = await prisma.auditEvent.findMany({ where: { actorUserId: userId, entityType: "customer" }, select: { entityId: true } });
      await prisma.importSourceRow.deleteMany({ where: { batch: { actorId: userId } } });
      await prisma.importBatch.deleteMany({ where: { actorId: userId } });
      await prisma.auditEvent.deleteMany({ where: { actorUserId: userId } });
      await prisma.sale.deleteMany({ where: { createdById: userId } });
      await prisma.customer.deleteMany({ where: { id: { in: customerAudits.map((event) => event.entityId) } } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
