"use client";

import { useId, useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";

export const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function MonthField({ defaultValue = "", currentYear }: { defaultValue?: string; currentYear: number }) {
  const id = useId();
  const [month, setMonth] = useState(defaultValue.slice(5));
  const [year, setYear] = useState(defaultValue.slice(0, 4) || String(currentYear));
  const first = Math.min(2020, Number(year));
  const last = Math.max(currentYear + 1, Number(year));
  return <div className="period-controls"><input type="hidden" name="month" value={month ? `${year}-${month}` : ""} />
    <label htmlFor={`${id}-month`}>Mes<NativeSelect id={`${id}-month`} value={month} onChange={(event) => setMonth(event.target.value)}><option value="">Todo el histórico</option>{monthNames.map((name, index) => <option key={name} value={String(index + 1).padStart(2, "0")}>{name}</option>)}</NativeSelect></label>
    {month && <label htmlFor={`${id}-year`}>Año<NativeSelect id={`${id}-year`} value={year} onChange={(event) => setYear(event.target.value)}>{Array.from({ length: last - first + 1 }, (_, index) => last - index).map((value) => <option key={value}>{value}</option>)}</NativeSelect></label>}
  </div>;
}
