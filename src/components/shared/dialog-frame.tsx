"use client";

import type { ComponentProps, ReactNode } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = ComponentProps<typeof Dialog.Content> & { title: string; description: string; children: ReactNode; size?: "simple" | "sale" | "sample" | "import"; layer?: "base" | "nested" | "top" };

export function DialogFrame({ title, description, children, size = "simple", layer = "base", className = "", ...props }: Props) {
  return <Dialog.Portal><Dialog.Overlay className={`dialog-backdrop dialog-layer-${layer}`} />
    <Dialog.Content {...props} className={`dialog-surface dialog-size-${size} dialog-layer-${layer} ${className}`}>
      <header className="dialog-header"><div><Dialog.Title className="dialog-title">{title}</Dialog.Title><Dialog.Description className="dialog-description">{description}</Dialog.Description></div>
        <Dialog.Close asChild><Button type="button" variant="ghost" size="icon" aria-label="Cerrar ventana"><X size={20} aria-hidden="true" /></Button></Dialog.Close>
      </header><div className="dialog-body">{children}</div>
    </Dialog.Content></Dialog.Portal>;
}
