import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface StatusIndicatorProps {
  status?: "online" | "busy" | "offline";
  label?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status = "online",
  label,
  className
}) => {
  const dotColors = {
    online: "bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]",
    busy: "bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]",
    offline: "bg-muted shadow-none"
  };

  return (
    <div className={twMerge("inline-flex items-center gap-1.5 text-xs font-semibold text-muted select-none", className)}>
      <span className={twMerge(clsx("h-2.5 w-2.5 rounded-full shrink-0", dotColors[status]))} />
      {label && <span>{label}</span>}
    </div>
  );
};
export default StatusIndicator;
