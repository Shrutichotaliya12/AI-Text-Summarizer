import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  min: number;
  max: number;
  value: number;
  onChangeValue?: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  min,
  max,
  value,
  onChangeValue,
  className,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChangeValue) {
      onChangeValue(Number(e.target.value));
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-center text-xs font-semibold text-muted">
        <span>{label}</span>
        <span className="text-primary font-bold">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        className={twMerge(
          clsx(
            "w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-primary",
            className
          )
        )}
        {...props}
      />
      <div className="flex justify-between text-[10px] text-muted/80">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};
export default Slider;
