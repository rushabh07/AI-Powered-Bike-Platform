import { useEffect, useState } from "react";
import { StarInput } from "./StarRating";

export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export const COMMENT_MIN = 10;
export const COMMENT_MAX = 2000;

const CATEGORIES = [
    { key: "performance", label: "Power & Performance" },
    { key: "handling", label: "Ride Quality & Handling" },
    { key: "design", label: "Design & Quality" },
    { key: "mileage", label: "Mileage & Fuel Efficiency" },
    { key: "comfort", label: "Comfort & Features" },
];

// Clean, responsive review form with frontend validation,
// loading / success / failure states and double-submit guard.
// Content is preserved when submission fails.
export const ReviewForm = ({
    initial = null,
    submitting = false,
    serverError = "",
    onSubmit,
    onCancel,
}) => {
    const [title, setTitle] = useState(initial?.title || "");
    const [category, setCategory] = useState(initial?.category || "performance");
    const [rating, setRating] = useState(initial?.rating || 0);
    const [comment, setComment] = useState(initial?.comment || "");
    const [errors, setErrors] = useState({});

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional form reset when editing a different review
        setTitle(initial?.title || "");
        setCategory(initial?.category || "performance");
        setRating(initial?.rating || 0);
        setComment(initial?.comment || "");
        setErrors({});
        // Re-initialize only when switching to a different review
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial?._id]);

    const validate = () => {
        const next = {};
        if (!title.trim() || title.trim().length < TITLE_MIN) {
            next.title = `Title must be at least ${TITLE_MIN} characters.`;
        } else if (title.trim().length > TITLE_MAX) {
            next.title = `Title must be under ${TITLE_MAX} characters.`;
        }
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            next.rating = "Please select a star rating from 1 to 5.";
        }
        if (!comment.trim() || comment.trim().length < COMMENT_MIN) {
            next.comment = `Please write at least ${COMMENT_MIN} characters about your experience.`;
        } else if (comment.trim().length > COMMENT_MAX) {
            next.comment = `Review must be under ${COMMENT_MAX} characters.`;
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (submitting) return; // prevent duplicate submissions
        if (!validate()) return;
        onSubmit({ title: title.trim(), category, rating, comment: comment.trim() });
    };

    const inputCls = (bad) =>
        `w-full rounded-xl border bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/50 ${
            bad ? "border-red-500/50" : "border-white/10"
        }`;

    return (
        <form onSubmit={handleSubmit} noValidate aria-label={initial ? "Edit review" : "Write a review"}>
            <div className="mb-5">
                <span className="mb-2 block text-xs font-semibold text-zinc-400" id="rating-label">
                    Your rating <span className="text-orange-500">*</span>
                </span>
                <StarInput value={rating} onChange={setRating} disabled={submitting} aria-labelledby="rating-label" />
                {errors.rating && (
                    <p role="alert" className="mt-1.5 text-xs text-red-400">{errors.rating}</p>
                )}
            </div>

            <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400" htmlFor="review-category">
                    Category
                </label>
                <select
                    id="review-category"
                    value={category}
                    disabled={submitting}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                >
                    {CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-zinc-400" htmlFor="review-title">
                    <span>Title <span className="text-orange-500">*</span></span>
                    <span className="font-normal text-zinc-600">{title.trim().length}/{TITLE_MAX}</span>
                </label>
                <input
                    id="review-title"
                    value={title}
                    disabled={submitting}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Sum it up in a line"
                    maxLength={TITLE_MAX + 20}
                    aria-invalid={!!errors.title}
                    aria-describedby={errors.title ? "review-title-error" : undefined}
                    className={inputCls(errors.title)}
                />
                {errors.title && (
                    <p role="alert" id="review-title-error" className="mt-1.5 text-xs text-red-400">{errors.title}</p>
                )}
            </div>

            <div className="mb-5">
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-zinc-400" htmlFor="review-comment">
                    <span>Your review <span className="text-orange-500">*</span></span>
                    <span className="font-normal text-zinc-600">{comment.trim().length}/{COMMENT_MAX}</span>
                </label>
                <textarea
                    id="review-comment"
                    value={comment}
                    disabled={submitting}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Share mileage, comfort, service experience... (min 10 characters)"
                    aria-invalid={!!errors.comment}
                    aria-describedby={errors.comment ? "review-comment-error" : undefined}
                    className={`${inputCls(errors.comment)} resize-none`}
                />
                {errors.comment && (
                    <p role="alert" id="review-comment-error" className="mt-1.5 text-xs text-red-400">{errors.comment}</p>
                )}
            </div>

            {serverError && (
                <p role="alert" className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {serverError}
                </p>
            )}

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {submitting ? "Submitting..." : initial ? "Update Review" : "Submit Review"}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};

export default ReviewForm;
