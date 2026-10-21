import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    Bike,
    CalendarDays,
    ExternalLink,
    Newspaper,
    RefreshCw,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { ApiError, getPublicUpdateBySlug } from "../services/api";
import { UPDATE_TYPE_META, formatUpdateDate } from "../components/LatestUpdatesSection";

const UpdateDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError("");
            try {
                const res = await getPublicUpdateBySlug(slug);
                if (!cancelled) setData(res);
            } catch (err) {
                if (!cancelled && !(err instanceof ApiError && err.status === 401)) {
                    setError(err.message || "Failed to load update.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                    <p className="mt-4 text-xs font-semibold text-zinc-500">Loading update...</p>
                </div>
            </div>
        );
    }

    if (error || !data?.update) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center px-5">
                <div className="text-center max-w-md">
                    <Newspaper size={40} className="mx-auto mb-4 text-zinc-600" />
                    <p className="text-zinc-300">{error || "Update not found."}</p>
                    <button
                        onClick={() => navigate("/updates")}
                        className="mt-6 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
                    >
                        View All Updates
                    </button>
                </div>
            </div>
        );
    }

    const { update, related } = data;
    const meta = UPDATE_TYPE_META[update.updateType] || UPDATE_TYPE_META.news;
    const image = update.imageUrl || update.motorcycle?.image || "";
    const publishedDate = formatUpdateDate(update.publishedAt || update.createdAt);
    const paragraphs = (update.content || "")
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar activeTab="" />

            <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
                <button
                    onClick={() => navigate("/updates")}
                    className="flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
                >
                    <ArrowLeft size={16} /> All Updates
                </button>

                {/* Article header */}
                <div className="mt-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${meta.classes}`}>
                            {meta.label}
                        </span>
                        {publishedDate && (
                            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <CalendarDays size={13} /> {publishedDate}
                            </span>
                        )}
                        {update.modelYear && (
                            <span className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-bold text-zinc-300">
                                Model Year {update.modelYear}
                            </span>
                        )}
                    </div>

                    <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                        {update.title || [update.brand, update.modelName].filter(Boolean).join(" ")}
                    </h1>

                    <p className="mt-4 text-lg leading-relaxed text-zinc-400">
                        {update.shortDescription}
                    </p>

                    {(update.brand || update.modelName) && (
                        <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-orange-500">
                            {[update.brand, update.modelName].filter(Boolean).join(" • ")}
                        </p>
                    )}
                </div>

                {/* Hero image */}
                {image && (
                    <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
                        <img
                            src={image}
                            alt={update.title || "Update image"}
                            className="max-h-[480px] w-full object-cover"
                            onError={(e) => {
                                e.currentTarget.parentElement.style.display = "none";
                            }}
                        />
                    </div>
                )}

                {/* Body */}
                <div className="mt-8 space-y-5">
                    {paragraphs.length > 0 ? (
                        paragraphs.map((para, i) => (
                            <p key={i} className="leading-8 text-zinc-300">
                                {para}
                            </p>
                        ))
                    ) : (
                        <p className="leading-8 text-zinc-300">{update.shortDescription}</p>
                    )}
                </div>

                {/* Source */}
                {(update.sourceName || update.sourceUrl) && (
                    <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Source
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <span className="font-semibold text-white">{update.sourceName || "External source"}</span>
                        {update.sourceUrl && (
                            <a
                                href={update.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-400 transition hover:bg-orange-500 hover:text-black"
                            >
                                Visit Original Article <ExternalLink size={12} />
                            </a>
                        )}
                        </div>
                    </div>
                )}

                {/* Linked motorcycle */}
                {update.motorcycle?._id && (
                    <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-orange-400">
                            Featured Motorcycle
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-4">
                            {update.motorcycle.image ? (
                                <img
                                    src={update.motorcycle.image}
                                    alt={update.motorcycle.name}
                                    className="h-16 w-20 rounded-xl object-cover border border-white/10"
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                    }}
                                />
                            ) : (
                                <div className="flex h-16 w-20 items-center justify-center rounded-xl border border-white/10 bg-zinc-800">
                                    <Bike size={24} className="text-zinc-600" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-500">
                                    {update.motorcycle.brand}
                                </p>
                                <p className="truncate text-lg font-black text-white">
                                    {update.motorcycle.name}
                                </p>
                            </div>
                            <Link
                                to={`/motorcycles/${update.motorcycle._id}`}
                                className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400"
                            >
                                View Motorcycle <ArrowRight size={15} />
                            </Link>
                        </div>
                    </div>
                )}

                {/* Related updates */}
                {related?.length > 0 && (
                    <div className="mt-12 border-t border-white/10 pt-8">
                        <h2 className="text-xl font-black tracking-tight">
                            Related Updates
                        </h2>
                        <div className="mt-5 grid gap-4 sm:grid-cols-3">
                            {related.map((rel) => {
                                const relImage = rel.imageUrl || rel.motorcycle?.image || "";
                                return (
                                    <article
                                        key={rel._id}
                                        onClick={() => rel.slug && navigate(`/updates/${rel.slug}`)}
                                        className="group cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] transition hover:border-orange-500/30"
                                    >
                                        <div className="relative h-32 overflow-hidden bg-zinc-900">
                                            {relImage ? (
                                                <img
                                                    src={relImage}
                                                    alt={rel.title}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = "none";
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <Bike size={28} className="text-zinc-700" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">
                                                {rel.brand || "MOTOAI"}
                                            </p>
                                            <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-white">
                                                {rel.title || [rel.brand, rel.modelName].filter(Boolean).join(" ")}
                                            </h3>
                                            <p className="mt-2 text-[11px] text-zinc-500">
                                                {formatUpdateDate(rel.publishedAt || rel.createdAt)}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Bottom nav */}
                <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row">
                    <button
                        onClick={() => navigate("/updates")}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-3.5 text-sm font-bold text-zinc-200 transition hover:border-orange-500/40 hover:text-orange-400"
                    >
                        <Newspaper size={16} /> All Updates
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3.5 text-sm font-semibold text-zinc-400 transition hover:text-white"
                    >
                        <RefreshCw size={15} /> Refresh
                    </button>
                </div>
            </main>
        </div>
    );
};

export default UpdateDetail;
