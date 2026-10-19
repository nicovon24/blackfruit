import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("Solo se permite dev/blackfruit.");
const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const preferenceKey = "blackfruit:production:team-panel-visible";

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let actorId = "";
  let machineId = "";
  try {
    const email = `viewer-qa-${randomUUID()}@example.invalid`;
    const password = `${randomBytes(24).toString("base64url")}Aa1!`;
    actorId = (await auth.api.createUser({ body: { email, password, name: "Visor QA", role: "admin", data: { emailVerified: true } } })).user.id;
    machineId = (await prisma.productionMachine.create({ data: { name: `Visor QA ${randomUUID().slice(0, 8)}`, trayCount: 16 } })).id;
    await page.goto(`${baseUrl}/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL("**/dashboard");
    const previewUrl = `${baseUrl}/produccion/maquina?machine=${machineId}`;
    await page.goto(previewUrl);
    const showPanel = page.getByRole("checkbox", { name: "Mostrar tu equipo" });
    const panel = page.getByRole("complementary", { name: "Tu equipo", includeHidden: true });
    const controls = page.getByRole("group", { name: "Controles del modelo" });
    await controls.waitFor();
    assert.equal(await page.getByText("Sin ciclo seleccionado", { exact: true }).count(), 0);
    assert.equal(await page.getByText("Vista previa · 16 bandejas", { exact: true }).count(), 0);
    assert.equal(await showPanel.isChecked(), false);
    assert.equal(await panel.isVisible(), false);
    assert.equal(await controls.getByRole("button").count(), 3);
    assert.equal(await page.getByRole("combobox", { name: "Vista de la máquina" }).count(), 0);
    const focus = page.getByRole("button", { name: "Acercar bandeja", exact: true });
    assert.equal(await focus.innerText(), "");
    for (const name of ["Acercar", "Alejar"]) await controls.getByRole("button", { name, exact: true }).click();
    await focus.click();
    await showPanel.check();
    await panel.getByRole("button", { name: "Seleccionar bandeja 1", exact: true }).click();
    await page.getByText("Vista general · tocá una bandeja para seleccionarla").waitFor();
    assert.equal(await focus.count(), 0);
    await controls.getByRole("button", { name: "Pantalla completa", exact: true }).click();
    await page.waitForFunction(() => document.fullscreenElement !== null);
    assert.deepEqual(await page.evaluate(() => ({
      hasCanvas: Boolean(document.fullscreenElement?.querySelector("canvas")),
      hasPieces: Boolean(document.fullscreenElement?.querySelector("details")),
      hasPanel: Boolean(document.fullscreenElement?.querySelector("aside")),
      fillsViewport: Math.abs((document.fullscreenElement?.getBoundingClientRect().height ?? 0) - innerHeight) < 1,
    })), { hasCanvas: true, hasPieces: false, hasPanel: false, fillsViewport: true });
    await page.waitForFunction(() => {
      const viewport = document.fullscreenElement?.getBoundingClientRect();
      const canvas = document.fullscreenElement?.querySelector("canvas")?.getBoundingClientRect();
      return Boolean(viewport && canvas && Math.abs(viewport.width - canvas.width) < 1 && Math.abs(viewport.height - canvas.height) < 1);
    }, undefined, { timeout: 5000 });
    await mkdir("tmp", { recursive: true });
    await page.screenshot({ path: "tmp/qa-viewer-fullscreen.png" });
    const fullscreenControls = page.getByRole("group", { name: "Controles de pantalla completa" });
    await fullscreenControls.getByRole("button", { name: "Acercar" }).click();
    await fullscreenControls.getByRole("button", { name: "Alejar" }).click();
    await page.getByRole("button", { name: "Salir de pantalla completa" }).click();
    await page.waitForFunction(() => document.fullscreenElement === null);
    await panel.getByRole("button", { name: "Seleccionar bandeja 1", exact: true }).click();
    await focus.waitFor();
    await showPanel.uncheck();
    await page.getByText("Piezas visibles", { exact: true }).click();
    await page.getByRole("checkbox", { name: "Ver interior", exact: true }).check();
    for (const name of ["Pared derecha", "Techo y controles"]) assert.equal(await page.getByRole("checkbox", { name, exact: true }).isChecked(), false);
    await page.getByRole("checkbox", { name: "Pared derecha", exact: true }).check();
    assert.equal(await page.getByRole("checkbox", { name: "Ver interior", exact: true }).isChecked(), false);
    await page.getByRole("checkbox", { name: "Puerta", exact: true }).uncheck();
    assert.equal(await page.getByRole("checkbox", { name: "Puerta abierta", exact: true }).isDisabled(), true);
    await page.getByRole("checkbox", { name: "Puerta", exact: true }).check();
    await page.getByRole("checkbox", { name: "Puerta abierta", exact: true }).uncheck();
    await page.getByRole("checkbox", { name: "Puerta abierta", exact: true }).check();
    await page.getByRole("checkbox", { name: "Bandejas separadas" }).check();
    await showPanel.focus();
    await page.keyboard.press("Space");
    assert.equal(await panel.isVisible(), true);
    await page.reload();
    await controls.waitFor();
    assert.equal(await showPanel.isChecked(), true);
    assert.equal(await panel.isVisible(), true);
    await page.goto(`${baseUrl}/produccion/nuevo?machine=${machineId}`);
    await controls.waitFor();
    assert.equal(await showPanel.isChecked(), true);
    await panel.getByRole("button", { name: "Seleccionar bandeja 1", exact: true }).click();
    await panel.getByRole("heading", { name: "Todas las bandejas" }).waitFor();
    await panel.getByRole("button", { name: "Seleccionar bandeja 2", exact: true }).click();
    await panel.getByRole("heading", { name: "Bandeja #2" }).waitFor();
    await showPanel.uncheck();
    await page.goto(previewUrl);
    await controls.waitFor();
    assert.equal(await panel.isVisible(), false);
    await page.reload();
    await controls.waitFor();
    assert.equal(await showPanel.isChecked(), false);
    await mkdir("tmp", { recursive: true });
    await page.screenshot({ path: "tmp/qa-viewer-desktop.png", fullPage: true });
    await page.getByText("Piezas visibles", { exact: true }).click();
    await page.screenshot({ path: "tmp/qa-viewer-options.png", fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await page.getByRole("button", { name: "Mostrar 3D", exact: true }).click();
    await controls.waitFor();
    assert.equal(await showPanel.isChecked(), false);
    await controls.getByRole("button", { name: "Pantalla completa", exact: true }).click();
    await page.waitForFunction(() => Math.abs((document.fullscreenElement?.querySelector("canvas")?.getBoundingClientRect().width ?? 0) - innerWidth) < 1);
    assert.equal(await page.evaluate(() => document.fullscreenElement?.querySelector("details") === null), true);
    await page.screenshot({ path: "tmp/qa-viewer-mobile-fullscreen.png" });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.fullscreenElement === null);
    await page.getByText("Piezas visibles", { exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    for (const button of await controls.getByRole("button").all()) {
      const box = await button.boundingBox();
      assert.ok(box && box.width >= 44 && box.height >= 44);
    }
    await page.screenshot({ path: "tmp/qa-viewer-mobile.png", fullPage: true });
    await showPanel.check();
    assert.equal(await panel.isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: "tmp/qa-viewer-mobile-panel.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate((key) => localStorage.setItem(key, "invalid"), preferenceKey);
    await page.reload();
    await controls.waitFor();
    assert.equal(await showPanel.isChecked(), false);
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Storage disabled", "SecurityError"); } });
    });
    await page.reload();
    await controls.waitFor();
    assert.equal(await showPanel.isChecked(), false);
    await showPanel.check();
    assert.equal(await panel.isVisible(), true);
    await showPanel.uncheck();
    assert.equal(await panel.isVisible(), false);
    assert.deepEqual(errors, []);
    process.stdout.write("Visor: controles, casillas, pantalla completa, preferencia persistente, almacenamiento bloqueado y móvil correctos.\n");
  } finally {
    await context.close();
    await browser.close();
    if (machineId) await prisma.productionMachine.delete({ where: { id: machineId } });
    if (actorId) await prisma.user.delete({ where: { id: actorId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1; });
