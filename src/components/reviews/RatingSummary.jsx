import { Star } from "lucide-react";
import { Stars } from "./StarRating";

// Average rating + total + 1–5 distribution bars.
// Empty state renders "No reviews yet" — never a fabricated rating.
export const RatingSummary = ({ summary, loading = false, onSelectStar, activeStar = null }) => {
    if (loading) {
        return (
            <div className="grid gap-4 sm:grid-cols-[220px_1fr]" aria-label="Loading rating summary">
                <div className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <div className="mx-auto h-10 w-20 rounded-lg bg-white/10" />
                    <div className="mx-auto mt-3 h-4 w-28 rounded bg-white/10" />
                </div>
                <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    {[5, 4, 3, 2, 1].map((s) => (
                        <div key={s} className="h-3 animate-pulse rounded-full bg-white/10" />
                    ))}
                </div>
            </div>
        );
    }

    const total = summary?.totalReviews ?? summary?.totalCount ?? 0;
    const avg = summary?.averageRating ?? summary?.overallRating ?? 0;
    const distribution = summary?.distribution || {};
    const percentages = summary?.percentages || {};

    if (!total) {
        return (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10">
                    <Star size={22} className="text-orange-500" />
                </div>
                <p className="mt-4 text-lg font-bold text-white">No reviews yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
                    Be the first to share your ownership experience for this motorcycle.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            {/* Average block */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
                <p className="text-5xl font-black tracking-tight text-white">
                    {Number(avg).toFixed(1)}
                    <span className="text-xl font-bold text-zinc-500">/5</span>
                </p>
                <Stars value={avg} size={17} className="mt-3 justify-center" />
                <p className="mt-2 text-sm text-zinc-400">
                    Based on {total} review{total === 1 ? "" : "s"}
                </p>
            </div>

            {/* Distribution 5 → 1 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
                <div className="space-y-2.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = distribution[star] || 0;
                        const pct = percentages[star] ?? (total ? Math.round((count / total) * 100) : 0);
                        const isActive = activeStar === star;
                        return (
                            <button
                                key={star}
                                type="button"
                                onClick={() => onSelectStar && onSelectStar(isActive ? null : star)}
                                aria-pressed={isActive}
                                aria-label={`Filter by ${star}-star reviews (${count})`}
                                title={onSelectStar ? `Show ${star}-star reviews` : undefined}
                                className={`group flex w-full items-center gap-3 rounded-lg px-2 py-1 text-left transition ${
                                    onSelectStar ? "hover:bg-white/[0.04]" : ""
                                } ${isActive ? "bg-orange-500/10" : ""}`}
                            >
                                <span className="flex w-10 shrink-0 items-center gap-1 text-sm font-bold text-zinc-300">
                                    {star}
                                    <Star size={12} className="fill-orange-400 text-orange-400" />
                                </span>
                                <span
                                    className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10"
                                    role="img"
                                    aria-label={`${pct}% of reviews are ${star} stars`}
                                >
                                    <span
                                        className="block h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all"
                                        style={{ width: `${pct}%` }}
                                    />
                                </span>
                                <span className="w-14 shrink-0 text-right text-xs text-zinc-500">
                                    {count} ({pct}%)
                                </span>
                            </button>
                        );
                    })}
                </div>
                {onSelectStar && activeStar && (
                    <button
                        type="button"
                        onClick={() => onSelectStar(null)}
                        className="mt-3 text-xs font-bold text-orange-500 transition hover:text-orange-400"
                    >
                        Clear star filter
                    </button>
                )}
            </div>
        </div>
    );
};

export default RatingSummary;
