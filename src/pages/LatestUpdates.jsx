import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    ArrowLeft,
    Bike,
    CalendarDays,
    ExternalLink,
    Newspaper,
    RefreshCw,
    Search,
    SearchX,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { ApiError, getPublicUpdates } from "../services/api";
import { UPDATE_TYPE_META, formatUpdateDate } from "../components/LatestUpdatesSection";

const PAGE_SIZE = 9;

const typeOptions = [
    { value: "", label: "All Categories" },
    { value: "new_launch", label: "New Launch" },
    { value: "updated_model", label: "Updated Model" },
    { value: "price_update", label: "Price Update" },
    { value: "new_variant", label: "New Variant" },
    { value: "news", label: "Motorcycle News" },
];

const LatestUpdates = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [updates, setUpdates] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");

    const search = searchParams.get("search") || "";
    const updateType = searchParams.get("type") || "";
    const brand = searchParams.get("brand") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const [searchInput, setSearchInput] = useState(search);
    const [brandInput, setBrandInput] = useState(brand);

    const buildParams = useCallback(
        (pageNum) => ({
            search,
            updateType,
            brand,
            from,
            to,
            limit: PAGE_SIZE,
            page: pageNum,
        }),
        [search, updateType, brand, from, to]
    );

    const load = useCallback(
        async (pageNum, append = false) => {
            if (append) setLoadingMore(true);
            else {
                setLoading(true);
                setError("");
            }
            try {
                const data = await getPublicUpdates(buildParams(pageNum));
                setUpdates((prev) => (append ? [...prev, ...(data.updates || [])] : data.updates || []));
                setTotal(data.count || (data.updates || []).length);
                setPage(pageNum);
            } catch (err) {
                if (!(err instanceof ApiError && err.status === 401)) {
                    setError(err.message || "Could not load updates.");
                    if (!append) setUpdates([]);
                }
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [buildParams]
    );

    useEffect(() => {
        setSearchInput(search);
        setBrandInput(brand);
        load(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, updateType, brand, from, to]);

    const hasMore = updates.length < total;

    const applyFilters = (overrides = {}) => {
        const params = {};
        const next = {
            search: overrides.search ?? searchInput,
            type: overrides.type ?? updateType,
            brand: overrides.brand ?? brandInput,
            from: overrides.from ?? from,
            to: overrides.to ?? to,
        };
        Object.entries(next).forEach(([k, v]) => {
            if (v && String(v).trim()) params[k] = v;
        });
        setSearchParams(params);
    };

    const clearFilters = () => {
        setSearchInput("");
        setBrandInput("");
        setSearchParams({});
    };

    const metaFor = (t) => UPDATE_TYPE_META[t] || UPDATE_TYPE_META.news;

    const resultsSummary = useMemo(() => {
        if (loading) return "Searching...";
        return `${total} update${total === 1 ? "" : "s"} found`;
    }, [loading, total]);

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar activeTab="" />

            <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
                >
                    <ArrowLeft size={16} /> Back to Home
                </button>

                {/* Header */}
                <div className="mt-5 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-2 text-orange-500">
                        <Newspaper size={16} />
                        <span className="text-xs font-bold uppercase tracking-[0.25em]">
                            MOTOAI Newsroom
                        </span>
                    </div>
                    <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                        Latest Motorcycle Updates
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                        Verified updates on new launches, new variants, price
                        changes and motorcycle news — sourced from
                        manufacturers and trusted publications.
                    </p>
                </div>

                {/* Search & Filters */}
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="relative lg:col-span-2">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") applyFilters();
                                }}
                                placeholder="Search by brand, model or keyword..."
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500/50"
                            />
                        </div>
                        <select
                            value={updateType}
                            onChange={(e) => applyFilters({ type: e.target.value })}
                            className="rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                        >
                            {typeOptions.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <input
                            value={brandInput}
                            onChange={(e) => setBrandInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") applyFilters();
                            }}
                            placeholder="Filter by brand (e.g. KTM)"
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-orange-500/50"
                        />
                        <input
                            type="date"
                            value={from}
                            max={to || undefined}
                            onChange={(e) => applyFilters({ from: e.target.value })}
                            aria-label="From date"
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                        />
                        <input
                            type="date"
                            value={to}
                            min={from || undefined}
                            onChange={(e) => applyFilters({ to: e.target.value })}
                            aria-label="To date"
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                        />
                        <div className="flex gap-2 md:col-span-2">
                            <button
                                onClick={() => applyFilters()}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
                            >
                                <Search size={15} /> Search
                            </button>
                            <button
                                onClick={clearFilters}
                                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:border-white/25"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => load(1)}
                                aria-label="Refresh updates"
                                className="flex items-center justify-center rounded-xl border border-white/10 px-3.5 text-zinc-400 transition hover:text-white"
                            >
                                <RefreshCw size={15} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results summary */}
                <div className="mt-6 flex items-center justify-between text-xs text-zinc-500">
                    <span className="font-semibold">{resultsSummary}</span>
                    {(search || updateType || brand || from || to) && (
                        <span className="text-orange-500">Filters active</span>
                    )}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="mt-6 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                            <div key={item} className="h-[380px] animate-pulse rounded-2xl bg-white/[0.04]" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/5 py-20 text-center">
                        <SearchX size={36} className="mx-auto mb-4 text-red-400" />
                        <p className="text-sm text-red-300">{error}</p>
                        <button
                            onClick={() => load(1)}
                            className="mt-5 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-black"
                        >
                            Try Again
                        </button>
                    </div>
                ) : updates.length === 0 ? (
                    <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/[0.025] py-20 text-center">
                        <Newspaper size={40} className="mx-auto mb-4 text-zinc-600" />
                        <h3 className="text-xl font-bold">No updates found</h3>
                        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                            {search || updateType || brand || from || to
                                ? "No published updates match your search or filters. Try broadening your criteria."
                                : "No motorcycle updates have been published yet. Check back soon for verified launches and news."}
                        </p>
                        {(search || updateType || brand || from || to) && (
                            <button
                                onClick={clearFilters}
                                className="mt-6 rounded-xl border border-white/10 px-6 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-orange-500/40 hover:text-orange-400"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="mt-6 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
                            {updates.map((update) => {
                                const meta = metaFor(update.updateType);
                                const image = update.imageUrl || update.motorcycle?.image || "";
                                const heading = update.title || [update.brand, update.modelName].filter(Boolean).join(" ");
                                return (
                                    <article
                                        key={update._id}
                                        onClick={() => update.slug && navigate(`/updates/${update.slug}`)}
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
                                                        <CalendarDays size={12} />
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
                                                    Read More <ExternalLink size={14} />
                                                </span>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {hasMore && (
                            <div className="mt-10 text-center">
                                <button
                                    onClick={() => load(page + 1, true)}
                                    disabled={loadingMore}
                                    className="inline-flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-8 py-3 text-sm font-bold text-orange-400 transition hover:bg-orange-500 hover:text-black disabled:opacity-50"
                                >
                                    {loadingMore ? (
                                        <>
                                            <RefreshCw size={15} className="animate-spin" /> Loading...
                                        </>
                                    ) : (
                                        "Load More Updates"
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default LatestUpdates;
