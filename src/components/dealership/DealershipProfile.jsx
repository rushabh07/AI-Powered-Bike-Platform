import React, { useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { getPanelDealerships, createPanelDealership, updatePanelDealership, addDealershipStaff, removeDealershipStaff } from "../../services/dealershipApi";

const emptyForm = { name: "", city: "", address: "", phone: "", email: "", openingHours: "Mon-Sat: 10:00 AM - 8:00 PM", brands: "", googleMapsUrl: "", timeSlots: "10:00 AM, 12:00 PM, 2:00 PM, 4:00 PM, 6:00 PM", stockStatus: "unknown", isActive: true };

const DealershipProfile = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [staffEmail, setStaffEmail] = useState({});
    const [imgUrl, setImgUrl] = useState({});

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getPanelDealerships();
            setItems(data.dealerships || []);
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const resetForm = () => {
        setForm(emptyForm);
        setEditing(null);
        setShowForm(false);
    };

    const openEdit = (d) => {
        setEditing(d);
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
            isActive: d.isActive !== false,
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.city.trim() || !form.address.trim() || !form.phone.trim()) {
            setError("Name, city, address and phone are required.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const payload = {
                ...form,
                brands: form.brands.split(",").map((b) => b.trim()).filter(Boolean),
                timeSlots: form.timeSlots.split(",").map((s) => s.trim()).filter(Boolean),
            };
            if (editing) await updatePanelDealership(editing._id, payload);
            else await createPanelDealership(payload);
            resetForm();
            await load();
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const addImage = async (d) => {
        const url = (imgUrl[d._id] || "").trim();
        if (!url) return;
        try {
            await updatePanelDealership(d._id, { showroomImages: [...(d.showroomImages || []), url] });
            setImgUrl((p) => ({ ...p, [d._id]: "" }));
            await load();
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        }
    };

    const removeImage = async (d, url) => {
        try {
            await updatePanelDealership(d._id, { showroomImages: (d.showroomImages || []).filter((u) => u !== url) });
            await load();
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        }
    };

    const handleAddStaff = async (d) => {
        const email = (staffEmail[d._id] || "").trim();
        if (!email) return;
        try {
            await addDealershipStaff(d._id, { email, role: "sales" });
            setStaffEmail((p) => ({ ...p, [d._id]: "" }));
            await load();
        } catch (err) {
            if (err?.status !== 401) alert(err.message || "Could not add staff.");
        }
    };

    if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-zinc-900" />;

    return (
        <div>
            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            <div className="mb-4 flex justify-end">
                <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-orange-400">
                    <Plus size={15} /> Add Dealership
                </button>
            </div>
            {showForm && (
                <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <h3 className="mb-4 font-bold text-white">{editing ? "Edit Dealership" : "New Dealership"}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs text-zinc-400">Name *<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400">City *<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400 sm:col-span-2">Address *<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400">Phone *<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400">Email (booking alerts)<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="showroom@example.com" className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400">Opening Hours<input value={form.openingHours} onChange={(e) => setForm({ ...form, openingHours: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400">Brands (comma separated)<input value={form.brands} onChange={(e) => setForm({ ...form, brands: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400">Google Maps URL<input value={form.googleMapsUrl} onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400 sm:col-span-2">Time Slots (comma separated)<input value={form.timeSlots} onChange={(e) => setForm({ ...form, timeSlots: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none" /></label>
                        <label className="block text-xs text-zinc-400">Stock Status<select value={form.stockStatus} onChange={(e) => setForm({ ...form, stockStatus: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none">{["unknown", "in_stock", "limited", "out_of_stock"].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
                    </div>
                    <div className="mt-4 flex gap-3">
                        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-orange-400 disabled:opacity-50"><Save size={15} />{saving ? "Saving..." : "Save"}</button>
                        <button onClick={resetForm} className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300">Cancel</button>
                    </div>
                </div>
            )}
            {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">No dealerships yet. Create your first showroom above.</p>
            ) : (
                <div className="space-y-3">
                    {items.map((d) => (
                        <div key={d._id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="font-bold text-white">{d.name}</p>
                                    <p className="mt-1 text-xs text-zinc-500">{d.city} • {d.address}</p>
                                    <p className="mt-1 text-xs text-zinc-500">{d.phone} • {d.openingHours}</p>
                                </div>
                                <button onClick={() => openEdit(d)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-orange-500/40 hover:text-orange-400">Edit</button>
                            </div>
                            {(d.showroomImages?.length > 0) && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {d.showroomImages.map((u) => (
                                        <div key={u} className="relative">
                                            <img src={u} alt="showroom" className="h-16 w-24 rounded-lg object-cover" />
                                            <button onClick={() => removeImage(d, u)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-red-400"><Trash2 size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-3 flex gap-2">
                                <input value={imgUrl[d._id] || ""} onChange={(e) => setImgUrl((p) => ({ ...p, [d._id]: e.target.value }))} placeholder="Showroom image URL" className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none" />
                                <button onClick={() => addImage(d)} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-orange-400">Add</button>
                            </div>
                            <div className="mt-3 border-t border-zinc-800 pt-3">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Staff ({d.staff?.length || 0})</p>
                                {(d.staff || []).map((s) => (
                                    <div key={s.user?._id || s.user} className="flex items-center justify-between py-1 text-xs">
                                        <span className="text-zinc-300">{s.user?.name || s.user} <span className="text-zinc-500">({s.role})</span></span>
                                        <button onClick={async () => { if (window.confirm("Remove staff?")) { await removeDealershipStaff(d._id, s.user?._id || s.user); load(); } }} className="text-zinc-500 hover:text-red-400"><Trash2 size={13} /></button>
                                    </div>
                                ))}
                                <div className="mt-2 flex gap-2">
                                    <input value={staffEmail[d._id] || ""} onChange={(e) => setStaffEmail((p) => ({ ...p, [d._id]: e.target.value }))} placeholder="Staff email" className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none" />
                                    <button onClick={() => handleAddStaff(d)} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-orange-400">Add</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DealershipProfile;
