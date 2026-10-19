import { requirePermission, ForbiddenError, UnauthenticatedError } from "@/modules/auth/infrastructure/require-permission";
import { uploadProductionImport, ProductionImportError } from "@/modules/production/infrastructure/prisma-production-imports";
import { ImportValidationError } from "@/modules/imports/domain/import-types";

export const runtime = "nodejs";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.slice(0, -1);
  try { return Boolean(origin && host && new URL(origin).host.toLowerCase() === host.toLowerCase() && new URL(origin).protocol === `${protocol}:`); } catch { return false; }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("production:write");
    await requirePermission("imports:write");
    if (!sameOrigin(request)) return Response.json({ error: "Origen no permitido." }, { status: 403 });
    if (Number(request.headers.get("content-length")) > 2.2 * 1024 * 1024) return Response.json({ error: "El archivo supera 2 MB." }, { status: 413 });
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "Elegí un archivo." }, { status: 400 });
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 2.2 * 1024 * 1024) { await reader.cancel(); return Response.json({ error: "El archivo supera 2 MB." }, { status: 413 }); } chunks.push(value); }
    const form = await new Response(new Uint8Array(Buffer.concat(chunks)), { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 2 * 1024 * 1024) return Response.json({ error: "Elegí un XLSX de hasta 2 MB." }, { status: 400 });
    return Response.json(await uploadProductionImport(Buffer.from(await file.arrayBuffer()), file.name, actor.id));
  } catch (error) {
    if (error instanceof UnauthenticatedError) return Response.json({ error: "Iniciá sesión para importar." }, { status: 401 });
    if (error instanceof ForbiddenError) return Response.json({ error: "No tenés permiso para importar producción." }, { status: 403 });
    if (error instanceof ProductionImportError || error instanceof ImportValidationError || error instanceof Error && /^(Falta la hoja|La hoja|En «|La fila|El archivo|No se pudo|Formato)/.test(error.message)) return Response.json({ error: error.message }, { status: 400 });
    console.error("Production import upload failed", error);
    return Response.json({ error: "No pudimos leer el archivo." }, { status: 500 });
  }
}
