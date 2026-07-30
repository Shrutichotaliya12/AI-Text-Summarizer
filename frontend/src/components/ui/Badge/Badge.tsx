import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "info";
  outline?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "secondary",
  outline = false,
  className
}) => {
  const baseStyles = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold select-none border";

  const variants = {
    primary: outline 
      ? "text-primary border-primary/30 bg-transparent" 
      : "bg-primary/10 text-primary border-transparent",
    secondary: outline 
      ? "text-muted border-borderToken bg-transparent" 
      : "bg-slate-100 dark:bg-slate-800 text-muted border-transparent",
    success: outline 
      ? "text-success border-success/30 bg-transparent" 
      : "bg-success/10 text-success border-transparent",
    warning: outline 
      ? "text-warning border-warning/30 bg-transparent" 
      : "bg-warning/10 text-warning border-transparent",
    danger: outline 
      ? "text-danger border-danger/30 bg-transparent" 
      : "bg-danger/10 text-danger border-transparent",
    info: outline 
      ? "text-info border-info/30 bg-transparent" 
      : "bg-info/10 text-info border-transparent"
  };

  return (
    <span className={twMerge(clsx(baseStyles, variants[variant], className))}>
      {children}
    </span>
  );
};
