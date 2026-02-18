import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

const normalizeType = (type) => {
  const t = String(type || "info").toLowerCase();
  if (t === "success" || t === "error" || t === "warning" || t === "info") return t;
  return "info";
};

const getDefaultTitle = (type) => {
  switch (type) {
    case "success":
      return "Success";
    case "error":
      return "Something went wrong";
    case "warning":
      return "Please check";
    default:
      return "Info";
  }
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ type = "info", title, message, durationMs = 3500 } = {}) => {
      const normalizedType = normalizeType(type);
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const toast = {
        id,
        type: normalizedType,
        title: title || getDefaultTitle(normalizedType),
        message: String(message || ""),
      };

      setToasts((prev) => [...prev, toast]);

      const d = Number(durationMs);
      if (Number.isFinite(d) && d > 0) {
        window.setTimeout(() => removeToast(id), d);
      }

      return id;
    },
    [removeToast],
  );

  const api = useMemo(() => ({ pushToast, removeToast }), [pushToast, removeToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="pg-toast-stack" aria-live="polite" aria-relevant="additions removals">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pg-toast pg-toast--${t.type}`}
            role={t.type === "error" ? "alert" : "status"}
          >
            <div className="pg-toast__header">
              <div className="pg-toast__title">{t.title}</div>
              <button
                type="button"
                className="pg-toast__close"
                aria-label="Close"
                onClick={() => removeToast(t.id)}
              >
                ×
              </button>
            </div>
            {t.message ? <div className="pg-toast__body">{t.message}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
};
