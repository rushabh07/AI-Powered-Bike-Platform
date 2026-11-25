import { useEffect, useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { getPanelDealerships, getDealershipStock, updateDealershipStock } from "../../services/dealershipApi";
import { searchMotorcycles } from "../../services/api";

const getMotorcycleId = (item) => {
    const motorcycle = item?.motorcycle;
    return typeof motorcycle === "object" ? motorcycle?._id : motorcycle;
};

const DealershipInventory = () => {
    const [dealerships, setDealerships] = useState([]);
    const [selected, setSelected] = useState("");
    const [stock, setStock] = useState([]);
    const [stockDealership, setStockDealership] = useState("");
    const [loading, setLoading] = useState(true);
    const [stockLoading, setStockLoading] = useState(false);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [saving, setSaving] = useState("");

    useEffect(() => {
        let active = true;
        getPanelDealerships()
            .then((data) => {
                if (!active) return;
                const list = data.dealerships || [];
                setDealerships(list);
                setSelected((current) => current || list[0]?._id || "");
            })
            .catch((err) => {
                if (active && err?.status !== 401) setError(err.message || "Could not load dealerships.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!selected) {
            return undefined;
        }

        let active = true;
        // This reflects the pending request for the newly selected dealership.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStockLoading(true);
        setError("");
        getDealershipStock(selected)
            .then((data) => {
                if (active) {
                    setStock(data.stock || []);
                    setStockDealership(selected);
                }
            })
            .catch((err) => {
                if (active && err?.status !== 401) setError(err.message || "Could not load inventory.");
            })
            .finally(() => {
                if (active) setStockLoading(false);
            });

        return () => { active = false; };
    }, [selected]);

    useEffect(() => {
        const search = query.trim();
        if (search.length < 2) return undefined;

        let active = true;
        const timer = setTimeout(async () => {
            try {
                const motorcycles = await searchMotorcycles(search);
                if (active) setResults(motorcycles);
            } catch {
                if (active) setResults([]);
            }
        }, 400);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [query]);

    const setQty = async (motorcycleId, quantity, price) => {
        if (!selected || !motorcycleId) return false;
        setSaving(motorcycleId);
        setError("");
        try {
            const payload = { motorcycle: motorcycleId, quantity };
            if (price !== undefined) payload.price = price;
            const data = await updateDealershipStock(selected, payload);
            setStock(data.stock || []);
            setStockDealership(selected);
            return true;
        } catch (err) {
            if (err?.status !== 401) setError(err.message || "Could not update inventory.");
            return false;
        } finally {
            setSaving("");
        }
    };

    const addMotorcycle = async (motorcycle) => {
        const current = stockDealership === selected
            ? stock.find((item) => getMotorcycleId(item) === motorcycle._id)
            : null;
        const saved = await setQty(
            motorcycle._id,
            Number(current?.quantity || 0) + 1,
            current ? current.price : Number(motorcycle.price ?? motorcycle.exShowroomPrice ?? 0)
        );
        if (saved) {
            setQuery("");
            setResults([]);
        }
    };

    if (loading) {
        return <div className="grid gap-4 sm:grid-cols-2"><div className="h-32 animate-pulse rounded-2xl bg-zinc-900" /><div className="h-32 animate-pulse rounded-2xl bg-zinc-900" /></div>;
    }

    const visibleStock = stockDealership === selected ? stock : [];
    const stockReady = !stockLoading && stockDealership === selected;

    return (
        <div>
            {error && <div role="alert" className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            {dealerships.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-zinc-800 py-8 text-center text-sm text-zinc-500">
                    No dealership is associated with this account yet. Inventory is only available for your authorized dealerships.
                </p>
            ) : (
                <>
                    <div className="mb-4">
                        <label htmlFor="inventory-dealership" className="mb-1.5 block text-xs font-semibold text-zinc-400">Dealership</label>
                        <select id="inventory-dealership" value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50">
                            {dealerships.map((d) => <option key={d._id} value={d._id}>{d.name} — {d.city}</option>)}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="inventory-motorcycle-search" className="mb-1.5 block text-xs font-semibold text-zinc-400">Add motorcycle to stock</label>
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
                            <input id="inventory-motorcycle-search" value={query} onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim().length < 2) setResults([]); }} placeholder="Search motorcycle..." className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-orange-500/50" />
                        </div>
                        {results.length > 0 && (
                            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900">
                                {results.slice(0, 8).map((motorcycle) => (
                                    <button key={motorcycle._id} type="button" onClick={() => addMotorcycle(motorcycle)} disabled={Boolean(saving) || !stockReady} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-white/5 disabled:cursor-wait disabled:opacity-60">
                                        <span className="font-semibold text-white">{motorcycle.brand} {motorcycle.name}</span>
                                        <span className="flex items-center gap-1 text-xs text-orange-400"><Plus size={13} aria-hidden="true" /> Add one</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {!stockReady ? (
                        <div aria-label="Loading inventory" className="space-y-2"><div className="h-16 animate-pulse rounded-2xl bg-zinc-900" /><div className="h-16 animate-pulse rounded-2xl bg-zinc-900" /></div>
                    ) : visibleStock.length === 0 ? (
                        <p className="py-8 text-center text-sm text-zinc-500">No stock yet. Search above to add motorcycles.</p>
                    ) : (
                        <div className="space-y-2">
                            {visibleStock.map((item) => {
                                const motorcycleId = getMotorcycleId(item);
                                const isSaving = saving === motorcycleId;
                                return (
                                    <div key={motorcycleId || item._id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-white">{item.motorcycle ? `${item.motorcycle.brand || ""} ${item.motorcycle.name || ""}`.trim() : "Motorcycle unavailable"}</p>
                                            <p className="text-xs text-zinc-500">₹{Number(item.price || 0).toLocaleString("en-IN")}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button type="button" aria-label={`Decrease ${item.motorcycle?.name || "motorcycle"} stock`} onClick={() => setQty(motorcycleId, Number(item.quantity) - 1, item.price)} disabled={!motorcycleId || isSaving} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-bold text-zinc-300 hover:border-orange-500/40 disabled:opacity-50">−</button>
                                            <span className="w-8 text-center text-sm font-bold text-white">{item.quantity}</span>
                                            <button type="button" aria-label={`Increase ${item.motorcycle?.name || "motorcycle"} stock`} onClick={() => setQty(motorcycleId, Number(item.quantity) + 1, item.price)} disabled={!motorcycleId || isSaving} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-bold text-zinc-300 hover:border-orange-500/40 disabled:opacity-50">+</button>
                                            <button type="button" aria-label={`Remove ${item.motorcycle?.name || "motorcycle"} from stock`} onClick={() => { if (window.confirm("Remove from stock?")) setQty(motorcycleId, 0); }} disabled={!motorcycleId || isSaving} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"><Trash2 size={15} aria-hidden="true" /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DealershipInventory;
