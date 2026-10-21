import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Archive,
    CalendarDays,
    Eye,
    ImagePlus,
    Newspaper,
    Pencil,
    Plus,
    RefreshCw,
    Save,
    Search,
    Trash2,
    X,
} from "lucide-react";
import {
    getAllMotorcycles,
    getAdminUpdate,
    getAdminUpdates,
    createUpdate,
    updateUpdate,
    setUpdateStatus,
    deleteUpdate,
} from "../../services/api";

const UPDATE_TYPES = [
    { value: "new_launch", label: "New Launch" },
    { value: "updated_model", label: "Updated Model" },
    { value: "price_update", label: "Price Update" },
    { value: "new_variant", label: "New Variant" },
    { value: "news", label: "Motorcycle News" },
];

const STATUSES = [
    { value: "draft", label: "Draft", classes: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
    { value: "published", label: "Published", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { value: "archived", label: "Archived", classes: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
];

const emptyForm = {
    title: "",
    motorcycleId: "",
    brand: "",
    modelName: "",
    modelYear: "",
    updateType: "news",
    imageUrl: "",
    shortDescription: "",
    content: "",
    sourceName: "",
    sourceUrl: "",
    publishedAt: "",
    status: "draft",
};

const inputCls =
    "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50 placeholder:text-zinc-600";
const labelCls = "block text-xs font-semibold text-zinc-400";

const fmtDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function MotorcycleUpdatesSection() {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [sort, setSort] = useState("-publishedAt");

    const [bikes, setBikes] = useState([]);
    const [modal, setModal] = useState(null); // { mode: "create" } | { mode: "edit", id }
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [preview, setPreview] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getAdminUpdates({
                search,
                status: statusFilter,
                updateType: typeFilter,
                sort,
                page,
                limit: 10,
            });
            setItems(data.updates || []);
            setTotal(data.total || 0);
            setPages(data.pages || 1);
        } catch (err) {
            if (err?.status !== 401) setError(err.message || "Could not load updates.");
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, typeFilter, sort, page]);

    useEffect(() => {
        const t = setTimeout(load, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [load]);

    useEffect(() => {
        getAllMotorcycles()
            .then((list) => setBikes(list || []))
            .catch(() => setBikes([]));
    }, []);

    const set = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        if (key === "motorcycleId" && value) {
            const bike = bikes.find((b) => b._id === value);
            if (bike) {
                setForm((f) => ({
                    ...f,
                    motorcycleId: value,
                    brand: f.brand || bike.brand || "",
                    modelName: f.modelName || bike.name || "",
                }));
            }
        }
    };

    const openCreate = () => {
        setForm({ ...emptyForm, status: "draft" });
        setFormError("");
        setPreview(false);
        setModal({ mode: "create" });
    };

    const openEdit = async (id) => {
        setFormError("");
        setPreview(false);
        try {
            const data = await getAdminUpdate(id);
            const u = data.update;
            setForm({
                title: u.title || "",
                motorcycleId: u.motorcycle?._id || "",
                brand: u.brand || "",
                modelName: u.modelName || "",
                modelYear: u.modelYear || "",
                updateType: u.updateType || "news",
                imageUrl: u.imageUrl || "",
                shortDescription: u.shortDescription || "",
                content: u.content || "",
                sourceName: u.sourceName || "",
                sourceUrl: u.sourceUrl || "",
                publishedAt: u.publishedAt ? u.publishedAt.slice(0, 10) : "",
                status: u.status || "draft",
            });
            setModal({ mode: "edit", id });
        } catch (err) {
            setError(err.message || "Could not load update.");
        }
    };

    const validate = () => {
        if (!form.title.trim()) return "Title is required.";
        if (!form.shortDescription.trim()) return "Short description is required.";
        if (form.imageUrl.trim() && !/^https?:\/\/.+/i.test(form.imageUrl.trim()))
            return "Image URL must start with http:// or https://";
        if (form.sourceUrl.trim() && !/^https?:\/\/.+/i.test(form.sourceUrl.trim()))
            return "Source URL must start with http:// or https://";
        if (form.modelYear && (isNaN(Number(form.modelYear)) || Number(form.modelYear) < 1900 || Number(form.modelYear) > 2100))
            return "Model year must be a valid year.";
        return "";
    };

    const save = async (targetStatus) => {
        const v = validate();
        if (v) {
            setFormError(v);
            return;
        }
        setSaving(true);
        setFormError("");
        const payload = {
            ...form,
            modelYear: form.modelYear ? Number(form.modelYear) : null,
            publishedAt: form.publishedAt || null,
        };
        if (targetStatus === "published" && form.status !== "published") {
            payload.status = "published";
            if (!form.publishedAt) payload.publishedAt = new Date().toISOString().slice(0, 10);
        }
        try {
            if (modal.mode === "create") {
                await createUpdate(payload);
            } else {
                await updateUpdate(modal.id, payload);
            }
            setModal(null);
            load();
        } catch (err) {
            setFormError(err.message || "Could not save update.");
        } finally {
            setSaving(false);
        }
    };

    const changeStatus = async (id, status) => {
        if (!window.confirm(`Mark this update as ${status}?`)) return;
        try {
            await setUpdateStatus(id, status);
            load();
        } catch (err) {
            setError(err.message || "Could not update status.");
        }
    };

    const remove = async (id) => {
        if (!window.confirm("Permanently delete this update? This cannot be undone.")) return;
        try {
            await deleteUpdate(id);
            load();
        } catch (err) {
            setError(err.message || "Could not delete update.");
        }
    };

    const counts = useMemo(() => ({ total }), [total]);

    const statusBadge = (s) => {
        const meta = STATUSES.find((x) => x.value === s) || STATUSES[0];
        return (
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.classes}`}>
                {meta.label}
            </span>
        );
    };

    const typeLabel = (t) => UPDATE_TYPES.find((x) => x.value === t)?.label || t;

    return (
        <div>
            {error && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-bold text-orange-400 flex items-center gap-1.5">
                    <Newspaper size={14} /> {counts.total} updates
                </div>
                <div className="relative min-w-[200px] flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search title, brand, source..."
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-orange-500/50"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                    }}
                    className="rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 text-xs font-semibold text-white outline-none"
                >
                    <option value="">All Statuses</option>
                    {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>
                <select
                    value={typeFilter}
                    onChange={(e) => {
                        setTypeFilter(e.target.value);
                        setPage(1);
                    }}
                    className="rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 text-xs font-semibold text-white outline-none"
                >
                    <option value="">All Categories</option>
                    {UPDATE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
                <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 text-xs font-semibold text-white outline-none"
                >
                    <option value="-publishedAt">Newest Published</option>
                    <option value="publishedAt">Oldest Published</option>
                    <option value="-createdAt">Newest Created</option>
                    <option value="-updatedAt">Recently Updated</option>
                    <option value="title">Title A-Z</option>
                </select>
                <button
                    onClick={load}
                    aria-label="Refresh"
                    className="rounded-xl border border-white/10 p-2.5 text-zinc-400 transition hover:text-white"
                >
                    <RefreshCw size={15} />
                </button>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-orange-400"
                >
                    <Plus size={15} /> New Update
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.03]" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-white/10">
                    <Newspaper size={32} className="mx-auto text-zinc-600 mb-2" />
                    <p className="text-sm font-semibold text-zinc-400">No updates found</p>
                    <p className="text-xs text-zinc-600 mt-1">
                        {search || statusFilter || typeFilter
                            ? "Try adjusting your search or filters."
                            : "Create your first motorcycle update to get started."}
                    </p>
                    {!search && !statusFilter && !typeFilter && (
                        <button
                            onClick={openCreate}
                            className="mt-4 rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-black transition hover:bg-orange-400"
                        >
                            Create Update
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((u) => (
                        <div
                            key={u._id}
                            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0c0c0c] p-4 sm:p-5 transition hover:border-orange-500/20"
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-4">
                                {u.imageUrl ? (
                                    <img
                                        src={u.imageUrl}
                                        alt=""
                                        className="h-14 w-20 shrink-0 rounded-lg object-cover border border-white/10"
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                    />
                                ) : (
                                    <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-800">
                                        <Newspaper size={20} className="text-zinc-600" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-extrabold text-white">
                                            {u.title || [u.brand, u.modelName].filter(Boolean).join(" ")}
                                        </p>
                                        {statusBadge(u.status)}
                                        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-400">
                                            {typeLabel(u.updateType)}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-zinc-500">
                                        {[u.brand, u.modelName, u.modelYear].filter(Boolean).join(" • ") || "—"}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <CalendarDays size={11} />
                                            Published: {fmtDate(u.publishedAt)}
                                        </span>
                                        {u.sourceName && <span>Source: {u.sourceName}</span>}
                                        {u.motorcycle && (
                                            <span className="text-orange-400/80">
                                                Bike: {u.motorcycle.brand} {u.motorcycle.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openEdit(u._id)}
                                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-orange-500/40 hover:text-orange-400"
                                >
                                    <Pencil size={13} /> Edit
                                </button>
                                {u.status !== "published" ? (
                                    <button
                                        onClick={() => changeStatus(u._id, "published")}
                                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-black transition hover:bg-emerald-400"
                                    >
                                        Publish
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => changeStatus(u._id, "draft")}
                                        className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:text-white"
                                    >
                                        Unpublish
                                    </button>
                                )}
                                {u.status !== "archived" && (
                                    <button
                                        onClick={() => changeStatus(u._id, "archived")}
                                        title="Archive"
                                        className="rounded-xl border border-white/10 p-2 text-zinc-400 transition hover:text-amber-400"
                                    >
                                        <Archive size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={() => remove(u._id)}
                                    title="Delete"
                                    className="rounded-xl border border-white/10 p-2 text-zinc-400 transition hover:border-red-500/40 hover:text-red-400"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                    <span>Page {page} of {pages} • {total} total</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40"
                        >
                            Prev
                        </button>
                        <button
                            disabled={page >= pages}
                            onClick={() => setPage((p) => p + 1)}
                            className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Create / Edit modal */}
            {modal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                    <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c]">
                        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                            <h3 className="text-lg font-black text-white">
                                {modal.mode === "create" ? "New Motorcycle Update" : "Edit Update"}
                            </h3>
                            <button
                                onClick={() => setModal(null)}
                                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {preview ? (
                            /* Preview mode */
                            <div className="overflow-y-auto px-6 py-6">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${
                                            STATUSES.find((s) => s.value === form.status)?.classes
                                        }`}>
                                            {STATUSES.find((s) => s.value === form.status)?.label}
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-zinc-300">
                                            {typeLabel(form.updateType)}
                                        </span>
                                        {form.modelYear && (
                                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-zinc-300">
                                                {form.modelYear}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="mt-4 text-2xl font-black leading-tight text-white">
                                        {form.title || "Untitled update"}
                                    </h2>
                                    {(form.brand || form.modelName) && (
                                        <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-orange-500">
                                            {[form.brand, form.modelName].filter(Boolean).join(" • ")}
                                        </p>
                                    )}
                                    {form.imageUrl && (
                                        <img
                                            src={form.imageUrl}
                                            alt="Preview"
                                            className="mt-4 max-h-64 w-full rounded-xl object-cover border border-white/10"
                                            onError={(e) => {
                                                e.currentTarget.style.display = "none";
                                            }}
                                        />
                                    )}
                                    <p className="mt-4 leading-7 text-zinc-300">{form.shortDescription}</p>
                                    {(form.content || "")
                                        .split(/\n+/)
                                        .filter((p) => p.trim())
                                        .map((p, i) => (
                                            <p key={i} className="mt-3 leading-7 text-zinc-400">
                                                {p}
                                            </p>
                                        ))}
                                    {(form.sourceName || form.sourceUrl) && (
                                        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-zinc-400">
                                            Source: {form.sourceName || "—"}
                                            {form.sourceUrl && (
                                                <>
                                                    {" "}
                                                    <a
                                                        href={form.sourceUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-orange-400 underline"
                                                    >
                                                        {form.sourceUrl}
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-5 flex justify-end gap-3">
                                    <button
                                        onClick={() => setPreview(false)}
                                        className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
                                    >
                                        Back to Edit
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Form mode */
                            <div className="flex-1 overflow-y-auto px-6 py-6">
                                {formError && (
                                    <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                        {formError}
                                    </div>
                                )}

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className={labelCls + " sm:col-span-2"}>
                                        Title *
                                        <input
                                            value={form.title}
                                            onChange={(e) => set("title", e.target.value)}
                                            placeholder="e.g. 2026 KTM 390 Duke Launched in India"
                                            className={inputCls}
                                        />
                                    </label>

                                    <label className={labelCls}>
                                        Link to Motorcycle
                                        <select
                                            value={form.motorcycleId}
                                            onChange={(e) => set("motorcycleId", e.target.value)}
                                            className={inputCls + " bg-[#111]"}
                                        >
                                            <option value="">None</option>
                                            {bikes.map((b) => (
                                                <option key={b._id} value={b._id}>
                                                    {b.brand} {b.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className={labelCls}>
                                        Update Category
                                        <select
                                            value={form.updateType}
                                            onChange={(e) => set("updateType", e.target.value)}
                                            className={inputCls + " bg-[#111]"}
                                        >
                                            {UPDATE_TYPES.map((t) => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className={labelCls}>
                                        Brand
                                        <input
                                            value={form.brand}
                                            onChange={(e) => set("brand", e.target.value)}
                                            placeholder="KTM"
                                            className={inputCls}
                                        />
                                    </label>

                                    <label className={labelCls}>
                                        Model Name
                                        <input
                                            value={form.modelName}
                                            onChange={(e) => set("modelName", e.target.value)}
                                            placeholder="390 Duke"
                                            className={inputCls}
                                        />
                                    </label>

                                    <label className={labelCls}>
                                        Model Year
                                        <input
                                            value={form.modelYear}
                                            onChange={(e) => set("modelYear", e.target.value)}
                                            placeholder="2026"
                                            type="number"
                                            min="1900"
                                            max="2100"
                                            className={inputCls}
                                        />
                                    </label>

                                    <label className={labelCls}>
                                        Publication Date
                                        <input
                                            type="date"
                                            value={form.publishedAt}
                                            onChange={(e) => set("publishedAt", e.target.value)}
                                            className={inputCls}
                                        />
                                    </label>

                                    <label className={labelCls + " sm:col-span-2"}>
                                        Image URL
                                        <div className="mt-1.5 flex items-center gap-3">
                                            <input
                                                value={form.imageUrl}
                                                onChange={(e) => set("imageUrl", e.target.value)}
                                                placeholder="https://example.com/image.jpg"
                                                className={inputCls}
                                            />
                                            {form.imageUrl ? (
                                                <img
                                                    src={form.imageUrl}
                                                    alt="Preview"
                                                    className="h-10 w-16 shrink-0 rounded-lg border border-white/10 object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = "none";
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/10 text-zinc-600">
                                                    <ImagePlus size={16} />
                                                </div>
                                            )}
                                        </div>
                                    </label>

                                    <label className={labelCls + " sm:col-span-2"}>
                                        Short Description * (shown on cards & listings)
                                        <textarea
                                            value={form.shortDescription}
                                            onChange={(e) => set("shortDescription", e.target.value)}
                                            rows={2}
                                            maxLength={400}
                                            placeholder="One or two sentences summarizing this update..."
                                            className={inputCls + " resize-none"}
                                        />
                                    </label>

                                    <label className={labelCls + " sm:col-span-2"}>
                                        Full Content
                                        <textarea
                                            value={form.content}
                                            onChange={(e) => set("content", e.target.value)}
                                            rows={6}
                                            placeholder="Detailed article content. Separate paragraphs with a blank line..."
                                            className={inputCls + " resize-y"}
                                        />
                                    </label>

                                    <label className={labelCls}>
                                        Source Name
                                        <input
                                            value={form.sourceName}
                                            onChange={(e) => set("sourceName", e.target.value)}
                                            placeholder="e.g. Autocar India"
                                            className={inputCls}
                                        />
                                    </label>

                                    <label className={labelCls}>
                                        Source URL
                                        <input
                                            value={form.sourceUrl}
                                            onChange={(e) => set("sourceUrl", e.target.value)}
                                            placeholder="https://..."
                                            className={inputCls}
                                        />
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Modal footer */}
                        {!preview && (
                            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
                                <button
                                    onClick={() => setPreview(true)}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/5"
                                >
                                    <Eye size={14} /> Preview
                                </button>
                                <button
                                    onClick={() => save("draft")}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:bg-white/5 disabled:opacity-50"
                                >
                                    <Save size={14} /> {form.status === "published" ? "Save Changes" : "Save as Draft"}
                                </button>
                                {form.status !== "published" && (
                                    <button
                                        onClick={() => save("published")}
                                        disabled={saving}
                                        className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-extrabold text-black transition hover:bg-orange-400 disabled:opacity-50"
                                    >
                                        {saving ? "Saving..." : "Publish"}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
