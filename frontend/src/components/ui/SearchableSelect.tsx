import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchPlaceholder?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className,
  searchPlaceholder = "Search..."
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      const dropdownHeight = 300; // estimated max height
      let top = rect.bottom + window.scrollY;
      let openUpward = false;

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        // Open upwards
        top = rect.top + window.scrollY - dropdownHeight;
        openUpward = true;
      }

      setDropdownStyle({
        position: 'absolute',
        top: openUpward ? 'auto' : `${rect.bottom + window.scrollY + 4}px`,
        bottom: openUpward ? `${window.innerHeight - rect.top - window.scrollY + 4}px` : 'auto',
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        zIndex: 9999,
      });
    }
  }, [isOpen]);


  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={twMerge("relative", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={twMerge(
          "bg-app border border-borderToken rounded-lg px-3 py-1.5 text-xs text-main focus:outline-none focus:ring-1 focus:ring-primary w-full flex items-center justify-between transition-colors",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 cursor-pointer"
        )}
      >
        <span className={selectedOption ? "text-main" : "text-muted truncate pr-2"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted flex-shrink-0" />
      </button>

      {isOpen && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="z-[9999]">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="w-full bg-surface border border-borderToken rounded-lg shadow-xl overflow-hidden flex flex-col"
              style={{ maxHeight: '300px' }}
            >
              <div className="p-2 border-b border-borderToken bg-app/50 backdrop-blur-sm sticky top-0 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                  <input
                    type="text"
                    autoFocus
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-app border border-borderToken rounded-md pl-8 pr-3 py-1.5 text-xs text-main focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted"
                  />
                </div>
              </div>
              
              <div className="overflow-y-auto p-1 custom-scrollbar flex-1">
                {filteredOptions.length === 0 ? (
                  <div className="py-3 text-center text-xs text-muted">No results found</div>
                ) : (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                      className={clsx(
                        "w-full text-left px-2 py-1.5 text-xs rounded-md flex items-center justify-between transition-colors",
                        value === opt.value
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-main hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {value === opt.value && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-2" />}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}
    </div>
  );
}
