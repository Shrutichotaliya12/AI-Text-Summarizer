import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SkeletonProps {
  variant?: "text" | "rect" | "circle";
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "rect",
  width,
  height,
  className
}) => {
  const styles = {
    text: "h-3 w-full rounded-md",
    rect: "w-full rounded-lg",
    circle: "rounded-full"
  };

  const inlineStyles: React.CSSProperties = {
    width: width,
    height: height
  };

  return (
    <div
      className={twMerge(
        clsx(
          "animate-shimmer bg-slate-200 dark:bg-slate-800/60",
          styles[variant],
          className
        )
      )}
      style={inlineStyles}
    />
  );
};
export default Skeleton;
