import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full md:max-w-md px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg shadow-lg p-4 flex items-start justify-between animate-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : toast.type === "error"
              ? "bg-rose-50 border border-rose-200 text-rose-800"
              : "bg-blue-50 border border-blue-200 text-blue-800"
          }`}
        >
          <div className="flex items-start gap-3 flex-1">
            <div className="text-lg">
              {toast.type === "success" ? "✓" : toast.type === "error" ? "✗" : "ℹ"}
            </div>
            <div className="text-sm font-medium flex-1">{toast.message}</div>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="ml-2 text-lg leading-none hover:opacity-70 transition-opacity"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
