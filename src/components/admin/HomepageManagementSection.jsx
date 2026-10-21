import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowDown,
    ArrowUp,
    Check,
    ChevronDown,
    Eye,
    GripVertical,
    ImagePlus,
    LayoutTemplate,
    Newspaper,
    Package,
    Plus,
    RefreshCw,
    RotateCcw,
    Save,
    Search,
    Send,
    Star,
    Store,
    Trash2,
    X,
} from "lucide-react";
import {
    getAllMotorcycles,
    getAdminAdvertisements,
    getAdminUpdates,
    getAdminAllDealerships,
    getAdminHomepage,
    saveHomepageDraft,
    publishHomepage,
    previewHomepage,
    restoreHomepage,
} from "../../services/api";

const SECTION_LABELS = {
    hero: "Hero Banner",
    stats: "Statistics & Highlights",
    promotions: "Advertisement Slider",
    featuredMotorcycles: "Featured Motorcycles",
    updates: "Latest Motorcycle Updates",
    brands: "Popular Brands",
    categories: "Motorcycle Categories",
    topRated: "Top Rated Motorcycles",
    latestReviews: "Latest Customer Reviews",
    specialOffers: "Special Offers & Promotions",
    featuredDealerships: "Featured Dealerships",
    infoSections: "Informational Sections",
    footerPromo: "Footer Promo Content",
};

const SECTION_ICONS = {
    hero: LayoutTemplate,
    stats: Star,
    promotions: ImagePlus,
    featuredMotorcycles: Package,
    updates: Newspaper,
    brands: GripVertical,
    categories: GripVertical,
    topRated: Star,
    latestReviews: Check,
    specialOffers: Send,
    featuredDealerships: Store,
    infoSections: Newspaper,
    footerPromo: Send,
};

const SELECTABLE = new Set(["featuredMotorcycles", "promotions", "updates", "featuredDealerships"]);
const TEXT_CUSTOM = new Set(["specialOffers", "infoSections", "footerPromo"]);

const inputCls =
    "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50 placeholder:text-zinc-600";
const labelCls = "block text-xs font-semibold text-zinc-400";

let toastId = 0;

