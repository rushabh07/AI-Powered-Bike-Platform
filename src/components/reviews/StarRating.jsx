import { useRef } from "react";
import { Star } from "lucide-react";

// Read-only star display
export const Stars = ({ value = 0, size = 14, className = "" }) => (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`Rated ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((s) => (
            <Star
                key={s}
                size={size}
                className={s <= Math.round(value) ? "fill-orange-400 text-orange-400" : "text-zinc-600"}
            />
        ))}
    </span>
);

// Accessible star-rating input: radiogroup + arrow-key support + visible selection
export const StarInput = ({ value = 0, onChange, disabled = false, id = "review-rating" }) => {
    const buttonsRef = useRef([]);

    const handleKeyDown = (e, star) => {
        let next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(5, star + 1);
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(1, star - 1);
        if (e.key === "Home") next = 1;
        if (e.key === "End") next = 5;
        if (next !== null) {
            e.preventDefault();
            onChange(next);
            requestAnimationFrame(() => buttonsRef.current[next - 1]?.focus());
        }
    };

    return (
        <div
            role="radiogroup"
            aria-label="Star rating"
            aria-required="true"
            id={id}
            className="flex items-center gap-1.5"
        >
            {[1, 2, 3, 4, 5].map((s) => {
                const selected = s <= value;
                const active = s === value;
                return (
                    <button
                        key={s}
                        ref={(el) => (buttonsRef.current[s - 1] = el)}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`${s} star${s > 1 ? "s" : ""}`}
                        disabled={disabled}
                        onClick={() => onChange(s)}
                        onKeyDown={(e) => handleKeyDown(e, s)}
                        className={`rounded-lg p-1 transition outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c0c] disabled:cursor-not-allowed disabled:opacity-60 ${
                            active ? "ring-2 ring-orange-500/60" : ""
                        }`}
                    >
                        <Star
                            size={30}
                            className={selected ? "fill-orange-400 text-orange-400" : "text-zinc-600"}
                        />
                    </button>
                );
            })}
            <span className="ml-2 text-sm text-zinc-500" aria-live="polite">
                {value > 0 ? `${value}/5` : "Select rating"}
            </span>
        </div>
    );
};

export default Stars;
