import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ProgressBarProps {
  progress: number; // 0 to 100
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = false,
  className
}) => {
  const boundedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={twMerge("w-full flex flex-col gap-1", className)}>
      <div className="relative w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${boundedProgress}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] text-right font-bold text-primary">
          {boundedProgress}%
        </span>
      )}
    </div>
  );
};
export default ProgressBar;
