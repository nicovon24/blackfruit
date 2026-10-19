import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("Solo se permite dev/blackfruit.");
const base = process.env.QA_BASE_URL ?? "http://localhost:3000";

async function main() {
  const email = `trash-${randomUUID()}@example.invalid`;
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
  page.on("dialog", (dialog) => { void dialog.accept(); });
  try {
    const actor = await auth.api.createUser({ body: { email, password, name: "Trash QA", role: "admin", data: { emailVerified: true } } });
    actorId = actor.user.id;
    await page.goto(`${base}/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL("**/dashboard");
    const navigation = page.getByRole("navigation", { name: "Navegación principal" });
    assert.deepEqual(await navigation.getByRole("link").allTextContents(), ["Inicio", "Ventas", "Clientes", "Muestras", "Dashboard", "Máquinas", "Productos", "Papelera"]);
    assert.deepEqual(await navigation.locator(".nav-caption").allTextContents(), ["Comercial", "Producción", "Catálogo"]);
    await navigation.getByRole("link", { name: "Dashboard" }).click();
    await page.waitForURL("**/produccion");
    assert.equal(await navigation.getByRole("link", { name: "Dashboard" }).getAttribute("aria-current"), "page");
    assert.equal(await navigation.getByRole("link", { name: "Máquinas" }).getAttribute("aria-current"), null);
    await navigation.getByRole("link", { name: "Máquinas" }).click();
    await page.waitForURL("**/produccion/maquina");
    assert.equal(await navigation.getByRole("link", { name: "Máquinas" }).getAttribute("aria-current"), "page");

    await navigation.getByRole("link", { name: "Productos", exact: true }).click();
    await page.waitForURL("**/productos");
    assert.equal(await navigation.getByRole("link", { name: "Productos", exact: true }).getAttribute("aria-current"), "page");
    await page.getByRole("button", { name: "Agregar producto" }).click();
    const add = page.getByRole("dialog", { name: "Agregar producto" });
    await add.getByLabel("Producto", { exact: true }).fill(`Producto QA ${marker}`);
    await add.getByLabel("Variante (opcional)").fill("Natural");
    await add.getByRole("button", { name: "Agregar al catálogo" }).click();
    await add.waitFor({ state: "hidden" });
    productId = (await prisma.product.findFirstOrThrow({ where: { name: `Producto QA ${marker}` }, select: { id: true } })).id;
    await page.getByLabel("Buscar producto o variante").fill(marker);
    await page.getByRole("button", { name: "Aplicar" }).click();
    const row = page.getByRole("row").filter({ hasText: marker });
    await row.getByRole("button", { name: "Editar" }).click();
    const edit = page.getByRole("dialog", { name: "Editar producto" });
    await edit.getByLabel("Variante (opcional)").fill("Sin azúcar");
    await edit.getByRole("button", { name: "Guardar cambios" }).click();
    await edit.waitFor({ state: "hidden" });
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).variant, "Sin azúcar");
    await mkdir("tmp", { recursive: true });
    await page.screenshot({ path: "tmp/trash-products-desktop.png", fullPage: true });

    await navigation.getByRole("link", { name: "Clientes", exact: true }).click();
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const customerDialog = page.getByRole("dialog", { name: "Nuevo cliente" });
    await customerDialog.getByLabel("Nombre", { exact: true }).fill(`Cliente QA ${marker}`);
    await customerDialog.getByRole("button", { name: "Guardar cliente" }).click();
    await customerDialog.waitFor({ state: "hidden" });
    customerId = (await prisma.customer.findFirstOrThrow({ where: { name: `Cliente QA ${marker}` }, select: { id: true } })).id;
    await page.getByLabel("Buscar cliente").fill(marker);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByRole("row").filter({ hasText: marker }).getByRole("button", { name: "Enviar a papelera" }).click();
    await page.getByText("No encontramos clientes con esa búsqueda.").waitFor();
    assert.ok((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).deletedAt);
    await navigation.getByRole("link", { name: "Papelera", exact: true }).click();
    await page.waitForURL("**/papelera");
    await page.getByRole("navigation", { name: "Tipos de registros" }).getByRole("link", { name: "Clientes" }).click();
    await page.waitForURL("**/papelera?type=customers");
    await page.getByLabel("Buscar en papelera").fill(marker);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.waitForURL((url) => url.pathname === "/papelera" && url.searchParams.get("q") === marker);
    await page.getByRole("listitem").filter({ hasText: marker }).getByRole("button", { name: "Restaurar" }).click();
    await page.getByText("No hay registros para esta búsqueda.").waitFor();
    assert.equal((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).deletedAt, null);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: "tmp/trash-mobile.png", fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.deepEqual(errors, []);
    console.log("Popups, Productos y Papelera: navegador correcto en escritorio y celular.");
  } finally {
    await context.close(); await browser.close();
    if (customerId) await prisma.customer.deleteMany({ where: { id: customerId } });
    if (productId) await prisma.product.deleteMany({ where: { id: productId } });
    if (actorId) { await prisma.auditEvent.deleteMany({ where: { actorUserId: actorId } }); await prisma.user.deleteMany({ where: { id: actorId } }); }
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
