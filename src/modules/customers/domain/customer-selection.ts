export type CustomerOption = { id: string; name: string; email: string | null; phone: string | null };
export type CustomerSelectionInput = { customerId?: string; customerName?: string; customerEmail?: string; customerPhone?: string };
export type CustomerSelection =
  | { kind: "none" }
  | { kind: "existing"; id: string }
  | { kind: "new"; data: { name: string; email: string | null; phone: string | null } };

export class CustomerValidationError extends Error {
  constructor(public readonly field: keyof CustomerSelectionInput, message: string) { super(message); }
}

export function validateCustomerSelection(input: CustomerSelectionInput): CustomerSelection {
  const id = input.customerId?.trim() ?? "";
  if (!id) return { kind: "none" };
  if (id !== "new") {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new CustomerValidationError("customerId", "Seleccioná un cliente válido.");
    }
    return { kind: "existing", id };
  }
  const name = input.customerName?.trim() ?? "";
  const email = input.customerEmail?.trim() ?? "";
  const phone = input.customerPhone?.trim() ?? "";
  if (!name || name.length > 160) throw new CustomerValidationError("customerName", "Ingresá un nombre de hasta 160 caracteres.");
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new CustomerValidationError("customerEmail", "Ingresá un email válido o dejalo vacío.");
  if (phone.length > 40) throw new CustomerValidationError("customerPhone", "El teléfono admite hasta 40 caracteres.");
  return { kind: "new", data: { name, email: email || null, phone: phone || null } };
}
