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
        "relative h-2 w-full overflow-hidden rounded-full",
        isIndeterminate ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-zinc-800",
        className,
      )}
      {...props}
    >
      {isIndeterminate ? (
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div 
            className="absolute inset-0 rounded-full animate-progress-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.8), transparent)',
              width: '50%'
            }}
          />
        </div>
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
