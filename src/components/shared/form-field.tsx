import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function FormField({ id, label, hint, error, children, className }: { id: string; label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return <div className={`form-field ${className ?? ""}`}><Label htmlFor={id}>{label}</Label>{children}{hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}{error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
