import React, { useEffect, useState } from "react";
import { Plus, ShieldCheck, Search } from "lucide-react";
import { getPanelSales, createPanelSale, verifyPanelSale, getPanelDealerships } from "../../services/dealershipApi";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const METHODS = ["cash", "upi", "card", "bank_transfer"];

const DealershipSales = ({ dealerships: propDealerships }) => {
    const [dealerships, setDealerships] = useState(propDealerships || []);

    useEffect(() => {
        if (propDealerships?.length) {
            setDealerships(propDealerships);
            return;
        }
        (async () => {
            try {
                const data = await getPanelDealerships();
                setDealerships(data.dealerships || []);
            } catch {
                /* ignore */
            }
        })();
    }, [propDealerships]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [verifiedFilter, setVerifiedFilter] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ dealership: "", customerName: "", customerPhone: "", motorcycleName: "", amount: "", paymentMethod: "upi", receiptRef: "", deliveryStatus: "pending" });
    const [saving, setSaving] = useState(false);
    const [confirmId, setConfirmId] = useState(null);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getPanelSales({ verified: verifiedFilter, page, limit: 15 });
            setItems(data.sales || []);
            setPages(data.pages || 1);
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [verifiedFilter, page]);

    useEffect(() => {
        if (dealerships?.length === 1) setForm((f) => ({ ...f, dealership: dealerships[0]._id }));
    }, [dealerships]);

    const handleSave = async () => {
        if (!form.dealership || !form.customerName.trim() || !form.customerPhone.trim() || !Number(form.amount)) {
            setError("Dealership, customer, and a valid amount are required.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await createPanelSale({ ...form, amount: Number(form.amount) });
            setShowForm(false);
            setForm({ dealership: dealerships?.length === 1 ? dealerships[0]._id : "", customerName: "", customerPhone: "", motorcycleName: "", amount: "", paymentMethod: "upi", receiptRef: "", deliveryStatus: "pending" });
            setPage(1);
            await load();
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const doVerify = async (id) => {
        try {
            const data = await verifyPanelSale(id);
            setItems((prev) => prev.map((s) => (s._id === id ? data.sale : s)));
        } catch (err) {
            if (err?.status !== 401) alert(err.message || "Verification failed.");
        } finally {
            setConfirmId(null);
        }
    };

    return (
        <div>
            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <select value={verifiedFilter} onChange={(e) => { setVerifiedFilter(e.target.value); setPage(1); }} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50">
                    <option value="">All payments</option>
                    <option value="true">Verified</option>
                    <option value="false">Unverified</option>
                </select>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-orange-400">
                    <Plus size={15} /> Record Sale
                </button>
            </div>
            {showForm && (
                <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <h3 className="mb-4 font-bold text-white">New Offline Sale</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs text-zinc-400">Dealership *<select value={form.dealership} onChange={(e) => setForm({ ...form, dealership: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none">{(dealerships || []).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></label>
                        <label className="block text-xs text-zinc-400">Amount (₹) *<input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400">Customer Name *<input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400">Customer Phone *<input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400">Motorcycle<input value={form.motorcycleName} onChange={(e) => setForm({ ...form, motorcycleName: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400">Payment Method<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none">{METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
                        <label className="block text-xs text-zinc-400">Receipt / UPI Ref<input value={form.receiptRef} onChange={(e) => setForm({ ...form, receiptRef: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400">Delivery<select value={form.deliveryStatus} onChange={(e) => setForm({ ...form, deliveryStatus: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none">{["pending", "ready", "delivered"].map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
                    </div>
                    <button onClick={handleSave} disabled={saving} className="mt-4 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-black hover:bg-orange-400 disabled:opacity-50">{saving ? "Saving..." : "Save Sale"}</button>
                </div>
            )}
            {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-900" />)}</div>
            ) : items.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">No sales recorded.</p>
            ) : (
                <div className="space-y-2">
                    {items.map((s) => (
                        <div key={s._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                            <div>
                                <p className="font-mono text-xs text-zinc-500">{s.invoiceNo} • {s.deliveryStatus}</p>
                                <p className="mt-1 text-sm font-bold text-white">{s.customerName} — {inr(s.amount)}</p>
                                <p className="text-xs text-zinc-500">{s.paymentMethod}{s.receiptRef ? ` • ${s.receiptRef}` : ""} • {s.motorcycleName}</p>
                            </div>
                            {s.verified ? (
                                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400"><ShieldCheck size={12} /> Verified</span>
                            ) : (
                                <button onClick={() => setConfirmId(s._id)} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-black hover:bg-orange-400">Verify Payment</button>
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
                        <p className="font-bold text-white">Confirm cash/UPI/card payment received?</p>
                        <p className="mt-1 text-xs text-zinc-500">This marks the payment as verified and cannot be undone here. Only confirm after actually receiving the money.</p>
                        <div className="mt-5 flex gap-3">
                            <button onClick={() => doVerify(confirmId)} className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-black hover:bg-orange-400">Yes, Verify</button>
                            <button onClick={() => setConfirmId(null)} className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-semibold text-zinc-300">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DealershipSales;
