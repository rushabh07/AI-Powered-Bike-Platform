import React, { useEffect, useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { getPanelDealerships, getDealershipStock, updateDealershipStock } from "../../services/dealershipApi";
import { searchMotorcycles } from "../../services/api";

const DealershipInventory = () => {
    const [dealerships, setDealerships] = useState([]);
    const [selected, setSelected] = useState("");
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [saving, setSaving] = useState("");

    const loadDealerships = async () => {
        try {
            const data = await getPanelDealerships();
            setDealerships(data.dealerships || []);
            if (!selected && data.dealerships?.length > 0) setSelected(data.dealerships[0]._id);
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadStock = async () => {
        if (!selected) return;
        try {
            const data = await getDealershipStock(selected);
            setStock(data.stock || []);
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        }
    };

    useEffect(() => {
        loadDealerships();
    }, []);

    useEffect(() => {
        loadStock();
    }, [selected]);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }
        const t = setTimeout(async () => {
            try {
                setResults(await searchMotorcycles(query));
            } catch {
                setResults([]);
            }
        }, 400);
        return () => clearTimeout(t);
    }, [query]);

    const setQty = async (motorcycleId, quantity, price) => {
        setSaving(motorcycleId);
        try {
            const data = await updateDealershipStock(selected, { motorcycle: motorcycleId, quantity, price });
            setStock(data.stock || []);
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        } finally {
            setSaving("");
        }
    };

    if (loading) {
        return <div className="grid gap-4 sm:grid-cols-2"><div className="h-32 animate-pulse rounded-2xl bg-zinc-900" /><div className="h-32 animate-pulse rounded-2xl bg-zinc-900" /></div>;
    }

    return (
        <div>
            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Dealership</label>
                <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50">
                    {dealerships.map((d) => (
                        <option key={d._id} value={d._id}>{d.name} — {d.city}</option>
                    ))}
                </select>
            </div>
            <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Add motorcycle to stock</label>
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search motorcycle..." className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-orange-500/50" />
                </div>
                {results.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900">
                        {results.slice(0, 8).map((m) => (
                            <button key={m._id} onClick={() => { setQty(m._id, 1, m.price); setQuery(""); setResults([]); }} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-white/5">
                                <span className="font-semibold text-white">{m.brand} {m.name}</span>
                                <span className="flex items-center gap-1 text-xs text-orange-400"><Plus size={13} /> Add</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {stock.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">No stock yet. Search above to add motorcycles.</p>
            ) : (
                <div className="space-y-2">
                    {stock.map((s) => (
                        <div key={s.motorcycle?._id || s._id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-white">{s.motorcycle?.brand} {s.motorcycle?.name}</p>
                                <p className="text-xs text-zinc-500">₹{Number(s.price || 0).toLocaleString("en-IN")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setQty(s.motorcycle._id, s.quantity - 1, s.price)} disabled={saving === s.motorcycle._id} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-bold text-zinc-300 hover:border-orange-500/40">−</button>
                                <span className="w-8 text-center text-sm font-bold text-white">{s.quantity}</span>
                                <button onClick={() => setQty(s.motorcycle._id, s.quantity + 1, s.price)} disabled={saving === s.motorcycle._id} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-bold text-zinc-300 hover:border-orange-500/40">+</button>
                                <button onClick={() => { if (window.confirm("Remove from stock?")) setQty(s.motorcycle._id, 0); }} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={15} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DealershipInventory;
