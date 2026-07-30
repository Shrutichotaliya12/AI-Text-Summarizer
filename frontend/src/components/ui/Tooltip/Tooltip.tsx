import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface TooltipProps {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = "top",
  children,
  className
}) => {
  const [show, setShow] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (show && triggerRef.current) {
      // Use getBoundingClientRect which returns viewport-relative coords
      // These work directly with position:fixed – no scrollY/scrollX needed
      const rect = triggerRef.current.getBoundingClientRect();
      const GAP = 6; // px gap between trigger and tooltip

      let top = 0;
      let left = 0;

      if (position === "top") {
        top = rect.top - GAP;
        left = rect.left + rect.width / 2;
        // Boundary collision for top
        if (top - 30 < 0) { // approximate tooltip height is 30px
          top = rect.bottom + GAP; // push it to bottom
        }
      } else if (position === "bottom") {
        top = rect.bottom + GAP;
        left = rect.left + rect.width / 2;
      } else if (position === "left") {
        top = rect.top + rect.height / 2;
        left = rect.left - GAP;
      } else if (position === "right") {
        top = rect.top + rect.height / 2;
        left = rect.right + GAP;
      }

      // Boundary collision for left/right screen edges
      if (left < 50) {
         left = 50;
      }

      setCoords({ top, left });
    }
  }, [show, position]);

  const translateClasses = {
    top: "-translate-x-1/2 -translate-y-full",
    bottom: "-translate-x-1/2",
    left: "-translate-x-full -translate-y-1/2",
    right: "-translate-y-1/2"
  };

  const arrowPositions = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-slate-800 dark:border-t-slate-900 border-x-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 dark:border-b-slate-900 border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-slate-800 dark:border-l-slate-900 border-y-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-slate-800 dark:border-r-slate-900 border-y-transparent border-l-transparent"
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && content && createPortal(
        <div
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999,
            pointerEvents: "none"
          }}
          className={twMerge(
            clsx(
              "bg-slate-800 text-slate-100 dark:bg-slate-900 text-[10px] font-semibold py-1 px-2 rounded shadow-xl whitespace-nowrap transition-opacity duration-100",
              translateClasses[position],
              className
            )
          )}
        >
          {content}
          <div
            className={twMerge(
              "absolute border-4",
              arrowPositions[position]
            )}
          />
        </div>,
        document.body
      )}
    </div>
  );
};
