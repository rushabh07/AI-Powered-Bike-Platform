import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bike,
    Search,
    Plus,
    Pencil,
    Trash2,
    X,
    Save,
    LayoutDashboard,
    Database,
    IndianRupee,
    Gauge,
    Star,
    ImagePlus,
    ChevronLeft,
    ChevronRight,
    Menu,
    RefreshCw,
    User,
    Mail,
    Phone,
    MapPin,
    LogOut,
    Users,
    ShieldCheck,
    Crown,
    TrendingUp,
    Coins,
    BarChart3,
    ArrowUpRight,
    Palette,
    Store,
    ClipboardList,
    Megaphone,
    Package,
} from "lucide-react";
import UserAvatar from "../components/UserAvatar";
import BrandLogo from "../components/BrandLogo";
import AISubscriptionsSection from "../components/admin/AISubscriptionsSection";
import AIAnalyticsSection from "../components/admin/AIAnalyticsSection";
import AdvertisementsSection from "../components/admin/AdvertisementsSection";
import BikeOrdersSection from "../components/admin/BikeOrdersSection";
import ReviewsManagementSection from "../components/admin/ReviewsManagementSection";
import { getAdminSubscriptionStats } from "../services/api";

const API_URL = "http://localhost:5000/api/motorcycles";
const ADMIN_API = "http://localhost:5000/api/admin";

const emptyForm = {
    name: "",
    brand: "",
    brandLogo: "",
    category: "",
    price: "",
    engine: "",
    power: "",
    torque: "",
    mileage: "",
    fuel: "Petrol",
    transmission: "Manual",
    weight: "",
    rating: "4.5",
    batteryCapacity: "",
    range: "",
    chargingTime: "",
    topSpeed: "",
    image: "",
    description: "",
    model3DUrl: "",
    images: []
};

const CATEGORY_OPTIONS = [
    "Street",
    "Sports",
    "Sport",
    "Cruiser",
    "Roadster",
    "Adventure",
    "Commuter",
    "Electric",
];

