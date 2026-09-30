import React, { useState } from "react";

/**
 * UserAvatar — shows profileImage when available,
 * falls back to the user's initial.
 * Automatically hides broken image URLs.
 */
const UserAvatar = ({ user, size = 40, className = "", textClass = "" }) => {
    const [imgError, setImgError] = useState(false);

    const src = (user?.profileImage || "").trim();
    const initial = ((user?.name || "U").charAt(0) || "U").toUpperCase();

    const style = { width: size, height: size };

    if (src && !imgError) {
        return (
            <img
                src={src}
                alt={user?.name || "profile"}
                style={style}
                onError={() => setImgError(true)}
                className={`rounded-full object-cover border border-white/10 bg-zinc-800 ${className}`}
            />
        );
    }

    return (
        <div
            style={style}
            className={`rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold shrink-0 ${className}`}
        >
            <span className={textClass} style={{ fontSize: size * 0.42 }}>
                {initial}
            </span>
        </div>
    );
};

export default UserAvatar;
