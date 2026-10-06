import { redirect } from "next/navigation";
import type { Permission } from "../application/permissions";
import { ForbiddenError, requirePermission, UnauthenticatedError } from "./require-permission";

export async function requirePagePermission(permission: Permission) {
  try {
    return await requirePermission(permission);
  } catch (error) {
    if (error instanceof UnauthenticatedError) redirect("/login");
    if (error instanceof ForbiddenError) redirect("/acceso-denegado");
    throw error;
  }
}
