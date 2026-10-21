import { useEffect, useState } from "react";
import { Search, Star, Trash2, RefreshCw, BadgeCheck, Calendar } from "lucide-react";
import { getAdminReviews, moderateReview, deleteReview, recalculateAllRatings, getAllMotorcycles } from "../../services/api";

const statusBadge = (s) => {
    const base = "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border";
    if (s === "approved") return `${base} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`;
    if (s === "rejected") return `${base} bg-red-500/10 text-red-400 border-red-500/20`;
    return `${base} bg-yellow-500/10 text-yellow-400 border-yellow-500/20`;
};

// Reviews Management: search by motorcycle / user / rating / status,
// approve-or-reject moderation (status only — text/rating never altered),
// spam removal, and cached-rating recalculation.
export const ReviewsManagementSection = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [rating, setRating] = useState("");
    const [motorcycle, setMotorcycle] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [bikes, setBikes] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
    const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0, verifiedReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    const [acting, setActing] = useState({});
    const [recalcBusy, setRecalcBusy] = useState(false);

    const load = async (pageValue = page) => {
        setLoading(true);
        setError("");
        try {
            const data = await getAdminReviews({
                search: search.trim() || undefined,
                status: status || undefined,
                rating: rating || undefined,
                motorcycle: motorcycle || undefined,
                from: fromDate || undefined,
                to: toDate || undefined,
                page: pageValue,
                limit: 15,
            });
            setReviews(data.reviews || []);
            setPages(data.pages || 1);
            setCounts(data.statusCounts || { pending: 0, approved: 0, rejected: 0 });
            setStats(data.ratingStats || { averageRating: 0, totalReviews: 0, verifiedReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
        } catch (err) {
            setError(err.message || "Unable to load reviews.");
        } finally {
            setLoading(false);
        }
    };

    // Motorcycles for the filter dropdown.
    useEffect(() => {
        let cancelled = false;
        getAllMotorcycles()
            .then((list) => {
                if (!cancelled) setBikes(list || []);
            })
            .catch(() => {
                /* filter dropdown stays empty — other filters still work */
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on filter change
        load(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, rating, motorcycle, fromDate, toDate]);

    const handleModerate = async (id, nextStatus) => {
        setActing((p) => ({ ...p, [id]: true }));
        setNotice("");
        try {
            const data = await moderateReview(id, nextStatus);
            setReviews((prev) => prev.map((r) => (r._id === id ? data.review : r)));
            setNotice(`Review ${nextStatus}. Public rating updated.`);
        } catch (err) {
            setError(err.message || "Moderation failed.");
        } finally {
            setActing((p) => ({ ...p, [id]: false }));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this review? This removes spam/abuse permanently.")) return;
        setActing((p) => ({ ...p, [id]: true }));
        try {
            await deleteReview(id);
            setReviews((prev) => prev.filter((r) => r._id !== id));
            setNotice("Review deleted.");
        } catch (err) {
            setError(err.message || "Delete failed.");
        } finally {
            setActing((p) => ({ ...p, [id]: false }));
        }
    };

    const handleRecalc = async () => {
        setRecalcBusy(true);
        setNotice("");
        try {
            const data = await recalculateAllRatings();
            setNotice(data.message || "Ratings recalculated.");
        } catch (err) {
            setError(err.message || "Recalculation failed.");
        } finally {
            setRecalcBusy(false);
        }
    };

    return (
        <section>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-500">
                        Approved {counts.approved} · Pending {counts.pending} · Rejected {counts.rejected}
                    </span>
                    <button
                        onClick={handleRecalc}
                        disabled={recalcBusy}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:border-orange-500/40 hover:text-orange-400 disabled:opacity-50"
                        title="Recompute cached average ratings for every motorcycle from approved reviews"
                    >
                        <RefreshCw size={13} className={recalcBusy ? "animate-spin" : ""} />
                        {recalcBusy ? "Recalculating..." : "Recalculate Ratings"}
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <select
                        value={motorcycle}
                        onChange={(e) => { setMotorcycle(e.target.value); setPage(1); }}
                        className="max-w-[220px] rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                        aria-label="Filter by motorcycle"
                    >
                        <option value="">All motorcycles</option>
                        {bikes.map((b) => (
                            <option key={b._id} value={b._id}>
                                {b.brand} {b.name}
                            </option>
                        ))}
                    </select>
                    <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" aria-label="Filter by status">
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select value={rating} onChange={(e) => { setRating(e.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" aria-label="Filter by rating">
                        <option value="">All ratings</option>
                        {[5, 4, 3, 2, 1].map((s) => (
                            <option key={s} value={s}>{s} stars</option>
                        ))}
                    </select>
                    <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-zinc-500" aria-hidden="true" />
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                            aria-label="Reviews from date"
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-orange-500/50 [color-scheme:dark]"
                        />
                        <span className="text-zinc-600">→</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                            aria-label="Reviews to date"
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-orange-500/50 [color-scheme:dark]"
                        />
                    </div>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(1); } }}
                            placeholder="Search title / text..."
                            className="rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-orange-500/50"
                        />
                    </div>
                    <button onClick={() => { setPage(1); load(1); }} className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400">
                        Search
                    </button>
                </div>
            </div>

            {/* Rating statistics across approved reviews */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Average rating</p>
                    <p className="mt-1 text-2xl font-black text-orange-400">
                        {Number(stats.averageRating || 0).toFixed(1)}
                        <span className="text-sm text-zinc-500">/5</span>
                    </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Approved reviews</p>
                    <p className="mt-1 text-2xl font-black text-white">{stats.totalReviews || 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Verified purchases</p>
                    <p className="mt-1 text-2xl font-black text-emerald-400">{stats.verifiedReviews || 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Star spread</p>
                    <p className="mt-1 text-xs font-semibold text-zinc-300">
                        {[5, 4, 3, 2, 1]
                            .filter((s) => (stats.distribution?.[s] || 0) > 0)
                            .map((s) => `${s}★:${stats.distribution[s]}`)
                            .join("  ") || "—"}
                    </p>
                </div>
            </div>

            {notice && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                </div>
            ) : reviews.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">No reviews match these filters.</p>
            ) : (
                <div className="space-y-3">
                    {reviews.map((r) => (
                        <div key={r._id} className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
                                        {r.title}
                                        <span className="flex items-center gap-1 text-orange-400">
                                            <Star size={12} className="fill-orange-400" />{r.rating}
                                        </span>
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        {r.user?.name} ({r.user?.email}) · {r.motorcycle?.brand} {r.motorcycle?.name} ·
                                        {" "}{r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : ""}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={statusBadge(r.status)}>{r.status}</span>
                                    {r.verifiedPurchase && (
                                        <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                            <BadgeCheck size={12} /> Verified
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="mt-2 line-clamp-3 text-sm text-zinc-300">{r.comment}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {r.status !== "approved" && (
                                    <button disabled={acting[r._id]} onClick={() => handleModerate(r._id, "approved")} className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50">
                                        Approve
                                    </button>
                                )}
                                {r.status !== "rejected" && (
                                    <button disabled={acting[r._id]} onClick={() => handleModerate(r._id, "rejected")} className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 text-xs font-bold text-yellow-400 transition hover:bg-yellow-500/20 disabled:opacity-50">
                                        Reject
                                    </button>
                                )}
                                <button disabled={acting[r._id]} onClick={() => handleDelete(r._id)} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50">
                                    <Trash2 size={12} /> Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                <span>Page {page} of {pages}</span>
                <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40">Prev</button>
                    <button disabled={page >= pages} onClick={() => { const p = page + 1; setPage(p); load(p); }} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40">Next</button>
                </div>
            </div>
        </section>
    );
};

export default ReviewsManagementSection;
