import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "warning" | "danger" | "info";

export interface ToastProps {
  message: string;
  type?: ToastType;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  onClose,
  className
}) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning" />,
    danger: <AlertCircle className="w-5 h-5 text-danger" />,
    info: <Info className="w-5 h-5 text-info" />
  };

  const borderColors = {
    success: "border-success/30 bg-success/5",
    warning: "border-warning/30 bg-warning/5",
    danger: "border-danger/30 bg-danger/5",
    info: "border-info/30 bg-info/5"
  };

  return (
    <div
      className={twMerge(
        clsx(
          "toast-enter flex items-center justify-between gap-3 p-3 rounded-lg border shadow-lg max-w-sm w-full bg-surface border-borderToken",
          borderColors[type],
          className
        )
      )}
    >
      <div className="flex items-center gap-2.5">
        {icons[type]}
        <span className="text-sm font-semibold text-main">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-muted hover:text-main p-1 transition-all rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
