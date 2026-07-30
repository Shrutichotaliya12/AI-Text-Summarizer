import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface AvatarProps {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "offline" | "busy";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  status,
  className
}) => {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base"
  };

  const getInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const statusColors = {
    online: "bg-success",
    offline: "bg-muted",
    busy: "bg-danger"
  };

  return (
    <div className={twMerge("relative inline-block shrink-0 rounded-full", sizes[size], className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover border border-borderToken"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold font-display select-none">
          {getInitials(name)}
        </div>
      )}

      {status && (
        <span
          className={twMerge(
            clsx(
              "absolute bottom-0 right-0 block rounded-full ring-2 ring-surface",
              statusColors[status],
              size === "sm" ? "h-2 w-2" : "h-3 w-3"
            )
          )}
        />
      )}
    </div>
  );
};
export default Avatar;
