const vercelHostKeys = ["VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"] as const;

function validDeploymentHost(value: string | undefined): value is string {
  return Boolean(value && /^[a-z0-9.-]+$/i.test(value) && !value.startsWith(".") && !value.endsWith(".") && !value.includes(".."));
}

export function allowedAuthHosts(env: Record<string, string | undefined> = process.env): string[] {
  const hosts = ["localhost", "localhost:*", "127.0.0.1", "127.0.0.1:*", "[::1]", "[::1]:*"];

  for (const key of vercelHostKeys) {
    const host = env[key];
    if (validDeploymentHost(host)) hosts.push(host.toLowerCase());
  }

  return [...new Set(hosts)];
}
