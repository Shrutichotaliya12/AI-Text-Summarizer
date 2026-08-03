import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
}

export function Table<T>({ columns, data, className }: TableProps<T>) {
  return (
    <div className={twMerge("w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800", className)}>
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-dark-950 border-b border-slate-200 dark:border-slate-800 text-muted font-medium">
            {columns.map((column, idx) => (
              <th key={idx} className="p-3 font-semibold">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-dark-900">
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/40 transition-colors">
              {columns.map((column, colIdx) => (
                <td key={colIdx} className="p-3 text-main">
                  {column.render
                    ? column.render(row)
                    : (row[column.key as keyof T] as unknown as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-slate-400">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
