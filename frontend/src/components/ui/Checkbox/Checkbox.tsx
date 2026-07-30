import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            ref={ref}
            type="checkbox"
            className={twMerge(
              clsx(
                "h-4 w-4 rounded border border-borderToken bg-surface text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-app transition-all cursor-pointer accent-primary"
              ),
              className
            )}
            {...props}
          />
          {label && (
            <span className="text-sm font-medium text-main">
              {label}
            </span>
          )}
        </label>
        {error && (
          <span className="text-xs text-danger font-medium">{error}</span>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
