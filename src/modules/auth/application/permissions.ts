export const permissions = [
  "dashboard:read",
  "sales:read",
  "sales:write",
  "imports:read",
  "imports:write",
  "customers:read",
  "customers:write",
  "catalog:read",
  "catalog:write",
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissions: Record<string, readonly Permission[]> = {
  admin: permissions,
};

export function hasPermission(
  roles: string | null | undefined,
  permission: Permission,
): boolean {
  if (!roles) return false;

  return roles
    .split(",")
    .some((role) => rolePermissions[role.trim()]?.includes(permission) ?? false);
}
