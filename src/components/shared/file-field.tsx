"use client";

import { useId, useState } from "react";
import { FileSpreadsheet } from "lucide-react";

export function FileField({ accept, label, hint, disabled = false }: { accept: string; label: string; hint: string; disabled?: boolean }) {
  const id = useId();
  const [file, setFile] = useState("");
  return <div className="file-field"><label htmlFor={id} className="field-label">{label}</label>
    <div className="file-control"><FileSpreadsheet size={22} aria-hidden="true" /><div className="min-w-0"><span className="file-name">{file || "Elegí una planilla"}</span><span className="field-hint">{file ? "Seleccionar otro archivo" : "Seleccionar archivo"}</span></div>
      <input id={id} name="file" type="file" accept={accept} required disabled={disabled} aria-describedby={`${id}-hint`} onChange={(event) => setFile(event.target.files?.[0]?.name ?? "")} />
    </div><p id={`${id}-hint`} className="field-hint">{hint}</p>
  </div>;
}
