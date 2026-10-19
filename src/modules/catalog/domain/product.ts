export type ProductInput = { name: string; variant?: string; unitLabel?: string };

export class ProductValidationError extends Error {
  constructor(public readonly field: keyof ProductInput, message: string) { super(message); }
}

export function validateProduct(input: ProductInput) {
  const name = input.name.trim();
  if (!name || name.length > 100) throw new ProductValidationError("name", "Ingresá un nombre de hasta 100 caracteres.");
  const variant = input.variant?.trim() || null;
  if (variant && variant.length > 100) throw new ProductValidationError("variant", "Máximo 100 caracteres.");
  const unitLabel = input.unitLabel?.trim() || null;
  if (unitLabel && unitLabel.length > 40) throw new ProductValidationError("unitLabel", "Máximo 40 caracteres.");
  return { name, variant, unitLabel };
}
