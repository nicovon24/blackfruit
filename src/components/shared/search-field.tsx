"use client";

import { useId, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchField({ label, defaultValue = "", placeholder = "Buscar…", hint }: { label: string; defaultValue?: string; placeholder?: string; hint?: string }) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [previous, setPrevious] = useState(defaultValue);
  if (previous !== defaultValue) { setPrevious(defaultValue); setValue(defaultValue); }
  return <div className="search-field"><label htmlFor={id} className="field-label">{label}</label>
    <div className="search-input-wrap"><Search size={17} aria-hidden="true" />
      <Input id={id} type="search" name="q" value={value} onChange={(event) => setValue(event.target.value)} maxLength={100} placeholder={placeholder} aria-describedby={hint ? `${id}-hint` : undefined} />
      {value && <button type="button" aria-label={`Limpiar ${label.toLocaleLowerCase("es")}`} onClick={(event) => {
        const form = event.currentTarget.form;
        const input = form?.elements.namedItem("q") as HTMLInputElement | null;
        setValue("");
        if (input) input.value = "";
        form?.requestSubmit();
      }}><X size={16} aria-hidden="true" /></button>}
    </div>{hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
  </div>;
}
