"use client";

import { useEffect } from "react";

export function useBodyModalState(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    document.body.classList.add("app-modal-open");

    return () => {
      document.body.classList.remove("app-modal-open");
    };
  }, [isOpen]);
}
