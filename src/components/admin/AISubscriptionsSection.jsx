import React, { useEffect, useState, useCallback } from "react";
import {
    CreditCard,
    Coins,
    Users,
    Crown,
    Calendar,
    Search,
    Filter,
    ArrowUpDown,
    Download,
    Eye,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock,
    Zap,
    TrendingUp,
    Copy,
    Check,
    ChevronLeft,
    ChevronRight,
    X,
    User,
    Mail,
    Phone,
    IndianRupee,
    Shield,
    Sparkles,
    AlertTriangle,
} from "lucide-react";
import UserAvatar from "../UserAvatar";
import {
    getAdminSubscriptionStats,
    getAdminSubscriptions,
    getAdminSubscriptionDetails,
    getAdminExpiringSubscriptions,
    getAdminLowTokenUsers,
    exportAdminSubscriptionsCsv,
} from "../../services/api";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const fmtDate = (iso) =>
    iso
        ? new Date(iso).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "—";

const fmtDateTime = (iso) =>
    iso
        ? new Date(iso).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "—";

export default function AISubscriptionsSection() {
    // Top-level stats
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState("");

    // Subscriptions list & pagination
    const [subscriptions, setSubscriptions] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState("");

    // Filters & Sorting state
    const [search, setSearch] = useState("");
    const [planFilter, setPlanFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [datePreset, setDatePreset] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sort, setSort] = useState("newest");
    const [showCustomDate, setShowCustomDate] = useState(false);

    // Expiring & Low Tokens
    const [expiringSubs, setExpiringSubs] = useState([]);
    const [expiringLoading, setExpiringLoading] = useState(false);
    const [lowTokenUsers, setLowTokenUsers] = useState([]);
    const [lowTokenLoading, setLowTokenLoading] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState("all"); // "all" | "expiring" | "low_tokens"

    // Subscription Detail Modal
    const [selectedSubId, setSelectedSubId] = useState(null);
    const [detailData, setDetailData] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    // Copy to clipboard indicator
    const [copiedKey, setCopiedKey] = useState("");

    const copyText = (text, key) => {
        if (!text || text === "—") return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(""), 2000);
    };

    // Load Overview Stats
    const loadStats = useCallback(async () => {
        try {
            setStatsLoading(true);
            setStatsError("");
            const res = await getAdminSubscriptionStats();
            if (res && res.success) {
                setStats(res);
            } else {
                setStatsError(res?.message || "Failed to load subscription statistics.");
            }
        } catch (err) {
            console.error(err);
            setStatsError(err.message || "Failed to load subscription statistics.");
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // Load Subscriptions List
    const loadSubscriptions = useCallback(
        async (page = 1) => {
            try {
                setListLoading(true);
                setListError("");
                const params = {
                    page,
                    limit: pagination.limit,
                    search: search.trim(),
                    plan: planFilter,
                    status: statusFilter,
                    sort,
                    datePreset: showCustomDate ? "" : datePreset,
                    ...(showCustomDate && startDate ? { startDate } : {}),
                    ...(showCustomDate && endDate ? { endDate } : {}),
                };

                const res = await getAdminSubscriptions(params);
                if (res && res.success) {
                    setSubscriptions(res.subscriptions || []);
                    setPagination(res.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
                } else {
                    setListError(res?.message || "Failed to load subscriptions.");
                }
            } catch (err) {
                console.error(err);
                setListError(err.message || "Failed to load subscriptions.");
            } finally {
                setListLoading(false);
            }
        },
        [pagination.limit, search, planFilter, statusFilter, sort, datePreset, showCustomDate, startDate, endDate]
    );

    // Load Expiring & Low Tokens
    const loadSideAlerts = useCallback(async () => {
        try {
            setExpiringLoading(true);
            const expRes = await getAdminExpiringSubscriptions(7);
            if (expRes && expRes.success) {
                setExpiringSubs(expRes.expiring || []);
            }
        } catch (err) {
            console.warn(err);
        } finally {
            setExpiringLoading(false);
        }

        try {
            setLowTokenLoading(true);
            const lowRes = await getAdminLowTokenUsers(5);
            if (lowRes && lowRes.success) {
                setLowTokenUsers(lowRes.users || []);
            }
        } catch (err) {
            console.warn(err);
        } finally {
            setLowTokenLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
        loadSideAlerts();
    }, [loadStats, loadSideAlerts]);

    useEffect(() => {
        loadSubscriptions(1);
    }, [search, planFilter, statusFilter, sort, datePreset, showCustomDate, startDate, endDate]);

    // Handle View Details Modal
    const handleViewDetails = async (id) => {
        setSelectedSubId(id);
        setDetailData(null);
        setDetailError("");
        setDetailLoading(true);
        try {
            const res = await getAdminSubscriptionDetails(id);
            if (res && res.success) {
                setDetailData(res);
            } else {
                setDetailError(res?.message || "Could not load subscription details.");
            }
        } catch (err) {
            console.error(err);
            setDetailError(err.message || "Failed to fetch details.");
        } finally {
            setDetailLoading(false);
        }
    };

    // Export CSV
    const handleExport = async () => {
        try {
            await exportAdminSubscriptionsCsv({
                search: search.trim(),
                plan: planFilter,
                status: statusFilter,
            });
        } catch (err) {
            alert(err.message || "Failed to download export.");
        }
    };

    const overview = stats?.overview || {};
    const tokens = stats?.tokens || {};
    const planBreakdown = stats?.planBreakdown || [];

    return (
        <div className="space-y-8">
            {/* TOP ACTIONS BAR */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Crown className="text-orange-500" size={22} />
                        AI Subscription & Token Management
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                        MongoDB-driven real-time subscriber lifecycle, token allocations, and verified revenue.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            loadStats();
                            loadSubscriptions(pagination.page);
                            loadSideAlerts();
                        }}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
                    >
                        <RefreshCw size={15} className={statsLoading || listLoading ? "animate-spin" : ""} />
                        Refresh Data
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-xs font-bold text-orange-400 transition hover:bg-orange-500 hover:text-black"
                    >
                        <Download size={15} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* OVERVIEW STATS CARDS */}
            {statsError ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-400 flex items-center justify-between">
                    <p>{statsError}</p>
                    <button
                        onClick={loadStats}
                        className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/30"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Card 1: Total Subscribers */}
                    <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5 transition hover:border-orange-500/30">
                        <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                Total Subscribers
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                                <Users size={18} />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-black text-white">
                            {statsLoading ? "—" : Number(overview.totalSubscribers || 0).toLocaleString("en-IN")}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            {overview.totalUsers || 0} total registered users
                        </p>
                    </div>

                    {/* Card 2: Active Premium */}
                    <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5 transition hover:border-orange-500/30">
                        <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                Active Premium
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                                <Crown size={18} />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-black text-emerald-400">
                            {statsLoading ? "—" : Number(overview.activePremiumUsers || 0).toLocaleString("en-IN")}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            <span>{overview.monthlySubscribers || 0} Monthly</span>
                            <span>•</span>
                            <span>{overview.yearlySubscribers || 0} Yearly</span>
                        </div>
                    </div>

                    {/* Card 3: Free Users */}
                    <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5 transition hover:border-orange-500/30">
                        <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                Free Users
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                                <User size={18} />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-black text-white">
                            {statsLoading ? "—" : Number(overview.freeUsers || 0).toLocaleString("en-IN")}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            {overview.expiredSubscriptions || 0} expired subscriptions
                        </p>
                    </div>

                    {/* Card 4: Total Revenue */}
                    <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5 transition hover:border-orange-500/30">
                        <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                Total Revenue
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                                <IndianRupee size={18} />
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-black text-orange-400">
                            {statsLoading ? "—" : inr(overview.totalRevenue)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            This month: <span className="text-gray-300 font-semibold">{inr(overview.thisMonthRevenue)}</span>
                        </p>
                    </div>
                </div>
            )}

            {/* AI TOKEN ANALYTICS CARDS */}
            <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <Coins className="text-orange-500" size={18} />
                            AI Token Analytics & Consumption
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Real-time AI credit allocation and usage across all users.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-orange-400 font-medium">
                            <Zap size={13} /> Low Token Threshold: ≤ {tokens.lowTokenThreshold || 5}
                        </span>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-[11px] uppercase tracking-wider text-gray-500">Total Allocated</p>
                        <p className="mt-2 text-xl font-extrabold text-white">
                            {Number(tokens.totalAllocated || 0).toLocaleString("en-IN")}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-[11px] uppercase tracking-wider text-gray-500">Total Used</p>
                        <p className="mt-2 text-xl font-extrabold text-orange-400">
                            {Number(tokens.totalUsed || 0).toLocaleString("en-IN")}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-[11px] uppercase tracking-wider text-gray-500">Remaining Balance</p>
                        <p className="mt-2 text-xl font-extrabold text-emerald-400">
                            {Number(tokens.totalRemaining || 0).toLocaleString("en-IN")}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-[11px] uppercase tracking-wider text-gray-500">Avg Used / User</p>
                        <p className="mt-2 text-xl font-extrabold text-white">
                            {tokens.avgUsedPerUser ?? 0}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-[11px] uppercase tracking-wider text-amber-500">Low Tokens Users</p>
                        <p className="mt-2 text-xl font-extrabold text-amber-400">
                            {tokens.lowTokenUsersCount ?? 0}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-[11px] uppercase tracking-wider text-red-500">Zero Token Users</p>
                        <p className="mt-2 text-xl font-extrabold text-red-400">
                            {tokens.zeroTokenUsersCount ?? 0}
                        </p>
                    </div>
                </div>

                {/* Live Progress Bar */}
                {tokens.totalAllocated > 0 && (
                    <div className="mt-5 pt-4 border-t border-white/5">
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                            <span>Token Consumption Rate</span>
                            <span className="font-semibold text-white">
                                {((tokens.totalUsed / tokens.totalAllocated) * 100).toFixed(1)}% Used
                            </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                                style={{
                                    width: `${Math.min(100, (tokens.totalUsed / tokens.totalAllocated) * 100)}%`,
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* PLAN BREAKDOWN TABLE */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c]">
                    <div className="border-b border-white/10 p-5 sm:p-6">
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <Crown size={18} className="text-orange-500" />
                            Subscription Plan Breakdown
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                            Current active tier subscribers, token allowances, and generated revenue.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[550px]">
                            <thead>
                                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-500">
                                    <th className="px-6 py-4">Plan Tier</th>
                                    <th className="px-6 py-4">Price</th>
                                    <th className="px-6 py-4">Tokens</th>
                                    <th className="px-6 py-4">Active Users</th>
                                    <th className="px-6 py-4 text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {planBreakdown.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition">
                                        <td className="px-6 py-4 font-bold text-white flex items-center gap-2.5">
                                            <span
                                                className={`h-2.5 w-2.5 rounded-full ${
                                                    item.id === "yearly"
                                                        ? "bg-amber-400"
                                                        : item.id === "monthly"
                                                        ? "bg-orange-500"
                                                        : "bg-gray-500"
                                                }`}
                                            />
                                            {item.plan}
                                        </td>
                                        <td className="px-6 py-4 text-gray-300">
                                            {item.price === 0 ? "Free (₹0)" : inr(item.price)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-300 font-mono">
                                            {Number(item.tokens).toLocaleString("en-IN")}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-semibold text-white">
                                                {item.activeUsers}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-orange-400">
                                            {inr(item.revenue)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* REVENUE ANALYTICS SUMMARY */}
                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 flex flex-col justify-between">
                    <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <TrendingUp size={18} className="text-orange-500" />
                            Revenue Analytics
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">Verified paid subscription earnings.</p>

                        <div className="mt-5 space-y-3">
                            <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/5">
                                <span className="text-xs text-gray-400">Monthly Plan Earnings</span>
                                <span className="text-sm font-bold text-white">{inr(overview.monthlyRevenue)}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/5">
                                <span className="text-xs text-gray-400">Yearly Plan Earnings</span>
                                <span className="text-sm font-bold text-white">{inr(overview.yearlyRevenue)}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/5">
                                <span className="text-xs text-gray-400">Current Month (M-T-D)</span>
                                <span className="text-sm font-bold text-emerald-400">{inr(overview.thisMonthRevenue)}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/5">
                                <span className="text-xs text-gray-400">Previous Month</span>
                                <span className="text-sm font-bold text-gray-300">{inr(overview.prevMonthRevenue)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Total Paid Revenue</span>
                        <span className="text-xl font-black text-orange-500">{inr(overview.totalRevenue)}</span>
                    </div>
                </div>
            </div>

            {/* EXPIRING SOON & LOW TOKENS HIGHLIGHT PANELS */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Expiring Soon */}
                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                                <Clock size={16} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">Subscriptions Expiring Soon</h4>
                                <p className="text-[11px] text-gray-500">Expiring within 7 days</p>
                            </div>
                        </div>
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                            {expiringSubs.length} users
                        </span>
                    </div>

                    {expiringLoading ? (
                        <div className="py-8 text-center text-xs text-gray-500">Loading expiring subscriptions...</div>
                    ) : expiringSubs.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-500">
                            No subscriptions expiring in the next 7 days.
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                            {expiringSubs.map((item) => (
                                <div
                                    key={item._id}
                                    className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-3 text-xs hover:border-amber-500/30 transition"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-white truncate">{item.name}</p>
                                        <p className="text-gray-500 truncate text-[11px]">{item.email}</p>
                                    </div>
                                    <div className="text-right pl-3">
                                        <span className="inline-block rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                            {item.remainingDays} {item.remainingDays === 1 ? "day" : "days"} left
                                        </span>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {item.tokensRemaining} tokens left
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Low AI Token Users */}
                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                                <Zap size={16} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">Low AI Token Users</h4>
                                <p className="text-[11px] text-gray-500">Balance ≤ 5 tokens</p>
                            </div>
                        </div>
                        <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-400">
                            {lowTokenUsers.length} users
                        </span>
                    </div>

                    {lowTokenLoading ? (
                        <div className="py-8 text-center text-xs text-gray-500">Loading low token users...</div>
                    ) : lowTokenUsers.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-500">
                            No users currently below the token threshold.
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                            {lowTokenUsers.map((u) => (
                                <div
                                    key={u._id}
                                    className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-3 text-xs hover:border-red-500/30 transition"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-white truncate">{u.name}</p>
                                            <span className="rounded bg-white/5 px-1.5 py-0.2 text-[10px] text-gray-400 uppercase">
                                                {u.plan}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 truncate text-[11px]">{u.email}</p>
                                    </div>
                                    <div className="text-right pl-3">
                                        <span
                                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                                u.tokensRemaining === 0
                                                    ? "bg-red-500/20 text-red-400"
                                                    : "bg-amber-500/20 text-amber-300"
                                            }`}
                                        >
                                            {u.tokensRemaining} tokens
                                        </span>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            Used: {u.tokensUsed}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* DETAILED SUBSCRIPTIONS TABLE SECTION */}
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c]">
                {/* TOOLBAR & FILTERS */}
                <div className="border-b border-white/10 p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                <CreditCard size={19} className="text-orange-500" />
                                All Subscription Records
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                                Search and filter through all user subscription transactions and Razorpay orders.
                            </p>
                        </div>
                        <div className="text-xs text-gray-400">
                            Showing <span className="text-white font-bold">{subscriptions.length}</span> of{" "}
                            <span className="text-white font-bold">{pagination.total}</span> records
                        </div>
                    </div>

                    {/* Filter controls row */}
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 pt-2">
                        {/* Search Input */}
                        <div className="relative sm:col-span-2">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search user, email, payment ID, order ID..."
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-orange-500/50"
                            />
                        </div>

                        {/* Plan Filter */}
                        <div>
                            <select
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-[#141414] px-3 py-2.5 text-xs text-white outline-none focus:border-orange-500/50"
                            >
                                <option value="all">All Plans</option>
                                <option value="monthly">Monthly (₹199)</option>
                                <option value="yearly">Yearly (₹1,999)</option>
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-[#141414] px-3 py-2.5 text-xs text-white outline-none focus:border-orange-500/50"
                            >
                                <option value="all">All Statuses</option>
                                <option value="paid">Paid</option>
                                <option value="created">Created (Pending)</option>
                                <option value="failed">Failed</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>

                        {/* Date Preset */}
                        <div>
                            <select
                                value={showCustomDate ? "custom" : datePreset}
                                onChange={(e) => {
                                    if (e.target.value === "custom") {
                                        setShowCustomDate(true);
                                    } else {
                                        setShowCustomDate(false);
                                        setDatePreset(e.target.value);
                                    }
                                }}
                                className="w-full rounded-xl border border-white/10 bg-[#141414] px-3 py-2.5 text-xs text-white outline-none focus:border-orange-500/50"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="custom">Custom Date Range</option>
                            </select>
                        </div>

                        {/* Sort */}
                        <div>
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-[#141414] px-3 py-2.5 text-xs text-white outline-none focus:border-orange-500/50"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="highest_amount">Highest Amount</option>
                                <option value="lowest_amount">Lowest Amount</option>
                                <option value="expiry_soon">Expiring Soon</option>
                            </select>
                        </div>
                    </div>

                    {/* Custom Date Range Row if active */}
                    {showCustomDate && (
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <span className="text-xs text-gray-400">Custom Date:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="rounded-xl border border-white/10 bg-[#141414] px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/50"
                            />
                            <span className="text-xs text-gray-500">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="rounded-xl border border-white/10 bg-[#141414] px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/50"
                            />
                            <button
                                onClick={() => {
                                    setShowCustomDate(false);
                                    setStartDate("");
                                    setEndDate("");
                                    setDatePreset("all");
                                }}
                                className="rounded-lg px-2.5 py-1 text-xs text-gray-400 hover:text-white"
                            >
                                Reset Range
                            </button>
                        </div>
                    )}
                </div>

                {/* TABLE CONTENT */}
                {listLoading ? (
                    <div className="flex min-h-[300px] flex-col items-center justify-center py-12 text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                        <p className="mt-3 text-xs text-gray-400">Loading subscription records...</p>
                    </div>
                ) : listError ? (
                    <div className="p-8 text-center">
                        <AlertCircle size={32} className="mx-auto text-red-400 mb-2" />
                        <p className="text-sm text-red-300">{listError}</p>
                        <button
                            onClick={() => loadSubscriptions(pagination.page)}
                            className="mt-3 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                        >
                            Try Again
                        </button>
                    </div>
                ) : subscriptions.length === 0 ? (
                    <div className="py-14 text-center">
                        <CreditCard size={40} className="mx-auto text-gray-700 mb-3" />
                        <p className="font-bold text-white">No subscriptions found</p>
                        <p className="mt-1 text-xs text-gray-500">Try adjusting your search query or filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] text-left">
                            <thead>
                                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-500 bg-white/[0.01]">
                                    <th className="px-5 py-4">User</th>
                                    <th className="px-5 py-4">Plan</th>
                                    <th className="px-5 py-4">Amount</th>
                                    <th className="px-5 py-4">Tokens</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4">Order ID</th>
                                    <th className="px-5 py-4">Payment ID</th>
                                    <th className="px-5 py-4">Started / Expiry</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs">
                                {subscriptions.map((sub) => {
                                    const user = sub.user || {};
                                    const isPaid = sub.status === "paid";
                                    const isExpired = sub.status === "expired";
                                    const isFailed = sub.status === "failed";

                                    return (
                                        <tr
                                            key={sub._id}
                                            className="hover:bg-white/[0.025] transition"
                                        >
                                            {/* User Info */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={user} size={34} />
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-white truncate max-w-[160px]">
                                                            {user.name || "Unknown"}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500 truncate max-w-[160px]">
                                                            {user.email || "—"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Plan */}
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                        sub.plan === "yearly"
                                                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                                            : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                                    }`}
                                                >
                                                    <Crown size={12} />
                                                    {sub.plan === "yearly" ? "Premium Yearly" : "Premium Monthly"}
                                                </span>
                                            </td>

                                            {/* Amount */}
                                            <td className="px-5 py-4 font-bold text-white">
                                                {inr(sub.amount)}
                                            </td>

                                            {/* Tokens */}
                                            <td className="px-5 py-4">
                                                <span className="font-mono text-gray-200">
                                                    {Number(sub.tokens || 0).toLocaleString("en-IN")}
                                                </span>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                        isPaid
                                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                            : isFailed
                                                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                                            : isExpired
                                                            ? "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                                                            : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                                    }`}
                                                >
                                                    {isPaid && <CheckCircle2 size={11} />}
                                                    {isFailed && <XCircle size={11} />}
                                                    {isExpired && <Clock size={11} />}
                                                    {!isPaid && !isFailed && !isExpired && <Clock size={11} />}
                                                    {sub.status}
                                                </span>
                                            </td>

                                            {/* Order ID */}
                                            <td className="px-5 py-4 font-mono text-[11px] text-gray-400">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="truncate max-w-[110px]" title={sub.orderId}>
                                                        {sub.orderId || "—"}
                                                    </span>
                                                    {sub.orderId && sub.orderId !== "—" && (
                                                        <button
                                                            onClick={() => copyText(sub.orderId, `order_${sub._id}`)}
                                                            className="text-gray-500 hover:text-white"
                                                            title="Copy Order ID"
                                                        >
                                                            {copiedKey === `order_${sub._id}` ? (
                                                                <Check size={12} className="text-emerald-400" />
                                                            ) : (
                                                                <Copy size={12} />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Payment ID */}
                                            <td className="px-5 py-4 font-mono text-[11px] text-gray-400">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="truncate max-w-[110px]" title={sub.paymentId}>
                                                        {sub.paymentId || "—"}
                                                    </span>
                                                    {sub.paymentId && sub.paymentId !== "—" && (
                                                        <button
                                                            onClick={() => copyText(sub.paymentId, `pay_${sub._id}`)}
                                                            className="text-gray-500 hover:text-white"
                                                            title="Copy Payment ID"
                                                        >
                                                            {copiedKey === `pay_${sub._id}` ? (
                                                                <Check size={12} className="text-emerald-400" />
                                                            ) : (
                                                                <Copy size={12} />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Dates */}
                                            <td className="px-5 py-4 text-gray-400 text-[11px]">
                                                <div>Start: {fmtDate(sub.startedAt || sub.createdAt)}</div>
                                                <div className="text-gray-500">Exp: {fmtDate(sub.expiresAt)}</div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    onClick={() => handleViewDetails(sub._id)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-400"
                                                >
                                                    <Eye size={13} />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* PAGINATION BAR */}
                {!listLoading && pagination.pages > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-6 py-4">
                        <p className="text-xs text-gray-500">
                            Page <span className="font-bold text-white">{pagination.page}</span> of{" "}
                            <span className="font-bold text-white">{pagination.pages}</span> ({pagination.total} total)
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => loadSubscriptions(Math.max(1, pagination.page - 1))}
                                disabled={pagination.page <= 1}
                                className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={15} /> Prev
                            </button>
                            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                const p = i + 1;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => loadSubscriptions(p)}
                                        className={`h-8 w-8 rounded-xl text-xs font-bold transition ${
                                            pagination.page === p
                                                ? "bg-orange-500 text-black"
                                                : "border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => loadSubscriptions(Math.min(pagination.pages, pagination.page + 1))}
                                disabled={pagination.page >= pagination.pages}
                                className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* SUBSCRIPTION DETAILS MODAL */}
            {selectedSubId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                    <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d0d] shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                                    Subscription Inspector
                                </p>
                                <h3 className="text-lg font-black text-white mt-0.5">
                                    Transaction Details
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedSubId(null)}
                                className="rounded-xl border border-white/10 p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto p-6 space-y-6">
                            {detailLoading ? (
                                <div className="py-12 text-center">
                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500 mx-auto" />
                                    <p className="mt-3 text-xs text-gray-400">Loading details...</p>
                                </div>
                            ) : detailError ? (
                                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                                    {detailError}
                                </div>
                            ) : detailData ? (
                                <>
                                    {/* 1. User Information Card */}
                                    <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
                                        <h5 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-4 flex items-center gap-2">
                                            <User size={14} className="text-orange-500" />
                                            Customer Account Information
                                        </h5>
                                        {detailData.user ? (
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={detailData.user} size={44} />
                                                    <div>
                                                        <p className="font-bold text-white">{detailData.user.name}</p>
                                                        <span className="rounded bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                                                            {detailData.user.role || "user"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5 text-xs text-gray-300">
                                                    <div className="flex items-center gap-2">
                                                        <Mail size={13} className="text-gray-500" />
                                                        <span>{detailData.user.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Phone size={13} className="text-gray-500" />
                                                        <span>{detailData.user.phone || "—"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                                        <span>User ID:</span>
                                                        <span className="font-mono">{detailData.user._id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500">User record was removed.</p>
                                        )}
                                    </div>

                                    {/* 2. Subscription & Payment Grid */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {/* Subscription Details */}
                                        <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 space-y-3">
                                            <h5 className="text-xs uppercase tracking-wider text-gray-400 font-bold flex items-center gap-2">
                                                <Crown size={14} className="text-orange-500" />
                                                Plan Details
                                            </h5>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Plan Tier:</span>
                                                    <span className="font-bold text-white uppercase">
                                                        {detailData.subscription.plan}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Amount Charged:</span>
                                                    <span className="font-bold text-orange-400">
                                                        {inr(detailData.subscription.amount)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Tokens Bundled:</span>
                                                    <span className="font-mono text-white">
                                                        {Number(detailData.subscription.tokens).toLocaleString("en-IN")}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Status:</span>
                                                    <span className="font-bold text-emerald-400 uppercase">
                                                        {detailData.subscription.status}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Started Date:</span>
                                                    <span className="text-gray-300">
                                                        {fmtDateTime(detailData.subscription.startedAt)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Expiry Date:</span>
                                                    <span className="text-gray-300">
                                                        {fmtDateTime(detailData.subscription.expiresAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Safe Payment Information */}
                                        <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 space-y-3">
                                            <h5 className="text-xs uppercase tracking-wider text-gray-400 font-bold flex items-center gap-2">
                                                <Shield size={14} className="text-orange-500" />
                                                Verified Payment Details
                                            </h5>
                                            <div className="space-y-2 text-xs">
                                                <div>
                                                    <span className="text-gray-500 block text-[11px]">Razorpay Order ID:</span>
                                                    <span className="font-mono text-gray-300 break-all">
                                                        {detailData.subscription.orderId || "—"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 block text-[11px]">Razorpay Payment ID:</span>
                                                    <span className="font-mono text-emerald-400 break-all">
                                                        {detailData.subscription.paymentId || "—"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Gateway Provider:</span>
                                                    <span className="font-semibold text-white uppercase">
                                                        {detailData.subscription.provider || "test"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Currency:</span>
                                                    <span className="font-semibold text-white">
                                                        {detailData.subscription.currency || "INR"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. AI Usage Card */}
                                    {detailData.user && (
                                        <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
                                            <h5 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3 flex items-center gap-2">
                                                <Sparkles size={14} className="text-orange-500" />
                                                Live AI Wallet Usage
                                            </h5>
                                            <div className="grid grid-cols-3 gap-3 text-center text-xs">
                                                <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
                                                    <p className="text-gray-500">Current Balance</p>
                                                    <p className="text-lg font-bold text-emerald-400 mt-1">
                                                        {detailData.user.aiTokens ?? 0}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
                                                    <p className="text-gray-500">Tokens Used</p>
                                                    <p className="text-lg font-bold text-orange-400 mt-1">
                                                        {detailData.user.aiTokensUsed ?? 0}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
                                                    <p className="text-gray-500">Active Plan Tier</p>
                                                    <p className="text-lg font-bold text-white mt-1 capitalize">
                                                        {detailData.user.aiPlanType || detailData.user.aiPlan || "free"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 4. Complete User Subscription History */}
                                    <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
                                        <h5 className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3 flex items-center gap-2">
                                            <Calendar size={14} className="text-orange-500" />
                                            User Subscription History ({detailData.userHistory?.length || 0})
                                        </h5>
                                        {detailData.userHistory?.length === 0 ? (
                                            <p className="text-xs text-gray-500">No previous subscriptions found.</p>
                                        ) : (
                                            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                                {detailData.userHistory.map((h) => (
                                                    <div
                                                        key={h._id}
                                                        className="flex items-center justify-between rounded-xl bg-white/[0.02] p-2.5 text-xs border border-white/5"
                                                    >
                                                        <div>
                                                            <span className="font-bold text-white capitalize">{h.plan}</span>
                                                            <span className="text-gray-500 ml-2">
                                                                {fmtDate(h.createdAt)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-orange-400">{inr(h.amount)}</span>
                                                            <span
                                                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                                                    h.status === "paid"
                                                                        ? "bg-emerald-500/20 text-emerald-400"
                                                                        : "bg-gray-500/20 text-gray-400"
                                                                }`}
                                                            >
                                                                {h.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-white/10 p-5 flex justify-end">
                            <button
                                onClick={() => setSelectedSubId(null)}
                                className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
                            >
                                Close Inspector
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
