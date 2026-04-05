import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-glass-border h-9 w-full min-w-0 rounded-md border bg-glass/40 backdrop-blur-sm px-3 py-1 text-base transition-[color,box-shadow,background] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:outline-solid focus-visible:outline-muted-foreground focus-visible:outline-2 focus-visible:bg-glass-hover",
        "aria-invalid:outline-destructive dark:aria-invalid:outline-destructive aria-invalid:border-destructive aria-invalid:focus-visible:border-0",
        className
      )}
      {...props}
    />
  )
}

export { Input }
