import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    TrendingUp,
    Calendar,
    BarChart3,
    PieChart,
    Coins,
    IndianRupee,
    CreditCard,
    RefreshCw,
    Sparkles,
    Users,
    Crown,
    ArrowUpRight,
} from "lucide-react";
import { getAdminSubscriptionAnalytics } from "../../services/api";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function AIAnalyticsSection() {
    const [range, setRange] = useState("30d");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showCustom, setShowCustom] = useState(false);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [hoveredPoint, setHoveredPoint] = useState(null);

    const loadAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const params = {
                range: showCustom ? "custom" : range,
                ...(showCustom && startDate ? { startDate } : {}),
                ...(showCustom && endDate ? { endDate } : {}),
            };
            const res = await getAdminSubscriptionAnalytics(params);
            if (res && res.success) {
                setData(res);
            } else {
                setError(res?.message || "Failed to load analytics data.");
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to fetch subscription analytics.");
        } finally {
            setLoading(false);
        }
    }, [range, showCustom, startDate, endDate]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    const timeline = data?.timeline || [];
    const summary = data?.summary || { revenue: 0, subscriptions: 0 };
    const planDist = data?.activeUserDistribution || [];
    const tokenBreakdown = data?.tokenBreakdown || { allocated: 0, used: 0, remaining: 0 };
    const planSales = data?.planSalesInRange || [];

    // Max values for chart scaling
    const maxRev = useMemo(() => {
        return Math.max(...timeline.map((t) => t.revenue || 0), 100);
    }, [timeline]);

    const maxSubs = useMemo(() => {
        return Math.max(...timeline.map((t) => t.subscriptions || 0), 5);
    }, [timeline]);

    const totalActiveUsers = useMemo(() => {
        return planDist.reduce((acc, p) => acc + (p.value || 0), 0) || 1;
    }, [planDist]);

    return (
        <div className="space-y-8">
            {/* HEADER & DATE RANGE CONTROLS */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="text-orange-500" size={22} />
                        Subscription & Revenue Analytics
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                        MongoDB aggregated time-series revenue curves, subscription growth, and token dynamics.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Range Buttons */}
                    {[
                        { id: "today", label: "Today" },
                        { id: "7d", label: "7 Days" },
                        { id: "30d", label: "30 Days" },
                        { id: "month", label: "This Month" },
                        { id: "year", label: "This Year" },
                        { id: "all", label: "All Time" },
                    ].map((btn) => (
                        <button
                            key={btn.id}
                            onClick={() => {
                                setShowCustom(false);
                                setRange(btn.id);
                            }}
                            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                                !showCustom && range === btn.id
                                    ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20"
                                    : "border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                            }`}
                        >
                            {btn.label}
                        </button>
                    ))}

                    <button
                        onClick={() => setShowCustom(!showCustom)}
                        className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                            showCustom
                                ? "bg-orange-500 text-black"
                                : "border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                        }`}
                    >
                        Custom Range
                    </button>

                    <button
                        onClick={loadAnalytics}
                        className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Custom Date Inputs */}
            {showCustom && (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
                    <span className="text-xs text-gray-400">From Date:</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="rounded-xl border border-white/10 bg-[#141414] px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/50"
                    />
                    <span className="text-xs text-gray-400">To Date:</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="rounded-xl border border-white/10 bg-[#141414] px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/50"
                    />
                    <button
                        onClick={loadAnalytics}
                        disabled={!startDate || !endDate}
                        className="rounded-xl bg-orange-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-orange-400 disabled:opacity-50"
                    >
                        Apply Filter
                    </button>
                </div>
            )}

            {/* RANGE SUMMARY METRICS */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="uppercase tracking-wider font-semibold">Revenue in Range</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                            <IndianRupee size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-3xl font-black text-orange-400">
                        {loading ? "—" : inr(summary.revenue)}
                    </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="uppercase tracking-wider font-semibold">Paid Purchases</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                            <CreditCard size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-3xl font-black text-emerald-400">
                        {loading ? "—" : summary.subscriptions}
                    </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="uppercase tracking-wider font-semibold">Active Tier Distribution</span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                            <Users size={16} />
                        </div>
                    </div>
                    <p className="mt-2 text-3xl font-black text-white">
                        {loading ? "—" : totalActiveUsers} <span className="text-sm font-normal text-gray-500">users</span>
                    </p>
                </div>
            </div>

            {/* ERROR OR LOADING */}
            {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-400 text-center">
                    {error}
                </div>
            )}

            {/* CHART 1: REVENUE TIMELINE */}
            <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <BarChart3 className="text-orange-500" size={18} />
                            Revenue Timeline (₹)
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Daily verified subscription revenue earned across the selected timeframe.
                        </p>
                    </div>
                    {hoveredPoint && (
                        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs text-orange-300">
                            <span className="font-bold">{hoveredPoint.date}</span>: {inr(hoveredPoint.revenue)} ({hoveredPoint.subscriptions} paid)
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center text-xs text-gray-500">
                        Loading revenue curve...
                    </div>
                ) : timeline.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-xs text-gray-500">
                        <p>No paid transactions in this time window.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Bar chart representation */}
                        <div className="h-64 flex items-end gap-2 pt-6 pb-2 overflow-x-auto">
                            {timeline.map((item, idx) => {
                                const heightPercent = Math.max(8, (item.revenue / maxRev) * 100);
                                return (
                                    <div
                                        key={item.date || idx}
                                        onMouseEnter={() => setHoveredPoint(item)}
                                        onMouseLeave={() => setHoveredPoint(null)}
                                        className="group flex-1 min-w-[28px] max-w-[50px] flex flex-col items-center gap-2 cursor-pointer"
                                    >
                                        <div className="w-full flex items-end justify-center h-48">
                                            <div
                                                className="w-full rounded-t-lg bg-gradient-to-t from-orange-500/80 to-amber-400 transition-all duration-300 group-hover:from-orange-400 group-hover:to-amber-300 group-hover:shadow-lg group-hover:shadow-orange-500/30"
                                                style={{ height: `${heightPercent}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-gray-500 group-hover:text-white truncate max-w-full">
                                            {item.date ? item.date.slice(5) : ""}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* CHART 2: SUBSCRIPTION GROWTH & DISTRIBUTION */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Subscription Volume Timeline */}
                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6">
                    <h4 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                        <Crown className="text-orange-500" size={18} />
                        Subscription Volume Growth
                    </h4>
                    <p className="text-xs text-gray-500 mb-6">Daily number of completed subscriptions.</p>

                    {loading ? (
                        <div className="h-48 flex items-center justify-center text-xs text-gray-500">Loading...</div>
                    ) : timeline.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-xs text-gray-500">No data.</div>
                    ) : (
                        <div className="h-48 flex items-end gap-2 overflow-x-auto pb-2">
                            {timeline.map((item, idx) => {
                                const heightPercent = Math.max(10, (item.subscriptions / maxSubs) * 100);
                                return (
                                    <div
                                        key={item.date || idx}
                                        className="flex-1 min-w-[24px] max-w-[40px] flex flex-col items-center gap-2"
                                    >
                                        <div className="w-full flex items-end justify-center h-36">
                                            <div
                                                className="w-full rounded-t-lg bg-emerald-500/80 hover:bg-emerald-400 transition-all"
                                                style={{ height: `${heightPercent}%` }}
                                                title={`${item.date}: ${item.subscriptions} subscriptions`}
                                            />
                                        </div>
                                        <span className="text-[9px] text-gray-500">{item.date ? item.date.slice(5) : ""}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Active Plan Distribution */}
                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 flex flex-col justify-between">
                    <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                            <PieChart className="text-orange-500" size={18} />
                            Active Plan Tier Distribution
                        </h4>
                        <p className="text-xs text-gray-500 mb-6">User proportion across Free, Monthly, and Yearly tiers.</p>

                        <div className="space-y-4">
                            {planDist.map((item) => {
                                const percent = ((item.value / totalActiveUsers) * 100).toFixed(1);
                                return (
                                    <div key={item.name} className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-semibold text-white flex items-center gap-2">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full"
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                {item.name} Plan
                                            </span>
                                            <span className="text-gray-400">
                                                {item.value} users ({percent}%)
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${percent}%`,
                                                    backgroundColor: item.color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                        <span>Total Tracked Users:</span>
                        <span className="font-bold text-white">{totalActiveUsers}</span>
                    </div>
                </div>
            </div>

            {/* CHART 3: AI TOKEN UTILIZATION GAUGE */}
            <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6">
                <h4 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                    <Coins className="text-orange-500" size={18} />
                    Platform AI Token Pool Dynamics
                </h4>
                <p className="text-xs text-gray-500 mb-6">
                    Breakdown of AI Tokens currently remaining in user wallets versus consumed.
                </p>

                <div className="grid gap-4 sm:grid-cols-3 mb-6">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
                        <p className="text-xs text-gray-500 uppercase">Gross Pool</p>
                        <p className="mt-1 text-2xl font-black text-white">
                            {Number(tokenBreakdown.allocated || 0).toLocaleString("en-IN")}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
                        <p className="text-xs text-orange-400 uppercase">Consumed Credits</p>
                        <p className="mt-1 text-2xl font-black text-orange-400">
                            {Number(tokenBreakdown.used || 0).toLocaleString("en-IN")}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
                        <p className="text-xs text-emerald-400 uppercase">Active Available</p>
                        <p className="mt-1 text-2xl font-black text-emerald-400">
                            {Number(tokenBreakdown.remaining || 0).toLocaleString("en-IN")}
                        </p>
                    </div>
                </div>

                {/* Stacked visualization bar */}
                {tokenBreakdown.allocated > 0 && (
                    <div>
                        <div className="h-3.5 w-full flex overflow-hidden rounded-full bg-white/10">
                            <div
                                style={{
                                    width: `${(tokenBreakdown.used / tokenBreakdown.allocated) * 100}%`,
                                }}
                                className="bg-orange-500 transition-all duration-500"
                                title={`Used: ${tokenBreakdown.used}`}
                            />
                            <div
                                style={{
                                    width: `${(tokenBreakdown.remaining / tokenBreakdown.allocated) * 100}%`,
                                }}
                                className="bg-emerald-500 transition-all duration-500"
                                title={`Remaining: ${tokenBreakdown.remaining}`}
                            />
                        </div>
                        <div className="mt-2 flex justify-between text-[11px] text-gray-500">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-orange-500" />
                                {((tokenBreakdown.used / tokenBreakdown.allocated) * 100).toFixed(1)}% Consumed
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                {((tokenBreakdown.remaining / tokenBreakdown.allocated) * 100).toFixed(1)}% Active Remaining
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
