import { useEffect, useState, useCallback } from "react";
import {
    IndianRupee,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    Receipt,
    Settings,
    TrendingUp,
    Search,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    BadgeCheck,
    Banknote,
    BarChart3,
} from "lucide-react";

const API = "/api";

const getToken = () => localStorage.getItem("token");

const apiReq = async (url, opts = {}) => {
    const token = getToken();
    const res = await fetch(`${API}${url}`, {
        ...opts,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(opts.headers || {}),
        },
    });
    let data = {};
    try { data = await res.json(); } catch { /* ignore */ }
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const statusBadge = (s) => {
    const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider";
    if (s === "paid") return `${base} bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`;
    if (s === "approved") return `${base} bg-orange-500/10 text-orange-400 border border-orange-500/20`;
    if (s === "rejected") return `${base} bg-red-500/10 text-red-400 border border-red-500/20`;
    return `${base} bg-zinc-500/10 text-zinc-400 border border-zinc-500/20`;
};

const TABS = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "rules", label: "Commission Rules", icon: Settings },
    { id: "referrals", label: "Referrals", icon: Search },
    { id: "sales", label: "Sales & Approvals", icon: Receipt },
    { id: "payouts", label: "Commissions & Payouts", icon: Banknote },
];

// ─── OVERVIEW ────────────────────────────────────────────────────────────────

