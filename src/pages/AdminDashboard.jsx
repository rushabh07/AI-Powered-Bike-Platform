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
    ShoppingCart,
    CheckCircle,
    Clock,
} from "lucide-react";
import UserAvatar from "../components/UserAvatar";
import BrandLogo from "../components/BrandLogo";
import { optimizeThumbnail } from "../utils/imageOptimizer";

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

const VariantsSection = ({ motorcycles, apiUrl }) => {
    const [selectedBike, setSelectedBike] = useState("");
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingVariant, setEditingVariant] = useState(null);
    const [form, setForm] = useState({
        variantName: "",
        variantCode: "",
        exShowroomPrice: "",
        engine: "",
        power: "",
        torque: "",
        mileage: "",
        fuel: "Petrol",
        transmission: "Manual",
        weight: "",
        features: "",
        imageUrl: "",
        imageLabel: "Variant",
        cityPrices: [],
        isAvailable: true,
    });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const emptyForm = {
        variantName: "",
        variantCode: "",
        exShowroomPrice: "",
        engine: "",
        power: "",
        torque: "",
        mileage: "",
        fuel: "Petrol",
        transmission: "Manual",
        weight: "",
        features: "",
        imageUrl: "",
        imageLabel: "Variant",
        cityPrices: [],
        isAvailable: true,
    };

    const fetchVariants = async (bikeId) => {
        if (!bikeId) return;
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/variants/motorcycles/${bikeId}`);
            const data = await res.json();
            setVariants(data.variants || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedBike) fetchVariants(selectedBike);
        else setVariants([]);
    }, [selectedBike]);

    const resetForm = () => {
        setForm(emptyForm);
        setEditingVariant(null);
        setShowForm(false);
    };

    const openEdit = (v) => {
        setEditingVariant(v);
        setForm({
            variantName: v.variantName || "",
            variantCode: v.variantCode || "",
            exShowroomPrice: v.exShowroomPrice || "",
            engine: v.engine || "",
            power: v.power || "",
            torque: v.torque || "",
            mileage: v.mileage || "",
            fuel: v.fuel || "Petrol",
            transmission: v.transmission || "Manual",
            weight: v.weight || "",
            features: (v.features || []).join(", "),
            imageUrl: v.images?.[0]?.url || "",
            imageLabel: v.images?.[0]?.label || "Variant",
            cityPrices: (v.cityPrices || []).map((cp) => ({ ...cp })),
            isAvailable: v.isAvailable !== false,
        });
        setShowForm(true);
    };

    const addCity = () => {
        setForm((prev) => ({
            ...prev,
            cityPrices: [...prev.cityPrices, { city: "", roadTax: "" }],
        }));
    };

    const removeCity = (index) => {
        setForm((prev) => ({
            ...prev,
            cityPrices: prev.cityPrices.filter((_, i) => i !== index),
        }));
    };

    const updateCity = (index, field, value) => {
        setForm((prev) => ({
            ...prev,
            cityPrices: prev.cityPrices.map((cp, i) =>
                i === index ? { ...cp, [field]: field === "roadTax" ? (value === "" ? "" : Number(value)) : value } : cp
            ),
        }));
    };

    const handleSave = async () => {
        if (!form.variantName.trim()) {
            setMsg("Variant name is required.");
            return;
        }
        if (!form.exShowroomPrice || Number(form.exShowroomPrice) <= 0) {
            setMsg("Valid price is required.");
            return;
        }
        const validCities = form.cityPrices.filter((cp) => cp.city.trim() && cp.roadTax !== "" && Number(cp.roadTax) > 0);
        if (validCities.length === 0) {
            setMsg("Add at least one city with road tax.");
            return;
        }
        setSaving(true);
        setMsg("");
        try {
            const payload = {
                motorcycle: selectedBike,
                variantName: form.variantName.trim(),
                variantCode: form.variantCode.trim(),
                exShowroomPrice: Number(form.exShowroomPrice),
                engine: Number(form.engine) || 0,
                power: Number(form.power) || 0,
                torque: form.torque ? Number(form.torque) : null,
                mileage: Number(form.mileage) || 0,
                fuel: form.fuel,
                transmission: form.transmission,
                weight: form.weight ? Number(form.weight) : null,
                features: form.features.split(",").map((f) => f.trim()).filter(Boolean),
                images: form.imageUrl.trim() ? [{ url: form.imageUrl.trim(), label: form.imageLabel.trim() || "Variant" }] : [],
                cityPrices: validCities.map((cp) => ({ city: cp.city.trim(), roadTax: Number(cp.roadTax) })),
                isAvailable: form.isAvailable,
            };
            const res = await fetch(
                editingVariant ? `${apiUrl}/variants/${editingVariant._id}` : `${apiUrl}/variants`,
                {
                    method: editingVariant ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                    body: JSON.stringify(payload),
                }
            );
            const data = await res.json();
            if (!res.ok) {
                setMsg(data.message || "Failed to save variant.");
                return;
            }
            setMsg(editingVariant ? "Variant updated." : "Variant created.");
            resetForm();
            fetchVariants(selectedBike);
        } catch (err) {
            setMsg("Failed to save variant.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (variantId) => {
        if (!window.confirm("Delete this variant?")) return;
        try {
            const res = await fetch(`${apiUrl}/variants/${variantId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            if (res.ok) {
                setMsg("Variant deleted.");
                fetchVariants(selectedBike);
            }
        } catch (err) {
            setMsg("Failed to delete variant.");
        }
    };

    const toggleAvailability = async (v) => {
        try {
            await fetch(`${apiUrl}/variants/${v._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ isAvailable: !v.isAvailable }),
            });
            fetchVariants(selectedBike);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold">Variant Management</h2>
                    <p className="text-sm text-zinc-500">
                        Create and manage motorcycle variants.
                    </p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    disabled={!selectedBike}
                    className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-40"
                >
                    <Plus size={16} />
                    Add Variant
                </button>
            </div>

            {msg && (
                <div className="mb-4 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
                    {msg}
                </div>
            )}

            <div className="mb-6">
                <label className="block text-xs font-semibold text-zinc-400 mb-2">
                    Select Motorcycle
                </label>
                <select
                    value={selectedBike}
                    onChange={(e) => setSelectedBike(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 appearance-none cursor-pointer"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                    }}
                >
                    <option value="" className="bg-[#111] text-white">Choose a motorcycle</option>
                    {motorcycles.map((m) => (
                        <option key={m._id} value={m._id} className="bg-[#111] text-white">
                            {m.brand} {m.name}
                        </option>
                    ))}
                </select>
            </div>

            {showForm && (
                <div className="mb-6 rounded-2xl border border-white/10 bg-[#0c0c0c] p-6">
                    <h3 className="font-bold mb-4">
                        {editingVariant ? "Edit Variant" : "New Variant"}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-xs font-semibold text-zinc-400">
                            Variant Name *
                            <input
                                value={form.variantName}
                                onChange={(e) => setForm({ ...form, variantName: e.target.value })}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400">
                            Variant Code
                            <input
                                value={form.variantCode}
                                onChange={(e) => setForm({ ...form, variantCode: e.target.value })}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400">
                            Ex-showroom Price *
                            <input
                                type="number"
                                value={form.exShowroomPrice}
                                onChange={(e) => setForm({ ...form, exShowroomPrice: e.target.value })}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400">
                            Engine (CC)
                            <input
                                type="number"
                                value={form.engine}
                                onChange={(e) => setForm({ ...form, engine: e.target.value })}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400">
                            Power (HP)
                            <input
                                type="number"
                                value={form.power}
                                onChange={(e) => setForm({ ...form, power: e.target.value })}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400">
                            Torque (Nm)
                            <input
                                type="number"
                                value={form.torque}
                                onChange={(e) => setForm({ ...form, torque: e.target.value })}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400">
                            Mileage (km/l)
                            <input
                                type="number"
                                value={form.mileage}
                                onChange={(e) => setForm({ ...form, mileage: e.target.value })}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400">
                            Weight (kg)
                            <input
                                type="number"
                                value={form.weight}
                                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400">
                            Features (comma separated)
                            <input
                                value={form.features}
                                onChange={(e) => setForm({ ...form, features: e.target.value })}
                                placeholder="ABS, LED, Digital Console"
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400">
                            Image URL
                            <input
                                value={form.imageUrl}
                                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                                placeholder="https://..."
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-zinc-400">
                            Image Label
                            <input
                                value={form.imageLabel}
                                onChange={(e) => setForm({ ...form, imageLabel: e.target.value })}
                                placeholder="Front, Side, Rear"
                                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </label>
                    </div>

                    {/* City-wise Road Tax */}
                    <div className="mt-5">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-zinc-400">
                                City-wise Road Tax *
                            </p>
                            <button
                                onClick={addCity}
                                className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 transition hover:border-orange-500/40 hover:text-orange-400"
                            >
                                <Plus size={12} />
                                Add City
                            </button>
                        </div>
                        {form.cityPrices.length === 0 ? (
                            <p className="text-xs text-zinc-600 py-2">
                                No cities added. Click "Add City" to set road tax per city.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {form.cityPrices.map((cp, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            value={cp.city}
                                            onChange={(e) => updateCity(i, "city", e.target.value)}
                                            placeholder="City name"
                                            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                                        />
                                        <input
                                            type="number"
                                            value={cp.roadTax}
                                            onChange={(e) => updateCity(i, "roadTax", e.target.value)}
                                            placeholder="Road Tax (₹)"
                                            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                                        />
                                        <button
                                            onClick={() => removeCity(i)}
                                            aria-label="Remove city"
                                            className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-zinc-400">
                            <input
                                type="checkbox"
                                checked={form.isAvailable}
                                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                                className="rounded"
                            />
                            Available
                        </label>
                    </div>
                    <div className="mt-5 flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                        >
                            <Save size={15} />
                            {saving ? "Saving..." : "Save Variant"}
                        </button>
                        <button
                            onClick={resetForm}
                            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                </div>
            ) : variants.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
                    <Gauge size={32} className="mx-auto text-zinc-600 mb-3" />
                    <p className="text-zinc-500">
                        {selectedBike
                            ? "No variants found. Create one above."
                            : "Select a motorcycle to manage variants."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {variants.map((v) => (
                        <div
                            key={v._id}
                            className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold">{v.variantName}</p>
                                        {v.variantCode && (
                                            <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                                                {v.variantCode}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-orange-400 mt-1">
                                        ₹{Number(v.exShowroomPrice).toLocaleString("en-IN")}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                                        {v.engine > 0 && <span>{v.engine} CC</span>}
                                        {v.power > 0 && <span>{v.power} HP</span>}
                                        {v.mileage > 0 && <span>{v.mileage} km/l</span>}
                                        {v.fuel && <span>{v.fuel}</span>}
                                    </div>
                                    {v.features && v.features.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {v.features.slice(0, 4).map((f) => (
                                                <span
                                                    key={f}
                                                    className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-400"
                                                >
                                                    {f}
                                                </span>
                                            ))}
                                            {v.features.length > 4 && (
                                                <span className="text-[10px] text-zinc-500">
                                                    +{v.features.length - 4} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {v.cityPrices && v.cityPrices.length > 0 && (
                                        <p className="mt-2 text-[10px] text-zinc-600">
                                            {v.cityPrices.length} cities configured
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => toggleAvailability(v)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                            v.isAvailable
                                                ? "bg-emerald-500/10 text-emerald-400"
                                                : "bg-zinc-500/10 text-zinc-500"
                                        }`}
                                    >
                                        {v.isAvailable ? "Active" : "Disabled"}
                                    </button>
                                    <button
                                        onClick={() => openEdit(v)}
                                        aria-label="Edit variant"
                                        className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                                    >
                                        <Pencil size={15} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(v._id)}
                                        aria-label="Delete variant"
                                        className="rounded-lg p-2 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

const ReviewsSection = ({ apiUrl }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [deleting, setDeleting] = useState("");

    const fetchReviews = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${apiUrl}/reviews`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to load reviews");
            }
            setReviews(data.reviews || []);
        } catch (err) {
            setError(err.message || "Unable to load reviews.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleDelete = async (reviewId) => {
        if (!window.confirm("Delete this review permanently?")) return;
        setDeleting(reviewId);
        try {
            const res = await fetch(`${apiUrl}/reviews/${reviewId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to delete");
            }
            setReviews((prev) => prev.filter((r) => r._id !== reviewId));
        } catch (err) {
            alert(err.message || "Failed to delete review.");
        } finally {
            setDeleting("");
        }
    };

    const filteredReviews = reviews.filter((r) => {
        const q = search.toLowerCase();
        if (!q) return true;
        return (
            r.user?.name?.toLowerCase().includes(q) ||
            r.user?.email?.toLowerCase().includes(q) ||
            r.motorcycle?.name?.toLowerCase().includes(q) ||
            r.motorcycle?.brand?.toLowerCase().includes(q) ||
            r.comment?.toLowerCase().includes(q)
        );
    });

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold">Review Management</h2>
                    <p className="text-sm text-zinc-500">
                        Moderate and manage user reviews.
                    </p>
                </div>
                <button
                    onClick={fetchReviews}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold transition hover:bg-white/10 disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {error && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
                    <span>{error}</span>
                    <button
                        onClick={fetchReviews}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold hover:border-orange-500/40 hover:text-orange-400 transition"
                    >
                        Retry
                    </button>
                </div>
            )}

            <div className="mb-6">
                <div className="relative">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by user, motorcycle, or comment..."
                        className="w-full rounded-xl border border-white/10 bg-[#111] py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-orange-500/50"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                </div>
            ) : filteredReviews.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
                    <Star size={32} className="mx-auto text-zinc-600 mb-3" />
                    <p className="text-zinc-500">
                        {search ? "No reviews match your search." : "No reviews found."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredReviews.map((r) => (
                        <div
                            key={r._id}
                            className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm shrink-0">
                                            {r.user?.name?.charAt(0)?.toUpperCase() || "?"}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm truncate">
                                                {r.user?.name || "Unknown User"}
                                            </p>
                                            <p className="text-xs text-zinc-500 truncate">
                                                {r.user?.email || "—"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    size={13}
                                                    className={
                                                        s <= r.rating
                                                            ? "fill-orange-400 text-orange-400"
                                                            : "text-zinc-600"
                                                    }
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs text-zinc-500">
                                            {new Date(r.createdAt).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </div>
                                    {r.motorcycle && (
                                        <p className="text-xs font-semibold text-orange-500 mb-2">
                                            {r.motorcycle.brand} {r.motorcycle.name}
                                        </p>
                                    )}
                                    <p className="text-sm text-zinc-300 leading-relaxed">
                                        {r.comment}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(r._id)}
                                    disabled={deleting === r._id}
                                    aria-label="Delete review"
                                    className="shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
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

    // Dashboard stats state
    const [dashStats, setDashStats] = useState(null);
    const [dashStatsLoading, setDashStatsLoading] = useState(true);
    const [dashStatsError, setDashStatsError] = useState("");

    const getToken = () => localStorage.getItem("token");

    const fetchDashboardStats = async () => {
        setDashStatsLoading(true);
        setDashStatsError("");
        try {
            const res = await fetch(`${ADMIN_API}/dashboard/stats`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to load stats");
            }
            setDashStats(data.stats);
        } catch (err) {
            setDashStatsError(err.message || "Unable to load dashboard stats.");
        } finally {
            setDashStatsLoading(false);
        }
    };

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
        if (activeTab === "dashboard") fetchDashboardStats();
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
    // PAGINATION
    // --------------------------------------------------
    const ITEMS_PER_PAGE = 8;
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(filteredMotorcycles.length / ITEMS_PER_PAGE));

    const paginatedMotorcycles = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredMotorcycles.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredMotorcycles, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

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
                description: form.description.trim()
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

                            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                                Admin
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="rounded-xl border border-white/10 p-2"
                        aria-label="Toggle navigation menu"
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

                                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                                    Admin Panel
                                </p>
                            </div>

                        </div>

                        {/* NAVIGATION */}

                        <nav className="flex-1 space-y-2 px-4 py-6">
                            {[
                                { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={19} /> },
                                { id: "motorcycles", label: "Motorcycles", icon: <Bike size={19} /> },
                                { id: "variants", label: "Variants", icon: <Gauge size={19} /> },
                                { id: "reviews", label: "Reviews", icon: <Star size={19} /> },
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
                                        <p className="truncate text-xs text-gray-400">
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
                                    {activeTab === "database" && "Database"}
                                    {activeTab === "profile" && "Admin Profile"}
                                </h2>

                                <p className="mt-2 max-w-xl text-sm text-gray-400">
                                    {activeTab === "dashboard" && "Overview of your MOTOAI platform."}
                                    {activeTab === "motorcycles" && "Manage your MOTOAI motorcycle inventory from one place."}
                                    {activeTab === "database" && "Inspect collections, brand/category breakdown and users."}
                                    {activeTab === "profile" && "View and edit your administrator profile."}
                                </p>

                            </div>

                            <div className="flex gap-3">
                                {(activeTab === "dashboard" || activeTab === "motorcycles") && (
                                    <>
                                        <button
                                            onClick={fetchMotorcycles}
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
                        <div className="mb-8">
                            {dashStatsError && (
                                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
                                    <span>{dashStatsError}</span>
                                    <button
                                        onClick={fetchDashboardStats}
                                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold hover:border-orange-500/40 hover:text-orange-400 transition"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {dashStatsLoading ? (
                                    <>
                                        {[...Array(7)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5 animate-pulse min-h-[142px]"
                                            >
                                                <div className="h-10 w-10 rounded-xl bg-white/5 mb-5" />
                                                <div className="h-3.5 w-24 bg-white/5 rounded mb-3" />
                                                <div className="h-7 w-20 bg-white/5 rounded" />
                                            </div>
                                        ))}
                                    </>
                                ) : dashStats ? (
                                    <>
                                        <StatCard
                                            icon={<Crown size={20} />}
                                            label="Active Premium Users"
                                            value={dashStats.activePremiumUsers}
                                        />
                                        <StatCard
                                            icon={<Gauge size={20} />}
                                            label="Total Variants"
                                            value={dashStats.totalVariants}
                                        />
                                        <StatCard
                                            icon={<Star size={20} />}
                                            label="Total Reviews"
                                            value={dashStats.totalReviews}
                                        />
                                        <StatCard
                                            icon={<ShoppingCart size={20} />}
                                            label="Total Orders"
                                            value={dashStats.totalOrders}
                                        />
                                        <StatCard
                                            icon={<CheckCircle size={20} />}
                                            label="Paid Orders"
                                            value={dashStats.paidOrders}
                                        />
                                        <StatCard
                                            icon={<Clock size={20} />}
                                            label="Pending Orders"
                                            value={dashStats.pendingOrders}
                                        />
                                        <StatCard
                                            icon={<IndianRupee size={20} />}
                                            label="Total Revenue"
                                            value={formatPrice(dashStats.totalRevenue)}
                                        />
                                    </>
                                ) : null}
                            </div>

                            {dashStats && (
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={fetchDashboardStats}
                                        disabled={dashStatsLoading}
                                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold transition hover:bg-white/10 disabled:opacity-50"
                                    >
                                        <RefreshCw size={14} className={dashStatsLoading ? "animate-spin" : ""} />
                                        {dashStatsLoading ? "Refreshing..." : "Refresh Dashboard"}
                                    </button>
                                </div>
                            )}
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

                                    <p className="mt-1 text-xs text-gray-400">
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

                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[950px]">
                                        <thead>
                                            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-400">
                                                <th className="px-6 py-4">Motorcycle</th>
                                                <th className="px-6 py-4">Category</th>
                                                <th className="px-6 py-4">Price</th>
                                                <th className="px-6 py-4">Engine</th>
                                                <th className="px-6 py-4">Power</th>
                                                <th className="px-6 py-4">Rating</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...Array(6)].map((_, i) => (
                                                <tr key={i} className="border-b border-white/5 animate-pulse">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-14 w-20 rounded-xl bg-white/5 shrink-0" />
                                                            <div className="space-y-2">
                                                                <div className="h-4 w-32 rounded bg-white/5" />
                                                                <div className="h-3 w-20 rounded bg-white/5" />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="h-6 w-20 rounded-full bg-white/5" />
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="h-5 w-24 rounded bg-white/5" />
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="h-4 w-16 rounded bg-white/5" />
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="h-4 w-16 rounded bg-white/5" />
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="h-4 w-12 rounded bg-white/5" />
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="inline-flex gap-2">
                                                            <div className="h-9 w-9 rounded-lg bg-white/5" />
                                                            <div className="h-9 w-9 rounded-lg bg-white/5" />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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

                                    <p className="mt-2 text-sm text-gray-400">
                                        Add a motorcycle or change your search.
                                    </p>

                                </div>

                            ) : (
                                <>
                                <div className="overflow-x-auto">

                                    <table className="w-full min-w-[950px]">

                                        <thead>
                                            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-400">

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

                                            {paginatedMotorcycles.map(
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
                                                                            src={optimizeThumbnail(bike.image, 180)}
                                                                            alt={bike.name}
                                                                            width="80"
                                                                            height="56"
                                                                            loading="lazy"
                                                                            decoding="async"
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
                                                                    aria-label={`Edit ${bike.name}`}
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
                                                                    aria-label={`Delete ${bike.name}`}
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

                                {totalPages > 1 && (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 px-6 py-4 bg-white/[0.01]">
                                        <p className="text-xs text-gray-400">
                                            Showing <span className="font-semibold text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                                            <span className="font-semibold text-white">{Math.min(currentPage * ITEMS_PER_PAGE, filteredMotorcycles.length)}</span> of{" "}
                                            <span className="font-semibold text-white">{filteredMotorcycles.length}</span> motorcycles
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                aria-label="Previous page"
                                                className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <ChevronLeft size={16} />
                                                Previous
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {[...Array(totalPages)].map((_, i) => {
                                                    const page = i + 1;
                                                    if (
                                                        page === 1 ||
                                                        page === totalPages ||
                                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                                    ) {
                                                        return (
                                                            <button
                                                                key={page}
                                                                type="button"
                                                                onClick={() => setCurrentPage(page)}
                                                                aria-label={`Go to page ${page}`}
                                                                className={`h-8 w-8 rounded-xl text-xs font-bold transition ${
                                                                    currentPage === page
                                                                        ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20"
                                                                        : "border border-white/10 text-gray-300 hover:bg-white/5"
                                                                }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        );
                                                    }
                                                    if (page === currentPage - 2 || page === currentPage + 2) {
                                                        return <span key={page} className="px-1 text-gray-600 text-xs">...</span>;
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                aria-label="Next page"
                                                className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Next
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                </>
                            )}

                        </section>
                        )}

                        {/* VARIANTS TAB */}
                        {activeTab === "variants" && (
                            <VariantsSection
                                motorcycles={motorcycles}
                                apiUrl="http://localhost:5000/api/variants"
                            />
                        )}

                        {/* REVIEWS TAB */}
                        {activeTab === "reviews" && (
                            <ReviewsSection
                                apiUrl="http://localhost:5000/api/admin"
                            />
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
                                    aria-label="Close modal"
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
                                                                aria-label="Remove image"
                                                                className="
                                                                self-start
                                                                rounded-lg
                                                                p-2
                                                                text-gray-400
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

            <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">
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
