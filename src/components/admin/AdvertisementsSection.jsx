import React, { useCallback, useEffect, useState } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    X,
    Save,
    Search,
    ChevronUp,
    ChevronDown,
    Eye,
    EyeOff,
    RefreshCw,
    Megaphone,
    MousePointerClick,
    Eye as EyeIcon,
} from "lucide-react";
import {
    getAdminAdvertisements,
    createAdminAdvertisement,
    updateAdminAdvertisement,
    setAdminAdvertisementStatus,
    reorderAdminAdvertisements,
    deleteAdminAdvertisement,
} from "../../services/api";

const emptyForm = {
    title: "",
    description: "",
    imageUrl: "",
    mobileImageUrl: "",
    ctaText: "Explore Bikes",
    targetUrl: "/motorcycles",
    badgeText: "",
    startDate: "",
    endDate: "",
    priority: 0,
    displayOrder: 0,
    status: "draft",
    placement: "homepage",
};

const toInputDate = (iso) => {
    if (!iso) return "";
    try {
        return new Date(iso).toISOString().slice(0, 16);
    } catch {
        return "";
    }
};

const statusBadge = (ad) => {
    const now = new Date();
    const expired = ad.endDate && new Date(ad.endDate) < now;
    const scheduled = ad.startDate && new Date(ad.startDate) > now;
    if (expired) return <span className="rounded-full bg-zinc-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-zinc-500">Expired</span>;
    if (ad.status === "active" && scheduled) return <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-400">Scheduled</span>;
    if (ad.status === "active") return <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-400">Active</span>;
    if (ad.status === "draft") return <span className="rounded-full bg-yellow-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-yellow-400">Draft</span>;
    return <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase text-zinc-400">Inactive</span>;
};

const BannerPreview = ({ form }) => (
    <div className="relative aspect-[21/8] overflow-hidden rounded-2xl border border-white/10 bg-[#111]">
        {form.imageUrl ? (
            <img src={form.imageUrl} alt={form.title || "Preview"} className="h-full w-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
        ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-zinc-600">No image — paste a banner URL above</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            {form.badgeText && (
                <span className="mb-1.5 inline-block rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">{form.badgeText}</span>
            )}
            <p className="text-lg font-black text-white sm:text-xl">{form.title || "Advertisement title"}</p>
            {form.description && <p className="mt-0.5 truncate text-xs text-zinc-300 sm:text-sm">{form.description}</p>}
            <span className="mt-2 inline-block rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-black">{form.ctaText || "Explore Bikes"}</span>
        </div>
    </div>
);

