import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Star,
    Pencil,
    Trash2,
    ExternalLink,
    MessageSquare,
    AlertTriangle,
} from "lucide-react";
import Navbar from "../components/Navbar";
import BrandLogo from "../components/BrandLogo";
import {
    ApiError,
    getMyReviews,
    deleteReview,
    updateReview,
} from "../services/api";

const Loading = () => (
    <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
        <p className="mt-4 text-sm text-zinc-500">Loading your reviews...</p>
    </div>
);

const ErrorBox = ({ message, onRetry }) => (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <AlertTriangle size={28} className="mx-auto text-red-400" />
        <p className="mt-3 text-sm text-red-300">
            {message || "Unable to load reviews."}
        </p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="mt-4 rounded-xl border border-white/10 px-5 py-2.5 text-xs font-bold text-zinc-200 transition hover:border-orange-500/40 hover:text-orange-400"
            >
                Try Again
            </button>
        )}
    </div>
);

const EmptyBox = () => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
            <MessageSquare size={26} />
        </div>
        <p className="mt-4 font-bold">No reviews yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
            Share your experience by reviewing motorcycles you've ridden.
        </p>
        <Link
            to="/motorcycles"
            className="mt-5 inline-block rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
        >
            Explore Motorcycles
        </Link>
    </div>
);

const UserReviews = () => {
    const navigate = useNavigate();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingReview, setEditingReview] = useState(null);
    const [editForm, setEditForm] = useState({ rating: 0, comment: "" });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getMyReviews();
            setReviews(data.reviews || []);
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openEdit = (review) => {
        setEditingReview(review);
        setEditForm({ rating: review.rating, comment: review.comment });
    };

    const closeEdit = () => {
        setEditingReview(null);
        setEditForm({ rating: 0, comment: "" });
    };

    const submitEdit = async () => {
        if (!editForm.rating || editForm.rating < 1 || editForm.rating > 5) {
            alert("Please select a rating between 1 and 5.");
            return;
        }
        if (!editForm.comment.trim()) {
            alert("Please write a comment.");
            return;
        }
        setSubmitting(true);
        try {
            await updateReview(editingReview._id, {
                rating: editForm.rating,
                comment: editForm.comment.trim(),
            });
            closeEdit();
            await load();
        } catch (err) {
            alert(err.message || "Failed to update review.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (reviewId) => {
        if (!window.confirm("Delete this review permanently?")) return;
        try {
            await deleteReview(reviewId);
            await load();
        } catch (err) {
            alert(err.message || "Failed to delete review.");
        }
    };

    const getMotorcycleImage = (bike) => {
        if (bike?.images && bike.images.length > 0) return bike.images[0].url;
        return bike?.image || "";
    };

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar />
            <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                        My Reviews
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        All your motorcycle reviews, stored in MongoDB.
                    </p>
                </div>

                {error && <ErrorBox message={error} onRetry={load} />}

                {loading ? (
                    <Loading />
                ) : !error && reviews.length === 0 ? (
                    <EmptyBox />
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => {
                            const bike = review.motorcycle;
                            return (
                                <div
                                    key={review._id}
                                    className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5 transition hover:border-orange-500/20"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Motorcycle Image */}
                                        <button
                                            onClick={() =>
                                                bike?._id &&
                                                navigate(`/motorcycles/${bike._id}`)
                                            }
                                            className="shrink-0"
                                        >
                                            {getMotorcycleImage(bike) ? (
                                                <img
                                                    src={getMotorcycleImage(bike)}
                                                    alt={bike?.name || "Motorcycle"}
                                                    className="h-20 w-20 rounded-xl object-cover"
                                                />
                                            ) : (
                                                <div className="h-20 w-20 rounded-xl bg-zinc-800 flex items-center justify-center">
                                                    <BrandLogo
                                                        brand={bike?.brand || ""}
                                                        brandLogo={bike?.brandLogo || ""}
                                                        size={32}
                                                    />
                                                </div>
                                            )}
                                        </button>

                                        {/* Content */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                                                        {bike?.brand || "Unknown"}
                                                    </p>
                                                    <p className="font-bold truncate">
                                                        {bike?.name || "Unknown Motorcycle"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <Star
                                                            key={s}
                                                            size={14}
                                                            className={
                                                                s <= review.rating
                                                                    ? "fill-orange-400 text-orange-400"
                                                                    : "text-zinc-600"
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
                                                {review.comment}
                                            </p>

                                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                                <span className="text-xs text-zinc-500">
                                                    {new Date(review.createdAt).toLocaleDateString(
                                                        "en-IN",
                                                        {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        }
                                                    )}
                                                </span>
                                                <button
                                                    onClick={() => openEdit(review)}
                                                    className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-400 transition hover:border-orange-500/40 hover:text-orange-400"
                                                >
                                                    <Pencil size={11} />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(review._id)}
                                                    className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-400 transition hover:border-red-500/40 hover:text-red-400"
                                                >
                                                    <Trash2 size={11} />
                                                    Delete
                                                </button>
                                                {bike?._id && (
                                                    <button
                                                        onClick={() =>
                                                            navigate(`/motorcycles/${bike._id}`)
                                                        }
                                                        className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-400 transition hover:border-orange-500/40 hover:text-orange-400"
                                                    >
                                                        <ExternalLink size={11} />
                                                        View
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Edit Review Modal */}
            {editingReview && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
                        <h3 className="text-xl font-black mb-6">Edit Review</h3>

                        <div className="flex items-center gap-2 mb-5">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                    key={s}
                                    onClick={() =>
                                        setEditForm((f) => ({ ...f, rating: s }))
                                    }
                                    className="transition hover:scale-110"
                                >
                                    <Star
                                        size={28}
                                        className={
                                            s <= editForm.rating
                                                ? "fill-orange-400 text-orange-400"
                                                : "text-zinc-600"
                                        }
                                    />
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-zinc-500">
                                {editForm.rating > 0
                                    ? `${editForm.rating}/5`
                                    : "Select rating"}
                            </span>
                        </div>

                        <textarea
                            value={editForm.comment}
                            onChange={(e) =>
                                setEditForm((f) => ({
                                    ...f,
                                    comment: e.target.value,
                                }))
                            }
                            rows={4}
                            maxLength={1000}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 resize-none"
                        />
                        <p className="text-xs text-zinc-600 mt-1 text-right">
                            {editForm.comment.length}/1000
                        </p>

                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={submitEdit}
                                disabled={submitting}
                                className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                            >
                                {submitting ? "Updating..." : "Update Review"}
                            </button>
                            <button
                                onClick={closeEdit}
                                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserReviews;
