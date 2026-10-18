import { CheckCircle2, AlertCircle, X } from "lucide-react";

// Lightweight toast stack (success / failure notifications)
export const ToastStack = ({ toasts, onDismiss }) => {
    if (!toasts || toasts.length === 0) return null;
    return (
        <div className="fixed bottom-5 right-5 z-[60] flex w-[calc(100vw-2.5rem)] max-w-sm flex-col gap-2" aria-live="polite">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    role={t.type === "error" ? "alert" : "status"}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
                        t.type === "error"
                            ? "border-red-500/30 bg-[#1a0d0d]/95 text-red-200"
                            : "border-emerald-500/30 bg-[#0b1a12]/95 text-emerald-100"
                    }`}
                >
                    {t.type === "error" ? (
                        <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
                    ) : (
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
                    )}
                    <p className="min-w-0 flex-1 text-sm leading-relaxed">{t.message}</p>
                    <button
                        onClick={() => onDismiss(t.id)}
                        aria-label="Dismiss notification"
                        className="shrink-0 rounded-lg p-1 opacity-70 transition hover:opacity-100"
                    >
                        <X size={15} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ToastStack;
