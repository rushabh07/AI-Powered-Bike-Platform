import { useCallback, useEffect, useState } from "react";
import { Pencil, Save, Store, UserPlus, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { API_BASE } from "../../services/api";

const emptyForm = {
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    dealershipId: "",
};

const ProvidersSection = () => {
    const [providers, setProviders] = useState([]);
    const [dealerships, setDealerships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const authHeaders = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
    });

    const fetchInitial = useCallback(async () => {
        const [provRes, dealerRes] = await Promise.all([
            fetch(`${API_BASE}/admin/providers`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }),
            fetch(`${API_BASE}/dealerships/admin/all`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }),
        ]);
        const [provData, dealerData] = await Promise.all([provRes.json(), dealerRes.json()]);
        if (!provRes.ok || !provData.success) throw new Error(provData.message || "Failed to load providers.");
        if (!dealerRes.ok || !dealerData.success) throw new Error(dealerData.message || "Failed to load dealerships.");
        return { providers: provData.providers || [], dealerships: dealerData.dealerships || [] };
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchInitial();
            setProviders(data.providers);
            setDealerships(data.dealerships);
        } catch (err) {
            setError(err.message || "Unable to load providers.");
        } finally {
            setLoading(false);
        }
    }, [fetchInitial]);

    useEffect(() => {
        let active = true;
        fetchInitial()
            .then((data) => {
                if (!active) return;
                setProviders(data.providers);
                setDealerships(data.dealerships);
            })
            .catch((err) => {
                if (active) setError(err.message || "Unable to load providers.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [fetchInitial]);

    const resetForm = () => {
        setForm(emptyForm);
        setEditing(null);
        setShowForm(false);
    };

    const openAdd = () => {
        setEditing(null);
        setForm(emptyForm);
        setError("");
        setNotice("");
        setShowForm(true);
    };

    const openEdit = (p) => {
        setEditing(p);
        setForm({
            name: p.name || "",
            email: p.email || "",
            phone: p.phone || "",
            address: p.address || "",
            password: "",
            dealershipId: p.dealership?._id || "",
        });
        setError("");
        setNotice("");
        setShowForm(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.phone.trim() || (!editing && (!form.email.trim() || !form.password))) {
            setError("Name, email, phone, and password (for new providers) are required.");
            return;
        }
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const payload = editing
                ? {
                      name: form.name.trim(),
                      phone: form.phone.trim(),
                      address: form.address.trim(),
                      ...(form.password.trim() ? { password: form.password } : {}),
                      dealershipId: form.dealershipId || null,
                  }
                : {
                      name: form.name.trim(),
                      email: form.email.trim(),
                      phone: form.phone.trim(),
                      address: form.address.trim(),
                      password: form.password,
                      dealershipId: form.dealershipId || null,
                  };

            const res = await fetch(
                editing ? `${API_BASE}/admin/providers/${editing._id}` : `${API_BASE}/admin/providers`,
                {
                    method: editing ? "PUT" : "POST",
                    headers: authHeaders(),
                    body: JSON.stringify(payload),
                }
            );
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Failed to save provider.");
            setNotice(editing ? "Provider updated." : "Provider created.");
            resetForm();
            await load();
        } catch (err) {
            setError(err.message || "Could not save provider.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-zinc-500">
                    {providers.length} provider{providers.length === 1 ? "" : "s"}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={load}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
                    >
                        <RefreshCw size={15} /> Refresh
                    </button>
                    <button
                        type="button"
                        onClick={openAdd}
                        className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400"
                    >
                        <UserPlus size={15} /> Add Provider
                    </button>
                </div>
            </div>

            {error && (
                <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <AlertCircle size={15} /> {error}
                </div>
            )}
            {notice && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                    <CheckCircle2 size={15} /> {notice}
                </div>
            )}

            {showForm && (
                <form onSubmit={handleSave} className="mb-6 rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                    <h3 className="mb-4 text-lg font-bold">{editing ? "Edit Provider" : "Add Provider"}</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-xs font-semibold text-zinc-400">
                            Full Name *
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Provider full name"
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400">
                            Email *
                            <input
                                type="email"
                                value={form.email}
                                disabled={!!editing}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="provider@example.com"
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400">
                            Phone *
                            <input
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="+91 98765 43210"
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400">
                            {editing ? "New Password (leave blank to keep current)" : "Password *"}
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                placeholder={editing ? "Optional" : "Minimum 6 characters"}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
                            Assigned Dealership
                            <select
                                value={form.dealershipId}
                                onChange={(e) => setForm({ ...form, dealershipId: e.target.value })}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            >
                                <option value="">— No assigned dealership (Unassigned) —</option>
                                {dealerships.map((d) => (
                                    <option key={d._id} value={d._id}>
                                        {d.name} ({d.city})
                                        {d.owner && (!editing || String(d.owner._id || d.owner) !== String(editing._id))
                                            ? ` — Currently owned by ${d.owner.name || d.owner.email}`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
                            Address
                            <input
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                placeholder="Optional address"
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                        >
                            <Save size={15} /> {saving ? "Saving..." : "Save Provider"}
                        </button>
                        <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                </div>
            ) : providers.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] py-12 text-center">
                    <p className="text-sm text-zinc-500">No provider accounts yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {providers.map((p) => {
                        const owned = p.ownedDealerships || [];
                        const staffOf = p.staffDealerships || [];
                        const isUnassigned = owned.length === 0 && staffOf.length === 0;
                        return (
                            <div key={p._id} className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-white">{p.name}</p>
                                        <p className="mt-1 text-xs text-zinc-400">{p.email} • {p.phone || "No phone"}</p>
                                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                            {owned.map((d) => (
                                                <span
                                                    key={d._id}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400"
                                                >
                                                    <Store size={12} /> {d.name} ({d.city}) • Owner
                                                </span>
                                            ))}
                                            {staffOf.map((d) => (
                                                <span
                                                    key={d._id}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300"
                                                >
                                                    <Store size={12} /> {d.name} ({d.city}) • Staff
                                                </span>
                                            ))}
                                            {isUnassigned && (
                                                <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                                                    Unassigned (No dealership)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openEdit(p)}
                                        className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition hover:border-orange-500/40 hover:text-orange-400"
                                    >
                                        <Pencil size={13} /> Edit / Assign
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default ProvidersSection;
