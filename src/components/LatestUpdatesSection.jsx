import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowRight,
    CalendarDays,
    Newspaper,
    Sparkles,
    ExternalLink,
    Bike,
} from "lucide-react";
import { getPublicUpdates } from "../services/api";

export const UPDATE_TYPE_META = {
    new_launch: { label: "New Launch", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    updated_model: { label: "Updated Model", classes: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    price_update: { label: "Price Update", classes: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    new_variant: { label: "New Variant", classes: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    news: { label: "Motorcycle News", classes: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20" },
};

export const formatUpdateDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const UpdateCard = ({ update, onOpen }) => {
    const meta = UPDATE_TYPE_META[update.updateType] || UPDATE_TYPE_META.news;
    const image = update.imageUrl || update.motorcycle?.image || "";
    const heading = update.title || [update.brand, update.modelName].filter(Boolean).join(" ");

    return (
        <article
            onClick={() => onOpen(update)}
            className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/30 hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-orange-500/[0.06]"
        >
            <div className="relative h-48 overflow-hidden bg-zinc-900">
                {image ? (
                    <img
                        src={image}
                        alt={heading}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.parentElement.classList.add("flex", "items-center", "justify-center");
                        }}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <Bike size={44} className="text-zinc-700" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-[11px] font-bold ${meta.classes}`}>
                    {meta.label}
                </span>
                {update.modelYear && (
                    <span className="absolute bottom-4 right-4 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                        {update.modelYear}
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-500">
                    {[update.brand, update.modelName].filter(Boolean).join(" • ") || "MOTOAI Updates"}
                </p>
                <h3 className="mt-1.5 line-clamp-2 text-lg font-bold leading-snug text-white">
                    {heading}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                    {update.shortDescription}
                </p>

                <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1.5">
                            <CalendarDays size={12} className="text-zinc-500" />
                            {formatUpdateDate(update.publishedAt || update.createdAt)}
                        </span>
                        {update.sourceName && (
                            <span className="flex items-center gap-1 truncate max-w-[45%]">
                                <Newspaper size={12} className="shrink-0" />
                                <span className="truncate">{update.sourceName}</span>
                            </span>
                        )}
                    </div>
                    <span className="mt-3 flex items-center gap-1.5 text-sm font-bold text-orange-500 transition group-hover:gap-2.5">
                        Read More <ArrowRight size={15} />
                    </span>
                </div>
            </div>
        </article>
    );
};

const LatestUpdatesSection = ({ limit = 6 }) => {
    const navigate = useNavigate();
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getPublicUpdates({ limit });
                if (!cancelled) setUpdates(data.updates || []);
            } catch (err) {
                if (!cancelled) setError(err.message || "Could not load updates.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [limit]);

    const openUpdate = (update) => {
        if (update?.slug) navigate(`/updates/${update.slug}`);
    };

    return (
        <section className="border-t border-white/[0.06] bg-[#0c0c0c] py-24">
            <div className="mx-auto max-w-7xl px-6">
                <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <div className="flex items-center gap-2 text-orange-500">
                            <Sparkles size={16} />
                            <span className="text-sm font-semibold uppercase tracking-[0.2em]">
                                Latest Motorcycle Updates
                            </span>
                        </div>
                        <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                            New Launches, Updates
                            <br />
                            <span className="text-orange-500"> & Industry News</span>
                        </h2>
                        <p className="mt-4 max-w-xl text-gray-500">
                            Verified motorcycle news, new launches, variants, and
                            price updates — sourced from manufacturers and
                            trusted automotive publications.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/updates")}
                        className="group flex items-center gap-2 self-start rounded-xl border border-orange-500/30 bg-orange-500/10 px-5 py-3 text-sm font-bold text-orange-400 transition hover:bg-orange-500 hover:text-black md:self-auto"
                    >
                        View All Updates
                        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                    </button>
                </div>

                {loading ? (
                    <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="h-[380px] animate-pulse rounded-2xl bg-white/[0.04]" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="rounded-3xl border border-white/10 bg-white/[0.025] py-16 text-center">
                        <Newspaper size={36} className="mx-auto mb-4 text-zinc-600" />
                        <p className="text-sm text-zinc-400">{error}</p>
                    </div>
                ) : updates.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] py-16 text-center">
                        <Newspaper size={36} className="mx-auto mb-4 text-zinc-600" />
                        <h3 className="text-lg font-bold">No updates published yet</h3>
                        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                            Verified motorcycle updates from administrators will
                            appear here as soon as they are published.
                        </p>
                        <button
                            onClick={() => navigate("/motorcycles")}
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
                        >
                            <Bike size={16} /> Browse Motorcycles
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
                            {updates.map((update) => (
                                <UpdateCard key={update._id} update={update} onOpen={openUpdate} />
                            ))}
                        </div>
                        {updates.length > 0 && (
                            <div className="mt-10 text-center">
                                <button
                                    onClick={() => navigate("/updates")}
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-zinc-300 transition hover:border-orange-500/40 hover:text-orange-400"
                                >
                                    View All Updates <ExternalLink size={14} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default LatestUpdatesSection;
