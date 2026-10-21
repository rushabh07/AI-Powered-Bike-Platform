import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PenLine } from "lucide-react";
import { RatingSummary } from "./RatingSummary";
import { ReviewCard } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";
import { ToastStack } from "./Toast";

let toastSeq = 0;
const makeToast = (type, message) => ({ id: ++toastSeq, type, message });
import {
    getMotorcycleReviewsPaged,
    getReviewEligibility,
    submitMotorcycleReview,
    updateReview,
    deleteReview,
    toggleReviewHelpful,
} from "../../services/api";

const PAGE_SIZE = 6;

const getStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
};

// Full Ratings & Reviews section for ONE motorcycle page.
// Scoped strictly to `motorcycleId` — re-fetches on change.
export const ReviewsSection = ({ motorcycleId, motorcycleName = "" }) => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(getStoredUser);

    const [reviews, setReviews] = useState([]);
    const [summary, setSummary] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, hasMore: false });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");

    const [sort, setSort] = useState("newest");
    const [starFilter, setStarFilter] = useState(null);

    const [eligible, setEligible] = useState(false);
    const [hasReviewed, setHasReviewed] = useState(false);
    // "none" | "pending" | "completed" — lets us explain WHY a review
    // is locked (purchase pending vs never purchased).
    const [purchaseState, setPurchaseState] = useState("none");
    const [purchaseReason, setPurchaseReason] = useState("");
    const [myReviewId, setMyReviewId] = useState(null);
    const [myReviewData, setMyReviewData] = useState(null);

    const [showForm, setShowForm] = useState(false);
    const [editingReview, setEditingReview] = useState(null);
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [helpfulPending, setHelpfulPending] = useState({});

    const [toasts, setToasts] = useState([]);
    const toastTimer = useRef({});
    const requestSeq = useRef(0);

    const pushToast = useCallback((type, message) => {
        const t = makeToast(type, message);
        setToasts((prev) => [...prev.slice(-2), t]);
        clearTimeout(toastTimer.current[t.id]);
        toastTimer.current[t.id] = setTimeout(() => {
            setToasts((prev) => prev.filter((x) => x.id !== t.id));
        }, 4500);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
    }, []);

    const isLoggedIn = !!(localStorage.getItem("token") && getStoredUser());

    // ---- data loading (scoped to motorcycleId) ----
    const loadPage = useCallback(
        async (page, { append = false, sortValue = sort, starValue = starFilter } = {}) => {
            if (!motorcycleId) return;
            const seq = ++requestSeq.current;
            if (append) setLoadingMore(true);
            else setLoading(true);
            setError("");
            try {
                const data = await getMotorcycleReviewsPaged(motorcycleId, {
                    page,
                    limit: PAGE_SIZE,
                    sort: sortValue,
                    rating: starValue || undefined,
                });
                if (seq !== requestSeq.current) return; // stale response guard
                setReviews((prev) => (append ? [...prev, ...(data.reviews || [])] : data.reviews || []));
                setSummary(data.summary || null);
                setPagination(
                    data.pagination || { page, pages: 1, total: 0, hasMore: false }
                );
            } catch (err) {
                if (seq !== requestSeq.current) return;
                setError(err.message || "Could not load reviews.");
            } finally {
                if (seq === requestSeq.current) {
                    setLoading(false);
                    setLoadingMore(false);
                }
            }
        },
        [motorcycleId, sort, starFilter]
    );

    const refreshEligibility = useCallback(async () => {
        if (!motorcycleId || !isLoggedIn) {
            setEligible(false);
            setHasReviewed(false);
            setPurchaseState("none");
            setPurchaseReason("");
            setMyReviewId(null);
            setMyReviewData(null);
            return;
        }
        try {
            const data = await getReviewEligibility(motorcycleId);
            setEligible(!!data.eligible && !data.hasReviewed);
            setHasReviewed(!!data.hasReviewed);
            setPurchaseState(data.purchaseState || (data.eligible ? "completed" : "none"));
            setPurchaseReason(data.reason || "");
            setMyReviewId(data.reviewId || null);
            setMyReviewData(data.review || null);
        } catch {
            setEligible(false);
            setPurchaseState("none");
        }
    }, [motorcycleId, isLoggedIn]);

    // Initial + reactive load. The parent remounts this section per
    // motorcycle (key={motorcycleId}), so all state stays bike-scoped.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on bike/sort/filter change
        loadPage(1);
        refreshEligibility();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [motorcycleId, sort, starFilter]);

    useEffect(() => {
        const onStorage = () => {
            setCurrentUser(getStoredUser());
            refreshEligibility();
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [refreshEligibility]);

    // The signed-in customer's own review (from the loaded list, falling
    // back to the copy returned by the eligibility endpoint).
    const myReview = useMemo(() => {
        if (!myReviewId) return null;
        return (
            reviews.find((r) => r._id === myReviewId) ||
            (myReviewData && myReviewData._id === myReviewId ? myReviewData : null)
        );
    }, [reviews, myReviewId, myReviewData]);

    // ---- actions ----
    const handleSortChange = (value) => {
        setSort(value);
        loadPage(1, { sortValue: value });
    };

    const handleStarSelect = (star) => {
        setStarFilter(star);
        loadPage(1, { starValue: star });
    };

    const openForm = (review = null) => {
        if (!isLoggedIn) {
            navigate("/login", { state: { from: `/motorcycles/${motorcycleId}` } });
            return;
        }
        // No explicit review passed → editing my own existing review.
        const target = review || (hasReviewed ? myReview : null);
        if (!target && !eligible && currentUser?.role !== "admin") {
            pushToast(
                "error",
                hasReviewed
                    ? "You have already reviewed this motorcycle."
                    : purchaseState === "pending"
                    ? purchaseReason ||
                      "Your purchase is still being processed. The review unlocks once it is completed."
                    : "Purchase this motorcycle to share your review."
            );
            return;
        }
        setEditingReview(target);
        setFormError("");
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingReview(null);
        setFormError("");
    };

    const handleFormSubmit = async (payload) => {
        if (formSubmitting) return;
        setFormSubmitting(true);
        setFormError("");
        try {
            if (editingReview) {
                await updateReview(editingReview._id, payload);
                pushToast("success", "Your review has been updated.");
            } else {
                await submitMotorcycleReview(motorcycleId, payload);
                pushToast("success", "Thanks! Your review has been submitted.");
            }
            closeForm();
            await loadPage(1);
            await refreshEligibility();
        } catch (err) {
            // Preserve entered content: only surface the error.
            setFormError(err.message || "Failed to submit review. Your text has been kept — please try again.");
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDelete = async (review) => {
        if (!window.confirm("Delete this review? This cannot be undone.")) return;
        try {
            await deleteReview(review._id);
            pushToast("success", "Review deleted.");
            await loadPage(1);
            await refreshEligibility();
        } catch (err) {
            pushToast("error", err.message || "Failed to delete review.");
        }
    };

    const handleHelpful = async (review) => {
        if (!isLoggedIn) {
            navigate("/login", { state: { from: `/motorcycles/${motorcycleId}` } });
            return;
        }
        if (helpfulPending[review._id]) return;
        setHelpfulPending((p) => ({ ...p, [review._id]: true }));
        try {
            const data = await toggleReviewHelpful(review._id);
            setReviews((prev) =>
                prev.map((r) =>
                    r._id === review._id
                        ? { ...r, helpfulCount: data.helpfulCount, votedHelpful: data.votedHelpful }
                        : r
                )
            );
        } catch (err) {
            pushToast("error", err.message || "Could not record your vote.");
        } finally {
            setHelpfulPending((p) => ({ ...p, [review._id]: false }));
        }
    };

    const canWrite = isLoggedIn && (eligible || currentUser?.role === "admin");

    return (
        <section aria-label={`Ratings and reviews for ${motorcycleName || "this motorcycle"}`} className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
            {/* Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-white">Ratings & Reviews</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        Real reviews from verified MOTOAI owners.
                    </p>
                </div>
                {canWrite ? (
                    <button
                        onClick={() => openForm()}
                        className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition outline-none hover:bg-orange-400 focus-visible:ring-2 focus-visible:ring-orange-300"
                    >
                        <PenLine size={15} />
                        Write a Review
                    </button>
                ) : hasReviewed ? (
                    /* Already reviewed — show their review + an edit option. */
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-400">
                            You have already reviewed this motorcycle.
                        </span>
                        <button
                            onClick={() => openForm()}
                            disabled={!myReview}
                            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-300 transition outline-none hover:border-orange-500/40 hover:text-orange-400 focus-visible:ring-2 focus-visible:ring-orange-300 disabled:opacity-50"
                        >
                            <PenLine size={13} />
                            Edit your review
                        </button>
                    </div>
                ) : purchaseState === "pending" ? (
                    /* Purchase in progress — a review unlocks once it completes. */
                    <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-300">
                        {purchaseReason ||
                            "Your purchase is still being processed. The review unlocks once it is completed."}
                    </span>
                ) : (
                    <p className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-zinc-500">
                        {!isLoggedIn
                            ? "Login and purchase this motorcycle to share your review."
                            : "Purchase this motorcycle to share your experience."}
                    </p>
                )}
            </div>

            {/* Summary */}
            <RatingSummary
                summary={summary}
                loading={loading && reviews.length === 0}
                onSelectStar={handleStarSelect}
                activeStar={starFilter}
            />

            {/* Sort row */}
            {!loading && (summary?.totalReviews || 0) > 0 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-zinc-500" aria-live="polite">
                        Showing {reviews.length} of {pagination.total} review{pagination.total === 1 ? "" : "s"}
                        {starFilter ? ` · ${starFilter}-star only` : ""}
                    </p>
                    <label className="flex items-center gap-2 text-xs text-zinc-500">
                        Sort by
                        <select
                            value={sort}
                            onChange={(e) => handleSortChange(e.target.value)}
                            aria-label="Sort reviews"
                            className="rounded-xl border border-white/10 bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                        >
                            <option value="newest">Newest first</option>
                            <option value="helpful">Most helpful</option>
                            <option value="highest">Highest rated</option>
                            <option value="lowest">Lowest rated</option>
                        </select>
                    </label>
                </div>
            )}

            {error && (
                <div role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            )}

            {/* List / skeletons / empty */}
            <div className="mt-4 space-y-4">
                {loading && reviews.length === 0 ? (
                    [1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-hidden="true">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-white/10" />
                                <div className="flex-1">
                                    <div className="h-3 w-32 rounded bg-white/10" />
                                    <div className="mt-2 h-3 w-24 rounded bg-white/10" />
                                </div>
                            </div>
                            <div className="mt-4 h-3 w-2/3 rounded bg-white/10" />
                            <div className="mt-2 h-3 w-full rounded bg-white/10" />
                        </div>
                    ))
                ) : reviews.length === 0 && !error ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-10 text-center">
                        <p className="font-bold text-white">
                            {starFilter ? `No ${starFilter}-star reviews yet` : "No reviews to show"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                            {starFilter ? "Try a different star filter." : "Reviews from verified owners will appear here."}
                        </p>
                    </div>
                ) : (
                    reviews.map((review) => (
                        <ReviewCard
                            key={review._id}
                            review={review}
                            currentUser={currentUser}
                            onEdit={openForm}
                            onDelete={handleDelete}
                            onHelpful={handleHelpful}
                            helpfulPending={!!helpfulPending[review._id]}
                        />
                    ))
                )}
            </div>

            {/* Pagination: Load More */}
            {pagination.hasMore && (
                <div className="mt-6 text-center">
                    <button
                        onClick={() => loadPage(pagination.page + 1, { append: true })}
                        disabled={loadingMore}
                        className="rounded-xl border border-white/10 px-8 py-3 text-sm font-bold text-zinc-200 transition outline-none hover:border-orange-500/40 hover:text-orange-400 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
                    >
                        {loadingMore ? "Loading..." : `Load More (${pagination.total - reviews.length} remaining)`}
                    </button>
                </div>
            )}

            {/* Review form modal */}
            {showForm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label={editingReview ? "Edit review" : `Write a review for ${motorcycleName}`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !formSubmitting) closeForm();
                    }}
                >
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
                        <h3 className="mb-1 text-xl font-black text-white">
                            {editingReview ? "Edit Review" : "Write a Review"}
                        </h3>
                        {motorcycleName && !editingReview && (
                            <p className="mb-5 text-sm text-zinc-500">for {motorcycleName}</p>
                        )}
                        <div className={!editingReview && motorcycleName ? "" : "mt-5"}>
                            <ReviewForm
                                initial={editingReview}
                                submitting={formSubmitting}
                                serverError={formError}
                                onSubmit={handleFormSubmit}
                                onCancel={closeForm}
                            />
                        </div>
                    </div>
                </div>
            )}

            <ToastStack toasts={toasts} onDismiss={dismissToast} />
        </section>
    );
};

export default ReviewsSection;