const OverviewTab = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await apiReq("/admin/commissions/summary");
            setData(res.summary || null);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
        </div>
    );
    if (error) return <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: "Total Referrals", value: data?.referrals?.total ?? 0, icon: BarChart3, color: "text-blue-400" },
                    { label: "Active Referrals", value: data?.referrals?.active ?? 0, icon: Clock, color: "text-orange-400" },
                    { label: "Sales Awaiting Verification", value: data?.sales?.pendingVerification ?? 0, icon: Receipt, color: "text-yellow-400" },
                    { label: "Verified Sales", value: data?.sales?.verified ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
                    { label: "Gross Eligible Sale Value", value: fmt(data?.grossEligibleSaleValue), icon: IndianRupee, color: "text-zinc-300" },
                    { label: "MOTOAI Commission Earned", value: fmt(data?.commission?.earned), icon: TrendingUp, color: "text-orange-400" },
                    { label: "Commission Awaiting Approval", value: fmt(data?.commission?.awaitingApproval), icon: AlertCircle, color: "text-yellow-400" },
                    { label: "Commission Payable / Paid", value: `${fmt(data?.commission?.payable)} / ${fmt(data?.commission?.paid)}`, icon: Banknote, color: "text-emerald-400" },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5 transition hover:border-orange-500/20">
                        <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 ${color}`}>
                            <Icon size={20} />
                        </div>
                        <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
                        <p className="mt-2 text-2xl font-black">{value}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6">
                <h3 className="text-base font-bold">Commission Workflow</h3>
                <p className="mt-1 text-xs text-gray-500">How commissions flow through the system</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    {[
                        { step: "1", label: "Referral / Enquiry", desc: "Customer submits via MOTOAI", color: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
                        { step: "2", label: "Dealership Follow-up", desc: "Dealership contacts customer", color: "border-orange-500/30 text-orange-400 bg-orange-500/10" },
                        { step: "3", label: "Sale Submitted", desc: "Dealer records completed sale + invoice", color: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10" },
                        { step: "4", label: "Admin Verification", desc: "Admin reviews and approves sale", color: "border-purple-500/30 text-purple-400 bg-purple-500/10" },
                        { step: "5", label: "Commission Approved", desc: "Auto-calculated on backend", color: "border-orange-500/30 text-orange-400 bg-orange-500/10" },
                        { step: "6", label: "Payout Recorded", desc: "Admin marks as paid with reference", color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
                    ].map(({ step, label, desc, color }) => (
                        <div key={step} className={`rounded-xl border px-3 py-3 ${color}`}>
                            <span className="text-xs font-black">Step {step}</span>
                            <p className="mt-1 text-xs font-semibold">{label}</p>
                            <p className="mt-0.5 text-[10px] opacity-70">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── COMMISSION RULES ────────────────────────────────────────────────────────

const RulesTab = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ ruleType: "percentage", ruleValue: "", isActive: true, notes: "", eligibleAmountBasis: "final_invoice", effectiveFrom: "", effectiveTo: "", minEligibleAmount: 0, maxEligibleAmount: 0, maxCommissionAmount: 0, payoutDelayDays: 0, includesTaxes: true, includesAccessories: false, includesRegistration: false });
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState("");
    const [saveErr, setSaveErr] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const qs = new URLSearchParams({ page, limit: 15, ...(search ? { search } : {}) });
            const res = await apiReq(`/admin/commissions/rules?${qs}`);
            setData(res.data || []);
            setPages(res.pages || 1);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { load(); }, [load]);

    const openEdit = (item) => {
        setEditing(item.dealership);
        setForm({
            ruleType: item.rule?.ruleType || "percentage",
            ruleValue: item.rule?.ruleValue ?? "",
            isActive: item.rule?.isActive !== false,
            notes: item.rule?.notes || "",
            eligibleAmountBasis: item.rule?.eligibleAmountBasis || "final_invoice",
            effectiveFrom: item.rule?.effectiveFrom ? new Date(item.rule.effectiveFrom).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            effectiveTo: item.rule?.effectiveTo ? new Date(item.rule.effectiveTo).toISOString().slice(0, 10) : "",
            minEligibleAmount: item.rule?.minEligibleAmount || 0,
            maxEligibleAmount: item.rule?.maxEligibleAmount || 0,
            maxCommissionAmount: item.rule?.maxCommissionAmount || 0,
            payoutDelayDays: item.rule?.payoutDelayDays || 0,
            includesTaxes: item.rule?.includesTaxes !== false,
            includesAccessories: item.rule?.includesAccessories === true,
            includesRegistration: item.rule?.includesRegistration === true,
        });
        setSaveMsg("");
        setSaveErr("");
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!window.confirm("Save this commission policy for the selected dealership?")) return;
        setSaving(true);
        setSaveMsg("");
        setSaveErr("");
        try {
            await apiReq(`/admin/commissions/rules/${editing._id}`, {
                method: "PUT",
                body: JSON.stringify({ ...form, ruleValue: Number(form.ruleValue) }),
            });
            setSaveMsg("Commission rule saved successfully.");
            await load();
            setTimeout(() => setEditing(null), 1500);
        } catch (e) {
            setSaveErr(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="relative w-full max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search dealerships..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-orange-500/50"
                />
            </div>

            {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                </div>
            ) : data.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">No dealerships found.</p>
            ) : (
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c]">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-500">
                                    <th className="px-6 py-4">Dealership</th>
                                    <th className="px-6 py-4">Rule Type</th>
                                    <th className="px-6 py-4">Value</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(({ dealership, rule }) => (
                                    <tr key={dealership._id} className="border-b border-white/5 hover:bg-white/[0.025]">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold">{dealership.name}</p>
                                            <p className="text-xs text-gray-500">{dealership.city}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-300">{rule ? (rule.ruleType === "percentage" ? "Percentage" : "Fixed Amount") : "—"}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-orange-400">
                                            {rule ? (rule.ruleType === "percentage" ? `${rule.ruleValue}%` : fmt(rule.ruleValue)) : "Not configured"}
                                        </td>
                                        <td className="px-6 py-4">
                                            {rule ? (
                                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${rule.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                                                    {rule.isActive ? "Active" : "Inactive"}
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-red-400">None</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => openEdit({ dealership, rule })}
                                                className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400 transition hover:bg-orange-500 hover:text-black"
                                            >
                                                {rule ? "Edit" : "Set Rule"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/10 p-2 disabled:opacity-30 hover:bg-white/5">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-gray-400">Page {page} of {pages}</span>
                    <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/10 p-2 disabled:opacity-30 hover:bg-white/5">
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0d0d0d] p-6">
                        <div className="mb-5 flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-orange-500">Commission Rule</p>
                                <h3 className="mt-1 text-lg font-black">{editing.name}</h3>
                                <p className="text-xs text-gray-500">{editing.city}</p>
                            </div>
                            <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10">
                                <XCircle size={20} />
                            </button>
                        </div>
                        {saveErr && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{saveErr}</div>}
                        {saveMsg && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{saveMsg}</div>}
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="mb-2 block text-xs font-semibold text-gray-400">Rule Type</label>
                                <select
                                    value={form.ruleType}
                                    onChange={(e) => setForm({ ...form, ruleType: e.target.value })}
                                    className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                >
                                    <option value="percentage">Percentage of Sale Amount (%)</option>
                                    <option value="fixed">Fixed Amount per Sale (₹)</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-semibold text-gray-400">
                                    {form.ruleType === "percentage" ? "Percentage (0–100)" : "Fixed Amount (₹)"}
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={form.ruleType === "percentage" ? 100 : undefined}
                                    step={form.ruleType === "percentage" ? 0.1 : 1}
                                    value={form.ruleValue}
                                    onChange={(e) => setForm({ ...form, ruleValue: e.target.value })}
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                    required
                                />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="text-xs font-semibold text-gray-400">Eligible amount basis<select value={form.eligibleAmountBasis} onChange={(e) => setForm({ ...form, eligibleAmountBasis: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#111] px-3 py-2.5 text-sm text-white"><option value="final_invoice">Final invoice total</option><option value="ex_showroom">Ex-showroom price</option></select></label>
                                <label className="text-xs font-semibold text-gray-400">Payout delay (days)<input type="number" min="0" value={form.payoutDelayDays} onChange={(e) => setForm({ ...form, payoutDelayDays: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white" /></label>
                                <label className="text-xs font-semibold text-gray-400">Effective from<input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} required className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white" /></label>
                                <label className="text-xs font-semibold text-gray-400">Effective to (optional)<input type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white" /></label>
                                {[["Minimum eligible amount (₹)", "minEligibleAmount"], ["Maximum eligible amount (₹, 0 = no cap)", "maxEligibleAmount"], ["Maximum commission (₹, 0 = no cap)", "maxCommissionAmount"]].map(([label, field]) => <label key={field} className="text-xs font-semibold text-gray-400">{label}<input type="number" min="0" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white" /></label>)}
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs text-gray-300">{[["Includes taxes", "includesTaxes"], ["Includes accessories", "includesAccessories"], ["Includes registration", "includesRegistration"]].map(([label, field]) => <label key={field} className="inline-flex items-center gap-2"><input type="checkbox" checked={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.checked })} className="accent-orange-500" />{label}</label>)}</div>
                            <div>
                                <label className="mb-2 block text-xs font-semibold text-gray-400">Notes (optional)</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    rows={2}
                                    placeholder="Internal notes about this rule..."
                                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                />
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                    className="h-4 w-4 accent-orange-500 rounded"
                                />
                                Rule is active
                            </label>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setEditing(null)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/5">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-60">
                                    {saving ? "Saving..." : "Save Rule"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── SALES & APPROVALS ────────────────────────────────────────────────────────

const ReferralsTab = () => {
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const query = new URLSearchParams({ page, limit: 20, ...(search ? { search } : {}), ...(status ? { status } : {}) });
            const data = await apiReq(`/admin/commissions/referrals?${query}`);
            setRows(data.referrals || []);
            setPages(data.pages || 1);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, [page, search, status]);

    const toggleDispute = async (row) => {
        const disputed = !row.disputed;
        if (!window.confirm(disputed ? "Flag this referral for dispute review?" : "Resolve this referral dispute?")) return;
        const reason = disputed ? window.prompt("Reason for the dispute:") : "";
        if (disputed && !reason?.trim()) return;
        try {
            await apiReq(`/admin/commissions/referrals/${row._id}/dispute`, { method: "PATCH", body: JSON.stringify({ disputed, reason }) });
            await load();
        } catch (err) { setError(err.message); }
    };

    useEffect(() => { load(); }, [load]);
    return <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search referral, customer or phone" className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-[#0c0c0c] px-4 py-2.5 text-sm text-white" />
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-[#0c0c0c] px-4 py-2.5 text-sm text-white"><option value="">All statuses</option>{["new", "contacted", "visit_scheduled", "negotiation", "converted", "rejected", "expired"].map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select>
        </div>
        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
        {loading ? <div className="py-12 text-center text-sm text-zinc-500">Loading referrals…</div> : rows.length === 0 ? <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] py-12 text-center text-sm text-zinc-500">No referrals match these filters.</div> : <div className="space-y-2">{rows.map((row) => <article key={row._id} className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-orange-400">{row.referralCode}</p><h3 className="mt-1 font-bold text-white">{row.motorcycle?.brand} {row.motorcycle?.name}</h3><p className="mt-1 text-xs text-zinc-400">{row.dealership?.name} · {row.dealership?.city || ""}</p></div><span className={statusBadge(row.status)}>{row.status?.replaceAll("_", " ")}</span></div>
            <div className="mt-3 grid gap-1 text-xs text-zinc-500 sm:grid-cols-2"><span>Created {new Date(row.createdAt).toLocaleDateString()}</span><span>Expires {new Date(row.expiresAt).toLocaleDateString()}</span><span>Source: {row.source?.replaceAll("_", " ")}</span><span>{row.consentToShare ? `${row.contact?.name || row.customer?.name || "Customer"} · ${row.contact?.phone || row.customer?.phone || "No phone"}` : "Customer contact sharing not consented"}</span></div>
            {row.disputed && <p className="mt-2 text-xs text-red-400">Dispute: {row.disputeReason}</p>}
            <button onClick={() => toggleDispute(row)} className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5">{row.disputed ? "Resolve dispute" : "Flag dispute"}</button>
        </article>)}</div>}
        <div className="flex items-center justify-between text-xs text-zinc-500"><span>Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
    </div>;
};

const SalesTab = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [filters, setFilters] = useState({ verified: "", commissionStatus: "" });
    const [actionLoading, setActionLoading] = useState(null);
    const [actionMsg, setActionMsg] = useState({});
    const [payoutModal, setPayoutModal] = useState(null);
    const [payoutForm, setPayoutForm] = useState({ paymentReference: "", paymentNotes: "" });
    const [payoutSaving, setPayoutSaving] = useState(false);
    const [payoutErr, setPayoutErr] = useState("");
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectSaving, setRejectSaving] = useState(false);
    const [rejectErr, setRejectErr] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const qs = new URLSearchParams({ page, limit: 15, ...filters });
            const res = await apiReq(`/admin/commissions/sales?${qs}`);
            setSales(res.sales || []);
            setPages(res.pages || 1);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (saleId) => {
        if (!window.confirm("Approve this verified referral sale and calculate MOTOAI's commission from the active policy?")) return;
        setActionLoading(saleId + "_approve");
        setActionMsg({});
        try {
            await apiReq(`/admin/commissions/sales/${saleId}/approve`, { method: "POST" });
            setActionMsg({ [saleId]: { type: "success", text: "Commission approved and calculated!" } });
            await load();
        } catch (e) {
            setActionMsg({ [saleId]: { type: "error", text: e.message } });
        } finally {
            setActionLoading(null);
        }
    };

    const handlePayout = async (e) => {
        e.preventDefault();
        setPayoutSaving(true);
        setPayoutErr("");
        try {
            await apiReq(`/admin/commissions/${payoutModal._id}/payout`, {
                method: "POST",
                body: JSON.stringify(payoutForm),
            });
            setPayoutModal(null);
            await load();
        } catch (e) {
            setPayoutErr(e.message);
        } finally {
            setPayoutSaving(false);
        }
    };

    const handleReject = async (e) => {
        e.preventDefault();
        setRejectSaving(true);
        setRejectErr("");
        try {
            await apiReq(`/admin/commissions/sales/${rejectModal._id}/reject`, {
                method: "POST",
                body: JSON.stringify({ reason: rejectReason }),
            });
            setRejectModal(null);
            await load();
        } catch (e) {
            setRejectErr(e.message);
        } finally {
            setRejectSaving(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
                <select
                    value={filters.verified}
                    onChange={(e) => { setFilters({ ...filters, verified: e.target.value }); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                >
                    <option value="">All sales</option>
                    <option value="true">Verified only</option>
                    <option value="false">Unverified only</option>
                </select>
                <select
                    value={filters.commissionStatus}
                    onChange={(e) => { setFilters({ ...filters, commissionStatus: e.target.value }); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                >
                    <option value="">All commission statuses</option>
                    <option value="none">No commission yet</option>
                    <option value="approved">Approved (pending payout)</option>
                    <option value="paid">Paid</option>
                    <option value="rejected">Rejected</option>
                </select>
                <button onClick={load} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
                    <RefreshCw size={15} /> Refresh
                </button>
            </div>

            {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                </div>
            ) : sales.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">No sales found.</p>
            ) : (
                <div className="space-y-3">
                    {sales.map((sale) => {
                        const msg = actionMsg[sale._id];
                        const commission = sale.commission;
                        return (
                            <div key={sale._id} className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-mono text-xs text-zinc-500">{sale.invoiceNo}</p>
                                        <p className="mt-1 font-bold">{sale.motorcycleName || "—"}</p>
                                        <p className="mt-0.5 text-xs text-zinc-400">{sale.customerName} • {sale.dealership?.name}, {sale.dealership?.city}</p>
                                        <p className="mt-1 text-sm font-semibold text-orange-400">{fmt(sale.amount)}</p>
                                        <p className="mt-1 text-xs text-zinc-500">Invoice basis: {sale.saleAmountMeaning?.replaceAll("_", " ") || "not specified"}{sale.saleDate ? ` · Sale date ${new Date(sale.saleDate).toLocaleDateString("en-IN")}` : ""}</p>
                                        {sale.evidenceUrl && /^https?:\/\//i.test(sale.evidenceUrl) && <a href={sale.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-orange-400 underline">Review invoice evidence</a>}
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${sale.verified ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}`}>
                                            {sale.verified ? "Verified" : "Unverified"}
                                        </span>
                                        {commission && (
                                            <span className={statusBadge(commission.status)}>
                                                Commission: {commission.status}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {commission && (
                                    <div className="mt-3 rounded-xl bg-white/[0.03] px-4 py-3 text-xs">
                                        <span className="text-gray-500">Commission amount: </span>
                                        <span className="font-bold text-orange-400">{fmt(commission.commissionAmount)}</span>
                                        <span className="ml-3 text-gray-500">
                                            ({commission.ruleType === "percentage" ? `${commission.ruleValue}% of ${fmt(commission.saleAmount)}` : `Fixed ${fmt(commission.ruleValue)}`})
                                        </span>
                                        {commission.status === "paid" && commission.paymentReference && (
                                            <span className="ml-3 text-emerald-400">• Ref: {commission.paymentReference}</span>
                                        )}
                                        {commission.status === "rejected" && commission.rejectionReason && (
                                            <span className="ml-3 text-red-400">• Reason: {commission.rejectionReason}</span>
                                        )}
                                    </div>
                                )}

                                {msg && (
                                    <div className={`mt-2 rounded-xl px-3 py-2 text-xs font-semibold ${msg.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                        {msg.text}
                                    </div>
                                )}

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {sale.verified && !commission && (
                                        <button
                                            disabled={actionLoading === sale._id + "_approve"}
                                            onClick={() => handleApprove(sale._id)}
                                            className="flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400 transition hover:bg-orange-500 hover:text-black disabled:opacity-50"
                                        >
                                            <BadgeCheck size={13} />
                                            {actionLoading === sale._id + "_approve" ? "Approving..." : "Approve Commission"}
                                        </button>
                                    )}
                                    {["approved", "payable"].includes(commission?.status) && (
                                        <>
                                            <button
                                                onClick={() => { setPayoutModal(commission); setPayoutForm({ paymentReference: "", paymentNotes: "", method: "bank_transfer", paidAt: new Date().toISOString().slice(0, 10) }); setPayoutErr(""); }}
                                                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500 hover:text-black"
                                            >
                                                <Banknote size={13} /> Record Payout
                                            </button>
                                            <button
                                                onClick={() => { setRejectModal(sale); setRejectReason(""); setRejectErr(""); }}
                                                className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500 hover:text-white"
                                            >
                                                <XCircle size={13} /> Reject
                                            </button>
                                        </>
                                    )}
                                    {commission?.status === "rejected" && sale.verified && (
                                        <button
                                            disabled={actionLoading === sale._id + "_approve"}
                                            onClick={() => handleApprove(sale._id)}
                                            className="flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400 transition hover:bg-orange-500 hover:text-black disabled:opacity-50"
                                        >
                                            <BadgeCheck size={13} /> Re-approve
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/10 p-2 disabled:opacity-30 hover:bg-white/5">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-gray-400">Page {page} of {pages}</span>
                    <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/10 p-2 disabled:opacity-30 hover:bg-white/5">
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* Payout Modal */}
            {payoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d0d0d] p-6">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Record Payout</p>
                                <h3 className="mt-1 text-lg font-black">Commission: {fmt(payoutModal.commissionAmount)}</h3>
                            </div>
                            <button onClick={() => setPayoutModal(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10">
                                <XCircle size={20} />
                            </button>
                        </div>
                        {payoutErr && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{payoutErr}</div>}
                        <form onSubmit={handlePayout} className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block text-xs font-semibold text-gray-400">Payout date *<input type="date" value={payoutForm.paidAt || ""} onChange={(e) => setPayoutForm({ ...payoutForm, paidAt: e.target.value })} required className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white" /></label>
                                <label className="block text-xs font-semibold text-gray-400">Method<select value={payoutForm.method || "bank_transfer"} onChange={(e) => setPayoutForm({ ...payoutForm, method: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white">{["bank_transfer", "upi", "cash", "cheque", "adjustment"].map((method) => <option key={method} value={method}>{method.replaceAll("_", " ")}</option>)}</select></label>
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-semibold text-gray-400">Payment Reference *</label>
                                <input
                                    value={payoutForm.paymentReference}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, paymentReference: e.target.value })}
                                    placeholder="UTR number, transaction ID, cheque no..."
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-semibold text-gray-400">Payment Notes (optional)</label>
                                <textarea
                                    value={payoutForm.paymentNotes}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, paymentNotes: e.target.value })}
                                    rows={2}
                                    placeholder="Additional notes..."
                                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setPayoutModal(null)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5">
                                    Cancel
                                </button>
                                <button type="submit" disabled={payoutSaving} className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-60">
                                    {payoutSaving ? "Recording..." : "Mark as Paid"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d0d0d] p-6">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-red-400">Reject Commission</p>
                                <h3 className="mt-1 text-lg font-black">{rejectModal.invoiceNo}</h3>
                            </div>
                            <button onClick={() => setRejectModal(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10">
                                <XCircle size={20} />
                            </button>
                        </div>
                        {rejectErr && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{rejectErr}</div>}
                        <form onSubmit={handleReject} className="space-y-4">
                            <div>
                                <label className="mb-2 block text-xs font-semibold text-gray-400">Rejection Reason *</label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    rows={3}
                                    placeholder="Explain why this commission is being rejected..."
                                    required
                                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setRejectModal(null)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5">
                                    Cancel
                                </button>
                                <button type="submit" disabled={rejectSaving} className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-60">
                                    {rejectSaving ? "Rejecting..." : "Reject Commission"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── COMMISSIONS & PAYOUTS ────────────────────────────────────────────────────

const PayoutsTab = () => {
    const [commissions, setCommissions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [auditView, setAuditView] = useState(null);

    const handleExport = async () => {
        try {
            const response = await fetch(`${API}/admin/commissions/report.csv`, { headers: { Authorization: `Bearer ${getToken() || ""}` } });
            if (!response.ok) throw new Error("Could not export the report.");
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "motoai-commission-report.csv";
            anchor.click();
            URL.revokeObjectURL(url);
        } catch (err) { setError(err.message); }
    };

    const handleReverse = async (commission) => {
        if (!window.confirm(`Reverse the paid commission for invoice ${commission.sale?.invoiceNo || "this sale"}?`)) return;
        const reason = window.prompt("Reason for reversing this commission:");
        if (!reason?.trim()) return;
        try {
            await apiReq(`/admin/commissions/${commission._id}/reverse`, { method: "POST", body: JSON.stringify({ reason }) });
            await load();
        } catch (err) { setError(err.message); }
    };

    const openAudit = async (commission) => {
        try {
            const data = await apiReq(`/admin/commissions/${commission._id}/audit`);
            setAuditView({ commission, ...data });
        } catch (err) { setError(err.message); }
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const qs = new URLSearchParams({ page, limit: 20, ...(statusFilter ? { status: statusFilter } : {}) });
            const res = await apiReq(`/admin/commissions?${qs}`);
            setCommissions(res.commissions || []);
            setSummary(res.summary || null);
            setPages(res.pages || 1);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="space-y-5">
            {summary && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { label: "Pending Payout", value: summary.totalApproved, color: "text-orange-400" },
                        { label: "Paid", value: summary.totalPaid, color: "text-emerald-400" },
                        { label: "Pending Amount", value: fmt(summary.pendingAmount), color: "text-orange-400" },
                        { label: "Total Paid", value: fmt(summary.paidAmount), color: "text-emerald-400" },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
                            <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
                            <p className={`mt-2 text-xl font-black ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                >
                    <option value="">All statuses</option>
                    <option value="approved">Approved (Pending Payout)</option>
                    <option value="payable">Payable</option>
                    <option value="paid">Paid</option>
                    <option value="rejected">Rejected</option>
                    <option value="disputed">Disputed</option>
                    <option value="reversed">Reversed</option>
                </select>
                <button onClick={handleExport} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">Export CSV</button>
                <button onClick={load} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
                    <RefreshCw size={15} /> Refresh
                </button>
            </div>

            {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                </div>
            ) : commissions.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-10 text-center">
                    <Banknote size={36} className="mx-auto mb-3 text-gray-600" />
                    <p className="text-sm text-zinc-500">No commissions found. Approve a verified sale to create a commission record.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c]">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-500">
                                    <th className="px-6 py-4">Dealership</th>
                                    <th className="px-6 py-4">Invoice</th>
                                    <th className="px-6 py-4">Sale Amount</th>
                                    <th className="px-6 py-4">Rule</th>
                                    <th className="px-6 py-4">Commission</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Payment Ref</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {commissions.map((c) => (
                                    <tr key={c._id} className="border-b border-white/5 hover:bg-white/[0.025]">
                                        <td className="px-6 py-3">
                                            <p className="text-sm font-semibold">{c.dealership?.name || "—"}</p>
                                            <p className="text-xs text-gray-500">{c.dealership?.city}</p>
                                        </td>
                                        <td className="px-6 py-3 font-mono text-xs text-gray-400">{c.sale?.invoiceNo || "—"}</td>
                                        <td className="px-6 py-3 text-sm font-semibold">{fmt(c.saleAmount)}</td>
                                        <td className="px-6 py-3 text-xs text-gray-400">
                                            {c.ruleType === "percentage" ? `${c.ruleValue}%` : `Fixed ${fmt(c.ruleValue)}`}
                                        </td>
                                        <td className="px-6 py-3 text-sm font-bold text-orange-400">{fmt(c.commissionAmount)}</td>
                                        <td className="px-6 py-3">
                                            <span className={statusBadge(c.status)}>{c.status}</span>
                                        </td>
                                        <td className="px-6 py-3 text-xs text-gray-400">{c.paymentReference || "—"}</td>
                                        <td className="px-6 py-3 text-xs text-gray-500">
                                            {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                        </td>
                                        <td className="px-6 py-3"><div className="flex gap-2"><button onClick={() => openAudit(c)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5">History</button>{c.status === "paid" && <button onClick={() => handleReverse(c)} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10">Reverse</button>}</div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/10 p-2 disabled:opacity-30 hover:bg-white/5">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-gray-400">Page {page} of {pages}</span>
                    <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/10 p-2 disabled:opacity-30 hover:bg-white/5">
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {auditView && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Commission audit history">
                <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
                    <div className="flex items-center justify-between"><div><p className="text-xs text-orange-400">Commission audit history</p><h3 className="mt-1 font-bold text-white">Invoice {auditView.commission.sale?.invoiceNo || "—"}</h3></div><button onClick={() => setAuditView(null)} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300">Close</button></div>
                    <h4 className="mt-5 text-sm font-semibold text-zinc-200">Commission actions</h4>
                    <div className="mt-2 space-y-2">{auditView.entries?.length ? auditView.entries.map((entry) => <div key={entry._id} className="rounded-xl border border-white/10 p-3 text-xs"><p className="font-semibold text-white">{entry.action} · {entry.actor?.name || "Admin"}</p><p className="mt-1 text-zinc-400">{entry.details}</p><p className="mt-1 text-zinc-600">{new Date(entry.createdAt).toLocaleString()}</p></div>) : <p className="text-xs text-zinc-500">No action entries recorded.</p>}</div>
                    <h4 className="mt-5 text-sm font-semibold text-zinc-200">Payout ledger</h4>
                    <div className="mt-2 space-y-2">{auditView.payouts?.length ? auditView.payouts.map((entry) => <div key={entry._id} className="rounded-xl border border-white/10 p-3 text-xs"><p className="font-semibold text-white">{entry.isReversal ? "Reversal" : "Payout"} · {fmt(entry.amount)} · {entry.reference}</p><p className="mt-1 text-zinc-400">{entry.method} · {entry.recordedBy?.name || "Admin"} · {new Date(entry.paidAt).toLocaleString()}</p><p className="mt-1 text-zinc-500">{entry.notes || "—"}</p></div>) : <p className="text-xs text-zinc-500">No payout records.</p>}</div>
                </div>
            </div>}
        </div>
    );
};

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

const AdminCommissionSection = () => {
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                            activeTab === id
                                ? "border border-orange-500/20 bg-orange-500/10 text-orange-500"
                                : "border border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                        }`}
                    >
                        <Icon size={16} />
                        {label}
                    </button>
                ))}
            </div>

            {activeTab === "overview" && <OverviewTab />}
            {activeTab === "rules" && <RulesTab />}
            {activeTab === "referrals" && <ReferralsTab />}
            {activeTab === "sales" && <SalesTab />}
            {activeTab === "payouts" && <PayoutsTab />}
        </div>
    );
};

export default AdminCommissionSection;
