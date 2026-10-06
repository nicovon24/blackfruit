import { requirePermission, ForbiddenError, UnauthenticatedError } from "@/modules/auth/infrastructure/require-permission";
import { uploadImport } from "@/modules/imports/infrastructure/prisma-import-service";
import { ImportValidationError } from "@/modules/imports/domain/import-types";

export const runtime = "nodejs";

async function limitedFormData(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ImportValidationError("Elegí un archivo.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2.2 * 1024 * 1024) { await reader.cancel(); throw new ImportValidationError("El archivo supera 2 MB."); }
    chunks.push(value);
  }
  return new Response(new Uint8Array(Buffer.concat(chunks)), { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
}
export async function POST(request: Request) {
  try {
    const actor = await requirePermission("imports:write");
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(process.env.APP_URL!).origin) return Response.json({ error: "Origen no permitido." }, { status: 403 });
    if (Number(request.headers.get("content-length")) > 2.2 * 1024 * 1024) return Response.json({ error: "El archivo supera 2 MB." }, { status: 413 });
    const form = await limitedFormData(request);
    const file = form.get("file");
    if (!(file instanceof File)) throw new ImportValidationError("Elegí un archivo XLSX o CSV.");
    if (file.size > 2 * 1024 * 1024) throw new ImportValidationError("El archivo supera 2 MB.");
    return Response.json(await uploadImport(Buffer.from(await file.arrayBuffer()), file.name, actor.id));
  } catch (error) {
    if (error instanceof UnauthenticatedError) return Response.json({ error: "Iniciá sesión para importar." }, { status: 401 });
    if (error instanceof ForbiddenError) return Response.json({ error: "No tenés permiso para importar." }, { status: 403 });
    return Response.json({ error: error instanceof ImportValidationError ? error.message : "No pudimos leer el archivo. Revisá que sea un XLSX o CSV válido." }, { status: 400 });
  }
}
