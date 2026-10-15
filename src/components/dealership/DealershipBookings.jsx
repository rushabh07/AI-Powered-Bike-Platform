import React, { useEffect, useState } from "react";
import { Search, Check, X } from "lucide-react";
import { getPanelBookings, updatePanelBooking } from "../../services/dealershipApi";

const STATUSES = ["pending", "submitted", "contacted", "scheduled", "confirmed", "completed", "cancelled", "rejected"];

const badge = (s) => {
    const base = "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider";
    if (s === "confirmed" || s === "completed") return `${base} bg-emerald-500/10 text-emerald-400`;
    if (s === "cancelled" || s === "rejected") return `${base} bg-zinc-500/10 text-zinc-500`;
    if (s === "contacted" || s === "scheduled") return `${base} bg-blue-500/10 text-blue-400`;
    return `${base} bg-yellow-500/10 text-yellow-400`;
};

const DealershipBookings = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [confirmId, setConfirmId] = useState(null);
    const [detail, setDetail] = useState(null);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getPanelBookings({ status, search, page, limit: 15 });
            setItems(data.bookings || []);
            setPages(data.pages || 1);
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [status, page]);

    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            load();
        }, 500);
        return () => clearTimeout(t);
    }, [search]);

    const doUpdate = async (id, payload, label) => {
        if (label && !window.confirm(`${label}?`)) return;
        try {
            const data = await updatePanelBooking(id, payload);
            setItems((prev) => prev.map((b) => (b._id === id ? { ...b, ...data.booking } : b)));
            if (detail?._id === id) setDetail({ ...detail, ...data.booking });
        } catch (err) {
            if (err?.status !== 401) alert(err.message || "Update failed.");
        }
    };

    return (
        <div>
            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            <div className="mb-4 flex flex-wrap gap-3">
                <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50">
                    <option value="">All statuses</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID, name, phone..." className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-orange-500/50" />
                </div>
            </div>
            {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-900" />)}</div>
            ) : items.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">No bookings found.</p>
            ) : (
                <div className="space-y-2">
                    {items.map((b) => (
                        <div key={b._id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <button onClick={() => setDetail(detail?._id === b._id ? null : b)} className="min-w-0 flex-1 text-left">
                                    <p className="font-mono text-xs text-zinc-500">{b.enquiryId} • {b.enquiryType === "test_ride" ? "Test Ride" : "Purchase"}</p>
                                    <p className="mt-1 truncate text-sm font-bold text-white">{b.contactName} — {b.motorcycle?.brand} {b.motorcycle?.name}</p>
                                    <p className="mt-0.5 text-xs text-zinc-500">
                                        {b.visitDate ? new Date(b.visitDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}{b.timeSlot ? ` • ${b.timeSlot}` : ""}{b.licenceConfirmed ? " • Licence ✓" : ""}
                                    </p>
                                </button>
                                <span className="flex flex-col items-end gap-1">
                                    <span className={badge(b.status)}>{b.status}</span>
                                    {b.emailStatus && b.emailStatus !== "unknown" && (
                                        <span title="Email notification status" className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/5 text-zinc-400">✉ {b.emailStatus}</span>
                                    )}
                                </span>
                            </div>
                            {detail?._id === b._id && (
                                <div className="mt-3 rounded-xl bg-white/[0.02] p-4 text-sm">
                                    <p className="text-zinc-400">Phone: <span className="text-white">{b.contactPhone}</span></p>
                                    <p className="text-zinc-400">Dealership: <span className="text-white">{b.dealership?.name}</span></p>
                                    {b.notes && <p className="mt-1 text-zinc-400">Notes: <span className="text-white">{b.notes}</span></p>}
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        <label className="block text-xs text-zinc-500">Reschedule<input type="date" id={`date-${b._id}`} defaultValue={b.visitDate ? new Date(b.visitDate).toISOString().slice(0, 10) : ""} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none" /></label>
                                        <label className="block text-xs text-zinc-500">Note<input id={`note-${b._id}`} defaultValue={b.adminNotes || ""} placeholder="Internal note" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none" /></label>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button onClick={() => { const d = document.getElementById(`date-${b._id}`)?.value; const n = document.getElementById(`note-${b._id}`)?.value; doUpdate(b._id, { visitDate: d || undefined, adminNotes: n }); }} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-orange-500/40 hover:text-orange-400">Save changes</button>
                                        <button onClick={() => setConfirmId({ id: b._id, status: "confirmed", label: "Confirm this booking" })} className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"><Check size={13} /> Confirm</button>
                                        <button onClick={() => setConfirmId({ id: b._id, status: "rejected", label: "Reject this booking" })} className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20"><X size={13} /> Reject</button>
                                        <button onClick={() => doUpdate(b._id, { status: "completed" }, "Mark completed")} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-orange-500/40 hover:text-orange-400">Complete</button>
                                        <button onClick={() => doUpdate(b._id, { status: "cancelled" }, "Cancel this booking")} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-red-500/40 hover:text-red-400">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                <span>Page {page} of {pages}</span>
                <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-zinc-800 px-3 py-1.5 disabled:opacity-40">Prev</button>
                    <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-zinc-800 px-3 py-1.5 disabled:opacity-40">Next</button>
                </div>
            </div>
            {confirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                        <p className="font-bold text-white">{confirmId.label}?</p>
                        <div className="mt-5 flex gap-3">
                            <button onClick={() => { doUpdate(confirmId.id, { status: confirmId.status }); setConfirmId(null); }} className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-black hover:bg-orange-400">Yes</button>
                            <button onClick={() => setConfirmId(null)} className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-semibold text-zinc-300">No</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DealershipBookings;
