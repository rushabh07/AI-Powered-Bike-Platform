import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Sparkles,
    Check,
    Crown,
    Zap,
    ShieldCheck,
    TrendingUp,
} from "lucide-react";
import Navbar from "../components/Navbar";
import UpgradeModal from "../components/UpgradeModal";
import { getSubscriptionPlans, getSubscriptionStatus, getSubscriptionHistory } from "../services/api";

const FREE_FEATURES = [
    "AI Motorcycle Recommendations",
    "Basic AI Advisor",
    "Chat History",
    "Motorcycle Database Access",
];

const PREMIUM_FEATURES = [
    "Advanced AI Advisor",
    "Personalized Motorcycle Recommendations",
    "Motorcycle Comparisons",
    "Detailed Bike Information",
    "Chat History",
    "Edit Messages",
    "Regenerate Responses",
    "Priority AI Features",
];

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function AIPlan() {
    const navigate = useNavigate();
    const location = useLocation();

    const [config, setConfig] = useState(null);
    const [subStatus, setSubStatus] = useState(null);
    const [loggedIn, setLoggedIn] = useState(false);
    const [billing, setBilling] = useState("yearly");
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [upgradePlan, setUpgradePlan] = useState("monthly");
    const [payHistory, setPayHistory] = useState([]);

    const loadData = useCallback(async () => {
        try {
            const plansData = await getSubscriptionPlans();
            if (plansData && plansData.success) {
                setConfig(plansData);
            }
        } catch (err) {
            console.warn("Could not load backend plans config:", err.message);
        }

        const token = localStorage.getItem("token");
        if (!token) {
            setLoggedIn(false);
            setSubStatus(null);
            setPayHistory([]);
            return;
        }

        setLoggedIn(true);
        try {
            const statusData = await getSubscriptionStatus();
            if (statusData && statusData.success) {
                setSubStatus(statusData);
                try {
                    const stored = JSON.parse(localStorage.getItem("user") || "{}");
                    localStorage.setItem(
                        "user",
                        JSON.stringify({
                            ...stored,
                            aiPlan: statusData.plan,
                            aiPlanType: statusData.planType,
                        })
                    );
                } catch {
                    /* ignore */
                }
            }
        } catch (err) {
            console.warn("Could not load subscription status:", err.message);
        }
        try {
            const hist = await getSubscriptionHistory();
            if (hist && hist.success) {
                setPayHistory(hist.subscriptions || []);
            }
        } catch (err) {
            console.warn("Could not load payment history:", err.message);
        }
    }, []);

    useEffect(() => {
        loadData();

        const handleSubUpdate = () => {
            loadData();
        };

        window.addEventListener("subscriptionUpdated", handleSubUpdate);
        return () => window.removeEventListener("subscriptionUpdated", handleSubUpdate);
    }, [loadData]);

    const monthly = config?.monthly || {
        price: 199,
        tokens: 500,
        days: 30,
    };

    const yearly = config?.yearly || {
        price: 1999,
        tokens: 6000,
        days: 365,
    };

    const freeTokens = config?.freeTokens ?? 20;

    // Dynamic savings calculation
    const monthlyEquivalent = useMemo(() => monthly.price * 12, [monthly.price]);
    const savingsAmount = useMemo(
        () => monthlyEquivalent - yearly.price,
        [monthlyEquivalent, yearly.price]
    );

    const isPremium = subStatus?.plan === "premium";
    const activePlanType = subStatus?.planType || "free";

    const handleUpgradeClick = (plan) => {
        if (!loggedIn) {
            navigate("/login", {
                state: { from: location.pathname },
            });
            return;
        }
        setUpgradePlan(plan);
        setShowUpgrade(true);
    };

    const fmtDate = (iso) =>
        iso
            ? new Date(iso).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
              })
            : "—";

    return (
        <div className="min-h-screen bg-[#070708] text-white">
            <Navbar activeTab="ai-plan" />

            <main className="mx-auto max-w-7xl px-5 py-12 md:px-6 md:py-16">
                {/* Header / Hero */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-bold text-orange-400 shadow-sm">
                        <Zap size={14} />
                        MOTOAI AI PLAN
                    </div>
                    <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                        Choose the plan{" "}
                        <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                            that fits you
                        </span>
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-400 sm:text-base">
                        Supercharge your motorcycle research with MotoMind AI advisor. Unlock priority tokens, comparisons, and deep technical specs.
                    </p>

                    {/* Billing Toggle */}
                    <div className="mx-auto mt-8 flex max-w-xs items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-md">
                        <button
                            onClick={() => setBilling("monthly")}
                            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition duration-200 ${
                                billing === "monthly"
                                    ? "bg-orange-500 text-black shadow-md"
                                    : "text-zinc-400 hover:text-white"
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBilling("yearly")}
                            className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition duration-200 ${
                                billing === "yearly"
                                    ? "bg-orange-500 text-black shadow-md"
                                    : "text-zinc-400 hover:text-white"
                            }`}
                        >
                            Yearly
                        </button>
                    </div>

                    {/* Dynamic Savings Highlight */}
                    {savingsAmount > 0 && (
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
                            <TrendingUp size={14} />
                            Monthly equivalent: {inr(monthly.price)} × 12 = {inr(monthlyEquivalent)} • Yearly price: {inr(yearly.price)} • You save: {inr(savingsAmount)}/year
                        </div>
                    )}
                </div>

                {/* Pricing Cards Grid */}
                <div className="mt-12 grid gap-8 lg:grid-cols-3">
                    {/* FREE PLAN CARD */}
                    <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-xl transition hover:border-white/20">
                        <div>
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white">Free</h2>
                                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-zinc-400">
                                    Starter
                                </span>
                            </div>
                            <p className="mt-4 text-4xl font-black text-white">₹0</p>
                            <p className="mt-1 text-xs text-zinc-400">
                                {Number(freeTokens).toLocaleString("en-IN")} AI Tokens • Lifetime access
                            </p>

                            <div className="my-6 border-t border-white/[0.08]" />

                            <ul className="space-y-3.5 text-xs text-zinc-300 sm:text-sm">
                                {FREE_FEATURES.map((feature) => (
                                    <li key={feature} className="flex items-start gap-3">
                                        <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-8">
                            <button
                                disabled
                                className="w-full cursor-default rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 text-center text-sm font-bold text-zinc-400"
                            >
                                {!loggedIn || activePlanType === "free"
                                    ? "Current Plan"
                                    : "Included in Premium"}
                            </button>
                        </div>
                    </div>

                    {/* PREMIUM MONTHLY CARD */}
                    <div
                        className={`flex flex-col justify-between rounded-3xl border p-8 backdrop-blur-xl transition ${
                            billing === "monthly"
                                ? "border-orange-500/50 bg-gradient-to-b from-orange-500/[0.08] to-transparent shadow-xl shadow-orange-500/5"
                                : "border-white/10 bg-white/[0.02] hover:border-white/20"
                        }`}
                    >
                        <div>
                            <div className="flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-xl font-bold text-orange-400">
                                    <Crown size={20} />
                                    Premium Monthly
                                </h2>
                                {billing === "monthly" && (
                                    <span className="rounded-full bg-orange-500/20 px-3 py-1 text-[11px] font-bold text-orange-400">
                                        Selected
                                    </span>
                                )}
                            </div>

                            <p className="mt-4 text-4xl font-black text-white">
                                {inr(monthly.price)}
                                <span className="text-sm font-medium text-zinc-500"> /month</span>
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                                {Number(monthly.tokens).toLocaleString("en-IN")} AI Tokens • {monthly.days} Days Validity
                            </p>

                            <div className="my-6 border-t border-white/[0.08]" />

                            <ul className="space-y-3.5 text-xs text-zinc-200 sm:text-sm">
                                {PREMIUM_FEATURES.map((feature) => (
                                    <li key={feature} className="flex items-start gap-3">
                                        <Check size={16} className="mt-0.5 shrink-0 text-orange-400" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-8">
                            {isPremium && activePlanType === "monthly" ? (
                                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                                    <p className="text-sm font-bold text-emerald-400">
                                        ✓ Premium Monthly
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-300">
                                        {Number(monthly.tokens).toLocaleString("en-IN")} Token Plan • Expires: {fmtDate(subStatus?.expiresAt)}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-emerald-300">
                                        Remaining Tokens: {Number(subStatus?.tokens ?? 0).toLocaleString("en-IN")}
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleUpgradeClick("monthly")}
                                    className="w-full rounded-2xl bg-orange-500 py-3.5 text-center text-sm font-bold text-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-400 active:scale-[0.99]"
                                >
                                    Upgrade
                                </button>
                            )}
                        </div>
                    </div>

                    {/* PREMIUM YEARLY CARD (BEST VALUE) */}
                    <div
                        className={`relative flex flex-col justify-between rounded-3xl border p-8 backdrop-blur-xl transition ${
                            billing === "yearly"
                                ? "border-orange-500 bg-gradient-to-b from-orange-500/15 via-orange-500/5 to-transparent shadow-2xl shadow-orange-500/10 ring-1 ring-orange-500/30"
                                : "border-orange-500/40 bg-white/[0.03] hover:border-orange-500"
                        }`}
                    >
                        {/* BEST VALUE Floating Badge */}
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                            <span className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-1 text-xs font-black uppercase tracking-wider text-black shadow-lg">
                                BEST VALUE
                            </span>
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-xl font-bold text-orange-400">
                                    <Crown size={20} className="text-amber-400" />
                                    Premium Yearly
                                </h2>
                                {savingsAmount > 0 && (
                                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                                        Save {inr(savingsAmount)}
                                    </span>
                                )}
                            </div>

                            <p className="mt-4 text-4xl font-black text-white">
                                {inr(yearly.price)}
                                <span className="text-sm font-medium text-zinc-500"> /year</span>
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                                {Number(yearly.tokens).toLocaleString("en-IN")} AI Tokens • {yearly.days} Days Validity
                            </p>

                            <div className="my-6 border-t border-white/[0.08]" />

                            <ul className="space-y-3.5 text-xs text-zinc-200 sm:text-sm">
                                {PREMIUM_FEATURES.map((feature) => (
                                    <li key={feature} className="flex items-start gap-3">
                                        <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-8">
                            {isPremium && activePlanType === "yearly" ? (
                                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                                    <p className="text-sm font-bold text-emerald-400">
                                        ✓ Premium Yearly
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-300">
                                        {Number(yearly.tokens).toLocaleString("en-IN")} Token Plan • Expires: {fmtDate(subStatus?.expiresAt)}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-emerald-300">
                                        Remaining Tokens: {Number(subStatus?.tokens ?? 0).toLocaleString("en-IN")}
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleUpgradeClick("yearly")}
                                    className="w-full rounded-2xl bg-orange-500 py-3.5 text-center text-sm font-bold text-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-400 active:scale-[0.99]"
                                >
                                    Upgrade
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Payment History */}
                {loggedIn && (
                    <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c]">
                        <div className="border-b border-white/10 p-5 sm:p-6">
                            <h3 className="text-lg font-bold">
                                Payment History
                            </h3>
                            <p className="mt-1 text-xs text-zinc-500">
                                Every payment record from MongoDB. No
                                card details are ever stored.
                            </p>
                        </div>
                        {payHistory.length === 0 ? (
                            <p className="p-8 text-center text-sm text-zinc-600">
                                No payments yet. Free plan is active.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-500">
                                            <th className="px-5 py-3.5">
                                                Plan
                                            </th>
                                            <th className="px-5 py-3.5 text-right">
                                                Amount
                                            </th>
                                            <th className="px-5 py-3.5">
                                                Payment ID
                                            </th>
                                            <th className="px-5 py-3.5">
                                                Order ID
                                            </th>
                                            <th className="px-5 py-3.5">
                                                Status
                                            </th>
                                            <th className="px-5 py-3.5">
                                                Purchase Date
                                            </th>
                                            <th className="px-5 py-3.5">
                                                Expiry Date
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payHistory.map((s) => (
                                            <tr
                                                key={s._id}
                                                className="border-b border-white/5 last:border-0"
                                            >
                                                <td className="px-5 py-3 font-semibold capitalize">
                                                    {s.plan}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    ₹
                                                    {Number(
                                                        s.amount || 0
                                                    ).toLocaleString("en-IN")}
                                                </td>
                                                <td
                                                    className="max-w-[140px] truncate px-5 py-3 font-mono text-xs text-zinc-400"
                                                    title={s.paymentId || ""}
                                                >
                                                    {s.paymentId || "—"}
                                                </td>
                                                <td
                                                    className="max-w-[140px] truncate px-5 py-3 font-mono text-xs text-zinc-400"
                                                    title={s.orderId || ""}
                                                >
                                                    {s.orderId || "—"}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                                                            s.status ===
                                                            "paid"
                                                                ? "bg-emerald-500/10 text-emerald-400"
                                                                : s.status ===
                                                                    "created"
                                                                  ? "bg-yellow-500/10 text-yellow-400"
                                                                  : "bg-red-500/10 text-red-400"
                                                        }`}
                                                    >
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-zinc-400">
                                                    {fmtDate(s.createdAt)}
                                                </td>
                                                <td className="px-5 py-3 text-zinc-400">
                                                    {fmtDate(s.expiresAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer notes */}
                <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-xs text-zinc-400">
                    <div className="flex items-center justify-center gap-2 text-zinc-300 font-semibold mb-2">
                        <ShieldCheck size={16} className="text-emerald-400" />
                        Transparent & Secure AI Token System
                    </div>
                    <p>
                        Tokens are only consumed when MotoMind successfully generates an AI response. Failed queries are never billed.
                        Motorcycle browsing, specs viewing, and database filters remain completely free.
                    </p>
                </div>
            </main>

            {/* Upgrade / Checkout Modal */}
            <UpgradeModal
                open={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                config={config ? { monthly: config.monthly, yearly: config.yearly } : undefined}
                initialPlan={upgradePlan}
                onActivated={(updatedWallet) => {
                    setSubStatus((prev) => ({ ...prev, ...updatedWallet }));
                    setShowUpgrade(false);
                    loadData();
                }}
            />
        </div>
    );
}