export default function HomepageManagementSection() {
    const [draft, setDraft] = useState([]);
    const [published, setPublished] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState(null);
    const [expanded, setExpanded] = useState(null);
    const [confirmPublish, setConfirmPublish] = useState(false);

    // selectable content libraries
    const [bikes, setBikes] = useState([]);
    const [ads, setAds] = useState([]);
    const [updates, setUpdates] = useState([]);
    const [dealers, setDealers] = useState([]);
    const [libraryLoading, setLibraryLoading] = useState(true);

    const showToast = (message, type = "success") => {
        const id = ++toastId;
        setToast({ id, message, type });
        setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 3500);
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getAdminHomepage();
            setDraft(data.draft?.sections || []);
            setPublished(data.published);
        } catch (err) {
            setError(err.message || "Could not load homepage configuration.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        (async () => {
            setLibraryLoading(true);
            try {
                const [b, a, u, d] = await Promise.all([
                    getAllMotorcycles(),
                    getAdminAdvertisements({ limit: 50 }),
                    getAdminUpdates({ limit: 50, sort: "-publishedAt" }),
                    getAdminAllDealerships(),
                ]);
                setBikes(b || []);
                setAds(a || []);
                setUpdates(u || []);
                setDealers(d || []);
            } catch {
                /* library load failure should not block the editor */
            } finally {
                setLibraryLoading(false);
            }
        })();
    }, []);

    const move = (index, dir) => {
        const next = [...draft];
        const target = index + dir;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        next.forEach((s, i) => {
            s.displayOrder = i;
        });
        setDraft(next);
    };

    const updateSection = (index, patch) => {
        setDraft((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    };

    const libraryFor = (key) => {
        switch (key) {
            case "featuredMotorcycles":
                return bikes.map((b) => ({ id: b._id, label: `${b.brand} ${b.name}`, sub: `₹${Number(b.price || b.exShowroomPrice || 0).toLocaleString("en-IN")}` }));
            case "promotions":
                return ads.map((a) => ({ id: a._id, label: a.title, sub: a.status }));
            case "updates":
                return updates.map((u) => ({ id: u._id, label: u.title, sub: u.status }));
            case "featuredDealerships":
                return dealers.map((d) => ({ id: d._id, label: d.name, sub: d.city || "" }));
            default:
                return [];
        }
    };

    const toggleSelect = (section, itemId) => {
        const current = Array.isArray(section.selectedItems) ? section.selectedItems.map(String) : [];
        const next = current.includes(String(itemId))
            ? current.filter((id) => id !== String(itemId))
            : [...current, String(itemId)];
        updateSection(draft.indexOf(section), { selectedItems: next });
    };

    const saveDraft = async () => {
        setSaving(true);
        setError("");
        try {
            const data = await saveHomepageDraft(draft);
            setDraft(data.draft?.sections || draft);
            showToast("Draft saved successfully.");
        } catch (err) {
            setError(err.message || "Could not save draft.");
        } finally {
            setSaving(false);
        }
    };

    const publish = async () => {
        setPublishing(true);
        setError("");
        try {
            await publishHomepage();
            await load();
            setConfirmPublish(false);
            showToast("Homepage published. Live site updated.");
        } catch (err) {
            setError(err.message || "Could not publish.");
        } finally {
            setPublishing(false);
        }
    };

    const restore = async () => {
        if (!window.confirm("Restore the previously published configuration?")) return;
        try {
            await restoreHomepage();
            await load();
            showToast("Previous configuration restored.");
        } catch (err) {
            setError(err.message || "Could not restore.");
        }
    };

    const openPreview = () => {
        if (expanded === "__preview__") {
            setExpanded(null);
            return;
        }
        setExpanded("__preview__");
    };

    const selectedCount = (section) => (Array.isArray(section.selectedItems) ? section.selectedItems.length : 0);

    const sortedDraft = useMemo(() => [...draft].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)), [draft]);

    return (
        <div>
            {toast && (
                <div
                    className={`fixed right-4 top-4 z-[200] rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl ${
                        toast.type === "success"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-red-500/30 bg-red-500/10 text-red-400"
                    }`}
                >
                    {toast.message}
                </div>
            )}

            {error && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Header */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-black text-white">Homepage Sections</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                        Toggle visibility, reorder, and configure content for each homepage section. Draft changes are not visible publicly until published.
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px]">
                        <span className="flex items-center gap-1.5 rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2.5 py-1 font-bold text-zinc-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                            Draft edited
                        </span>
                        <span
                            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bold ${
                                published
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                    : "border-zinc-500/20 bg-zinc-500/10 text-zinc-500"
                            }`}
                        >
                            <span className={`h-1.5 w-1.5 rounded-full ${published ? "bg-emerald-400" : "bg-zinc-500"}`} />
                            {published ? "Published" : "Not published yet"}
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={load}
                        className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/5"
                    >
                        <RefreshCw size={14} /> Reload
                    </button>
                    <button
                        onClick={restore}
                        disabled={!published}
                        className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/5 disabled:opacity-40"
                    >
                        <RotateCcw size={14} /> Restore Previous
                    </button>
                    <button
                        onClick={openPreview}
                        className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/5"
                    >
                        <Eye size={14} /> Preview
                    </button>
                    <button
                        onClick={saveDraft}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:bg-white/5 disabled:opacity-50"
                    >
                        <Save size={14} /> {saving ? "Saving..." : "Save Draft"}
                    </button>
                    <button
                        onClick={() => setConfirmPublish(true)}
                        disabled={publishing}
                        className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-extrabold text-black transition hover:bg-orange-400 disabled:opacity-50"
                    >
                        <Send size={14} /> {publishing ? "Publishing..." : "Publish"}
                    </button>
                </div>
            </div>

            {/* Confirm publish modal */}
            {confirmPublish && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0c0c0c] p-6">
                        <h4 className="text-lg font-black text-white">Publish Homepage Changes?</h4>
                        <p className="mt-2 text-sm text-zinc-400">
                            This will make your draft configuration live on the public homepage immediately. The current published version will be kept for rollback.
                        </p>
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmPublish(false)}
                                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={publish}
                                disabled={publishing}
                                className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-extrabold text-black hover:bg-orange-400 disabled:opacity-50"
                            >
                                {publishing ? "Publishing..." : "Yes, Publish"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Section list */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.03]" />
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedDraft.map((section, index) => {
                        const Icon = SECTION_ICONS[section.sectionKey] || LayoutTemplate;
                        const isOpen = expanded === section.sectionKey;
                        return (
                            <div
                                key={section.sectionKey}
                                className={`overflow-hidden rounded-2xl border transition ${
                                    section.enabled ? "border-white/10 bg-[#0c0c0c]" : "border-white/5 bg-[#0a0a0a] opacity-70"
                                }`}
                            >
                                {/* Card header */}
                                <div className="flex flex-wrap items-center gap-3 p-4">
                                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${section.enabled ? "bg-orange-500/10 text-orange-500" : "bg-white/5 text-zinc-600"}`}>
                                        <Icon size={17} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-extrabold text-white">{SECTION_LABELS[section.sectionKey] || section.sectionKey}</p>
                                        <p className="text-[11px] text-zinc-500">
                                            {section.enabled ? "Visible on homepage" : "Hidden from homepage"}
                                            {SELECTABLE.has(section.sectionKey) && ` • ${selectedCount(section)} selected`}
                                        </p>
                                    </div>

                                    {/* Reorder */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => move(index, -1)}
                                            disabled={index === 0}
                                            aria-label="Move up"
                                            className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:text-white disabled:opacity-30"
                                        >
                                            <ArrowUp size={14} />
                                        </button>
                                        <button
                                            onClick={() => move(index, 1)}
                                            disabled={index === sortedDraft.length - 1}
                                            aria-label="Move down"
                                            className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:text-white disabled:opacity-30"
                                        >
                                            <ArrowDown size={14} />
                                        </button>
                                    </div>

                                    {/* Enable toggle */}
                                    <button
                                        onClick={() => updateSection(index, { enabled: !section.enabled })}
                                        aria-label={section.enabled ? "Disable section" : "Enable section"}
                                        className={`relative h-6 w-11 rounded-full transition ${section.enabled ? "bg-emerald-500" : "bg-zinc-700"}`}
                                    >
                                        <span
                                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${section.enabled ? "left-[22px]" : "left-0.5"}`}
                                        />
                                    </button>

                                    <button
                                        onClick={() => setExpanded(isOpen ? null : section.sectionKey)}
                                        aria-label="Edit section"
                                        className={`rounded-lg border p-1.5 transition ${
                                            isOpen
                                                ? "border-orange-500/40 text-orange-400"
                                                : "border-white/10 text-zinc-400 hover:text-white"
                                        }`}
                                    >
                                        <ChevronDown size={15} className={isOpen ? "rotate-180 transition" : "transition"} />
                                    </button>
                                </div>

                                {/* Expanded editor */}
                                {isOpen && (
                                    <div className="border-t border-white/[0.06] bg-white/[0.01] p-5">
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            <label className={labelCls}>
                                                Section Title
                                                <input
                                                    value={section.title || ""}
                                                    onChange={(e) => updateSection(index, { title: e.target.value })}
                                                    placeholder={SECTION_LABELS[section.sectionKey]}
                                                    className={inputCls}
                                                />
                                            </label>
                                            <label className={labelCls + " sm:col-span-2"}>
                                                Subtitle / Description
                                                <input
                                                    value={section.subtitle || ""}
                                                    onChange={(e) => updateSection(index, { subtitle: e.target.value })}
                                                    placeholder="Shown under the section title"
                                                    className={inputCls}
                                                />
                                            </label>
                                            <label className={labelCls}>
                                                CTA Button Text
                                                <input
                                                    value={section.ctaText || ""}
                                                    onChange={(e) => updateSection(index, { ctaText: e.target.value })}
                                                    placeholder="e.g. View All Bikes"
                                                    className={inputCls}
                                                />
                                            </label>
                                            <label className={labelCls}>
                                                CTA Link
                                                <input
                                                    value={section.ctaUrl || ""}
                                                    onChange={(e) => updateSection(index, { ctaUrl: e.target.value })}
                                                    placeholder="/motorcycles"
                                                    className={inputCls}
                                                />
                                            </label>
                                            <label className={labelCls}>
                                                Max Items to Show
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="24"
                                                    value={section.itemLimit || 6}
                                                    onChange={(e) => updateSection(index, { itemLimit: Number(e.target.value) })}
                                                    className={inputCls}
                                                />
                                            </label>

                                            {(section.sectionKey === "hero" || TEXT_CUSTOM.has(section.sectionKey)) && (
                                                <label className={labelCls + " sm:col-span-2 lg:col-span-3"}>
                                                    Image URL (optional)
                                                    <input
                                                        value={section.imageUrl || ""}
                                                        onChange={(e) => updateSection(index, { imageUrl: e.target.value })}
                                                        placeholder="https://..."
                                                        className={inputCls}
                                                    />
                                                </label>
                                            )}

                                            {TEXT_CUSTOM.has(section.sectionKey) && (
                                                <label className={labelCls + " sm:col-span-2 lg:col-span-3"}>
                                                    Promotional Content
                                                    <textarea
                                                        value={section.customFields?.text || ""}
                                                        onChange={(e) =>
                                                            updateSection(index, {
                                                                customFields: { ...(section.customFields || {}), text: e.target.value },
                                                            })
                                                        }
                                                        rows={3}
                                                        placeholder="Promotional or informational text. Manual text is shown as marketing content — keep it accurate."
                                                        className={inputCls + " resize-none"}
                                                    />
                                                </label>
                                            )}
                                        </div>

                                        {/* Content selection */}
                                        {SELECTABLE.has(section.sectionKey) && (
                                            <div className="mt-5 border-t border-white/[0.06] pt-4">
                                                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                                    Select Content from Database ({selectedCount(section)} selected)
                                                </p>
                                                {libraryLoading ? (
                                                    <p className="mt-2 text-xs text-zinc-500">Loading library...</p>
                                                ) : (
                                                    <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                                                        {libraryFor(section.sectionKey).map((item) => {
                                                            const selected = (section.selectedItems || []).map(String).includes(item.id);
                                                            return (
                                                                <button
                                                                    key={item.id}
                                                                    onClick={() => toggleSelect(section, item.id)}
                                                                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                                                                        selected
                                                                            ? "border-orange-500/50 bg-orange-500/10 text-white"
                                                                            : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/25"
                                                                    }`}
                                                                >
                                                                    <span className="min-w-0">
                                                                        <span className="block truncate font-bold">{item.label}</span>
                                                                        {item.sub && <span className="block truncate text-[10px] text-zinc-500">{item.sub}</span>}
                                                                    </span>
                                                                    {selected && <Check size={14} className="shrink-0 text-orange-400" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {selectedCount(section) === 0 && (
                                                    <p className="mt-2 text-[11px] text-amber-400/80">
                                                        Nothing selected — the section will use live database defaults.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
