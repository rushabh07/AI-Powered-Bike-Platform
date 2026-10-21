import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, PenLine, Trash2, BadgeCheck, MessageSquare } from "lucide-react";
import { getMyReviews, updateReview, deleteReview } from "../../services/api";
import { Stars } from "./StarRating";
import { ReviewForm } from "./ReviewForm";

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

const statusBadge = (status) => {
    if (status === "approved") {
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    }
    if (status === "rejected") {
        return "border-red-500/20 bg-red-500/10 text-red-400";
    }
    return "border-amber-500/20 bg-amber-500/10 text-amber-400";
};

const statusLabel = (status) => {
    if (status === "approved") return "Published";
    if (status === "rejected") return "Rejected";
    return "Pending approval";
};

/**
 * My Reviews — the customer's own review history.
 * Lists every review they have written, which motorcycle it is for,
 * whether it is published or awaiting moderation, and lets them
 * edit or delete it without leaving the panel.
 */
export const MyReviewsSection = () => {
    const navigate = useNavigate();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [editing, setEditing] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getMyReviews();
            setReviews(data.reviews || []);
        } catch (err) {
            setError(err.message || "Unable to load your reviews.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
        load();
    }, [load]);

    const handleSave = async (payload) => {
        if (!editing || submitting) return;
        setSubmitting(true);
        setFormError("");
        try {
            await updateReview(editing._id, payload);
            setEditing(null);
            setNotice("Your review was updated.");
            await load();
        } catch (err) {
            setFormError(err.message || "Could not update your review.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (review) => {
        if (!window.confirm("Delete this review? This cannot be undone.")) return;
        setBusyId(review._id);
        setError("");
        try {
            await deleteReview(review._id);
            setReviews((prev) => prev.filter((r) => r._id !== review._id));
            setNotice("Review deleted.");
        } catch (err) {
            setError(err.message || "Could not delete your review.");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-white">My Reviews</h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        Reviews you have written for motorcycles you purchased.
                    </p>
                </div>
                <p className="text-xs font-semibold text-zinc-500">
                    {reviews.length} review{reviews.length === 1 ? "" : "s"} written
                </p>
            </div>

            {notice && (
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    {notice}
                </div>
            )}
            {error && (
                <div role="alert" className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                    <p className="mt-4 text-sm text-zinc-500">Loading your reviews...</p>
                </div>
            ) : reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10">
                        <MessageSquare size={22} className="text-orange-500" />
                    </div>
                    <p className="mt-4 text-lg font-bold text-white">You have not written any reviews yet</p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
                        Once you complete a purchase you can share your honest experience and help
                        other riders choose with confidence.
                    </p>
                    <button
                        onClick={() => navigate("/motorcycles")}
                        className="mt-5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400"
                    >
                        Browse Motorcycles
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((r) => {
                        const bike = r.motorcycle || {};
                        return (
                            <article
                                key={r._id}
                                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    {/* Motorcycle identity */}
                                    <div className="flex min-w-0 items-center gap-3">
                                        {bike.image ? (
                                            <img
                                                src={bike.image}
                                                alt={`${bike.brand || ""} ${bike.name || ""}`}
                                                className="h-14 w-20 shrink-0 rounded-xl object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-xs text-zinc-500">
                                                No image
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <button
                                                onClick={() => navigate(`/motorcycles/${bike._id}`)}
                                                className="block max-w-full truncate text-left text-sm font-bold text-white transition hover:text-orange-400"
                                                title="View this motorcycle"
                                            >
                                                {bike.brand ? `${bike.brand} ` : ""}
                                                {bike.name || "Motorcycle"}
                                            </button>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <Stars value={r.rating} size={13} />
                                                <span className="text-[11px] text-zinc-500">
                                                    {formatDate(r.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status + badges */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBadge(r.status)}`}
                                        >
                                            {statusLabel(r.status)}
                                        </span>
                                        {r.verifiedPurchase && (
                                            <span
                                                title="Your completed purchase of this exact motorcycle was verified"
                                                className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400"
                                            >
                                                <BadgeCheck size={12} /> Verified
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Review content */}
                                <p className="mt-3 text-sm font-bold text-white">{r.title}</p>
                                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                                    {r.comment}
                                </p>

                                {/* Qualifying order reference */}
                                {r.order && (
                                    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                                        <Star size={11} className="text-zinc-600" />
                                        Order {r.order.orderNumber}
                                        <span className="text-zinc-700">·</span>
                                        <span className="capitalize">
                                            {String(r.order.orderStatus || "").replace(/_/g, " ")}
                                        </span>
                                    </p>
                                )}

                                {/* Actions */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        onClick={() => {
                                            setEditing(r);
                                            setFormError("");
                                            setNotice("");
                                        }}
                                        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-orange-500/40 hover:text-orange-400"
                                    >
                                        <PenLine size={12} /> Edit
                                    </button>
                                    <button
                                        onClick={() => navigate(`/motorcycles/${bike._id}`)}
                                        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-orange-500/40 hover:text-orange-400"
                                    >
                                        View Motorcycle
                                    </button>
                                    <button
                                        onClick={() => handleDelete(r)}
                                        disabled={busyId === r._id}
                                        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                                    >
                                        <Trash2 size={12} /> Delete
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Edit modal */}
            {editing && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Edit your review"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !submitting) setEditing(null);
                    }}
                >
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
                        <h3 className="mb-1 text-xl font-black text-white">Edit Review</h3>
                        {editing.motorcycle?.name && (
                            <p className="mb-5 text-sm text-zinc-500">
                                for {editing.motorcycle.brand} {editing.motorcycle.name}
                            </p>
                        )}
                        <div className="mt-5">
                            <ReviewForm
                                initial={editing}
                                submitting={submitting}
                                serverError={formError}
                                onSubmit={handleSave}
                                onCancel={() => setEditing(null)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyReviewsSection;
