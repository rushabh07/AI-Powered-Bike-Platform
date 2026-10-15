import React, { useEffect, useState } from "react";
import { Search, Phone } from "lucide-react";
import { getPanelBookings, updatePanelBooking } from "../../services/dealershipApi";

const DealershipLeads = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getPanelBookings({ search, page, limit: 15 });
            const open = (data.bookings || []).filter((b) =>
                ["pending", "submitted", "contacted", "scheduled"].includes(b.status)
            );
            setItems(open);
            setPages(data.pages || 1);
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [page]);

    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            load();
        }, 500);
        return () => clearTimeout(t);
    }, [search]);

    const saveLead = async (b, patch) => {
        try {
            const data = await updatePanelBooking(b._id, patch);
            setItems((prev) => prev.map((x) => (x._id === b._id ? { ...x, ...data.booking } : x)));
        } catch (err) {
            if (err?.status !== 401) alert(err.message || "Save failed.");
        }
    };

    return (
        <div>
            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            <div className="relative mb-4">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-orange-500/50" />
            </div>
            {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-900" />)}</div>
            ) : items.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">No open leads.</p>
            ) : (
                <div className="space-y-2">
                    {items.map((b) => (
                        <div key={b._id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm font-bold text-white">{b.contactName} <span className="font-mono text-[11px] text-zinc-500">{b.enquiryId}</span></p>
                                    <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400"><Phone size={11} />{b.contactPhone}</p>
                                    <p className="mt-0.5 text-xs text-zinc-500">{b.motorcycle?.brand} {b.motorcycle?.name} • {b.enquiryType === "test_ride" ? "Test Ride" : "Purchase"}</p>
                                </div>
                                <label className="flex items-center gap-2 text-xs text-zinc-400">
                                    <input type="checkbox" checked={!!b.converted} onChange={(e) => saveLead(b, { converted: e.target.checked })} className="rounded" />
                                    Converted
                                </label>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <label className="block text-xs text-zinc-500">Follow-up date<input type="date" defaultValue={b.followUpDate ? new Date(b.followUpDate).toISOString().slice(0, 10) : ""} id={`fu-${b._id}`} className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none" /></label>
                                <label className="block text-xs text-zinc-500">Note<input defaultValue={b.adminNotes || ""} id={`ln-${b._id}`} placeholder="Follow-up note" className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none" /></label>
                            </div>
                            <button onClick={() => { const f = document.getElementById(`fu-${b._id}`)?.value; const n = document.getElementById(`ln-${b._id}`)?.value; saveLead(b, { followUpDate: f || null, adminNotes: n }); }} className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-orange-500/40 hover:text-orange-400">Save lead info</button>
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
        </div>
    );
};

export default DealershipLeads;
