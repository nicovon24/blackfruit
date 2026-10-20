"use client";

import { NativeSelect } from "@/components/ui/native-select";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BusinessDateField } from "@/components/shared/business-date-field";
import { Label } from "@/components/ui/label";
import type { SalesPeriod } from "@/modules/sales/domain/sales-period";

const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function PeriodPicker({ period, currentMonth }: { period: SalesPeriod; currentMonth: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<SalesPeriod["kind"]>(period.kind);
  const [month, setMonth] = useState(period.kind === "month" ? period.month : currentMonth);
  const [from, setFrom] = useState(period.from ?? "");
  const [to, setTo] = useState(period.to ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  function navigate(url: string) { setError(""); startTransition(() => router.replace(url, { scroll: false })); }
  function changeMode(value: SalesPeriod["kind"]) {
    setMode(value);
    if (value === "all") navigate("/dashboard?view=all");
    if (value === "month") navigate(`/dashboard?period=${month}`);
    if (value === "range" && from && to && from <= to) navigate(`/dashboard?view=range&from=${from}&to=${to}`);
  }
  function changeRange(nextFrom: string, nextTo: string) {
    setFrom(nextFrom); setTo(nextTo);
    if (nextFrom && nextTo && nextFrom <= nextTo) navigate(`/dashboard?view=range&from=${nextFrom}&to=${nextTo}`);
    else if (nextFrom && nextTo && nextFrom > nextTo) setError("Desde debe ser anterior o igual a Hasta.");
    else setError("");
  }
  const years = Array.from({ length: Math.max(8, Number(currentMonth.slice(0, 4)) - 2020 + 2) }, (_, index) => Number(currentMonth.slice(0, 4)) + 1 - index);
  return <div className="period-toolbar" aria-busy={pending}>
    <fieldset><legend className="field-label mb-2">Período</legend><div className="segmented-control">{([{ value: "month", label: "Mes" }, { value: "range", label: "Rango" }, { value: "all", label: "Histórico" }] as const).map((item) => <label key={item.value}><input type="radio" name="period-mode" value={item.value} checked={mode === item.value} onChange={() => changeMode(item.value)} /><span>{item.label}</span></label>)}</div></fieldset>
    {mode === "month" && <><label className="space-y-1 text-sm">Mes<NativeSelect value={month.slice(5)} onChange={(event) => { const next = `${month.slice(0, 4)}-${event.target.value}`; setMonth(next); navigate(`/dashboard?period=${next}`); }} className="field-select block min-h-11">{months.map((label, index) => <option key={label} value={String(index + 1).padStart(2, "0")}>{label}</option>)}</NativeSelect></label><label className="space-y-1 text-sm">Año<NativeSelect value={month.slice(0, 4)} onChange={(event) => { const next = `${event.target.value}-${month.slice(5)}`; setMonth(next); navigate(`/dashboard?period=${next}`); }} className="field-select block min-h-11">{years.map((year) => <option key={year}>{year}</option>)}</NativeSelect></label></>}
    {mode === "range" && <><div className="space-y-1"><Label htmlFor="period-from">Desde</Label><BusinessDateField id="period-from" value={from} onChange={(value) => changeRange(value, to)} /></div><div className="space-y-1"><Label htmlFor="period-to">Hasta</Label><BusinessDateField id="period-to" value={to} onChange={(value) => changeRange(from, value)} /></div></>}
    {mode === "range" && (!from || !to) && <p role="status" className="w-full text-sm text-muted-foreground">Completá ambas fechas para actualizar. Los datos todavía corresponden al último período consultado.</p>}
    {pending && <span role="status" className="text-sm text-muted-foreground">Actualizando…</span>}{error && <p role="alert" className="w-full text-sm text-destructive">{error}</p>}
  </div>;
}
