import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import type { SourceCell, SourceWorkbook } from "../domain/import-types";
import { ImportValidationError } from "../domain/import-types";

function checkZipSize(buffer: Buffer) {
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new ImportValidationError("El XLSX no es válido.");
  const count = buffer.readUInt16LE(end + 10);
  let position = buffer.readUInt32LE(end + 16);
  let size = 0;
  if (count > 250) throw new ImportValidationError("El archivo tiene demasiados componentes. Exportá solo la hoja necesaria.");
  for (let i = 0; i < count; i++) {
    if (position + 46 > buffer.length || buffer.readUInt32LE(position) !== 0x02014b50) throw new ImportValidationError("El archivo XLSX está dañado.");
    size += buffer.readUInt32LE(position + 24);
    position += 46 + buffer.readUInt16LE(position + 28) + buffer.readUInt16LE(position + 30) + buffer.readUInt16LE(position + 32);
  }
  if (size > 25 * 1024 * 1024) throw new ImportValidationError("El XLSX descomprimido supera 25 MB. Exportá una hoja más pequeña.");
}

export async function readWorkbook(buffer: Buffer, fileName: string): Promise<SourceWorkbook> {
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) throw new ImportValidationError("Elegí un archivo de hasta 2 MB.");
  const workbook = new ExcelJS.Workbook();
  if (/\.xlsx$/i.test(fileName)) {
    checkZipSize(buffer);
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } else if (/\.csv$/i.test(fileName)) {
    const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
    const first = text.split(/\r?\n/, 1)[0];
    await workbook.csv.read(Readable.from([text]), { parserOptions: { delimiter: first.includes(";") ? ";" : "," }, map: (value: string) => value });
  } else throw new ImportValidationError("Usá un archivo XLSX o CSV.");
  if (!workbook.worksheets.length || workbook.worksheets.length > 10) throw new ImportValidationError("El archivo debe tener entre 1 y 10 hojas.");
  return { sheets: workbook.worksheets.map((sheet) => {
    if (sheet.rowCount > 1000 || sheet.columnCount > 32) throw new ImportValidationError(`La hoja ${sheet.name} supera 1.000 filas o 32 columnas.`);
    const rows: SourceWorkbook["sheets"][number]["rows"] = [];
    sheet.eachRow({ includeEmpty: true }, (row, number) => {
      const cells: SourceCell[] = [];
      for (let index = 1; index <= sheet.columnCount; index++) {
        const cell = row.getCell(index);
        let value = cell.value;
        const raw: SourceCell = { value: null };
        if (value && typeof value === "object" && ("formula" in value || "sharedFormula" in value)) { raw.formula = cell.formula; value = cell.result ?? null; }
        if (value instanceof Date) raw.value = value.toISOString().slice(0, 10);
        else if (typeof value === "number" || typeof value === "string") raw.value = value;
        else if (value && typeof value === "object" && "richText" in value) raw.value = value.richText.map((part) => part.text).join("");
        else if (value && typeof value === "object" && "text" in value) raw.value = value.text;
        else if (value !== null) raw.value = cell.text;
        if (cell.fill?.type === "pattern" && cell.fill.fgColor?.argb) raw.color = cell.fill.fgColor.argb.slice(-6).toUpperCase();
        cells.push(raw);
      }
      rows.push({ number, cells });
    });
    return { name: sheet.name || "CSV", rows };
  }) };
}
