import type { ComponentProps } from "react";
import { cn } from "cn";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return <table className={cn("data-table", className)} {...props} />;
}
