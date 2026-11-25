import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { API_BASE } from "../services/api";

const AUTOPLAY_MS = 3500;

const isSafeTarget = (url) => {
    if (!url || typeof url !== "string") return false;
    const t = url.trim();
    if (/^\s*javascript:/i.test(t)) return false;
    if (t.startsWith("/")) return true;
    return /^https:\/\//i.test(t);
};

const AdvertisementSlider = () => {
    const navigate = useNavigate();
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [failedImages, setFailedImages] = useState({});
    const timerRef = useRef(null);
    const touchX = useRef(null);
    const seenImpressions = useRef(new Set());

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/advertisements`);
                const data = await res.json();
                if (!cancelled && data.success) setAds(data.advertisements || []);
            } catch {
                /* slider stays hidden on error */
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const go = useCallback(
        (dir) => {
            setIndex((prev) => (ads.length === 0 ? 0 : (prev + dir + ads.length) % ads.length));
        },
        [ads.length]
    );

    // Autoplay (respects reduced motion + hover pause)
    useEffect(() => {
        if (ads.length < 2 || paused) return;
        if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        timerRef.current = setTimeout(() => go(1), AUTOPLAY_MS);
        return () => clearTimeout(timerRef.current);
    }, [ads.length, paused, index, go]);

    // Impression: once per ad per mount
    useEffect(() => {
        const ad = ads[index];
        if (!ad || seenImpressions.current.has(ad._id)) return;
        seenImpressions.current.add(ad._id);
        fetch(`${API_BASE}/advertisements/${ad._id}/impression`, { method: "POST" }).catch(() => {});
    }, [index, ads]);

    // Keyboard navigation
    const onKeyDown = (e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
    };

    // Touch swipe navigation
    const onTouchStart = (e) => {
        touchX.current = e.touches[0].clientX;
    };

    const onTouchEnd = (e) => {
        if (touchX.current === null) return;
        const diff = touchX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) {
            go(diff > 0 ? 1 : -1);
        }
        touchX.current = null;
    };

    const openAd = (ad) => {
        if (!ad || !isSafeTarget(ad.targetUrl)) return;
        fetch(`${API_BASE}/advertisements/${ad._id}/click`, { method: "POST" }).catch(() => {});
        const t = ad.targetUrl.trim();
        if (t.startsWith("/")) navigate(t);
        else window.open(t, "_blank", "noopener,noreferrer");
    };

    if (loading || ads.length === 0) return null;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

    return (
        <section
            aria-label="Advertisements"
            className="relative mx-auto w-full max-w-7xl px-5 sm:px-8"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onKeyDown={onKeyDown}
            tabIndex={0}
        >
            <p className="mb-2 text-center text-sm font-bold uppercase tracking-[0.25em] text-zinc-400">
                Advertisement
            </p>
            <div
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                className="relative aspect-[16/10] sm:aspect-[21/8] overflow-hidden rounded-3xl border border-white/10 bg-[#111]"
            >
                {ads.map((ad, i) => {
                    const img = isMobile && ad.mobileImageUrl ? ad.mobileImageUrl : ad.imageUrl;
                    const active = i === index;
                    return (
                        <div
                            key={ad._id}
                            aria-hidden={!active}
                            inert={!active}
                            className={`absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
                        >
                            {failedImages[ad._id] ? (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-orange-500/20 to-transparent">
                                    <ImageOff size={32} className="text-zinc-500" />
                                    <p className="px-6 text-center text-lg font-bold text-white">{ad.title}</p>
                                </div>
                            ) : (
                                <img
                                    src={img}
                                    alt={ad.title}
                                    loading={i === 0 ? "eager" : "lazy"}
                                    decoding="async"
                                    onError={() => setFailedImages((p) => ({ ...p, [ad._id]: true }))}
                                    className="h-full w-full object-cover"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8">
                                {ad.badgeText && (
                                    <span className="mb-1.5 sm:mb-2 inline-block rounded-full bg-orange-500 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-black">
                                        {ad.badgeText}
                                    </span>
                                )}
                                <h2 className="max-w-xl text-lg font-black text-white sm:text-2xl md:text-3xl line-clamp-2">{ad.title}</h2>
                                {ad.description && (
                                    <p className="mt-1 max-w-xl text-xs sm:text-base text-zinc-300 line-clamp-1 sm:line-clamp-2">{ad.description}</p>
                                )}
                                <button
                                    onClick={() => openAd(ad)}
                                    className="mt-2.5 sm:mt-3 rounded-xl bg-orange-500 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-black transition hover:bg-orange-400"
                                >
                                    {ad.ctaText || "Explore Bikes"}
                                </button>
                            </div>
                        </div>
                    );
                })}

                {ads.length > 1 && (
                    <>
                        <button
                            aria-label="Previous promotion"
                            onClick={() => go(-1)}
                            className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition hover:bg-orange-500 hover:text-black"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            aria-label="Next promotion"
                            onClick={() => go(1)}
                            className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition hover:bg-orange-500 hover:text-black"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                            {ads.map((ad, i) => (
                                <button
                                    key={ad._id}
                                    aria-label={`Go to promotion ${i + 1}`}
                                    onClick={() => setIndex(i)}
                                    className="flex h-6 w-6 items-center justify-center rounded-full"
                                >
                                    <span aria-hidden="true" className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-orange-500" : "w-1.5 bg-white/40 hover:bg-white/70"}`} />
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};

export default AdvertisementSlider;
