import { useState } from "react";
import { BadgeCheck, Pencil, ThumbsUp, Trash2 } from "lucide-react";
import { Stars } from "./StarRating";

const formatDate = (iso) => {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    } catch {
        return "";
    }
};

export const ReviewCard = ({
    review,
    currentUser,
    onEdit,
    onDelete,
    onHelpful,
    helpfulPending = false,
}) => {
    const [expanded, setExpanded] = useState(false);
    const isAuthor = currentUser && review.user && String(review.user._id) === String(currentUser._id || currentUser.id);
    const long = (review.comment || "").length > 220;

    return (
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/20">
            {/* Header: author + stars + badges + actions */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-sm font-bold text-orange-400"
                        aria-hidden="true"
                    >
                        {(review.user?.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                            {review.user?.name || "Anonymous"}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <Stars value={review.rating} size={12} />
                            <span className="text-[11px] text-zinc-500">
                                <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                    {review.verifiedPurchase && (
                        <span
                            className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400"
                            title="The reviewer has a completed, paid purchase of this exact motorcycle"
                        >
                            <BadgeCheck size={12} />
                            Verified Purchase
                        </span>
                    )}
                    {isAuthor && (
                        <>
                            <button
                                onClick={() => onEdit(review)}
                                aria-label={`Edit your review titled ${review.title}`}
                                title="Edit review"
                                className="rounded-lg p-1.5 text-zinc-500 transition outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-orange-500"
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                onClick={() => onDelete(review)}
                                aria-label={`Delete your review titled ${review.title}`}
                                title="Delete review"
                                className="rounded-lg p-1.5 text-zinc-500 transition outline-none hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-500"
                            >
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Body */}
            <h4 className="mt-3 font-semibold text-white">{review.title}</h4>
            <p className={`mt-1.5 text-sm leading-relaxed text-zinc-300 ${expanded ? "" : "line-clamp-4"}`}>
                {review.comment}
            </p>
            {long && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-1.5 text-xs font-bold text-orange-500 transition hover:text-orange-400"
                >
                    {expanded ? "Show less" : "Read more"}
                </button>
            )}

            {/* Footer: helpful vote */}
            <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
                <button
                    onClick={() => onHelpful(review)}
                    disabled={helpfulPending}
                    aria-pressed={!!review.votedHelpful}
                    aria-label={review.votedHelpful ? "Remove helpful vote" : "Mark review as helpful"}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50 ${
                        review.votedHelpful
                            ? "border-orange-500/40 bg-orange-500/10 text-orange-400"
                            : "border-white/10 text-zinc-400 hover:border-orange-500/30 hover:text-orange-400"
                    }`}
                >
                    <ThumbsUp size={13} className={review.votedHelpful ? "fill-orange-500/20" : ""} />
                    Helpful{review.helpfulCount > 0 ? ` (${review.helpfulCount})` : ""}
                </button>
            </div>
        </article>
    );
};

export default ReviewCard;
