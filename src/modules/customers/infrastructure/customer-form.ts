import { requirePermission } from "@/modules/auth/infrastructure/require-permission";

export async function readAuthorizedCustomerForm(form: FormData) {
  const customerId = String(form.get("customerId") ?? "");
  if (customerId) await requirePermission("customers:read");
  if (customerId === "new") await requirePermission("customers:write");
  return {
    customerId,
    customerName: String(form.get("customerName") ?? ""),
    customerEmail: String(form.get("customerEmail") ?? ""),
    customerPhone: String(form.get("customerPhone") ?? ""),
  };
}
