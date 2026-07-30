import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: DropdownOption[];
  label?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  label,
  className,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold text-muted">
          {label}
        </label>
      )}
      <select
        className={twMerge(
          clsx(
            "bg-surface text-main border border-borderToken rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full transition-all cursor-pointer",
            className
          )
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-surface text-main">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
