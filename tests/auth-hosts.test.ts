import assert from "node:assert/strict";
import test from "node:test";
import { allowedAuthHosts } from "../src/lib/auth-hosts";

test("acepta puertos locales y los tres dominios exactos del despliegue", () => {
  const hosts = allowedAuthHosts({
    VERCEL_URL: "blackfruit-build.vercel.app",
    VERCEL_BRANCH_URL: "blackfruit-git-master.vercel.app",
    VERCEL_PROJECT_PRODUCTION_URL: "app.example.com",
  });
  assert.ok(hosts.includes("localhost:*"));
  assert.ok(hosts.includes("127.0.0.1:*"));
  assert.ok(hosts.includes("blackfruit-build.vercel.app"));
  assert.ok(hosts.includes("blackfruit-git-master.vercel.app"));
  assert.ok(hosts.includes("app.example.com"));
  assert.ok(!hosts.includes("*.vercel.app"));
});

test("descarta valores de host inválidos sin abrir un comodín externo", () => {
  const hosts = allowedAuthHosts({
    VERCEL_URL: "evil.test:4444",
    VERCEL_BRANCH_URL: "https://evil.test",
    VERCEL_PROJECT_PRODUCTION_URL: "evil..test",
  });
  assert.equal(hosts.length, 6);
  assert.ok(!hosts.some((host) => host.includes("evil")));
});
