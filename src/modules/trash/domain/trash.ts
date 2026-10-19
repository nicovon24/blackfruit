export const trashTypes = ["sales", "customers", "production", "samples"] as const;
export type TrashType = typeof trashTypes[number];
export const trashLabels: Record<TrashType, string> = { sales: "Ventas", customers: "Clientes", production: "Producción", samples: "Muestras" };
export function isTrashType(value: string): value is TrashType { return trashTypes.some((type) => type === value); }
export class TrashConflictError extends Error {}
