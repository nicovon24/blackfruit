import { validateCustomerSelection, type CustomerSelectionInput, type CustomerSelection } from "@/modules/customers/domain/customer-selection";

export type AmountSaleInput = CustomerSelectionInput & {
  occurredOn: string;
  amount: string;
  channel?: string;
  notes?: string;
};

export type ValidAmountSale = {
  customer: CustomerSelection;
  occurredOn: Date;
  total: string;
  channel: string | null;
  notes: string | null;
};

export class SaleValidationError extends Error {
  constructor(
    public readonly field: keyof AmountSaleInput,
    message: string,
  ) {
    super(message);
  }
}

function optionalText(value: string | undefined, field: "channel" | "notes", max: number) {
  const text = value?.trim() ?? "";
  if (text.length > max) {
    throw new SaleValidationError(field, `Máximo ${max} caracteres.`);
  }
  return text || null;
}

export function validateAmountSale(input: AmountSaleInput): ValidAmountSale {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn)) {
    throw new SaleValidationError("occurredOn", "Ingresá una fecha válida.");
  }

  const occurredOn = new Date(`${input.occurredOn}T00:00:00.000Z`);
  if (Number.isNaN(occurredOn.valueOf()) || occurredOn.toISOString().slice(0, 10) !== input.occurredOn) {
    throw new SaleValidationError("occurredOn", "Ingresá una fecha válida.");
  }

  const amount = input.amount.trim();
  if (!/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(amount)) {
    throw new SaleValidationError("amount", "Ingresá un importe positivo con hasta dos decimales.");
  }

  const [whole, fractional = ""] = amount.split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(fractional.padEnd(2, "0"));
  if (cents <= BigInt(0)) {
    throw new SaleValidationError("amount", "El importe debe ser mayor que cero.");
  }

  return {
    customer: validateCustomerSelection(input),
    occurredOn,
    total: `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`,
    channel: optionalText(input.channel, "channel", 80),
    notes: optionalText(input.notes, "notes", 2000),
  };
}
