import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { authRequestHeaders } from "./test-origin";

if (process.env.NEON_BRANCH !== "dev/blackfruit") {
  throw new Error("Esta prueba solo puede usar dev/blackfruit.");
}

const initialAllowlist = process.env.ALLOWED_LOGIN_EMAILS;
const users: { id: string; email: string; password: string }[] = [];

async function signIn(email: string, password: string) {
  return auth.api.signInEmail({
    body: { email, password },
    headers: authRequestHeaders(),
    asResponse: true,
  });
}

async function main() {
  try {
    delete process.env.ALLOWED_LOGIN_EMAILS;
    for (let index = 0; index < 3; index++) {
      const email = `allowlist-qa-${randomUUID()}@example.invalid`;
      const password = `${randomBytes(24).toString("base64url")}Aa1!`;
      const created = await auth.api.createUser({
        body: { email, password, name: "Allowlist QA", role: "admin", data: { emailVerified: true } },
      });
      users.push({ id: created.user.id, email, password });
    }

    const existingLogin = await signIn(users[2].email, users[2].password);
    assert.equal(existingLogin.status, 200);
    const cookie = existingLogin.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");
    assert.ok(cookie.includes("session_token"));

    process.env.ALLOWED_LOGIN_EMAILS = `${users[0].email},${users[1].email}`;
    assert.equal((await signIn(users[0].email, users[0].password)).status, 200);
    assert.notEqual((await signIn(users[2].email, users[2].password)).status, 200);

    const unprovisionedEmail = `allowlist-empty-${randomUUID()}@example.invalid`;
    process.env.ALLOWED_LOGIN_EMAILS = `${users[0].email},${unprovisionedEmail}`;
    assert.notEqual((await signIn(unprovisionedEmail, users[0].password)).status, 200);
    process.env.ALLOWED_LOGIN_EMAILS = `${users[0].email},${users[1].email}`;

    await assert.rejects(auth.api.getSession({ headers: authRequestHeaders(cookie), asResponse: true }));
    await assert.rejects(auth.api.createUser({
      body: { email: `outside-qa-${randomUUID()}@example.invalid`, password: `${randomBytes(24).toString("base64url")}Aa1!`, name: "Outside QA", role: "admin" },
    }));

    console.log("La lista permite dos cuentas y rechaza login, sesión previa y alta fuera de ella.");
  } finally {
    if (initialAllowlist === undefined) delete process.env.ALLOWED_LOGIN_EMAILS;
    else process.env.ALLOWED_LOGIN_EMAILS = initialAllowlist;
    for (const user of users) await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
