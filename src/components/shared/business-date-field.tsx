"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatBusinessDate, parseBusinessDate } from "@/lib/business-date";

export function BusinessDateField({ id, name, value, onChange, required = false, disabled = false, invalid = false }: {
  id: string; name?: string; value: string; onChange: (value: string) => void; required?: boolean; disabled?: boolean; invalid?: boolean;
}) {
  const [display, setDisplay] = useState(() => formatBusinessDate(value));
  const [touched, setTouched] = useState(false);
  const badDate = touched && display !== "" && !parseBusinessDate(display);
  return <>
    <Input id={id} type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" value={display} disabled={disabled} required={required} maxLength={10} pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" aria-invalid={invalid || badDate} aria-describedby={badDate ? `${id}-format-error` : undefined} onBlur={() => setTouched(true)} onChange={(event) => { const next = event.target.value; setDisplay(next); onChange(parseBusinessDate(next) ?? ""); }} />
    {name && <input type="hidden" name={name} value={value} />}
    {badDate && <p id={`${id}-format-error`} role="alert" className="text-sm text-destructive">Ingresá una fecha válida con formato dd/mm/aaaa.</p>}
  </>;
}
