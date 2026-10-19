import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { ImportProductionForm } from "./import-production-form";

export default async function ImportProductionPage() {
  const user = await requirePagePermission("production:write");
  await requirePagePermission("imports:write");
  return <AppShell user={user} section="Producción / Importar"><PageHeading title="Importar producción" description="Revisá ciclos y pesajes del Excel antes de guardarlos." /><ImportProductionForm /></AppShell>;
}
