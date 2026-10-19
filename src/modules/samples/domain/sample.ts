import { validateCustomerSelection, type CustomerSelection, type CustomerSelectionInput } from "@/modules/customers/domain/customer-selection";

export type SampleLineInput = { productId: string | null; productName?: string; variant?: string | null; quantity: string; unitLabel: string };
export type SampleInput = CustomerSelectionInput & {
  recipientName: string;
  sampleOn: string;
  status: "pending" | "delivered";
  deliveredOn: string;
  notes: string;
  lines: SampleLineInput[];
};
export type SampleProduct = { id: string; name: string; variant: string | null };
export type ValidSample = {
  recipientName: string;
  sampleOn: Date;
  status: "pending" | "delivered";
  deliveredOn: Date | null;
  notes: string | null;
  customer: CustomerSelection;
  lines: Array<{ position: number; productId: string | null; productName: string; variant: string | null; quantity: string; unitLabel: string }>;
};

export class SampleValidationError extends Error {
  constructor(public readonly field: string, message: string) { super(message); }
}
export class SampleConflictError extends Error {
  constructor(message = "La muestra cambió. Recargá su detalle antes de guardar de nuevo.") { super(message); }
}

function localDate(value: string, field: string): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new SampleValidationError(field, "Ingresá una fecha válida.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new SampleValidationError(field, "Ingresá una fecha válida.");
  return date;
}

export function parseSampleQuantity(value: string, field = "lines") {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/.test(value.trim())) throw new SampleValidationError(field, "Ingresá una cantidad positiva con hasta tres decimales.");
  const [whole, fraction = ""] = value.trim().split(".");
  const mills = BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
  if (mills <= 0) throw new SampleValidationError(field, "La cantidad debe ser mayor que cero.");
  return `${whole}.${fraction.padEnd(3, "0")}`;
}

export function validateSample(input: SampleInput, products: SampleProduct[]): ValidSample {
  const recipientName = input.recipientName?.trim();
  if (!recipientName || recipientName.length > 160) throw new SampleValidationError("recipientName", "Ingresá un destinatario de hasta 160 caracteres.");
  const sampleOn = localDate(input.sampleOn, "sampleOn");
  if (!sampleOn) throw new SampleValidationError("sampleOn", "Ingresá la fecha de la muestra.");
  if (input.status !== "pending" && input.status !== "delivered") throw new SampleValidationError("status", "Elegí un estado válido.");
  const deliveredOn = localDate(input.deliveredOn, "deliveredOn");
  if (input.status === "pending" && deliveredOn) throw new SampleValidationError("deliveredOn", "Una muestra pendiente no puede tener fecha de entrega.");
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > 2000) throw new SampleValidationError("notes", "Máximo 2000 caracteres.");
  if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 100) throw new SampleValidationError("lines", "Agregá entre 1 y 100 productos.");
  const catalog = new Map(products.map((product) => [product.id, product]));
  const lines = input.lines.map((line, position) => {
    const product = line.productId ? catalog.get(line.productId) : null;
    if (line.productId && !product) throw new SampleValidationError("lines", `El producto de la línea ${position + 1} no existe.`);
    const productName = product?.name ?? line.productName?.trim() ?? "";
    const variant = product ? product.variant : line.variant?.trim() ?? null;
    if (!productName || productName.length > 160 || (variant && variant.length > 100)) throw new SampleValidationError("lines", `Revisá el producto de la línea ${position + 1}.`);
    const unitLabel = line.unitLabel?.trim();
    if (!unitLabel || unitLabel.length > 40) throw new SampleValidationError("lines", `Indicá la unidad de la línea ${position + 1}.`);
    return { position: position + 1, productId: product?.id ?? null, productName, variant, quantity: parseSampleQuantity(line.quantity), unitLabel };
  });
  return { recipientName, sampleOn, status: input.status, deliveredOn, notes, customer: validateCustomerSelection(input), lines };
}
