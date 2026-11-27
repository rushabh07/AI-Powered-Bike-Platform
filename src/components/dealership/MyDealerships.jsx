import { useCallback, useEffect, useState } from "react";
import { Store, MapPin, Phone, Clock, Pencil, Save, Users, UserPlus, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import {
    getPanelDealerships,
    updatePanelDealership,
    addDealershipStaff,
    removeDealershipStaff,
} from "../../services/dealershipApi";

const MyDealerships = ({ currentUser }) => {
    const [dealerships, setDealerships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [staffForms, setStaffForms] = useState({});
    const [staffBusy, setStaffBusy] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getPanelDealerships();
            setDealerships(data.dealerships || []);
        } catch (err) {
            if (err?.status !== 401) setError(err.message || "Could not load your dealerships.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;
        getPanelDealerships()
            .then((data) => {
                if (active) setDealerships(data.dealerships || []);
            })
            .catch((err) => {
                if (active && err?.status !== 401) setError(err.message || "Could not load your dealerships.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, []);

    const userId = String(currentUser?._id || currentUser?.id || "");
    const isAdmin = currentUser?.role === "admin";

    const canManage = (d) => {
        if (isAdmin) return true;
        if (d.owner && String(d.owner._id || d.owner) === userId) return true;
        return (d.staff || []).some(
            (s) => String(s.user?._id || s.user) === userId && s.role === "manager"
        );
    };

    const accessLabel = (d) => {
        if (isAdmin) return "Admin";
        if (d.owner && String(d.owner._id || d.owner) === userId) return "Owner";
        const entry = (d.staff || []).find((s) => String(s.user?._id || s.user) === userId);
        return entry?.role === "manager" ? "Manager" : "Staff";
    };

    const startEdit = (d) => {
        setEditingId(d._id);
        setError("");
        setNotice("");
        setForm({
            name: d.name || "",
            city: d.city || "",
            address: d.address || "",
            phone: d.phone || "",
            email: d.email || "",
            openingHours: d.openingHours || "",
            brands: (d.brands || []).join(", "),
            googleMapsUrl: d.googleMapsUrl || "",
            timeSlots: (d.timeSlots || []).join(", "),
            stockStatus: d.stockStatus || "unknown",
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name?.trim() || !form.city?.trim() || !form.address?.trim() || !form.phone?.trim()) {
            setError("Name, city, address, and phone are required.");
            return;
        }
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const payload = {
                name: form.name.trim(),
                city: form.city.trim(),
                address: form.address.trim(),
                phone: form.phone.trim(),
                email: form.email.trim().toLowerCase(),
                openingHours: form.openingHours.trim(),
                brands: form.brands.split(",").map((b) => b.trim()).filter(Boolean),
                googleMapsUrl: form.googleMapsUrl.trim(),
                timeSlots: form.timeSlots.split(",").map((s) => s.trim()).filter(Boolean),
                stockStatus: form.stockStatus,
            };
            const data = await updatePanelDealership(editingId, payload);
            setDealerships((prev) => prev.map((item) => (item._id === editingId ? data.dealership : item)));
            setEditingId(null);
            setNotice("Dealership details updated.");
        } catch (err) {
            setError(err.message || "Could not update dealership.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddStaff = async (dealershipId) => {
        const entry = staffForms[dealershipId] || { email: "", role: "sales" };
        if (!entry.email?.trim()) {
            setError("Enter a staff member's email address.");
            return;
        }
        setStaffBusy(dealershipId);
        setError("");
        setNotice("");
        try {
            const data = await addDealershipStaff(dealershipId, {
                email: entry.email.trim(),
                role: entry.role || "sales",
            });
            setDealerships((prev) =>
                prev.map((d) => (d._id === dealershipId ? { ...d, staff: data.staff || [] } : d))
            );
            setStaffForms((prev) => ({ ...prev, [dealershipId]: { email: "", role: "sales" } }));
            setNotice("Staff member added.");
        } catch (err) {
            setError(err.message || "Could not add staff member.");
        } finally {
            setStaffBusy("");
        }
    };

    const handleRemoveStaff = async (dealershipId, memberId) => {
        setStaffBusy(`${dealershipId}:${memberId}`);
        setError("");
        setNotice("");
        try {
            const data = await removeDealershipStaff(dealershipId, memberId);
            setDealerships((prev) =>
                prev.map((d) => (d._id === dealershipId ? { ...d, staff: data.staff || [] } : d))
            );
            setNotice("Staff member removed.");
        } catch (err) {
            setError(err.message || "Could not remove staff member.");
        } finally {
            setStaffBusy("");
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="h-44 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-500">
                    {dealerships.length} authorized dealership{dealerships.length === 1 ? "" : "s"}
                </p>
                <button
                    type="button"
                    onClick={load}
                    className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:text-white"
                >
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {error && (
                <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <AlertCircle size={15} /> {error}
                </div>
            )}
            {notice && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                    <CheckCircle2 size={15} /> {notice}
                </div>
            )}

            {dealerships.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-10 text-center">
                    <Store size={36} className="mx-auto text-zinc-600" />
                    <h3 className="mt-4 text-lg font-bold text-white">No Dealership Assigned</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                        Your provider account is not currently assigned to any dealership. Ask an administrator to assign your dealership in the Admin Panel.
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    {dealerships.map((d) => {
                        const manageable = canManage(d);
                        const isEditing = editingId === d._id;
                        const staffInput = staffForms[d._id] || { email: "", role: "sales" };

                        return (
                            <div key={d._id} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg font-bold text-white">{d.name}</h3>
                                            <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-400">
                                                {accessLabel(d)}
                                            </span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${d.isActive ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border border-zinc-700 bg-zinc-800 text-zinc-400"}`}>
                                                {d.isActive ? "Active" : "Inactive"}
                                            </span>
                                            {!d.approved && (
                                                <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                                                    Pending Approval
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-2.5 space-y-1 text-xs text-zinc-400">
                                            <p className="flex items-center gap-2"><MapPin size={13} className="text-orange-400 shrink-0" /> {d.city} • {d.address}</p>
                                            <p className="flex items-center gap-2"><Phone size={13} className="text-orange-400 shrink-0" /> {d.phone}{d.email ? ` • ${d.email}` : ""}</p>
                                            <p className="flex items-center gap-2"><Clock size={13} className="text-orange-400 shrink-0" /> {d.openingHours || "Hours not set"}</p>
                                        </div>
                                        {d.brands && d.brands.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {d.brands.map((brand) => (
                                                    <span key={brand} className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300">
                                                        {brand}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {manageable && !isEditing && (
                                        <button
                                            type="button"
                                            onClick={() => startEdit(d)}
                                            className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-orange-500/50 hover:text-orange-400"
                                        >
                                            <Pencil size={13} /> Edit Dealership
                                        </button>
                                    )}
                                </div>

                                {isEditing && (
                                    <form onSubmit={handleSave} className="mt-5 border-t border-zinc-800 pt-5">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <label className="block text-xs font-semibold text-zinc-400">
                                                Name *
                                                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                                            </label>
                                            <label className="block text-xs font-semibold text-zinc-400">
                                                City *
                                                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                                            </label>
                                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
                                                Address *
                                                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                                            </label>
                                            <label className="block text-xs font-semibold text-zinc-400">
                                                Phone *
                                                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                                            </label>
                                            <label className="block text-xs font-semibold text-zinc-400">
                                                Email
                                                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                                            </label>
                                            <label className="block text-xs font-semibold text-zinc-400">
                                                Opening Hours
                                                <input value={form.openingHours} onChange={(e) => setForm({ ...form, openingHours: e.target.value })} className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                                            </label>
                                            <label className="block text-xs font-semibold text-zinc-400">
                                                Stock Status
                                                <select value={form.stockStatus} onChange={(e) => setForm({ ...form, stockStatus: e.target.value })} className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500">
                                                    <option value="unknown">Unknown</option>
                                                    <option value="in_stock">In Stock</option>
                                                    <option value="limited">Limited</option>
                                                    <option value="out_of_stock">Out of Stock</option>
                                                </select>
                                            </label>
                                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
                                                Brands (comma separated)
                                                <input value={form.brands} onChange={(e) => setForm({ ...form, brands: e.target.value })} className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                                            </label>
                                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
                                                Time Slots (comma separated)
                                                <input value={form.timeSlots} onChange={(e) => setForm({ ...form, timeSlots: e.target.value })} className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                                            </label>
                                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
                                                Google Maps URL
                                                <input value={form.googleMapsUrl} onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })} className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500" />
                                            </label>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50">
                                                <Save size={15} /> {saving ? "Saving..." : "Save Changes"}
                                            </button>
                                            <button type="button" onClick={() => setEditingId(null)} className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800">
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* STAFF SECTION */}
                                <div className="mt-5 border-t border-zinc-800 pt-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        <Users size={13} className="text-orange-400" /> Dealership Staff ({(d.staff || []).length})
                                    </div>
                                    {(d.staff || []).length > 0 && (
                                        <div className="mt-2.5 flex flex-wrap gap-2">
                                            {d.staff.map((member) => {
                                                const memberObj = member.user || {};
                                                const memberId = String(memberObj._id || member.user);
                                                return (
                                                    <div key={memberId} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs">
                                                        <span className="font-semibold text-white">{memberObj.name || memberObj.email || memberId}</span>
                                                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">{member.role}</span>
                                                        {manageable && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveStaff(d._id, memberId)}
                                                                disabled={staffBusy === `${d._id}:${memberId}`}
                                                                aria-label={`Remove ${memberObj.name || "staff member"}`}
                                                                className="text-zinc-500 transition hover:text-red-400 disabled:opacity-50"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {manageable && (
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <input
                                                type="email"
                                                value={staffInput.email}
                                                onChange={(e) =>
                                                    setStaffForms((prev) => ({
                                                        ...prev,
                                                        [d._id]: { ...staffInput, email: e.target.value },
                                                    }))
                                                }
                                                placeholder="Add staff by user email"
                                                className="min-w-[220px] flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-white outline-none focus:border-orange-500"
                                            />
                                            <select
                                                value={staffInput.role}
                                                onChange={(e) =>
                                                    setStaffForms((prev) => ({
                                                        ...prev,
                                                        [d._id]: { ...staffInput, role: e.target.value },
                                                    }))
                                                }
                                                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                                            >
                                                <option value="sales">Sales</option>
                                                <option value="manager">Manager</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => handleAddStaff(d._id)}
                                                disabled={staffBusy === d._id}
                                                className="flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3.5 py-2 text-xs font-bold text-orange-400 transition hover:bg-orange-500/20 disabled:opacity-50"
                                            >
                                                <UserPlus size={13} /> Add Staff
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyDealerships;
