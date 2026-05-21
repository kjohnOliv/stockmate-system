"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppSelectOption } from "@/components/ui/app-select";

interface AppComboboxProps {
  value: string;
  options: AppSelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  menuClassName?: string;
  optionClassName?: string;
  disabled?: boolean;
}

export function AppCombobox({
  value,
  options,
  onValueChange,
  placeholder = "Select Item",
  searchPlaceholder = "Search ingredient...",
  emptyMessage = "No ingredients found",
  className,
  menuClassName,
  optionClassName,
  disabled = false,
}: AppComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  const closeCombobox = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updateMenuPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideTrigger = containerRef.current?.contains(target);
      const clickedInsideMenu = menuRef.current?.contains(target);

      if (!clickedInsideTrigger && !clickedInsideMenu) {
        closeCombobox();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCombobox();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;

          setOpen((current) => {
            const nextOpen = !current;
            if (current) setQuery("");
            return nextOpen;
          });
        }}
        className={cn(
          "flex min-h-11 w-full items-center justify-between rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 outline-none transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-100",
          open && "border-emerald-500 ring-4 ring-emerald-100",
          className
        )}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown className={cn("ml-3 h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle}
              className={cn(
                "overflow-hidden rounded-2xl border border-emerald-100 bg-white p-2 shadow-[0_20px_50px_rgba(47,111,79,0.14)]",
                menuClassName
              )}
            >
              <div className="border-b border-emerald-50 px-2 pb-2">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-11 w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto py-2">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => {
                    const isSelected = option.value === value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onValueChange(option.value);
                          closeCombobox();
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-[#2f6f4f]",
                          isSelected && "bg-emerald-50 text-[#2f6f4f]",
                          optionClassName
                        )}
                      >
                        <span className="truncate pr-3">{option.label}</span>
                        {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-sm font-semibold text-slate-400">{emptyMessage}</div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
