import React, { useState } from "react";

/**
 * BrandLogo — single shared brand-logo component.
 * Shows the MongoDB-driven brandLogo image; falls back to the
 * brand's first letter when missing, and hides safely when the
 * URL is broken.
 */
const BrandLogo = ({ brand, brandLogo, size = 36, className = "" }) => {
    const [imgError, setImgError] = useState(false);

    const src = (brandLogo || "").trim();
    const initial = ((brand || "?").charAt(0) || "?").toUpperCase();

    if (src && !imgError) {
        return (
            <img
                src={src}
                alt={`${brand} logo`}
                width={size}
                height={size}
                loading="lazy"
                decoding="async"
                onError={() => setImgError(true)}
                style={{ width: size, height: size }}
                className={`object-contain rounded-lg bg-white p-1 shrink-0 ${className}`}
            />
        );
    }

    return (
        <div
            aria-label={`${brand} logo`}
            style={{ width: size, height: size }}
            className={`rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center font-black shrink-0 ${className}`}
        >
            <span style={{ fontSize: size * 0.45 }}>{initial}</span>
        </div>
    );
};

export default BrandLogo;
