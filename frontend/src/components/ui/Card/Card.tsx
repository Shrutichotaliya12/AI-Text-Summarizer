import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverGlow?: boolean;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverGlow = false,
  glass = false,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          glass ? "glass-surface" : "bg-surface border-borderToken",
          "border rounded-lg p-5 shadow-premium overflow-hidden transition-all duration-300",
          hoverGlow && "hover:border-primary/50 hover:shadow-glow",
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
