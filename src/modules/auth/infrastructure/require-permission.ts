import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "../application/permissions";

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
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) throw new UnauthenticatedError();
  if (!hasPermission(session.user.role, permission)) throw new ForbiddenError();

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}
