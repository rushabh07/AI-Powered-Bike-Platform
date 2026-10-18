import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

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
                const res = await fetch("http://localhost:5000/api/advertisements");
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
        fetch(`http://localhost:5000/api/advertisements/${ad._id}/impression`, { method: "POST" }).catch(() => {});
    }, [index, ads]);

    // Keyboard navigation
    const onKeyDown = (e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
    };

    const openAd = (ad) => {
        if (!ad || !isSafeTarget(ad.targetUrl)) return;
        fetch(`http://localhost:5000/api/advertisements/${ad._id}/click`, { method: "POST" }).catch(() => {});
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
            <div className="relative aspect-[16/10] sm:aspect-[21/8] overflow-hidden rounded-3xl border border-white/10 bg-[#111]">
                {ads.map((ad, i) => {
                    const img = isMobile && ad.mobileImageUrl ? ad.mobileImageUrl : ad.imageUrl;
                    const active = i === index;
                    return (
                        <div
                            key={ad._id}
                            aria-hidden={!active}
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
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                                {ad.badgeText && (
                                    <span className="mb-2 inline-block rounded-full bg-orange-500 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-black">
                                        {ad.badgeText}
                                    </span>
                                )}
                                <h2 className="max-w-xl text-xl font-black text-white sm:text-3xl">{ad.title}</h2>
                                {ad.description && (
                                    <p className="mt-1 max-w-xl truncate text-sm text-zinc-300 sm:text-base">{ad.description}</p>
                                )}
                                <button
                                    onClick={() => openAd(ad)}
                                    className="mt-3 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400"
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
                            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-black/60 p-2.5 text-white backdrop-blur-md transition hover:bg-orange-500 hover:text-black"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            aria-label="Next promotion"
                            onClick={() => go(1)}
                            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-black/60 p-2.5 text-white backdrop-blur-md transition hover:bg-orange-500 hover:text-black"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                            {ads.map((ad, i) => (
                                <button
                                    key={ad._id}
                                    aria-label={`Go to promotion ${i + 1}`}
                                    onClick={() => setIndex(i)}
                                    className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-orange-500" : "w-1.5 bg-white/40 hover:bg-white/70"}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};

export default AdvertisementSlider;
