import { parseBusinessDate } from "@/lib/business-date";

export type SalesPeriod = { kind: "month"; month: string; from: string; to: string } | { kind: "range"; from: string; to: string } | { kind: "all"; from: null; to: null };

export function parseSalesPeriod(query: { period?: string; from?: string; to?: string; view?: string }, currentMonth: string): SalesPeriod {
  if (query.view === "all") return { kind: "all", from: null, to: null };
  if (query.view === "range") {
    const from = query.from && (parseBusinessDate(query.from) ?? (/^\d{4}-\d{2}-\d{2}$/.test(query.from) ? query.from : null));
    const to = query.to && (parseBusinessDate(query.to) ?? (/^\d{4}-\d{2}-\d{2}$/.test(query.to) ? query.to : null));
    const valid = (date: string) => { const parsed = new Date(`${date}T00:00:00Z`); return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date; };
    if (from && to && valid(from) && valid(to) && from <= to) return { kind: "range", from, to };
  }
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(query.period ?? "") ? query.period! : currentMonth;
  const [year, number] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return { kind: "month", month, from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}
