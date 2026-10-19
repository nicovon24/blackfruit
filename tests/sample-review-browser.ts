import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { uploadImport, previewImport, confirmImport } from "../src/modules/imports/infrastructure/prisma-import-service";

if (process.env.NEON_BRANCH !== "dev/blackfruit") throw new Error("Solo se permite dev/blackfruit.");
const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";

async function main() {
  const marker = randomUUID().slice(0, 8);
  const email = `review-qa-${marker}@example.invalid`;
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;
  let actorId = "";
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    const actor = await auth.api.createUser({ body: { email, password, name: "Review QA", role: "admin", data: { emailVerified: true } } });
    actorId = actor.user.id;
    const salesBefore = await prisma.sale.count();
    const recipient = `Origen ${marker}`;
    const uploaded = await uploadImport(Buffer.from(`Fecha,Nombre,Importe\n2026-10-12,${recipient},0\n`), `review-${marker}.csv`, actorId);
    const preview = await previewImport(uploaded.id, actorId, { mapping: { ...uploaded.mapping, source: `review-${marker}` }, decisions: [{ key: "row:2", kind: "sample", customerId: "" }] });
    assert.equal(preview.summary.samples, 1);
    await confirmImport(uploaded.id, actorId, preview.hash);
    const review = await prisma.sampleImportReview.findFirstOrThrow({ where: { rows: { some: { batchId: uploaded.id } } } });
    assert.equal(review.status, "pending");
    assert.equal(review.sampleId, null);

    await page.goto(`${baseUrl}/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL("**/dashboard");
    await page.goto(`${baseUrl}/muestras/revision?status=pending`);
    const entry = page.getByRole("article").filter({ hasText: recipient });
    await entry.getByRole("link", { name: "Revisar" }).click();
    await page.waitForURL(`**/muestras/revision/${review.id}`);
    assert.equal(await page.getByLabel("Estado", { exact: true }).inputValue(), "");
    await page.getByText(`review-${marker}.csv`).first().waitFor();
    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await mkdir("tmp", { recursive: true });
    await page.screenshot({ path: "tmp/qa-sample-review-mobile.png", fullPage: true });

    await page.getByLabel("Producto del catálogo").selectOption("manual");
    await page.getByLabel("Nombre del producto").fill("Naranja");
    await page.getByLabel("Cantidad").fill("0.250");
    await page.getByLabel("Unidad").fill("kg");
    await page.getByLabel("Estado", { exact: true }).selectOption("pending");
    await page.getByRole("button", { name: "Registrar muestra" }).click();
    await page.waitForURL(/\/muestras\/[0-9a-f-]{36}$/);
    const converted = await prisma.sampleImportReview.findUniqueOrThrow({ where: { id: review.id }, include: { sample: { include: { lines: true } } } });
    assert.equal(converted.status, "converted");
    assert.equal(converted.sample?.status, "pending");
    assert.equal(converted.sample?.customerId, null);
    assert.equal(converted.sample?.lines[0].quantity.toFixed(3), "0.250");
    assert.equal(await prisma.sale.count(), salesBefore);
    await page.goto(`${baseUrl}/muestras/revision?status=converted`);
    await page.getByRole("article").filter({ hasText: recipient }).getByRole("link", { name: "Ver muestra" }).waitFor();
    process.stdout.write("Revisión histórica, procedencia, estado explícito y separación de ventas: navegador correcto.\n");
  } finally {
    await context.close();
    await browser.close();
    if (actorId) {
      const reviews = await prisma.sampleImportReview.findMany({ where: { rows: { some: { batch: { actorId } } } }, select: { id: true } });
      await prisma.importSourceRow.deleteMany({ where: { batch: { actorId } } });
      await prisma.sampleImportReview.deleteMany({ where: { id: { in: reviews.map((review) => review.id) } } });
      await prisma.importBatch.deleteMany({ where: { actorId } });
      await prisma.sampleLine.deleteMany({ where: { sample: { createdById: actorId } } });
      await prisma.sample.deleteMany({ where: { createdById: actorId } });
      await prisma.auditEvent.deleteMany({ where: { actorUserId: actorId } });
      await prisma.user.deleteMany({ where: { id: actorId } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => { process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1; });