const EnquiriesSection = () => {
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [search, setSearch] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const qs = new URLSearchParams();
            if (statusFilter) qs.set("status", statusFilter);
            if (typeFilter) qs.set("enquiryType", typeFilter);
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/api/bike-enquiries/admin/all${qs.toString() ? `?${qs.toString()}` : ""}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Failed to load enquiries");
            setEnquiries(data.enquiries || []);
        } catch (err) {
            setError(err.message || "Unable to load enquiries.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [statusFilter, typeFilter]);

    const updateStatus = async (id, status) => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/api/bike-enquiries/admin/${id}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Failed to update");
            setEnquiries((prev) => prev.map((e) => (e._id === id ? data.enquiry : e)));
        } catch (err) {
            alert(err.message || "Failed to update enquiry.");
        }
    };

    const filtered = enquiries.filter((e) => {
        const q = search.toLowerCase();
        if (!q) return true;
        return (
            e.enquiryId?.toLowerCase().includes(q) ||
            e.user?.name?.toLowerCase().includes(q) ||
            e.motorcycle?.name?.toLowerCase().includes(q) ||
            e.dealership?.name?.toLowerCase().includes(q)
        );
    });

    const badge = (s) => {
        const base = "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider";
        switch (s) {
            case "confirmed":
            case "completed": return `${base} bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`;
            case "contacted":
            case "scheduled": return `${base} bg-blue-500/10 text-blue-400 border border-blue-500/20`;
            case "cancelled":
            case "rejected": return `${base} bg-zinc-500/10 text-zinc-500 border border-zinc-500/20`;
            default: return `${base} bg-yellow-500/10 text-yellow-400 border border-yellow-500/20`;
        }
    };

    return (
        <section>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-wrap gap-3">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50">
                        <option value="">All statuses</option>
                        {["pending","submitted","contacted","scheduled","confirmed","completed","cancelled","rejected"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50">
                        <option value="">All types</option>
                        <option value="test_ride">Test rides</option>
                        <option value="purchase">Purchases</option>
                    </select>
                </div>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search enquiries..." className="rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-orange-500/50" />
                </div>
            </div>
            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            {loading ? (
                <div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" /></div>
            ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">No enquiries found.</p>
            ) : (
                <div className="space-y-3">
                    {filtered.map((e) => (
                        <div key={e._id} className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-mono text-zinc-500">{e.enquiryId} • {e.enquiryType === "test_ride" ? "Test Ride" : "Purchase"}</p>
                                    <p className="font-bold mt-1">{e.motorcycle?.brand} {e.motorcycle?.name}{e.variantName ? ` • ${e.variantName}` : ""}</p>
                                    <p className="text-xs text-zinc-500 mt-1">{e.user?.name} ({e.contactPhone}) • {e.dealership?.name} • Visit {e.visitDate ? new Date(e.visitDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}{e.timeSlot ? ` • ${e.timeSlot}` : ""}{e.licenceConfirmed ? " • Licence ✓" : ""}</p>
                                </div>
                                <span className="flex flex-col items-end gap-1">
                                    <span className={badge(e.status)}>{e.status}</span>
                                    {e.emailStatus && e.emailStatus !== "unknown" && (
                                        <span title="Email notification status" className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${e.emailStatus === "sent" ? "bg-emerald-500/10 text-emerald-400" : e.emailStatus === "failed" ? "bg-red-500/10 text-red-400" : "bg-white/5 text-zinc-400"}`}>✉ {e.emailStatus}</span>
                                    )}
                                </span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {["contacted","scheduled","confirmed","completed","cancelled","rejected"].map((s) => (
                                    <button key={s} onClick={() => updateStatus(e._id, s)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-orange-500/40 hover:text-orange-400">{s}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

const MessagesSection = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [expanded, setExpanded] = useState(null);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/api/contact/admin/messages?page=${page}&limit=15`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Failed to load messages");
            setItems(data.messages || []);
            setPages(Math.ceil((data.total || 0) / 15) || 1);
        } catch (err) {
            setError(err.message || "Unable to load messages.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [page]);

    const filtered = items.filter((m) => {
        const q = search.toLowerCase();
        if (!q) return true;
        return (
            m.name?.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q) ||
            m.subject?.toLowerCase().includes(q) ||
            m.referenceNumber?.toLowerCase().includes(q)
        );
    });

    return (
        <section>
            <div className="mb-5 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, subject, reference..." className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-orange-500/50" />
            </div>
            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            {loading ? (
                <div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" /></div>
            ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">No messages yet.</p>
            ) : (
                <div className="space-y-3">
                    {filtered.map((m) => (
                        <div key={m._id} className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-bold text-sm">{m.name} <span className="font-mono text-[11px] text-zinc-500">{m.referenceNumber}</span></p>
                                    <p className="text-xs text-zinc-500 mt-0.5">{m.email}{m.phone ? ` • ${m.phone}` : ""} • {m.category}</p>
                                    <p className="text-sm text-white mt-1 font-semibold">{m.subject}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${m.emailStatus === "sent" ? "bg-emerald-500/10 text-emerald-400" : m.emailStatus === "failed" ? "bg-red-500/10 text-red-400" : "bg-white/5 text-zinc-400"}`}>{m.emailStatus}</span>
                            </div>
                            <p className={`mt-2 text-sm text-zinc-300 ${expanded === m._id ? "" : "line-clamp-2"}`}>{m.message}</p>
                            <button onClick={() => setExpanded(expanded === m._id ? null : m._id)} className="mt-1 text-xs font-bold text-orange-500 hover:text-orange-400">{expanded === m._id ? "Show less" : "Read more"}</button>
                            <p className="mt-1 text-[11px] text-zinc-600">{new Date(m.createdAt).toLocaleString("en-IN")}</p>
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                <span>Page {page} of {pages}</span>
                <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40">Prev</button>
                    <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40">Next</button>
                </div>
            </div>
        </section>
    );
};

const DealershipsSection = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", city: "", address: "", phone: "", openingHours: "Mon-Sat: 10:00 AM - 8:00 PM", brands: "", googleMapsUrl: "", timeSlots: "10:00 AM, 12:00 PM, 2:00 PM, 4:00 PM, 6:00 PM", stockStatus: "unknown", approved: true, isActive: true });
    const [saving, setSaving] = useState(false);

    const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` });

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("http://localhost:5000/api/dealerships/admin/all", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Failed to load dealerships");
            setItems(data.dealerships || []);
        } catch (err) {
            setError(err.message || "Unable to load dealerships.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const resetForm = () => { setForm({ name: "", city: "", address: "", phone: "", email: "", openingHours: "Mon-Sat: 10:00 AM - 8:00 PM", brands: "", googleMapsUrl: "", timeSlots: "10:00 AM, 12:00 PM, 2:00 PM, 4:00 PM, 6:00 PM", stockStatus: "unknown", approved: true, isActive: true }); setEditing(null); setShowForm(false); };
    const openEdit = (d) => { setEditing(d); setForm({ name: d.name || "", city: d.city || "", address: d.address || "", phone: d.phone || "", email: d.email || "", openingHours: d.openingHours || "", brands: (d.brands || []).join(", "), googleMapsUrl: d.googleMapsUrl || "", timeSlots: (d.timeSlots || []).join(", "), stockStatus: d.stockStatus || "unknown", approved: d.approved !== false, isActive: d.isActive !== false }); setShowForm(true); };

    const handleSave = async () => {
        if (!form.name.trim() || !form.city.trim() || !form.address.trim() || !form.phone.trim()) { setError("Name, city, address and phone are required."); return; }
        setSaving(true);
        setError("");
        try {
            const payload = {
                ...form,
                brands: form.brands.split(",").map((b) => b.trim()).filter(Boolean),
                timeSlots: form.timeSlots.split(",").map((s) => s.trim()).filter(Boolean),
            };
            const res = await fetch(editing ? `http://localhost:5000/api/dealerships/${editing._id}` : "http://localhost:5000/api/dealerships", {
                method: editing ? "PUT" : "POST",
                headers: authHeaders(),
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Failed to save dealership");
            resetForm();
            await load();
        } catch (err) {
            setError(err.message || "Failed to save dealership.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this dealership?")) return;
        try {
            const res = await fetch(`http://localhost:5000/api/dealerships/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete");
            await load();
        } catch (err) {
            setError(err.message || "Failed to delete dealership.");
        }
    };

    return (
        <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-zinc-500">{items.length} dealerships</p>
                <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400">
                    <Plus size={15} /> Add Dealership
                </button>
            </div>
            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            {showForm && (
                <div className="mb-5 rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                    <h3 className="font-bold mb-4">{editing ? "Edit Dealership" : "New Dealership"}</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-xs font-semibold text-zinc-400">Name *<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" /></label>
                        <label className="block text-xs font-semibold text-zinc-400">City *<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" /></label>
                        <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">Address *<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" /></label>
                        <label className="block text-xs font-semibold text-zinc-400">Phone *<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" /></label>
                        <label className="block text-xs font-semibold text-zinc-400">Email (booking alerts)<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="showroom@example.com" className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" /></label>
                        <label className="block text-xs font-semibold text-zinc-400">Opening Hours<input value={form.openingHours} onChange={(e) => setForm({ ...form, openingHours: e.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" /></label>
                        <label className="block text-xs font-semibold text-zinc-400">Brands (comma separated)<input value={form.brands} onChange={(e) => setForm({ ...form, brands: e.target.value })} placeholder="Royal Enfield, TVS" className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" /></label>
                        <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">Google Maps URL<input value={form.googleMapsUrl} onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })} placeholder="https://maps.google.com/..." className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" /></label>
                        <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">Time Slots (comma separated)<input value={form.timeSlots} onChange={(e) => setForm({ ...form, timeSlots: e.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" /></label>
                        <label className="block text-xs font-semibold text-zinc-400">Stock Status
                            <select value={form.stockStatus} onChange={(e) => setForm({ ...form, stockStatus: e.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50">
                                <option value="unknown">Unknown</option>
                                <option value="in_stock">In Stock</option>
                                <option value="limited">Limited</option>
                                <option value="out_of_stock">Out of Stock</option>
                            </select>
                        </label>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-zinc-400"><input type="checkbox" checked={form.approved} onChange={(e) => setForm({ ...form, approved: e.target.checked })} className="rounded" />Approved</label>
                        <label className="flex items-center gap-2 text-sm text-zinc-400"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />Active</label>
                        <div className="flex gap-3">
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"><Save size={15} />{saving ? "Saving..." : "Save"}</button>
                            <button onClick={resetForm} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {loading ? (
                <div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" /></div>
            ) : items.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">No dealerships yet.</p>
            ) : (
                <div className="space-y-3">
                    {items.map((d) => (
                        <div key={d._id} className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="font-bold">{d.name}</p>
                                    <p className="text-xs text-zinc-500 mt-1">{d.city} • {d.address}</p>
                                    <p className="text-xs text-zinc-500 mt-1">{d.phone} • {d.openingHours}</p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {!d.approved && <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-400 border border-yellow-500/20">Unapproved</span>}
                                        {d.brands && d.brands.length > 0 && d.brands.slice(0, 3).map((b) => (
                                            <span key={b} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">{b}</span>
                                        ))}
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${d.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"}`}>{d.isActive ? "Active" : "Inactive"}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <button onClick={async () => {
                                    try {
                                        await fetch(`http://localhost:5000/api/dealerships/${d._id}`, {
                                            method: "PUT",
                                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                                            body: JSON.stringify({ approved: !d.approved }),
                                        });
                                        load();
                                    } catch {}
                                }} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${d.approved ? "bg-white/5 text-zinc-400 hover:text-white" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"}`}>
                                    {d.approved ? "Unapprove" : "Approve"}
                                </button>
                                <button onClick={() => openEdit(d)} className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"><Pencil size={15} /></button>
                                <button onClick={() => handleDelete(d._id)} className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"><Trash2 size={15} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

const ColorsSection = ({ motorcycles, apiUrl }) => {
    const [selectedBike, setSelectedBike] = useState("");
    const [colors, setColors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [editingColor, setEditingColor] = useState(null);
    const [colorForm, setColorForm] = useState({ name: "", hexCode: "", image: "", model3DUrl: "", available: true });

    const fetchColors = async (bikeId) => {
        if (!bikeId) return;
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/${bikeId}`);
            const data = await res.json();
            setColors(data.motorcycle?.colors || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedBike) fetchColors(selectedBike);
        else setColors([]);
    }, [selectedBike]);

    const resetForm = () => {
        setColorForm({ name: "", hexCode: "", image: "", model3DUrl: "", available: true });
        setEditingColor(null);
    };

    const openEdit = (color) => {
        setEditingColor(color);
        setColorForm({ name: color.name || "", hexCode: color.hexCode || "", image: color.image || "", model3DUrl: color.model3DUrl || "", available: color.available !== false });
    };

    const addColor = () => {
        setEditingColor(null);
        setColorForm({ name: "", hexCode: "", image: "", model3DUrl: "", available: true });
    };

    const handleSave = async () => {
        if (!colorForm.name.trim()) { setMsg("Color name is required."); return; }
        if (!colorForm.hexCode.trim()) { setMsg("Hex code is required."); return; }
        setSaving(true);
        setMsg("");
        try {
            const updatedColors = editingColor
                ? colors.map((c) => (c._id === editingColor._id ? { ...c, ...colorForm, name: colorForm.name.trim(), hexCode: colorForm.hexCode.trim(), image: colorForm.image.trim(), model3DUrl: colorForm.model3DUrl.trim() } : c))
                : [...colors, { ...colorForm, name: colorForm.name.trim(), hexCode: colorForm.hexCode.trim(), image: colorForm.image.trim(), model3DUrl: colorForm.model3DUrl.trim() }];
            const res = await fetch(`${apiUrl}/${selectedBike}/colors`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({ colors: updatedColors }),
            });
            const data = await res.json();
            if (!res.ok) { setMsg(data.message || "Failed to save."); return; }
            setMsg("Color saved.");
            setColors(data.colors || updatedColors);
            resetForm();
        } catch (err) {
            setMsg("Failed to save color.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (colorId) => {
        if (!window.confirm("Remove this color?")) return;
        const updatedColors = colors.filter((c) => c._id !== colorId);
        try {
            const res = await fetch(`${apiUrl}/${selectedBike}/colors`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({ colors: updatedColors }),
            });
            if (res.ok) { setMsg("Color removed."); setColors(updatedColors); }
        } catch (err) {
            setMsg("Failed to remove color.");
        }
    };

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold">Color Management</h2>
                    <p className="text-sm text-zinc-500">Add and manage motorcycle color variations.</p>
                </div>
                <button onClick={addColor} disabled={!selectedBike} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-40">
                    <Plus size={16} />
                    Add Color
                </button>
            </div>

            {msg && <div className="mb-4 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">{msg}</div>}

            <div className="mb-6">
                <label className="block text-xs font-semibold text-zinc-400 mb-2">Select Motorcycle</label>
                <select value={selectedBike} onChange={(e) => setSelectedBike(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 appearance-none cursor-pointer"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                    }}>
                    <option value="" className="bg-[#111] text-white">Choose a motorcycle</option>
                    {motorcycles.map((m) => (
                        <option key={m._id} value={m._id} className="bg-[#111] text-white">{m.brand} {m.name}</option>
                    ))}
                </select>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-6">
                {editingColor !== undefined && (selectedBike) && (
                    <div className="mb-6">
                        <h3 className="font-bold mb-4">{editingColor ? "Edit Color" : "New Color"}</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-zinc-400">
                                Color Name *
                                <input value={colorForm.name} onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })} placeholder="Matte Black" className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" />
                            </label>
                            <label className="block text-xs font-semibold text-zinc-400">
                                Hex Code *
                                <input value={colorForm.hexCode} onChange={(e) => setColorForm({ ...colorForm, hexCode: e.target.value })} placeholder="#1a1a1a" className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" />
                            </label>
                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
                                Image URL
                                <input value={colorForm.image} onChange={(e) => setColorForm({ ...colorForm, image: e.target.value })} placeholder="https://..." className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" />
                            </label>
                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
                                3D Model URL (GLB/GLTF, empty = photos only)
                                <input value={colorForm.model3DUrl} onChange={(e) => setColorForm({ ...colorForm, model3DUrl: e.target.value })} placeholder="https://.../bike-red.glb" className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" />
                            </label>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm text-zinc-400">
                                <input type="checkbox" checked={colorForm.available} onChange={(e) => setColorForm({ ...colorForm, available: e.target.checked })} className="rounded" />
                                Available
                            </label>
                        </div>
                        <div className="mt-5 flex gap-3">
                            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50">
                                <Save size={15} />
                                {saving ? "Saving..." : "Save Color"}
                            </button>
                            {editingColor && (
                                <button onClick={resetForm} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5">Cancel</button>
                            )}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                    </div>
                ) : colors.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-4 text-center">No colors for this motorcycle. Add one above.</p>
                ) : (
                    <div className="space-y-3">
                        {colors.map((color) => (
                            <div key={color._id || color.name} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: color.hexCode }} />
                                    <div>
                                        <p className="font-bold text-sm">{color.name}</p>
                                        <p className="text-xs text-zinc-500">{color.hexCode}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openEdit(color)} className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"><Pencil size={15} /></button>
                                    <button onClick={() => handleDelete(color._id)} className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"><Trash2 size={15} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [motorcycles, setMotorcycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState(emptyForm);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Active tab: dashboard | motorcycles | database | profile
    const [activeTab, setActiveTab] = useState("dashboard");

    // Admin profile state
    const [admin, setAdmin] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: "",
        phone: "",
        address: "",
        profileImage: "",
    });
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState("");
    const [profileErr, setProfileErr] = useState("");

    // Database tab state
    const [dbStats, setDbStats] = useState(null);
    const [dbUsers, setDbUsers] = useState([]);
    const [dbLoading, setDbLoading] = useState(false);

    // AI Subscription overview for Dashboard home
    const [subStats, setSubStats] = useState(null);
    const [subStatsLoading, setSubStatsLoading] = useState(false);

    const getToken = () => localStorage.getItem("token");

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        setSidebarOpen(false);
        setError("");
        setSuccess("");
    };

    // --------------------------------------------------
    // FETCH AI SUBSCRIPTION STATS (for Dashboard overview)
    // --------------------------------------------------
    const fetchSubStats = async () => {
        try {
            setSubStatsLoading(true);
            const res = await getAdminSubscriptionStats();
            if (res && res.success) {
                setSubStats(res);
            }
        } catch (err) {
            console.warn("Failed to fetch sub stats for overview:", err);
        } finally {
            setSubStatsLoading(false);
        }
    };

    // --------------------------------------------------
    // FETCH MOTORCYCLES
    // --------------------------------------------------

    const fetchMotorcycles = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(API_URL);

            if (!response.ok) {
                throw new Error("Failed to fetch motorcycles");
            }

            const data = await response.json();

            setMotorcycles(data.motorcycles || []);
        } catch (err) {
            console.error(err);
            setError("Unable to load motorcycles.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMotorcycles();
        fetchAdminProfile();
        fetchSubStats();
    }, []);

    // --------------------------------------------------
    // FETCH ADMIN PROFILE
    // --------------------------------------------------
    const fetchAdminProfile = async () => {
        try {
            setProfileLoading(true);
            const token = getToken();
            const response = await fetch(`${ADMIN_API}/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Failed to load profile");
            const adm = data.admin || data.data || data;
            setAdmin(adm);
            setProfileForm({
                name: adm.name || "",
                phone: adm.phone || "",
                address: adm.address || "",
                profileImage: adm.profileImage || "",
            });
        } catch (err) {
            console.error(err);
        } finally {
            setProfileLoading(false);
        }
    };

    const handleProfileChange = (e) => {
        setProfileForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        try {
            setProfileSaving(true);
            setProfileErr("");
            setProfileMsg("");
            const token = getToken();
            const response = await fetch(`${ADMIN_API}/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(profileForm),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Failed to update profile");
            const adm = data.admin || data.data;
            if (adm) {
                setAdmin(adm);
                // keep localStorage user in sync
                try {
                    const stored = JSON.parse(localStorage.getItem("user") || "{}");
                    localStorage.setItem("user", JSON.stringify({ ...stored, ...adm }));
                } catch { /* ignore */ }
            }
            setProfileMsg("Profile updated successfully.");
        } catch (err) {
            setProfileErr(err.message || "Something went wrong.");
        } finally {
            setProfileSaving(false);
        }
    };

    // --------------------------------------------------
    // FETCH DATABASE TAB DATA
    // --------------------------------------------------
    const fetchDatabase = async () => {
        try {
            setDbLoading(true);
            const token = getToken();
            const [statsRes, usersRes] = await Promise.all([
                fetch(`${ADMIN_API}/stats`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${ADMIN_API}/users`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);
            const statsData = await statsRes.json();
            const usersData = await usersRes.json();
            if (statsRes.ok) setDbStats(statsData);
            if (usersRes.ok) setDbUsers(usersData.users || []);
        } catch (err) {
            console.error(err);
        } finally {
            setDbLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "database" && !dbStats) fetchDatabase();
    }, [activeTab]);

    // --------------------------------------------------
    // SEARCH
    // --------------------------------------------------

    const filteredMotorcycles = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) {
            return motorcycles;
        }

        return motorcycles.filter((bike) =>
            [
                bike.name,
                bike.brand,
                bike.category
            ]
                .filter(Boolean)
                .some((field) =>
                    field.toLowerCase().includes(value)
                )
        );
    }, [motorcycles, search]);

    // --------------------------------------------------
    // STATISTICS
    // --------------------------------------------------

    const stats = useMemo(() => {
        const total = motorcycles.length;

        const averageRating =
            total > 0
                ? (
                    motorcycles.reduce(
                        (sum, bike) => sum + Number(bike.rating || 0),
                        0
                    ) / total
                ).toFixed(1)
                : "0.0";

        const averagePrice =
            total > 0
                ? Math.round(
                    motorcycles.reduce(
                        (sum, bike) => sum + Number(bike.price || 0),
                        0
                    ) / total
                )
                : 0;

        const brands = new Set(
            motorcycles
                .map((bike) => bike.brand)
                .filter(Boolean)
        ).size;

        return {
            total,
            averageRating,
            averagePrice,
            brands
        };
    }, [motorcycles]);

    // --------------------------------------------------
    // FORM HANDLING
    // --------------------------------------------------

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    // --------------------------------------------------
    // IMAGE HANDLING
    // --------------------------------------------------

    const addImage = () => {
        setForm((previous) => ({
            ...previous,
            images: [
                ...previous.images,
                {
                    url: "",
                    label: "Front View"
                }
            ]
        }));
    };

    const updateImage = (index, field, value) => {
        setForm((previous) => {
            const updatedImages = [...previous.images];

            updatedImages[index] = {
                ...updatedImages[index],
                [field]: value
            };

            return {
                ...previous,
                images: updatedImages
            };
        });
    };

    const removeImage = (index) => {
        setForm((previous) => ({
            ...previous,
            images: previous.images.filter(
                (_, imageIndex) => imageIndex !== index
            )
        }));
    };

    // --------------------------------------------------
    // OPEN ADD MODAL
    // --------------------------------------------------

    const openAddModal = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError("");
        setSuccess("");
        setShowModal(true);
    };

    // --------------------------------------------------
    // OPEN EDIT MODAL
    // --------------------------------------------------

    const openEditModal = (bike) => {
        setEditingId(bike._id);

        setForm({
            name: bike.name || "",
            brand: bike.brand || "",
            brandLogo: bike.brandLogo || "",
            category: bike.category || "",
            price: bike.price ?? "",
            engine: bike.engine ?? "",
            power: bike.power ?? "",
            torque: bike.torque ?? "",
            mileage: bike.mileage ?? "",
            fuel: bike.fuel || "Petrol",
            transmission: bike.transmission || "Manual",
            weight: bike.weight ?? "",
            rating: bike.rating ?? "4.5",
            batteryCapacity: bike.batteryCapacity ?? "",
            range: bike.range ?? "",
            chargingTime: bike.chargingTime ?? "",
            topSpeed: bike.topSpeed ?? "",
            image: bike.image || "",
            description: bike.description || "",
            model3DUrl: bike.model3DUrl || "",
            images: Array.isArray(bike.images)
                ? bike.images
                : bike.image
                    ? [
                        {
                            url: bike.image,
                            label: "Main View"
                        }
                    ]
                    : []
        });

        setError("");
        setSuccess("");
        setShowModal(true);
    };

    // --------------------------------------------------
    // SAVE MOTORCYCLE
    // --------------------------------------------------

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            if (
                !form.category.trim() ||
                form.category === "Select category"
            ) {
                setError("Please select a category.");
                setSaving(false);
                return;
            }

            const payload = {
                name: form.name.trim(),
                brand: form.brand.trim(),
                brandLogo: form.brandLogo.trim(),
                category: form.category.trim(),
                price: Number(form.price),
                engine:
                    form.engine === ""
                        ? 0
                        : Number(form.engine),
                power:
                    form.power === ""
                        ? 0
                        : Number(form.power),
                torque:
                    form.torque === ""
                        ? null
                        : Number(form.torque),
                mileage:
                    form.mileage === ""
                        ? 0
                        : Number(form.mileage),
                batteryCapacity:
                    form.batteryCapacity === ""
                        ? 0
                        : Number(form.batteryCapacity),
                range:
                    form.range === ""
                        ? 0
                        : Number(form.range),
                chargingTime:
                    form.chargingTime === ""
                        ? 0
                        : Number(form.chargingTime),
                topSpeed:
                    form.topSpeed === ""
                        ? 0
                        : Number(form.topSpeed),
                fuel: form.fuel,
                transmission: form.transmission,
                weight:
                    form.weight === ""
                        ? null
                        : Number(form.weight),
                rating: Number(form.rating),
                image: form.image.trim(),
                images: form.images
                    .filter(
                        (image) =>
                            image.url.trim() &&
                            image.label.trim()
                    )
                    .map((image) => ({
                        url: image.url.trim(),
                        label: image.label.trim()
                    })),
                description: form.description.trim(),
                model3DUrl: (form.model3DUrl || "").trim()
            };

            const url = editingId
                ? `${API_URL}/${editingId}`
                : API_URL;

            const method = editingId ? "PUT" : "POST";

            const token = localStorage.getItem("token");

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to save motorcycle"
                );
            }

            setSuccess(
                editingId
                    ? "Motorcycle updated successfully."
                    : "Motorcycle added successfully."
            );

            setShowModal(false);
            setForm(emptyForm);
            setEditingId(null);

            await fetchMotorcycles();
        } catch (err) {
            console.error(err);
            setError(err.message || "Something went wrong.");
        } finally {
            setSaving(false);
        }
    };

    // --------------------------------------------------
    // DELETE
    // --------------------------------------------------

    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this motorcycle?"
        );

        if (!confirmed) return;

        try {
            setError("");
            setSuccess("");

            const token = localStorage.getItem("token");

            const response = await fetch(
                `${API_URL}/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to delete motorcycle"
                );
            }

            setSuccess("Motorcycle deleted successfully.");

            await fetchMotorcycles();
        } catch (err) {
            console.error(err);
            setError(err.message || "Unable to delete motorcycle.");
        }
    };

    // --------------------------------------------------
    // FORMAT PRICE
    // --------------------------------------------------

    const formatPrice = (price) => {
        return `₹${Number(price || 0).toLocaleString("en-IN")}`;
    };

    return (
        <div className="min-h-screen bg-[#070707] text-white">

            {/* MOBILE HEADER */}
            <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070707]/95 backdrop-blur-xl lg:hidden">
                <div className="flex items-center justify-between px-5 py-4">

                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
                            <Bike size={22} />
                        </div>

                        <div>
                            <h1 className="font-black tracking-wide">
                                MOTO<span className="text-orange-500">AI</span>
                            </h1>

                            <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">
                                Admin
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="rounded-xl border border-white/10 p-2"
                    >
                        <Menu size={21} />
                    </button>

                </div>
            </header>

            <div className="flex">

                {/* SIDEBAR */}

                <aside
                    className={`
                        fixed inset-y-0 left-0 z-50 w-72
                        border-r border-white/10
                        bg-[#0b0b0b]
                        transition-transform duration-300
                        lg:static lg:translate-x-0
                        ${sidebarOpen
                            ? "translate-x-0"
                            : "-translate-x-full"
                        }
                    `}
                >

                    <div className="flex h-full flex-col">

                        {/* LOGO */}

                        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-black">
                                <Bike size={24} />
                            </div>

                            <div>
                                <h1 className="text-xl font-black tracking-wide">
                                    MOTO<span className="text-orange-500">
                                        AI
                                    </span>
                                </h1>

                                <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">
                                    Admin Panel
                                </p>
                            </div>

                        </div>

                        {/* NAVIGATION */}

                        <nav className="flex-1 space-y-2 px-4 py-6">
                            {[
                                { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={19} /> },
                                { id: "motorcycles", label: "Motorcycles", icon: <Bike size={19} /> },
                                { id: "colors", label: "Colors", icon: <Palette size={19} /> },
                                { id: "enquiries", label: "Bike Enquiries", icon: <ClipboardList size={19} /> },
                                { id: "dealerships", label: "Dealerships", icon: <Store size={19} /> },
                                { id: "orders", label: "Orders", icon: <Package size={19} /> },
                                { id: "reviews", label: "Reviews", icon: <Star size={19} /> },
                                { id: "messages", label: "Messages", icon: <Mail size={19} /> },
                                { id: "advertisements", label: "Advertisements", icon: <Megaphone size={19} /> },
                                { id: "subscriptions", label: "AI Subscriptions", icon: <Crown size={19} /> },
                                { id: "analytics", label: "AI Analytics", icon: <TrendingUp size={19} /> },
                                { id: "database", label: "Database", icon: <Database size={19} /> },
                                { id: "profile", label: "Profile", icon: <User size={19} /> },
                            ].map((item) => {
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => switchTab(item.id)}
                                        className={`
                                            flex w-full items-center gap-3
                                            rounded-xl px-4 py-3
                                            text-sm font-semibold
                                            transition
                                            ${isActive
                                                ? "bg-orange-500/10 text-orange-500"
                                                : "text-gray-400 hover:bg-white/5 hover:text-white"
                                            }
                                        `}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* ADMIN */}

                        <div className="border-t border-white/10 p-5">

                            <button
                                onClick={() => switchTab("profile")}
                                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-orange-500/30"
                            >
                                <div className="mb-3 flex items-center gap-3">
                                    <UserAvatar user={admin} size={40} />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold">
                                            {admin?.name || "Administrator"}
                                        </p>
                                        <p className="truncate text-xs text-gray-500">
                                            {admin?.email || "MOTOAI Control"}
                                        </p>
                                    </div>
                                </div>
                                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full w-full bg-orange-500" />
                                </div>
                            </button>

                            <button
                                onClick={handleLogout}
                                className="mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
                            >
                                <LogOut size={19} />
                                Logout
                            </button>

                        </div>

                    </div>

                </aside>

                {/* MAIN */}

                <main className="min-w-0 flex-1">

                    <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:px-10">

                        {/* HEADER */}

                        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">

                            <div>

                                <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
                                    Control Center
                                </p>

                                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                                    {activeTab === "dashboard" && "Admin Dashboard"}
                                    {activeTab === "motorcycles" && "Motorcycles"}
                                    {activeTab === "colors" && "Colors"}
                                    {activeTab === "enquiries" && "Bike Enquiries"}
                                    {activeTab === "dealerships" && "Dealerships"}
                                    {activeTab === "orders" && "Orders"}
                                    {activeTab === "reviews" && "Reviews"}
                                    {activeTab === "messages" && "Messages"}
                                    {activeTab === "advertisements" && "Advertisements"}
                                    {activeTab === "subscriptions" && "AI Subscriptions"}
                                    {activeTab === "analytics" && "AI Analytics"}
                                    {activeTab === "database" && "Database"}
                                    {activeTab === "profile" && "Admin Profile"}
                                </h2>

                                <p className="mt-2 max-w-xl text-sm text-gray-500">
                                    {activeTab === "dashboard" && "Overview of your MOTOAI platform."}
                                    {activeTab === "motorcycles" && "Manage your MOTOAI motorcycle inventory from one place."}
                                    {activeTab === "colors" && "Manage color variations for each motorcycle."}
                                    {activeTab === "enquiries" && "Review test rides and purchase enquiries."}
                                    {activeTab === "dealerships" && "Manage authorized dealerships."}
                                    {activeTab === "orders" && "Online and offline motorcycle orders."}
                                    {activeTab === "reviews" && "Moderate user reviews and verified-purchase ratings."}
                                    {activeTab === "messages" && "Contact form submissions from customers."}
                                    {activeTab === "advertisements" && "Manage homepage promotional banners."}
                                    {activeTab === "subscriptions" && "Monitor active subscriptions, user token allowances, and payment statuses."}
                                    {activeTab === "analytics" && "Analyze subscription volume growth, revenue timelines, and plan distributions."}
                                    {activeTab === "database" && "Inspect collections, brand/category breakdown and users."}
                                    {activeTab === "profile" && "View and edit your administrator profile."}
                                </p>

                            </div>

                            <div className="flex gap-3">
                                {(activeTab === "dashboard" || activeTab === "motorcycles") && (
                                    <>
                                        <button
                                            onClick={() => {
                                                fetchMotorcycles();
                                                fetchSubStats();
                                            }}
                                            className="
                                                flex items-center gap-2
                                                rounded-xl border border-white/10
                                                bg-white/5 px-4 py-3
                                                text-sm font-semibold
                                                transition hover:bg-white/10
                                            "
                                        >
                                            <RefreshCw size={17} />
                                            Refresh
                                        </button>

                                        <button
                                            onClick={openAddModal}
                                            className="
                                                flex items-center gap-2
                                                rounded-xl bg-orange-500
                                                px-5 py-3
                                                text-sm font-bold text-black
                                                shadow-lg shadow-orange-500/10
                                                transition hover:bg-orange-400
                                            "
                                        >
                                            <Plus size={18} />
                                            Add Motorcycle
                                        </button>
                                    </>
                                )}
                                {activeTab === "subscriptions" && (
                                    <button
                                        onClick={() => switchTab("analytics")}
                                        className="flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-400 transition hover:bg-orange-500 hover:text-black"
                                    >
                                        <TrendingUp size={17} />
                                        View AI Analytics
                                    </button>
                                )}
                                {activeTab === "analytics" && (
                                    <button
                                        onClick={() => switchTab("subscriptions")}
                                        className="flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-400 transition hover:bg-orange-500 hover:text-black"
                                    >
                                        <Crown size={17} />
                                        Manage Subscriptions
                                    </button>
                                )}
                                {activeTab === "database" && (
                                    <button
                                        onClick={fetchDatabase}
                                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
                                    >
                                        <RefreshCw size={17} />
                                        Refresh
                                    </button>
                                )}
                            </div>

                        </div>

                        {/* ALERTS */}

                        {error && (
                            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                                {success}
                            </div>
                        )}

                        {/* STAT CARDS — Dashboard tab only */}

                        {activeTab === "dashboard" && (
                        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                            <StatCard
                                icon={<Bike size={20} />}
                                label="Total Motorcycles"
                                value={stats.total}
                            />

                            <StatCard
                                icon={<Database size={20} />}
                                label="Brands"
                                value={stats.brands}
                            />

                            <StatCard
                                icon={<Star size={20} />}
                                label="Average Rating"
                                value={stats.averageRating}
                            />

                            <StatCard
                                icon={<IndianRupee size={20} />}
                                label="Average Price"
                                value={formatPrice(stats.averagePrice)}
                            />

                        </div>
                        )}

                        {/* AI SUBSCRIPTION OVERVIEW WIDGET (Dynamic from MongoDB) */}
                        {activeTab === "dashboard" && (
                            <div className="mb-8 rounded-3xl border border-white/10 bg-[#0c0c0c] p-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4 mb-5">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                                            Monetization & AI Tokens
                                        </p>
                                        <h3 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                                            <Crown size={18} className="text-orange-500" />
                                            AI Subscription & Wallet Overview
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => switchTab("analytics")}
                                            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-gray-300 transition hover:bg-white/10"
                                        >
                                            <TrendingUp size={13} />
                                            AI Analytics
                                        </button>
                                        <button
                                            onClick={() => switchTab("subscriptions")}
                                            className="flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3.5 py-2 text-xs font-bold text-orange-400 transition hover:bg-orange-500 hover:text-black"
                                        >
                                            Detailed Subscriptions
                                            <ArrowUpRight size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                                        <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Total Users</span>
                                        <p className="mt-2 text-2xl font-black text-white">
                                            {subStats?.overview?.totalUsers ?? "—"}
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-1">Platform registered</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                                        <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">Premium Users</span>
                                        <p className="mt-2 text-2xl font-black text-emerald-400">
                                            {subStats?.overview?.activePremiumUsers ?? "—"}
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-1">Active subscriptions</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                                        <span className="text-[11px] uppercase tracking-wider text-orange-400 font-semibold">Monthly Plan</span>
                                        <p className="mt-2 text-2xl font-black text-white">
                                            {subStats?.overview?.monthlySubscribers ?? "—"}
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-1">₹199 / month</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                                        <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">Yearly Plan</span>
                                        <p className="mt-2 text-2xl font-black text-white">
                                            {subStats?.overview?.yearlySubscribers ?? "—"}
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-1">₹1,999 / year</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                                        <span className="text-[11px] uppercase tracking-wider text-orange-400 font-semibold">Total Revenue</span>
                                        <p className="mt-2 text-2xl font-black text-orange-400">
                                            {subStats ? `₹${Number(subStats.overview?.totalRevenue || 0).toLocaleString("en-IN")}` : "—"}
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-1">Verified payments</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                                        <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-semibold">AI Tokens Pool</span>
                                        <p className="mt-2 text-2xl font-black text-cyan-400 font-mono">
                                            {subStats ? Number(subStats.tokens?.totalRemaining || 0).toLocaleString("en-IN") : "—"}
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-1">Active tokens balance</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TABLE CARD — Dashboard + Motorcycles tabs */}

                        {(activeTab === "dashboard" || activeTab === "motorcycles") && (
                        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c]">

                            {/* TABLE HEADER */}

                            <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

                                <div>
                                    <h3 className="text-lg font-bold">
                                        Motorcycle Inventory
                                    </h3>

                                    <p className="mt-1 text-xs text-gray-500">
                                        {filteredMotorcycles.length} motorcycles
                                        found
                                    </p>
                                </div>

                                <div className="relative w-full lg:w-80">

                                    <Search
                                        size={18}
                                        className="
                                            absolute left-3 top-1/2
                                            -translate-y-1/2
                                            text-gray-500
                                        "
                                    />

                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="Search motorcycles..."
                                        className="
                                            w-full rounded-xl
                                            border border-white/10
                                            bg-white/[0.03]
                                            py-3 pl-10 pr-4
                                            text-sm text-white
                                            outline-none
                                            transition
                                            focus:border-orange-500/50
                                        "
                                    />

                                </div>

                            </div>

                            {/* TABLE */}

                            {loading ? (

                                <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                                    <Bike size={45} className="mb-4 text-gray-700" />

                                    <h4 className="font-bold text-white">
                                        No motorcycles found
                                    </h4>

                                    <p className="mt-2 text-sm text-gray-500">
                                        Add a motorcycle or change your search.
                                    </p>
                                </div>
                            ) : filteredMotorcycles.length === 0 ? (

                                <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">

                                    <Bike
                                        size={45}
                                        className="mb-4 text-gray-700"
                                    />

                                    <h4 className="font-bold">
                                        No motorcycles found
                                    </h4>

                                    <p className="mt-2 text-sm text-gray-500">
                                        Add a motorcycle or change your search.
                                    </p>

                                </div>

                            ) : (

                                <div className="overflow-x-auto">

                                    <table className="w-full min-w-[950px]">

                                        <thead>
                                            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-500">

                                                <th className="px-6 py-4">
                                                    Motorcycle
                                                </th>

                                                <th className="px-6 py-4">
                                                    Category
                                                </th>

                                                <th className="px-6 py-4">
                                                    Price
                                                </th>

                                                <th className="px-6 py-4">
                                                    Engine
                                                </th>

                                                <th className="px-6 py-4">
                                                    Power
                                                </th>

                                                <th className="px-6 py-4">
                                                    Rating
                                                </th>

                                                <th className="px-6 py-4 text-right">
                                                    Actions
                                                </th>

                                            </tr>
                                        </thead>

                                        <tbody>

                                            {filteredMotorcycles.map(
                                                (bike) => (

                                                    <tr
                                                        key={bike._id}
                                                        className="
                                                            border-b
                                                            border-white/5
                                                            transition
                                                            hover:bg-white/[0.025]
                                                        "
                                                    >

                                                        {/* BIKE */}

                                                        <td className="px-6 py-5">

                                                            <div className="flex items-center gap-4">

                                                                <div className="
                                                                    h-14 w-20
                                                                    overflow-hidden
                                                                    rounded-xl
                                                                    border
                                                                    border-white/10
                                                                    bg-black
                                                                ">

                                                                    {bike.image ? (
                                                                        <img
                                                                            src={bike.image}
                                                                            alt={bike.name}
                                                                            className="
                                                                                h-full
                                                                                w-full
                                                                                object-cover
                                                                            "
                                                                        />
                                                                    ) : (
                                                                        <div className="
                                                                            flex
                                                                            h-full
                                                                            w-full
                                                                            items-center
                                                                            justify-center
                                                                            text-gray-700
                                                                        ">
                                                                            <Bike size={22} />
                                                                        </div>
                                                                    )}

                                                                </div>

                                                                <div className="flex items-center gap-2.5">

                                                                    <BrandLogo
                                                                        brand={bike.brand}
                                                                        brandLogo={bike.brandLogo}
                                                                        size={32}
                                                                    />

                                                                    <div>

                                                                        <p className="font-bold">
                                                                            {bike.name}
                                                                        </p>

                                                                        <p className="mt-1 text-xs text-gray-500">
                                                                            {bike.brand}
                                                                        </p>

                                                                    </div>

                                                                </div>

                                                            </div>

                                                        </td>

                                                        {/* CATEGORY */}

                                                        <td className="px-6 py-5">

                                                            <span className="
                                                                rounded-full
                                                                border
                                                                border-orange-500/20
                                                                bg-orange-500/10
                                                                px-3 py-1
                                                                text-xs
                                                                text-orange-400
                                                            ">
                                                                {bike.category}
                                                            </span>

                                                        </td>

                                                        {/* PRICE */}

                                                        <td className="px-6 py-5 font-semibold">
                                                            {formatPrice(bike.price)}
                                                        </td>

                                                        {/* ENGINE */}

                                                        <td className="px-6 py-5 text-gray-300">
                                                            {bike.engine} cc
                                                        </td>

                                                        {/* POWER */}

                                                        <td className="px-6 py-5 text-gray-300">
                                                            {bike.power} HP
                                                        </td>

                                                        {/* RATING */}

                                                        <td className="px-6 py-5">

                                                            <div className="flex items-center gap-1">

                                                                <Star
                                                                    size={15}
                                                                    className="fill-orange-500 text-orange-500"
                                                                />

                                                                <span>
                                                                    {bike.rating || "—"}
                                                                </span>

                                                            </div>

                                                        </td>

                                                        {/* ACTIONS */}

                                                        <td className="px-6 py-5">

                                                            <div className="flex justify-end gap-2">

                                                                <button
                                                                    onClick={() =>
                                                                        openEditModal(
                                                                            bike
                                                                        )
                                                                    }
                                                                    className="
                                                                        rounded-lg
                                                                        border
                                                                        border-white/10
                                                                        p-2.5
                                                                        text-gray-400
                                                                        transition
                                                                        hover:border-orange-500/30
                                                                        hover:bg-orange-500/10
                                                                        hover:text-orange-500
                                                                    "
                                                                    title="Edit"
                                                                >
                                                                    <Pencil
                                                                        size={16}
                                                                    />
                                                                </button>

                                                                <button
                                                                    onClick={() =>
                                                                        handleDelete(
                                                                            bike._id
                                                                        )
                                                                    }
                                                                    className="
                                                                        rounded-lg
                                                                        border
                                                                        border-white/10
                                                                        p-2.5
                                                                        text-gray-400
                                                                        transition
                                                                        hover:border-red-500/30
                                                                        hover:bg-red-500/10
                                                                        hover:text-red-400
                                                                    "
                                                                    title="Delete"
                                                                >
                                                                    <Trash2
                                                                        size={16}
                                                                    />
                                                                </button>

                                                            </div>

                                                        </td>

                                                    </tr>

                                                )
                                            )}

                                        </tbody>

                                    </table>

                                </div>

                            )}

                        </section>
                        )}

                        {/* AI SUBSCRIPTIONS TAB */}
                        {activeTab === "subscriptions" && (
                            <AISubscriptionsSection />
                        )}

                        {/* AI ANALYTICS TAB */}
                        {activeTab === "analytics" && (
                            <AIAnalyticsSection />
                        )}

                        {/* COLORS TAB */}
                        {activeTab === "colors" && (
                            <ColorsSection
                                motorcycles={motorcycles}
                                apiUrl="http://localhost:5000/api/motorcycles"
                            />
                        )}

                        {/* ENQUIRIES TAB */}
                        {activeTab === "enquiries" && (
                            <EnquiriesSection />
                        )}

                        {/* DEALERSHIPS TAB */}
                        {activeTab === "dealerships" && (
                            <DealershipsSection />
                        )}

                        {/* ORDERS TAB */}
                        {activeTab === "orders" && (
                            <BikeOrdersSection />
                        )}

                        {/* REVIEWS TAB */}
                        {activeTab === "reviews" && (
                            <ReviewsManagementSection />
                        )}

                        {/* MESSAGES TAB */}
                        {activeTab === "messages" && (
                            <MessagesSection />
                        )}

                        {/* ADVERTISEMENTS TAB */}
                        {activeTab === "advertisements" && (
                            <AdvertisementsSection />
                        )}

                        {/* DATABASE TAB */}
                        {activeTab === "database" && (
                            <DatabaseSection
                                dbStats={dbStats}
                                dbUsers={dbUsers}
                                dbLoading={dbLoading}
                                onRefresh={fetchDatabase}
                                formatPrice={formatPrice}
                            />
                        )}

                        {/* PROFILE TAB */}
                        {activeTab === "profile" && (
                            <AdminProfileSection
                                admin={admin}
                                profileLoading={profileLoading}
                                profileForm={profileForm}
                                onChange={handleProfileChange}
                                onSave={handleProfileSave}
                                profileSaving={profileSaving}
                                profileMsg={profileMsg}
                                profileErr={profileErr}
                                onRefresh={fetchAdminProfile}
                            />
                        )}

                    </div>

                </main>

            </div >

            {/* MODAL */}

            {
                showModal && (

                    <div className="
                    fixed inset-0 z-[100]
                    flex items-center justify-center
                    bg-black/80
                    p-4
                    backdrop-blur-md
                ">

                        <div className="
                        flex max-h-[92vh]
                        w-full max-w-4xl
                        flex-col
                        overflow-hidden
                        rounded-3xl
                        border border-white/10
                        bg-[#0d0d0d]
                        shadow-2xl
                    ">

                            {/* MODAL HEADER */}

                            <div className="
                            flex items-center justify-between
                            border-b border-white/10
                            px-6 py-5
                        ">

                                <div>

                                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500">
                                        {editingId
                                            ? "Edit Motorcycle"
                                            : "New Motorcycle"}
                                    </p>

                                    <h3 className="mt-1 text-xl font-black">
                                        {editingId
                                            ? "Update Motorcycle"
                                            : "Add Motorcycle"}
                                    </h3>

                                </div>

                                <button
                                    onClick={() => setShowModal(false)}
                                    className="
                                    rounded-xl
                                    border border-white/10
                                    p-2
                                    text-gray-400
                                    transition
                                    hover:bg-white/10
                                    hover:text-white
                                "
                                >
                                    <X size={20} />
                                </button>

                            </div>

                            {/* FORM */}

                            <form
                                onSubmit={handleSubmit}
                                className="overflow-y-auto"
                            >

                                <div className="grid gap-6 p-6 lg:grid-cols-2">

                                    {/* BASIC INFORMATION */}

                                    <div className="space-y-5">

                                        <SectionTitle>
                                            Basic Information
                                        </SectionTitle>

                                        <Input
                                            label="Motorcycle Name"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            placeholder="Hunter 350"
                                            required
                                        />

                                        <Input
                                            label="Brand"
                                            name="brand"
                                            value={form.brand}
                                            onChange={handleChange}
                                            placeholder="Royal Enfield"
                                            required
                                        />

                                        <Input
                                            label="Brand Logo URL"
                                            name="brandLogo"
                                            value={form.brandLogo}
                                            onChange={handleChange}
                                            placeholder="https://... (empty = first-letter badge)"
                                        />

                                        <Input
                                            label="3D Model URL (GLB/GLTF, empty = photos only)"
                                            name="model3DUrl"
                                            value={form.model3DUrl || ""}
                                            onChange={handleChange}
                                            placeholder="https://.../bike.glb"
                                        />

                                        <Select
                                            label="Category"
                                            name="category"
                                            value={form.category}
                                            onChange={handleChange}
                                            options={[
                                                "Select category",
                                                ...CATEGORY_OPTIONS,
                                            ]}
                                        />

                                        <div className="grid grid-cols-2 gap-4">

                                            <Input
                                                label="Price (₹)"
                                                name="price"
                                                type="number"
                                                value={form.price}
                                                onChange={handleChange}
                                                placeholder="150000"
                                                required
                                            />

                                            <Input
                                                label="Engine (cc) — 0 for EV"
                                                name="engine"
                                                type="number"
                                                value={form.engine}
                                                onChange={handleChange}
                                                placeholder="349"
                                            />

                                        </div>

                                        <div className="grid grid-cols-2 gap-4">

                                            <Input
                                                label="Power (HP)"
                                                name="power"
                                                type="number"
                                                step="0.1"
                                                value={form.power}
                                                onChange={handleChange}
                                                placeholder="20.2"
                                            />

                                            <Input
                                                label="Torque (Nm)"
                                                name="torque"
                                                type="number"
                                                step="0.1"
                                                value={form.torque}
                                                onChange={handleChange}
                                                placeholder="27"
                                            />

                                        </div>

                                    </div>

                                    {/* SPECIFICATIONS */}

                                    <div className="space-y-5">

                                        <SectionTitle>
                                            Specifications
                                        </SectionTitle>

                                        <div className="grid grid-cols-2 gap-4">

                                            <Input
                                                label="Mileage (km/l) — 0 for EV"
                                                name="mileage"
                                                type="number"
                                                step="0.1"
                                                value={form.mileage}
                                                onChange={handleChange}
                                                placeholder="36"
                                            />

                                            <Input
                                                label="Weight (kg)"
                                                name="weight"
                                                type="number"
                                                value={form.weight}
                                                onChange={handleChange}
                                                placeholder="181"
                                            />

                                            <Input
                                                label="Top Speed (km/h)"
                                                name="topSpeed"
                                                type="number"
                                                value={form.topSpeed}
                                                onChange={handleChange}
                                                placeholder="120"
                                            />

                                        </div>

                                        <Select
                                            label="Fuel Type"
                                            name="fuel"
                                            value={form.fuel}
                                            onChange={handleChange}
                                            options={[
                                                "Petrol",
                                                "Electric",
                                                "Hybrid"
                                            ]}
                                        />

                                        <Select
                                            label="Transmission"
                                            name="transmission"
                                            value={form.transmission}
                                            onChange={handleChange}
                                            options={[
                                                "Manual",
                                                "Automatic",
                                                "AMT",
                                                "CVT"
                                            ]}
                                        />

                                        <Input
                                            label="Rating"
                                            name="rating"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="5"
                                            value={form.rating}
                                            onChange={handleChange}
                                            placeholder="4.7"
                                        />

                                        <Input
                                            label="Main Image URL"
                                            name="image"
                                            value={form.image}
                                            onChange={handleChange}
                                            placeholder="https://..."
                                        />

                                    </div>

                                    {/* ELECTRIC SPECS */}

                                    <div className="space-y-5 lg:col-span-2">

                                        <SectionTitle>
                                            Electric Specs (for EV category)
                                        </SectionTitle>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

                                            <Input
                                                label="Battery (kWh)"
                                                name="batteryCapacity"
                                                type="number"
                                                step="0.1"
                                                value={form.batteryCapacity}
                                                onChange={handleChange}
                                                placeholder="4"
                                            />

                                            <Input
                                                label="Range (km)"
                                                name="range"
                                                type="number"
                                                value={form.range}
                                                onChange={handleChange}
                                                placeholder="150"
                                            />

                                            <Input
                                                label="Charging (hrs)"
                                                name="chargingTime"
                                                type="number"
                                                step="0.1"
                                                value={form.chargingTime}
                                                onChange={handleChange}
                                                placeholder="5"
                                            />

                                        </div>

                                    </div>

                                    {/* DESCRIPTION */}

                                    <div className="lg:col-span-2">

                                        <SectionTitle>
                                            Description
                                        </SectionTitle>

                                        <textarea
                                            name="description"
                                            value={form.description}
                                            onChange={handleChange}
                                            rows="4"
                                            placeholder="Describe this motorcycle..."
                                            className="
                                            mt-4 w-full resize-none
                                            rounded-xl
                                            border border-white/10
                                            bg-white/[0.03]
                                            px-4 py-3
                                            text-sm text-white
                                            outline-none
                                            transition
                                            placeholder:text-gray-600
                                            focus:border-orange-500/50
                                        "
                                        />

                                    </div>

                                    {/* IMAGE GALLERY */}

                                    <div className="lg:col-span-2">

                                        <div className="flex items-center justify-between">

                                            <SectionTitle>
                                                Motorcycle Gallery
                                            </SectionTitle>

                                            <button
                                                type="button"
                                                onClick={addImage}
                                                className="
                                                flex items-center gap-2
                                                rounded-xl
                                                border border-orange-500/20
                                                bg-orange-500/10
                                                px-3 py-2
                                                text-xs font-bold
                                                text-orange-500
                                                transition
                                                hover:bg-orange-500/20
                                            "
                                            >
                                                <ImagePlus size={15} />
                                                Add Image
                                            </button>

                                        </div>

                                        <div className="mt-4 space-y-3">

                                            {form.images.length === 0 && (

                                                <div className="
                                                rounded-2xl
                                                border border-dashed
                                                border-white/10
                                                p-8
                                                text-center
                                            ">

                                                    <ImagePlus
                                                        size={30}
                                                        className="
                                                        mx-auto mb-3
                                                        text-gray-600
                                                    "
                                                    />

                                                    <p className="text-sm text-gray-500">
                                                        No gallery images added.
                                                    </p>

                                                </div>

                                            )}

                                            {form.images.map(
                                                (image, index) => (

                                                    <div
                                                        key={index}
                                                        className="
                                                        rounded-2xl
                                                        border border-white/10
                                                        bg-white/[0.02]
                                                        p-4
                                                    "
                                                    >

                                                        <div className="flex gap-3">

                                                            <div className="
                                                            h-14 w-20
                                                            shrink-0
                                                            overflow-hidden
                                                            rounded-lg
                                                            bg-black
                                                            border
                                                            border-white/10
                                                        ">

                                                                {image.url ? (
                                                                    <img
                                                                        src={image.url}
                                                                        alt={image.label}
                                                                        className="
                                                                        h-full
                                                                        w-full
                                                                        object-cover
                                                                    "
                                                                        onError={(
                                                                            event
                                                                        ) => {
                                                                            event.currentTarget.style.display =
                                                                                "none";
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="
                                                                    flex
                                                                    h-full
                                                                    w-full
                                                                    items-center
                                                                    justify-center
                                                                    text-gray-700
                                                                ">
                                                                        <ImagePlus
                                                                            size={18}
                                                                        />
                                                                    </div>
                                                                )}

                                                            </div>

                                                            <div className="grid flex-1 gap-3 sm:grid-cols-2">

                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        image.url
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        updateImage(
                                                                            index,
                                                                            "url",
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    placeholder="Image URL"
                                                                    className="
                                                                    w-full
                                                                    rounded-xl
                                                                    border
                                                                    border-white/10
                                                                    bg-black/30
                                                                    px-3 py-3
                                                                    text-sm
                                                                    outline-none
                                                                    focus:border-orange-500/50
                                                                "
                                                                />

                                                                <select
                                                                    value={
                                                                        image.label
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        updateImage(
                                                                            index,
                                                                            "label",
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    className="
                                                                    w-full
                                                                    rounded-xl
                                                                    border
                                                                    border-white/10
                                                                    bg-[#111]
                                                                    px-3 py-3
                                                                    text-sm
                                                                    outline-none
                                                                    focus:border-orange-500/50
                                                                "
                                                                >

                                                                    <option>
                                                                        Front View
                                                                    </option>

                                                                    <option>
                                                                        Rear View
                                                                    </option>

                                                                    <option>
                                                                        Side View
                                                                    </option>

                                                                    <option>
                                                                        Dashboard
                                                                    </option>

                                                                    <option>
                                                                        Engine View
                                                                    </option>

                                                                    <option>
                                                                        Exhaust View
                                                                    </option>

                                                                    <option>
                                                                        Main View
                                                                    </option>

                                                                </select>

                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeImage(
                                                                        index
                                                                    )
                                                                }
                                                                className="
                                                                self-start
                                                                rounded-lg
                                                                p-2
                                                                text-gray-500
                                                                transition
                                                                hover:bg-red-500/10
                                                                hover:text-red-400
                                                            "
                                                            >
                                                                <Trash2 size={17} />
                                                            </button>

                                                        </div>

                                                    </div>

                                                )
                                            )}

                                        </div>

                                    </div>

                                </div>

                                {/* FORM FOOTER */}

                                <div className="
                                flex flex-col-reverse
                                gap-3
                                border-t border-white/10
                                bg-white/[0.02]
                                p-5
                                sm:flex-row
                                sm:justify-end
                            ">

                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="
                                        rounded-xl
                                        border border-white/10
                                        px-5 py-3
                                        text-sm font-semibold
                                        text-gray-300
                                        transition
                                        hover:bg-white/10
                                    "
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="
                                        flex items-center
                                        justify-center gap-2
                                        rounded-xl
                                        bg-orange-500
                                        px-6 py-3
                                        text-sm font-bold
                                        text-black
                                        transition
                                        hover:bg-orange-400
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                    >

                                        {saving ? (
                                            <>
                                                <div className="
                                                h-4 w-4
                                                animate-spin
                                                rounded-full
                                                border-2
                                                border-black/30
                                                border-t-black
                                            " />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={17} />
                                            {editingId
                                                ? "Update Motorcycle"
                                                : "Save Motorcycle"}
                                            </>
                                        )}

                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>

                )
            }

        </div >
    );
};

// --------------------------------------------------
// STAT CARD
// --------------------------------------------------

const StatCard = ({ icon, label, value }) => {
    return (
        <div className="
            rounded-2xl
            border border-white/10
            bg-[#0c0c0c]
            p-5
            transition
            hover:border-orange-500/20
        ">

            <div className="
                mb-5 flex
                h-10 w-10
                items-center justify-center
                rounded-xl
                bg-orange-500/10
                text-orange-500
            ">
                {icon}
            </div>

            <p className="text-xs uppercase tracking-wider text-gray-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-black">
                {value}
            </p>

        </div>
    );
};

// --------------------------------------------------
// SECTION TITLE
// --------------------------------------------------

const SectionTitle = ({ children }) => {
    return (
        <div className="
            border-b border-white/10
            pb-3
            text-sm font-bold
            uppercase tracking-wider
            text-gray-300
        ">
            {children}
        </div>
    );
};

// --------------------------------------------------
// INPUT
// --------------------------------------------------

const Input = ({
    label,
    name,
    type = "text",
    value,
    onChange,
    placeholder,
    required = false,
    step,
    min,
    max
}) => {
    return (
        <div>

            <label className="
                mb-2 block
                text-xs font-semibold
                text-gray-400
            ">
                {label}
            </label>

            <input
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                step={step}
                min={min}
                max={max}
                className="
                    w-full
                    rounded-xl
                    border border-white/10
                    bg-white/[0.03]
                    px-4 py-3
                    text-sm text-white
                    outline-none
                    transition
                    placeholder:text-gray-600
                    focus:border-orange-500/50
                    focus:bg-white/[0.05]
                "
            />

        </div>
    );
};

// --------------------------------------------------
// SELECT
// --------------------------------------------------

const Select = ({
    label,
    name,
    value,
    onChange,
    options
}) => {
    return (
        <div>

            <label className="
                mb-2 block
                text-xs font-semibold
                text-gray-400
            ">
                {label}
            </label>

            <select
                name={name}
                value={value}
                onChange={onChange}
                className="
                    w-full
                    rounded-xl
                    border border-white/10
                    bg-[#111]
                    px-4 py-3
                    text-sm text-white
                    outline-none
                    focus:border-orange-500/50
                "
            >

                {options.map((option) => (
                    <option
                        key={option}
                        value={option}
                    >
                        {option}
                    </option>
                ))}

            </select>

        </div>
    );
};

// --------------------------------------------------
// DATABASE SECTION
// --------------------------------------------------

const DatabaseSection = ({ dbStats, dbUsers, dbLoading, onRefresh, formatPrice }) => {
    if (dbLoading && !dbStats) {
        return (
            <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-white/10 bg-[#0c0c0c]">
                <p className="text-sm text-gray-500">Loading database...</p>
            </div>
        );
    }

    const stats = dbStats?.stats || {};
    const brands = dbStats?.brands || {};
    const categories = dbStats?.categories || {};
    const motorcycles = dbStats?.motorcycles || [];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard icon={<Bike size={20} />} label="Motorcycles" value={stats.totalMotorcycles ?? 0} />
                <StatCard icon={<Users size={20} />} label="Customers" value={stats.totalUsers ?? 0} />
                <StatCard icon={<ShieldCheck size={20} />} label="Providers" value={stats.totalProviders ?? 0} />
                <StatCard icon={<User size={20} />} label="Admins" value={stats.totalAdmins ?? 0} />
                <StatCard icon={<Database size={20} />} label="Bookings" value={stats.totalBookings ?? 0} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6">
                    <h3 className="text-lg font-bold">Brands breakdown</h3>
                    <p className="mt-1 text-xs text-gray-500">{Object.keys(brands).length} brands</p>
                    <div className="mt-4 space-y-2">
                        {Object.keys(brands).length === 0 && (
                            <p className="text-sm text-gray-600">No data yet.</p>
                        )}
                        {Object.entries(brands).map(([brand, count]) => (
                            <div key={brand} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 text-sm">
                                <span className="font-semibold">{brand}</span>
                                <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs text-orange-400">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6">
                    <h3 className="text-lg font-bold">Categories breakdown</h3>
                    <p className="mt-1 text-xs text-gray-500">{Object.keys(categories).length} categories</p>
                    <div className="mt-4 space-y-2">
                        {Object.keys(categories).length === 0 && (
                            <p className="text-sm text-gray-600">No data yet.</p>
                        )}
                        {Object.entries(categories).map(([cat, count]) => (
                            <div key={cat} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 text-sm">
                                <span className="font-semibold">{cat}</span>
                                <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs text-orange-400">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c]">
                <div className="flex items-center justify-between border-b border-white/10 p-5 sm:p-6">
                    <div>
                        <h3 className="text-lg font-bold">Motorcycle records</h3>
                        <p className="mt-1 text-xs text-gray-500">{motorcycles.length} records</p>
                    </div>
                    <button onClick={onRefresh} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-500">
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Brand</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            {motorcycles.slice(0, 50).map((bike) => (
                                <tr key={bike._id} className="border-b border-white/5 hover:bg-white/[0.025]">
                                    <td className="px-6 py-3 font-semibold">{bike.name}</td>
                                    <td className="px-6 py-3 text-gray-400">{bike.brand}</td>
                                    <td className="px-6 py-3 text-gray-400">{bike.category}</td>
                                    <td className="px-6 py-3">{formatPrice(bike.price)}</td>
                                    <td className="px-6 py-3 text-gray-400">{bike.rating ?? "—"}</td>
                                </tr>
                            ))}
                            {motorcycles.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-600">No motorcycles in database.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c]">
                <div className="border-b border-white/10 p-5 sm:p-6">
                    <h3 className="text-lg font-bold">Users</h3>
                    <p className="mt-1 text-xs text-gray-500">{dbUsers.length} users (latest 100)</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-500">
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Phone</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dbUsers.map((u) => (
                                <tr key={u._id} className="border-b border-white/5 hover:bg-white/[0.025]">
                                    <td className="px-6 py-3 font-semibold">{u.name}</td>
                                    <td className="px-6 py-3 text-gray-400">{u.email}</td>
                                    <td className="px-6 py-3">
                                        <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs text-orange-400">{u.role}</span>
                                    </td>
                                    <td className="px-6 py-3 text-gray-400">{u.phone || "—"}</td>
                                </tr>
                            ))}
                            {dbUsers.length === 0 && (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-600">No users found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --------------------------------------------------
// ADMIN PROFILE SECTION (editable)
// --------------------------------------------------

const AdminProfileSection = ({
    admin,
    profileLoading,
    profileForm,
    onChange,
    onSave,
    profileSaving,
    profileMsg,
    profileErr,
    onRefresh,
}) => {
    if (profileLoading && !admin) {
        return (
            <div className="flex min-h-[300px] items-center justify-center rounded-3xl border border-white/10 bg-[#0c0c0c]">
                <p className="text-sm text-gray-500">Loading profile...</p>
            </div>
        );
    }

    // Live preview: show typed URL instantly, fall back to saved photo
    const previewSrc = (profileForm.profileImage || admin?.profileImage || "").trim();

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 text-center">
                <div className="mx-auto w-fit">
                    <UserAvatar user={{ ...admin, profileImage: previewSrc }} size={80} className="!rounded-2xl" />
                </div>
                <h3 className="mt-4 text-xl font-bold">{profileForm.name || admin?.name || "Administrator"}</h3>
                <p className="mt-1 text-sm text-gray-500">{admin?.email}</p>
                <span className="mt-3 inline-block rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs text-orange-400">
                    {admin?.role || "admin"}
                </span>
                <button onClick={onRefresh} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            <form onSubmit={onSave} className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 lg:col-span-2">
                <h3 className="text-lg font-bold">Edit profile</h3>
                <p className="mt-1 text-xs text-gray-500">Email and role cannot be changed.</p>

                {profileErr && (
                    <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{profileErr}</div>
                )}
                {profileMsg && (
                    <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">{profileMsg}</div>
                )}

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-xs font-semibold text-gray-400">Full Name</label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                            <input name="name" value={profileForm.name} onChange={onChange} placeholder="Your name"
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-4 text-sm outline-none focus:border-orange-500/50" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-2 block text-xs font-semibold text-gray-400">Phone</label>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                            <input name="phone" value={profileForm.phone} onChange={onChange} placeholder="Phone number"
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-4 text-sm outline-none focus:border-orange-500/50" />
                        </div>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="mb-2 block text-xs font-semibold text-gray-400">Email (read-only)</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                            <input value={admin?.email || ""} disabled
                                className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-sm text-gray-500" />
                        </div>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="mb-2 block text-xs font-semibold text-gray-400">Address</label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-3.5 text-gray-600" />
                            <textarea name="address" value={profileForm.address} onChange={onChange} rows={3} placeholder="Your address"
                                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-4 text-sm outline-none focus:border-orange-500/50" />
                        </div>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="mb-2 block text-xs font-semibold text-gray-400">Profile Image URL</label>
                        <input name="profileImage" value={profileForm.profileImage} onChange={onChange} placeholder="https://..."
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-orange-500/50" />
                        {(profileForm.profileImage || "").trim() ? (
                            <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                <img
                                    src={profileForm.profileImage.trim()}
                                    alt="preview"
                                    className="h-12 w-12 rounded-xl object-cover border border-white/10 bg-black"
                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                                <p className="flex-1 text-xs text-gray-500">Live preview — press Save Changes to apply.</p>
                                <button
                                    type="button"
                                    onClick={() => onChange({ target: { name: "profileImage", value: "" } })}
                                    className="rounded-lg px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <p className="mt-2 text-xs text-gray-600">Paste an image URL to see a live preview here.</p>
                        )}
                    </div>
                </div>

                <button type="submit" disabled={profileSaving}
                    className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50">
                    <Save size={17} /> {profileSaving ? "Saving..." : "Save Changes"}
                </button>
            </form>
        </div>
    );
};

export default AdminDashboard;
