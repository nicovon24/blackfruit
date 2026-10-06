import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "../application/permissions";
import { isAllowedLoginEmail } from "../domain/login-allowlist";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Se necesita iniciar sesión.");
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("No tenés permiso para esta operación.");
  }
}

export async function requirePermission(permission: Permission) {
  let session;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    if (error instanceof APIError && error.status === "UNAUTHORIZED") throw new ForbiddenError();
    throw error;
  }

  if (!session) throw new UnauthenticatedError();
  if (!isAllowedLoginEmail(session.user.email)) throw new ForbiddenError();
  if (!hasPermission(session.user.role, permission)) throw new ForbiddenError();

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}
