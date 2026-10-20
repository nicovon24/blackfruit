import type { ComponentProps } from "react";
import { cn } from "cn";

export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return <select data-slot="select" className={cn("form-control native-select", className)} {...props} />;
}
