import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/shared/page-heading";
import { requirePagePermission } from "@/modules/auth/infrastructure/require-page-permission";
import { listCustomerOptions } from "@/modules/customers/infrastructure/prisma-customers";
import { listImportResults } from "@/modules/imports/infrastructure/prisma-import-service";
import type { ImportSummary } from "@/modules/imports/domain/import-types";
import { formatArs } from "@/lib/format-money";
import { ImportWizard } from "./import-wizard";

export default async function ImportPage() {
  const user = await requirePagePermission("imports:read");
  await requirePagePermission("customers:read");
  const [customers, history] = await Promise.all([listCustomerOptions(), listImportResults(user.id)]);
  return <AppShell user={user} section="Importar"><PageHeading title="Importar ventas" description="De tu planilla al negocio, con cada operación revisada." /><ImportWizard customers={customers} />{history.length > 0 && <section className="panel mt-6 p-5"><h2 className="font-semibold">Últimas importaciones confirmadas</h2><ul className="mt-4 divide-y">{history.map((batch) => { const result = batch.result as unknown as ImportSummary; return <li key={batch.id} className="py-3 text-sm"><p className="font-medium">{batch.fileName}</p><p className="mt-1 text-muted-foreground">{batch.confirmedAt?.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} · {result.sales} ventas · {formatArs(result.total)} · {result.samples} muestras · {result.excluded} exclusiones · {result.duplicates} ya importadas</p></li>; })}</ul></section>}</AppShell>;
}
