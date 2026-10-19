import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("Solo se permite dev/blackfruit.");
const base = process.env.QA_BASE_URL ?? "http://localhost:3000";

async function main() {
  const email = `improvements-${randomUUID()}@example.invalid`;
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  const marker = randomUUID().slice(0, 8);
  let actorId = "";
  let customerId = "";
  let productId = "";
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const actor = await auth.api.createUser({ body: { email, password, name: "Improvements QA", role: "admin", data: { emailVerified: true } } });
    actorId = actor.user.id;
    const productName = `Producto QA ${marker}`;
    productId = (await prisma.product.create({ data: { name: productName, variant: "Natural", unitLabel: "kg" } })).id;
    await page.goto(`${base}/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL("**/dashboard");
    await page.locator("label").filter({ hasText: /^Mes/ }).locator("select").selectOption("09");
    await page.waitForURL(/period=2026-09/);
    await page.getByLabel("Período").selectOption("range");
    await page.getByLabel("Hasta").fill("12/10/2026");
    await page.waitForURL(/view=range.*to=2026-10-12/);
    await page.getByLabel("Período").selectOption("all");
    await page.waitForURL(/view=all/);

    await page.goto(`${base}/clientes`);
    const name = `Cliente QA ${marker}`;
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const customerDialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    await customerDialog.getByLabel("Nombre", { exact: true }).fill(name);
    await customerDialog.getByLabel("Teléfono (opcional)").fill("1123456789");
    await customerDialog.getByRole("button", { name: "Guardar cliente" }).click();
    await customerDialog.waitFor({ state: "hidden" });
    customerId = (await prisma.customer.findFirstOrThrow({ where: { name }, select: { id: true } })).id;
    await page.getByLabel("Buscar cliente").fill(marker);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByRole("cell", { name }).waitFor();

    await page.goto(`${base}/dashboard`);
    await page.getByRole("button", { name: "Registrar muestra →" }).click();
    const dialog = page.getByRole("dialog", { name: "Registrar muestra" });
    await dialog.getByLabel("Buscar contactos").fill(marker);
    await dialog.getByLabel("Contacto (opcional)").selectOption(customerId);
    assert.equal(await dialog.getByLabel("Destinatario").inputValue(), name);
    assert.match(await dialog.getByLabel("Fecha de la muestra").inputValue(), /^\d{2}\/\d{2}\/\d{4}$/);
    await dialog.getByRole("button", { name: "Agregar producto" }).click();
    const productDialog = page.getByRole("dialog", { name: "Agregar producto" });
    await productDialog.waitFor();
    await productDialog.getByRole("button", { name: "Cerrar" }).click();
    await productDialog.waitFor({ state: "hidden" });
    await dialog.getByLabel("Producto del catálogo").selectOption({ label: `${productName} · Natural` });
    await dialog.getByLabel("Cantidad").fill("0.250");
    await dialog.getByLabel("Unidad").fill("kg");
    await mkdir("tmp", { recursive: true });
    await page.screenshot({ path: "tmp/improvements-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: "tmp/improvements-mobile.png", fullPage: true });
    await dialog.getByRole("button", { name: "Registrar muestra" }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await prisma.sample.count({ where: { customerId } }), 1);
    assert.deepEqual(errors, []);
    console.log("Cliente, períodos automáticos y popup de muestra: navegador correcto en escritorio y celular.");
  } catch (error) {
    console.error("QA URL:", page.url(), "headings:", await page.getByRole("heading").allTextContents(), "labels:", await page.locator("label").allTextContents());
    throw error;
  } finally {
    await context.close();
    await browser.close();
    if (actorId) {
      await prisma.sampleLine.deleteMany({ where: { sample: { createdById: actorId } } });
      await prisma.sample.deleteMany({ where: { createdById: actorId } });
      if (productId) await prisma.product.deleteMany({ where: { id: productId } });
      if (customerId) await prisma.customer.deleteMany({ where: { id: customerId } });
      await prisma.auditEvent.deleteMany({ where: { actorUserId: actorId } });
      await prisma.user.deleteMany({ where: { id: actorId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
