"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "./utils";

function Progress({
  className,
  value,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { variant?: "default" | "success" | "destructive" }) {
  const isIndeterminate = value === null || value === undefined;

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-zinc-800",
        className,
      )}
      {...props}
    >
      {isIndeterminate ? (
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div
            className="h-full w-full bg-gradient-to-r from-indigo-600 to-purple-600 animate-pulse origin-left"
            style={{ width: '100%' }}
          />
        </div>
      ) : (
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn(
            "h-full w-full flex-1 transition-all",
            variant === "success"
              ? "bg-gradient-to-r from-green-500 to-emerald-500"
              : variant === "destructive"
                ? "bg-gradient-to-r from-red-500 to-rose-600"
                : "bg-gradient-to-r from-indigo-600 to-purple-600"
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      )}
    </ProgressPrimitive.Root>
  );
}

export { Progress };
