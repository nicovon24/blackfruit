import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Page } from "playwright-core";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("Solo se permite dev/blackfruit.");
const base = process.env.QA_BASE_URL ?? "http://localhost:3000";
const folder = "tmp/ui-review/after";
const routes = ["dashboard?view=all", "ventas", "clientes", "muestras", "productos", "produccion", "produccion/maquina", "importar", "produccion/importar", "papelera"];
const captureStyle = "nextjs-portal { visibility: hidden; }";

async function isDark(page: Page) {
  return page.locator("html").evaluate((element) => element.classList.contains("dark"));
}
async function theme(page: Page, value: string) {
  await page.getByLabel("Tema de la interfaz").selectOption(value);
  await page.waitForFunction((expected) => document.documentElement.classList.contains("dark") === expected, value === "dark");
}
async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors: string[] = [];
  const checks: Array<{ route: string; width: number; theme: string; overflow: boolean }> = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let actorId = "";
  const email = `ui-theme-${randomUUID()}@example.invalid`;
  const password = randomBytes(24).toString("base64url") + "Aa1!";
  try {
    await mkdir(folder, { recursive: true });
    await page.goto(`${base}/login`);
    await page.getByLabel("Tema de la interfaz").selectOption("system");
    assert.equal(await isDark(page), false);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
    await theme(page, "light");
    await page.reload();
    assert.equal(await isDark(page), false, "Explicit light overrides dark system after reload");
    await theme(page, "dark");
    await page.screenshot({ path: `${folder}/login-dark-1440.png`, fullPage: true });
    const second = await context.newPage();
    await second.goto(`${base}/login`);
    assert.equal(await isDark(second), true);
    await theme(page, "light");
    await second.waitForFunction(() => !document.documentElement.classList.contains("dark"));
    await second.close();

    const actor = await auth.api.createUser({ body: { email, password, name: "Interfaz QA", role: "admin", data: { emailVerified: true } } });
    actorId = actor.user.id;
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await page.waitForURL("**/dashboard");

    // Capture the real initial empty state before adding owned QA rows.
    await page.goto(`${base}/muestras`);
    await page.screenshot({ path: `${folder}/muestras-inicial-1440.png`, fullPage: true });
    assert.equal(await page.getByRole("link", { name: "Revisar importadas", exact: true }).count(), 1);
    const sampleData = (number: number) => ({ recipientName: `Muestra QA ${number} · Destinatario con un nombre extenso para comprobar el ajuste`, sampleOn: new Date("2026-10-18T00:00:00Z"), status: "pending", createdById: actorId });
    await prisma.sample.create({ data: { ...sampleData(1), lines: { create: { position: 1, productName: "Naranja de prueba", variant: "Natural", quantity: "0.250", unitLabel: "kg" } } } });
    await page.reload();
    await page.screenshot({ path: `${folder}/muestras-una-fila-1440.png`, fullPage: true });
    await prisma.sample.createMany({ data: Array.from({ length: 30 }, (_, index) => sampleData(index + 2)) });

    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 });
      for (const value of ["light", "dark"]) {
        await theme(page, value);
        for (const route of routes) {
          await page.goto(`${base}/${route}`);
          await page.locator("h1").waitFor();
          await page.waitForFunction(() => !document.querySelector<HTMLSelectElement>('select[aria-label="Tema de la interfaz"]')?.disabled);
          await page.evaluate(() => document.fonts.ready);
          if (route === "produccion/maquina") {
            await page.waitForFunction(() => document.querySelector("canvas") || document.body.textContent?.includes("El 3D no"));
            await page.getByText("Comprobando compatibilidad 3D…", { exact: true }).waitFor({ state: "hidden" });
            await page.getByText("Preparando el deshidratador 3D…", { exact: true }).waitFor({ state: "hidden" });
          }
          await page.screenshot({ path: `${folder}/${route.replace(/[/?=]/g, "-")}-${value}-${width}.png`, fullPage: true, style: captureStyle });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
          checks.push({ route, width, theme: value, overflow });
          console.log(`${value} ${width} ${route}: ${overflow ? "OVERFLOW" : "ok"}`);
        }
        for (const [route, trigger] of [["clientes", "Nuevo cliente"], ["productos", "Agregar producto"], ["ventas", "Nueva venta"], ["muestras", "Registrar muestra"]]) {
          await page.goto(`${base}/${route}`);
          const opener = page.getByRole("button", { name: trigger, exact: true }).first();
          await opener.click();
          const dialog = page.getByRole("dialog");
          await dialog.locator("form").waitFor();
          assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true);
          assert.equal(await dialog.evaluate((element) => element.scrollWidth > element.clientWidth), false);
          const first = dialog.locator('button, input:not([type="hidden"]), select, textarea, a[href]').filter({ visible: true }).first();
          const last = dialog.locator('button, input:not([type="hidden"]), select, textarea, a[href]').filter({ visible: true }).last();
          await last.focus();
          await page.keyboard.press("Tab");
          assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true);
          await first.focus();
          await page.keyboard.press("Shift+Tab");
          assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true);
          await first.focus();
          await page.screenshot({ path: `${folder}/${route}-dialog-${value}-${width}.png`, style: captureStyle });
          await page.keyboard.press("Escape");
          await dialog.waitFor({ state: "hidden" });
          await page.waitForFunction((element) => element === document.activeElement, await opener.elementHandle());
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/ventas?q=QA-NO-EXISTE`);
    await page.getByRole("heading", { name: "No hay ventas para esta consulta" }).waitFor();
    await page.goto(`${base}/muestras?page=2`);
    await page.getByRole("link", { name: "Anterior", exact: true }).waitFor();
    await page.goto(`${base}/muestras?page=999`);
    await page.getByRole("link", { name: "Anterior", exact: true }).waitFor();
    await page.goto(`${base}/productos?status=archived&q=QA-NO-EXISTE`);
    await page.getByRole("button", { name: "Limpiar buscar producto" }).click();
    await page.waitForURL((url) => !url.searchParams.get("q") && url.searchParams.get("status") === "archived");

    await page.goto(`${base}/clientes`);
    await page.getByRole("button", { name: "Nuevo cliente" }).first().click();
    const customer = page.getByRole("dialog");
    await customer.getByLabel("Nombre", { exact: true }).fill("   ");
    await customer.getByLabel("Teléfono (opcional)").fill("1123456789");
    await customer.getByRole("button", { name: "Guardar cliente" }).click();
    await customer.getByRole("alert").waitFor();
    assert.equal(await customer.getByLabel("Teléfono (opcional)").inputValue(), "1123456789");
    assert.equal(await customer.getByLabel("Nombre", { exact: true }).getAttribute("aria-invalid"), "true");
    await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "alert");
    await customer.getByLabel("Nombre", { exact: true }).fill("Borrador QA");
    // A real OS theme event reaches an open modal without clicking behind its focus trap.
    await page.evaluate(() => localStorage.setItem("blackfruit-theme", "system"));
    const sibling = await context.newPage();
    await sibling.goto(`${base}/login`);
    await theme(sibling, "light");
    await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));
    assert.equal(await customer.getByLabel("Nombre", { exact: true }).inputValue(), "Borrador QA");
    await sibling.close();
    page.once("dialog", (dialog) => { void dialog.accept(); });
    await page.keyboard.press("Escape");
    await customer.waitFor({ state: "hidden" });

    for (const width of [768, 720]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${base}/productos`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    const restricted = await browser.newContext({ colorScheme: "dark" });
    await restricted.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
    });
    const restrictedPage = await restricted.newPage();
    await restrictedPage.goto(`${base}/login`);
    await theme(restrictedPage, "light");
    assert.equal(await isDark(restrictedPage), false);
    await restricted.close();
    await writeFile(`${folder}/report.json`, JSON.stringify({ checks, errors }, null, 2));
    assert.deepEqual(checks.filter((check) => check.overflow), []);
    assert.deepEqual(errors, []);
    console.log("Tema, persistencia, pestañas, almacenamiento bloqueado, foco, paginación y capturas: OK.");
  } finally {
    await context.close();
    await browser.close();
    if (actorId) {
      await prisma.sampleLine.deleteMany({ where: { sample: { createdById: actorId } } });
      await prisma.sample.deleteMany({ where: { createdById: actorId } });
      await prisma.auditEvent.deleteMany({ where: { actorUserId: actorId } });
      await prisma.user.deleteMany({ where: { id: actorId } });
    }
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
