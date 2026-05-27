"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "ok" | "err";
}

interface ToastCtx {
  toasts: ToastItem[];
  toast: (message: string, type: "ok" | "err") => void;
}

const Ctx = createContext<ToastCtx | null>(null);
let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: "ok" | "err") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <Ctx.Provider value={{ toasts, toast }}>
      {children}
      {/* Toast container — fixed top-right */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg border animate-slide-in
              ${t.type === "ok"
                ? "bg-emerald-600/90 border-emerald-500/40 text-white"
                : "bg-red-600/90 border-red-500/40 text-white"
              }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
