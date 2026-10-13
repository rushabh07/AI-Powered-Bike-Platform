/**
 * Optimizes image URLs for faster delivery, lower bandwidth, and reduced LCP.
 * For Unsplash images, replaces wide dimensions with appropriate thumbnail sizes and modern formats.
 */
export const optimizeThumbnail = (url, width = 160, quality = 75) => {
    if (!url || typeof url !== "string") return url;
    const trimmed = url.trim();
    if (!trimmed) return trimmed;

    if (trimmed.includes("images.unsplash.com")) {
        try {
            const parsed = new URL(trimmed);
            parsed.searchParams.set("w", String(width));
            parsed.searchParams.set("auto", "format");
            parsed.searchParams.set("fit", "crop");
            parsed.searchParams.set("q", String(quality));
            return parsed.toString();
        } catch {
            return trimmed.replace(/w=\d+/, `w=${width}`);
        }
    }
    return trimmed;
};
