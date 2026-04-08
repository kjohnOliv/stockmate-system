"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppSelectOption = {
  label: string;
  value: string;
};

interface AppSelectProps {
  value: string;
  options: AppSelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  optionClassName?: string;
  disabled?: boolean;
}

export function AppSelect({
  value,
  options,
  onValueChange,
  placeholder = "Select",
  className,
  menuClassName,
  optionClassName,
  disabled = false,
}: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const menuOptions = useMemo(() => {
    if (!selected) return options;
    return options.filter((option) => option.value !== selected.value);
  }, [options, selected]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-left font-semibold text-slate-900 outline-none transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60",
          open && "border-emerald-500 ring-2 ring-emerald-100",
          className
        )}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown className={cn("ml-3 h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+0.45rem)] z-50 overflow-hidden rounded-[1.4rem] border border-emerald-100 bg-white p-2 shadow-[0_20px_50px_rgba(47,111,79,0.16)]",
            menuClassName
          )}
        >
          <div className="max-h-64 overflow-y-auto">
            {menuOptions.map((option) => {
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-[1rem] px-4 py-3 text-left text-base font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-[#2f6f4f]",
                    optionClassName
                  )}
                >
                  {option.label}
                </button>
              );
            })}
            {menuOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm font-semibold text-slate-400">No other options</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
