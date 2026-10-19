import ExcelJS from "exceljs";
import { requirePermission, ForbiddenError, UnauthenticatedError } from "@/modules/auth/infrastructure/require-permission";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requirePermission("production:read");
    const workbook = new ExcelJS.Workbook();
    const cycles = workbook.addWorksheet("Ciclos");
    cycles.addRow(["codigo", "fecha", "maquina", "total_kg", "observaciones"]);
    cycles.addRow(["EJEMPLO-001", "11/10/2026", "Principal", "0,875", "Ejemplo ficticio: reemplazá estos valores"]);
    const weights = workbook.addWorksheet("Pesajes");
    weights.addRow(["codigo", "producto", "variante", "bandejas", "kg"]);
    weights.addRow(["EJEMPLO-001", "Naranja", "Con azúcar", "1,2", "0,875"]);
    for (const sheet of [cycles, weights]) { sheet.getRow(1).font = { bold: true }; sheet.columns.forEach((column) => { column.width = 24; }); }
    const bytes = await workbook.xlsx.writeBuffer();
    return new Response(new Uint8Array(bytes as ArrayBuffer), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": "attachment; filename=plantilla-produccion.xlsx", "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof UnauthenticatedError) return new Response("Iniciá sesión.", { status: 401 });
    if (error instanceof ForbiddenError) return new Response("Acceso denegado.", { status: 403 });
    throw error;
  }
}