export default function AdvertisementsSection() {
    const [items, setItems] = useState([]);
    const [counts, setCounts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState(null);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [sort, setSort] = useState("order");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const showToast = (msg, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getAdminAdvertisements({ search, status, sort, page, limit: 15 });
            setItems(data.advertisements || []);
            setPages(data.pages || 1);
            setCounts(data.counts || null);
        } catch (err) {
            if (err?.status !== 401) setError(err.message || "Could not load advertisements.");
        } finally {
            setLoading(false);
        }
    }, [search, status, sort, page]);

    useEffect(() => {
        const t = setTimeout(load, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [load]);

    const openNew = () => {
        setEditing(null);
        setForm({ ...emptyForm, displayOrder: items.length });
        setShowForm(true);
    };

    const openEdit = (ad) => {
        setEditing(ad);
        setForm({
            title: ad.title || "",
            description: ad.description || "",
            imageUrl: ad.imageUrl || "",
            mobileImageUrl: ad.mobileImageUrl || "",
            ctaText: ad.ctaText || "Explore Bikes",
            targetUrl: ad.targetUrl || "/motorcycles",
            badgeText: ad.badgeText || "",
            startDate: toInputDate(ad.startDate),
            endDate: toInputDate(ad.endDate),
            priority: ad.priority ?? 0,
            displayOrder: ad.displayOrder ?? 0,
            status: ad.status || "draft",
            placement: ad.placement || "homepage",
        });
        setShowForm(true);
    };

    const validate = () => {
        if (!form.title.trim()) return "Title is required.";
        if (!form.imageUrl.trim()) return "Banner image URL is required.";
        if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
            return "End date cannot be before start date.";
        }
        return "";
    };

    const handleSave = async () => {
        const err = validate();
        if (err) {
            showToast(err, false);
            return;
        }
        setSaving(true);
        try {
            if (editing) {
                await updateAdminAdvertisement(editing._id, form);
                showToast("Advertisement updated.");
            } else {
                await createAdminAdvertisement(form);
                showToast("Advertisement created.");
            }
            setShowForm(false);
            setEditing(null);
            load();
        } catch (err) {
            if (err?.status !== 401) showToast(err.message || "Save failed.", false);
        } finally {
            setSaving(false);
        }
    };

    const handleStatus = async (ad, next) => {
        try {
            await setAdminAdvertisementStatus(ad._id, next);
            showToast(`Advertisement ${next}.`);
            load();
        } catch (err) {
            if (err?.status !== 401) showToast(err.message || "Status update failed.", false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await deleteAdminAdvertisement(confirmDelete._id);
            showToast("Advertisement deleted.");
            setConfirmDelete(null);
            load();
        } catch (err) {
            if (err?.status !== 401) showToast(err.message || "Delete failed.", false);
        }
    };

    const move = async (index, dir) => {
        const sorted = [...items].sort((a, b) => (b.priority - a.priority) || (a.displayOrder - b.displayOrder));
        const j = index + dir;
        if (j < 0 || j >= sorted.length) return;
        const swapped = [...sorted];
        [swapped[index], swapped[j]] = [swapped[j], swapped[index]];
        try {
            await reorderAdminAdvertisements(
                swapped.map((ad, i) => ({ id: ad._id, displayOrder: i }))
            );
            load();
        } catch (err) {
            if (err?.status !== 401) showToast(err.message || "Reorder failed.", false);
        }
    };

    const inputCls = "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50 disabled:opacity-50";

    return (
        <div>
            {toast && (
                <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${toast.ok ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>
                    {toast.msg}
                </div>
            )}

            {counts && (
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                        ["All", counts.all],
                        ["Active", counts.active],
                        ["Drafts", counts.drafts],
                        ["Scheduled", counts.scheduled],
                        ["Expired", counts.expired],
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
                            <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
                            <p className="mt-1 text-2xl font-black text-white">{value ?? 0}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search advertisements..." className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-orange-500/50" />
                </div>
                <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 text-sm text-white outline-none">
                    <option value="">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 text-sm text-white outline-none">
                    <option value="order">Display order</option>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="clicks">Most clicks</option>
                    <option value="impressions">Most impressions</option>
                </select>
                <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400">
                    <Plus size={15} /> New Ad
                </button>
            </div>

            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

            {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.03]" />)}</div>
            ) : items.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
                    <Megaphone size={28} className="mx-auto text-zinc-600" />
                    <p className="mt-3 font-bold text-white">No advertisements</p>
                    <p className="mt-1 text-sm text-zinc-500">Create your first homepage banner above.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full min-w-[760px] text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-500">
                                <th className="px-4 py-3">Banner</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Schedule</th>
                                <th className="px-4 py-3">Stats</th>
                                <th className="px-4 py-3">Order</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((ad, i) => (
                                <tr key={ad._id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <img src={ad.imageUrl} alt="" loading="lazy" onError={(e) => { e.target.style.display = "none"; }} className="h-12 w-20 shrink-0 rounded-lg object-cover" />
                                            <div className="min-w-0">
                                                <p className="truncate font-bold text-white">{ad.title}</p>
                                                <p className="truncate text-xs text-zinc-500">{ad.targetUrl} • prio {ad.priority}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{statusBadge(ad)}</td>
                                    <td className="px-4 py-3 text-xs text-zinc-400">
                                        {ad.startDate ? new Date(ad.startDate).toLocaleDateString("en-IN") : "—"} → {ad.endDate ? new Date(ad.endDate).toLocaleDateString("en-IN") : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-zinc-400">
                                        <span className="mr-3 inline-flex items-center gap-1"><EyeIcon size={12} />{ad.impressions ?? 0}</span>
                                        <span className="inline-flex items-center gap-1"><MousePointerClick size={12} />{ad.clicks ?? 0}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1">
                                            <button onClick={() => move(i, -1)} aria-label="Move up" className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"><ChevronUp size={15} /></button>
                                            <button onClick={() => move(i, 1)} aria-label="Move down" className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"><ChevronDown size={15} /></button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => openEdit(ad)} aria-label="Edit" className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"><Pencil size={15} /></button>
                                            <button onClick={() => handleStatus(ad, ad.status === "active" ? "inactive" : "active")} aria-label={ad.status === "active" ? "Deactivate" : "Activate"} className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white">
                                                {ad.status === "active" ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                            <button onClick={() => setConfirmDelete(ad)} aria-label="Delete" className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                <span>Page {page} of {pages}</span>
                <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40">Prev</button>
                    <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40">Next</button>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0c0c0c] p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-black text-white">{editing ? "Edit Advertisement" : "New Advertisement"}</h3>
                            <button onClick={() => setShowForm(false)} aria-label="Close" className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
                        </div>
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Live preview</p>
                        <BannerPreview form={form} />
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">Title *<input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} /></label>
                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">Description<textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className={`${inputCls} resize-none`} /></label>
                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">Banner image URL *<input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." className={inputCls} /></label>
                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">Mobile image URL (optional)<input value={form.mobileImageUrl} onChange={(e) => set("mobileImageUrl", e.target.value)} placeholder="https://..." className={inputCls} /></label>
                            <label className="block text-xs font-semibold text-zinc-400">CTA text<input value={form.ctaText} onChange={(e) => set("ctaText", e.target.value)} className={inputCls} /></label>
                            <label className="block text-xs font-semibold text-zinc-400">Destination URL<input value={form.targetUrl} onChange={(e) => set("targetUrl", e.target.value)} placeholder="/motorcycles or https://..." className={inputCls} /></label>
                            <label className="block text-xs font-semibold text-zinc-400">Badge (e.g. 20% OFF)<input value={form.badgeText} onChange={(e) => set("badgeText", e.target.value)} className={inputCls} /></label>
                            <label className="block text-xs font-semibold text-zinc-400">Placement
                                <select value={form.placement} onChange={(e) => set("placement", e.target.value)} className={`${inputCls} bg-[#111]`}>
                                    <option value="homepage">Homepage</option>
                                    <option value="motorcycles">Motorcycles</option>
                                </select>
                            </label>
                            <label className="block text-xs font-semibold text-zinc-400">Start date<input type="datetime-local" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputCls} /></label>
                            <label className="block text-xs font-semibold text-zinc-400">End date<input type="datetime-local" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={inputCls} /></label>
                            <label className="block text-xs font-semibold text-zinc-400">Priority<input type="number" value={form.priority} onChange={(e) => set("priority", e.target.value)} className={inputCls} /></label>
                            <label className="block text-xs font-semibold text-zinc-400">Status
                                <select value={form.status} onChange={(e) => set("status", e.target.value)} className={`${inputCls} bg-[#111]`}>
                                    <option value="draft">Draft</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </label>
                        </div>
                        <div className="mt-5 flex gap-3">
                            <button onClick={handleSave} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50">
                                <Save size={15} /> {saving ? "Saving..." : editing ? "Update" : "Create"}
                            </button>
                            <button onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-300">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 text-center">
                        <Trash2 size={28} className="mx-auto text-red-400" />
                        <p className="mt-3 font-bold text-white">Delete “{confirmDelete.title}”?</p>
                        <p className="mt-1 text-sm text-zinc-500">It will be hidden from the website immediately.</p>
                        <div className="mt-5 flex gap-3">
                            <button onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600">Delete</button>
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-zinc-300">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    function set(k, v) {
        setForm((f) => ({ ...f, [k]: v }));
    }
}
