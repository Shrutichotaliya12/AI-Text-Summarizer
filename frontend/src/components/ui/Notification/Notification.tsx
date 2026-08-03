import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

export interface NotificationProps {
  type?: "success" | "warning" | "error" | "info";
  title?: string;
  message: string;
  className?: string;
}

export const Notification: React.FC<NotificationProps> = ({
  type = "info",
  title,
  message,
  className
}) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-danger shrink-0" />,
    info: <Info className="w-5 h-5 text-info shrink-0" />
  };

  const styleVariants = {
    success: "bg-success/5 border-success/20 text-main dark:text-success-200",
    warning: "bg-warning/5 border-warning/20 text-main dark:text-warning-200",
    error: "bg-danger/5 border-danger/20 text-main dark:text-danger-200",
    info: "bg-info/5 border-info/20 text-main dark:text-info-200"
  };

  return (
    <div
      className={twMerge(
        clsx(
          "flex gap-3 p-4 rounded-lg border text-sm",
          styleVariants[type],
          className
        )
      )}
    >
      {icons[type]}
      <div className="flex flex-col gap-0.5">
        {title && (
          <span className="font-bold text-main">
            {title}
          </span>
        )}
        <span className="text-muted dark:text-slate-300">
          {message}
        </span>
      </div>
    </div>
  );
};
export default Notification;
