import React, { useEffect, useState } from "react";
import { X, Rocket, CheckCircle2, Crown, Zap, ShieldCheck } from "lucide-react";
import { createSubscriptionOrder, verifySubscriptionPayment } from "../services/api";

const DEFAULT_CONFIG = {
    monthly: { price: 199, tokens: 500, days: 30 },
    yearly: { price: 1999, tokens: 6000, days: 365 },
};

const loadRazorpayScript = () =>
    new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

/**
 * UpgradeModal — premium upsell + subscribe flow.
 * Plan prices/tokens/days come from backend config.
 */
export default function UpgradeModal({
    open,
    onClose,
    config,
    initialPlan = "monthly",
    onActivated,
}) {
    const plans = config?.monthly ? config : DEFAULT_CONFIG;
    const [selectedPlan, setSelectedPlan] = useState(initialPlan);
    const [step, setStep] = useState("intro"); // intro | ordering | confirm | verifying | done | error
    const [order, setOrder] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setSelectedPlan(initialPlan === "yearly" ? "yearly" : "monthly");
            setStep("intro");
            setOrder(null);
            setError("");
        }
    }, [open, initialPlan]);

    if (!open) return null;

    const planCfg = plans[selectedPlan] || plans.monthly;

    const handleCreateOrder = async () => {
        setError("");
        setStep("ordering");
        try {
            const data = await createSubscriptionOrder(selectedPlan);
            setOrder(data);

            // Authoritative order id/amount from backend (flat fields
            // kept for backward compatibility with `order` object)
            const orderId = data.order?.id || data.orderId;
            const amountPaise =
                data.order?.amount ?? data.amount * 100;
            const keyId =
                data.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;

            if (data.mode === "razorpay" && keyId) {
                const loaded = await loadRazorpayScript();
                if (!loaded) {
                    throw new Error(
                        "Could not load Razorpay checkout. Check your connection and try again."
                    );
                }
                setStep("opening");
                const rzp = new window.Razorpay({
                    key: keyId,
                    amount: amountPaise,
                    currency: data.currency || "INR",
                    name: "MOTOAI",
                    description: "MOTOAI AI Plan",
                    order_id: orderId,
                    handler: (resp) =>
                        handleVerifyPayment({
                            razorpay_order_id: orderId,
                            razorpay_payment_id:
                                resp.razorpay_payment_id,
                            razorpay_signature:
                                resp.razorpay_signature,
                        }),
                    modal: {
                        ondismiss: () => {
                            setError(
                                "Payment cancelled. No amount has been added to your MOTOAI subscription."
                            );
                            setStep("error");
                        },
                    },
                    theme: { color: "#f97316" },
                });
                rzp.open();
            } else if (data.mode === "razorpay") {
                throw new Error(
                    "Payment gateway key is missing. Contact support."
                );
            } else {
                // Test mode confirmation screen
                setStep("confirm");
            }
        } catch (err) {
            setError(err.message || "Could not initialize payment order.");
            setStep("error");
        }
    };

    const handleVerifyPayment = async (payload) => {
        setError("");
        setStep("verifying");
        try {
            const data = await verifySubscriptionPayment(payload);
            setStep("done");

            // Dispatch global event for navbar and other listeners
            window.dispatchEvent(new Event("subscriptionUpdated"));

            if (onActivated) {
                onActivated(data.wallet || data);
            }
        } catch (err) {
            setError(err.message || "Payment verification failed.");
            setStep("error");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-orange-500/30 bg-[#0c0c0e] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <Rocket size={18} className="text-orange-500" />
                        Upgrade to MOTOAI Premium
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 text-center">
                    {step === "done" ? (
                        <>
                            <CheckCircle2 size={54} className="mx-auto text-emerald-400" />
                            <h3 className="mt-4 text-xl font-black text-white">
                                Premium Activated!
                            </h3>
                            <p className="mt-2 text-sm text-zinc-400">
                                Your account has been upgraded with your new token allowance.
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-6 w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black transition hover:bg-orange-400"
                            >
                                Start Exploring
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400 shadow-inner">
                                <Crown size={28} />
                            </div>

                            {/* Plan Toggle */}
                            <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                                {["monthly", "yearly"].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => {
                                            setSelectedPlan(p);
                                            setStep("intro");
                                            setOrder(null);
                                            setError("");
                                        }}
                                        className={`rounded-lg py-2 text-xs font-bold capitalize transition ${
                                            selectedPlan === p
                                                ? "bg-orange-500 text-black shadow"
                                                : "text-zinc-400 hover:text-white"
                                        }`}
                                    >
                                        {p} {p === "yearly" && "⭐"}
                                    </button>
                                ))}
                            </div>

                            <p className="mt-4 text-3xl font-black text-white">
                                ₹{Number(planCfg.price).toLocaleString("en-IN")}
                                <span className="text-sm font-medium text-zinc-500">
                                    {" "}
                                    / {selectedPlan === "monthly" ? "month" : "year"}
                                </span>
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                                {Number(planCfg.tokens).toLocaleString("en-IN")} AI Tokens • {planCfg.days} Days Validity
                            </p>

                            {error && (
                                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                                    {error}
                                </div>
                            )}

                            {step === "confirm" && order ? (
                                <div className="mt-4 space-y-3">
                                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                                            <ShieldCheck size={15} className="text-orange-500" />
                                            Test Payment Confirmation
                                        </div>
                                        <p className="mt-1 font-mono text-[11px] text-zinc-500">
                                            Order ID: {order.orderId}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() =>
                                            handleVerifyPayment({
                                                orderId: order.orderId,
                                            })
                                        }
                                        className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black transition hover:bg-orange-400 shadow-lg shadow-orange-500/20"
                                    >
                                        Complete Test Payment (₹{order.amount})
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="mt-4 min-h-[20px] text-xs text-zinc-500">
                                        {step === "ordering" &&
                                            "Creating secure payment..."}
                                        {step === "opening" &&
                                            "Opening Razorpay... complete the payment in the popup."}
                                        {step === "verifying" &&
                                            "Verifying payment..."}
                                    </p>
                                    <button
                                        onClick={handleCreateOrder}
                                        disabled={
                                            step === "ordering" ||
                                            step === "opening" ||
                                            step === "verifying"
                                        }
                                        className="mt-2 w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black transition hover:bg-orange-400 shadow-lg shadow-orange-500/20 disabled:opacity-50"
                                    >
                                        {step === "ordering"
                                            ? "Creating Order..."
                                            : step === "opening"
                                              ? "Waiting for Payment..."
                                              : step === "verifying"
                                                ? "Verifying Payment..."
                                                : `Proceed to Pay ₹${Number(planCfg.price).toLocaleString("en-IN")}`}
                                    </button>
                                </>
                            )}

                            <button
                                onClick={onClose}
                                className="mt-3 w-full py-2 text-xs font-semibold text-zinc-500 transition hover:text-white"
                            >
                                Maybe Later
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
