import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "form-control w-full min-w-0",
        className
      )}
      {...props}
    />
  )
}

export { Input }
