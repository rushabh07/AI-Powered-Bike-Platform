import React, { useEffect, useState } from "react";
import { Bike, CalendarDays, Users, IndianRupee, Star, TrendingUp, RefreshCw } from "lucide-react";
import { getPanelOverview } from "../../services/dealershipApi";

const Card = ({ icon, label, value, sub }) => (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
            {icon}
        </div>
        <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
        <p className="mt-1 text-2xl font-black text-white">{value}</p>
        {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
);

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const DealershipOverview = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getPanelOverview();
            setStats(data.stats);
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    if (loading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-900" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={load} className="mt-3 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-200 hover:border-orange-500/40 hover:text-orange-400">
                    Retry
                </button>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div>
            <div className="mb-4 flex justify-end">
                <button onClick={load} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card icon={<Bike size={20} />} label="Inventory Units" value={stats.inventoryUnits} sub={`${stats.inventoryModels} models in stock`} />
                <Card icon={<CalendarDays size={20} />} label="Bookings" value={stats.totalBookings} sub={`${stats.pendingBookings} pending • ${stats.confirmedBookings} confirmed`} />
                <Card icon={<Users size={20} />} label="Open Leads" value={stats.leads} sub={`${stats.converted} converted • ${stats.conversionRate}% rate`} />
                <Card icon={<IndianRupee size={20} />} label="Revenue" value={inr(stats.revenue)} sub={`${stats.verifiedSales}/${stats.totalSales} sales verified`} />
                <Card icon={<Star size={20} />} label="Reviews" value={stats.reviews} sub="On stocked models" />
                <Card icon={<TrendingUp size={20} />} label="Completed" value={stats.completedBookings} sub="Bookings completed" />
            </div>
        </div>
    );
};

export default DealershipOverview;
