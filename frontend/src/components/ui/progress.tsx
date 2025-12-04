"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "./utils";

function Progress({
  className,
  value,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { variant?: "default" | "success" }) {
  const isIndeterminate = value === null || value === undefined;

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-zinc-800 relative h-2 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      {isIndeterminate ? (
        <div 
          className="absolute top-0 h-full rounded-full animate-progress-indeterminate"
          style={{
            width: '35%',
            background: 'linear-gradient(90deg, #a855f7 0%, #818cf8 50%, #a855f7 100%)',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)'
          }}
        />
      ) : (
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn(
            "h-full w-full flex-1 transition-all",
            variant === "success" 
              ? "bg-gradient-to-r from-green-500 to-emerald-500" 
              : "bg-gradient-to-r from-indigo-600 to-purple-600"
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      )}
    </ProgressPrimitive.Root>
  );
}

export { Progress };
