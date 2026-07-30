import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, type = "text", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-xs font-semibold text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={twMerge(
            clsx(
              "bg-surface text-main border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all w-full",
              error
                ? "border-danger focus:ring-danger/50"
                : "border-borderToken focus:ring-primary/50"
            ),
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-xs text-danger font-medium">{error}</span>
        )}
        {!error && helperText && (
          <span className="text-xs text-muted">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
