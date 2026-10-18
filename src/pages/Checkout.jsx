import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    MapPin,
    ShieldCheck,
    Store,
    AlertTriangle,
    Calendar,
    Phone,
    Clock,
    CreditCard,
    CheckCircle2,
    Building2,
    Truck,
} from "lucide-react";
import Navbar from "../components/Navbar";
import BrandLogo from "../components/BrandLogo";
import {
    ApiError,
    getMotorcycle,
    getDealershipsByCity,
    createOfflineOrder,
} from "../services/api";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const Checkout = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [bike, setBike] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [city, setCity] = useState(location.state?.city || "");
    const [color, setColor] = useState(location.state?.color || "");
    const [variantId] = useState(location.state?.variantId || "");
    const [dealerships, setDealerships] = useState([]);
    const [dealershipId, setDealershipId] = useState("");
    const [deliveryMethod, setDeliveryMethod] = useState("collection");
    const [visitDate, setVisitDate] = useState("");
    const [customer, setCustomer] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
    });
    const [submitting, setSubmitting] = useState(false);

    // Minimum visit date = today in YYYY-MM-DD
    const todayStr = useMemo(() => {
        const d = new Date();
        return d.toISOString().split("T")[0];
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login", { state: { from: `/checkout/${id}` } });
            return;
        }

        (async () => {
            setLoading(true);
            try {
                const b = await getMotorcycle(id);
                setBike(b);

                // Auto-pick first color if none supplied
                if (!location.state?.color && b?.colors?.length > 0) {
                    const availableColor = b.colors.find((c) => c.available !== false) || b.colors[0];
                    if (availableColor) setColor(availableColor.name);
                }

                try {
                    const u = JSON.parse(localStorage.getItem("user") || "{}");
                    setCustomer({
                        name: u.name || "",
                        email: u.email || "",
                        phone: u.phone || "",
                        address: u.address || "",
                    });
                } catch {
                    /* ignore */
                }
            } catch (err) {
                if (!(err instanceof ApiError && err.status === 401)) {
                    setError(err.message || "Failed to load motorcycle details.");
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate, location.state]);

    // Fetch dealerships when city changes
    useEffect(() => {
        if (!city) {
            setDealerships([]);
            setDealershipId("");
            return;
        }
        getDealershipsByCity(city)
            .then((d) => {
                const list = d.dealerships || [];
                setDealerships(list);
                if (list.length === 1) {
                    setDealershipId(list[0]._id);
                } else if (!list.some((dealer) => dealer._id === dealershipId)) {
                    setDealershipId("");
                }
            })
            .catch(() => {
                setDealerships([]);
                setDealershipId("");
            });
    }, [city]);

    const cities = useMemo(() => {
        const set = new Set((bike?.cityPrices || []).map((c) => c.city));
        if (city) set.add(city);
        return [...set];
    }, [bike, city]);

    const selectedDealer = dealerships.find((d) => d._id === dealershipId);

    // Calculate live pricing preview
    const pricePreview = useMemo(() => {
        if (!bike) return null;
        const exShowroom = Number(bike.exShowroomPrice || bike.price || 0);
        const cityPrice = (bike.cityPrices || []).find(
            (cp) => cp.city.toLowerCase() === String(city || "").trim().toLowerCase()
        );
        const roadTax = cityPrice ? cityPrice.roadTax : Math.round(exShowroom * 0.1);
        const insurance = Math.round(exShowroom * 0.03);
        const total = exShowroom + roadTax + insurance;
        return { exShowroom, roadTax, insurance, total, hasCityPrice: !!cityPrice };
    }, [bike, city]);

    const handleSubmitRequest = async () => {
        setError("");
        if (!city) {
            setError("Please select a city to find authorized dealerships.");
            return;
        }
        if (!dealershipId) {
            setError("Please select an authorized dealership for your purchase.");
            return;
        }
        if (!customer.name.trim()) {
            setError("Customer full name is required.");
            return;
        }
        if (!customer.phone.trim()) {
            setError("Customer phone number is required.");
            return;
        }
        if (!visitDate) {
            setError("Please choose your preferred showroom visit date.");
            return;
        }
        if (visitDate < todayStr) {
            setError("Preferred visit date cannot be in the past.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                motorcycleId: id,
                city,
                color,
                ...(variantId ? { variantId } : {}),
                dealershipId,
                deliveryMethod,
                visitDate,
                customerDetails: {
                    ...customer,
                    preferredVisitDate: visitDate,
                },
            };

            const data = await createOfflineOrder(payload);
            const order = data.order;
            navigate(`/order-success/${order._id}`);
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message || "Could not submit purchase request. Please try again.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                    <p className="mt-4 text-xs font-semibold text-zinc-500">Loading dealership purchase details...</p>
                </div>
            </div>
        );
    }

    if (!bike) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-zinc-400">Motorcycle not found.</p>
                    <button
                        onClick={() => navigate("/motorcycles")}
                        className="mt-4 rounded-xl bg-orange-500 px-6 py-2.5 text-xs font-bold text-black"
                    >
                        Browse Motorcycles
                    </button>
                </div>
            </div>
        );
    }

    const img = bike.images?.[0]?.url || bike.image || "";
    const bikeColors = (bike.colors || []).filter((c) => c.available !== false);
    const selectedColorObj = bikeColors.find((c) => c.name === color);

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar activeTab="motorcycles" />
            <main className="mx-auto max-w-5xl px-4 sm:px-8 py-8">
                {/* Back Link */}
                <button
                    onClick={() => navigate(`/motorcycles/${id}`)}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
                >
                    <ArrowLeft size={16} /> Back to {bike.brand} {bike.name}
                </button>

                {/* Page Header */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-orange-500/10 border border-orange-500/30 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-orange-400">
                                Offline Purchase Only
                            </span>
                        </div>
                        <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
                            Buy at Dealership — Purchase Request
                        </h1>
                        <p className="mt-1 text-sm text-zinc-400">
                            Reserve this motorcycle at an authorized dealership. Payment is completed in person at the showroom counter.
                        </p>
                    </div>
                </div>

                {/* Reassurance Banner */}
                <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 sm:p-5 flex items-start gap-3.5">
                    <Store className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm text-zinc-300">
                        <p className="font-bold text-white">100% Secure Dealership Purchase</p>
                        <p className="mt-1 text-zinc-400 leading-relaxed">
                            No online payment is collected here. Your request will be sent directly to the authorized showroom.
                            Visit on your scheduled date to inspect the vehicle, verify documents, and pay via Cash, Card, UPI, or Bank Transfer.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3.5 text-sm text-red-300">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-400" />
                        <div>{error}</div>
                    </div>
                )}

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
                    {/* Left Column: Form & Selection */}
                    <div className="space-y-6">
                        {/* 1. Selected Motorcycle Card */}
                        <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4">
                                Selected Motorcycle
                            </h2>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                {img ? (
                                    <img
                                        src={img}
                                        alt={bike.name}
                                        className="h-24 w-28 rounded-xl object-cover border border-white/10"
                                    />
                                ) : (
                                    <div className="h-24 w-28 rounded-xl bg-zinc-800 flex items-center justify-center">
                                        <BrandLogo brand={bike.brand} brandLogo={bike.brandLogo} size={40} />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                                        {bike.brand}
                                    </p>
                                    <h3 className="text-lg font-black text-white">{bike.name}</h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Category: {bike.category || "Standard"} • Engine: {bike.engineCC || "—"}cc
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                                            Available for Booking
                                        </span>
                                        {color && (
                                            <span className="flex items-center gap-1.5 rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
                                                {selectedColorObj?.hexCode && (
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full border border-white/30"
                                                        style={{ backgroundColor: selectedColorObj.hexCode }}
                                                    />
                                                )}
                                                Color: {color}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Color Selector if multiple available */}
                            {bikeColors.length > 1 && (
                                <div className="mt-5 border-t border-white/10 pt-4">
                                    <p className="text-xs font-semibold text-zinc-400 mb-2">Change Color:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {bikeColors.map((c) => (
                                            <button
                                                key={c.name}
                                                type="button"
                                                onClick={() => setColor(c.name)}
                                                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                                                    color === c.name
                                                        ? "border-orange-500 bg-orange-500/10 text-orange-400"
                                                        : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20"
                                                }`}
                                            >
                                                {c.hexCode && (
                                                    <span
                                                        className="h-3 w-3 rounded-full border border-white/20 shrink-0"
                                                        style={{ backgroundColor: c.hexCode }}
                                                    />
                                                )}
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Location & Dealership Selection */}
                        <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-1.5">
                                <Building2 size={15} className="text-orange-500" />
                                1. Select Dealership & City *
                            </h2>

                            <label className="block text-xs font-semibold text-zinc-400">
                                City *
                                <select
                                    value={city}
                                    onChange={(e) => {
                                        setCity(e.target.value);
                                        setDealershipId("");
                                    }}
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                >
                                    <option value="">Select your city</option>
                                    {cities.map((c) => (
                                        <option key={c} value={c} className="bg-[#111] text-white">
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="mt-4">
                                <p className="text-xs font-semibold text-zinc-400 mb-2">
                                    Authorized Dealership *
                                </p>

                                {!city ? (
                                    <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-500">
                                        Please select a city above to see available authorized showrooms.
                                    </div>
                                ) : dealerships.length === 0 ? (
                                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-zinc-400">
                                        No authorized dealerships currently found for <span className="text-white font-bold">{city}</span>.
                                        Please select an alternative nearby city.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {dealerships.map((d) => {
                                            const isSelected = dealershipId === d._id;
                                            const acceptedMethods =
                                                d.acceptedPaymentMethods && d.acceptedPaymentMethods.length > 0
                                                    ? d.acceptedPaymentMethods
                                                    : ["cash", "upi", "card", "bank_transfer"];

                                            return (
                                                <div
                                                    key={d._id}
                                                    onClick={() => setDealershipId(d._id)}
                                                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                                                        isSelected
                                                            ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/5"
                                                            : "border-white/10 bg-white/[0.01] hover:border-white/25 hover:bg-white/[0.02]"
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-extrabold text-white">
                                                                    {d.name}
                                                                </p>
                                                                {isSelected && (
                                                                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-black">
                                                                        Selected
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="mt-1 flex items-start gap-1.5 text-xs text-zinc-400">
                                                                <MapPin size={13} className="shrink-0 mt-0.5 text-orange-500" />
                                                                {d.address}, {d.city}
                                                            </p>
                                                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                                                                <span className="flex items-center gap-1">
                                                                    <Phone size={11} className="text-zinc-400" /> {d.phone}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Clock size={11} className="text-zinc-400" /> {d.openingHours || "Mon-Sat: 10AM - 8PM"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Accepted Offline Payment Methods */}
                                                    <div className="mt-3 border-t border-white/5 pt-2.5">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                                                            Accepted Offline Payments:
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {acceptedMethods.map((m) => (
                                                                <span
                                                                    key={m}
                                                                    className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-300"
                                                                >
                                                                    {m.replace(/_/g, " ")}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Showroom Visit & Offline Payment Preferences */}
                        <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-1.5">
                                <Calendar size={15} className="text-orange-500" />
                                2. Visit Date & Showroom Preferences *
                            </h2>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-400">
                                        Preferred Showroom Visit Date *
                                    </label>
                                    <input
                                        type="date"
                                        min={todayStr}
                                        value={visitDate}
                                        onChange={(e) => setVisitDate(e.target.value)}
                                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                    />
                                    <p className="mt-1 text-[11px] text-zinc-500">
                                        Date you intend to visit the showroom to inspect and pay.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-400">
                                        Vehicle Handover
                                    </label>
                                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                                        {[
                                            ["collection", "Showroom Collection"],
                                            ["delivery", "Home Delivery"],
                                        ].map(([v, label]) => (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => setDeliveryMethod(v)}
                                                className={`rounded-xl border py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                                    deliveryMethod === v
                                                        ? "border-orange-500 bg-orange-500/10 text-orange-400"
                                                        : "border-white/10 text-zinc-400 hover:border-white/20"
                                                }`}
                                            >
                                                {v === "collection" ? <Store size={12} /> : <Truck size={12} />}
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-1 text-[11px] text-zinc-500">
                                        Delivery arrangements confirmed directly with dealership.
                                    </p>
                                </div>
                            </div>

                        </div>

                        {/* 4. Customer Information */}
                        <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4">
                                3. Customer Contact Details *
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-xs font-semibold text-zinc-400">
                                    Full Name *
                                    <input
                                        value={customer.name}
                                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                                        placeholder="Your full legal name"
                                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                    />
                                </label>
                                <label className="block text-xs font-semibold text-zinc-400">
                                    Phone Number *
                                    <input
                                        value={customer.phone}
                                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                                        placeholder="10-digit mobile number"
                                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                    />
                                </label>
                                <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
                                    Email Address
                                    <input
                                        type="email"
                                        value={customer.email}
                                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                                        placeholder="order-updates@example.com"
                                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                    />
                                </label>
                                <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
                                    Address / Landmark (optional)
                                    <textarea
                                        value={customer.address}
                                        onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                                        rows={2}
                                        placeholder="Street, locality, area"
                                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 resize-none"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Order Summary & Submit Button */}
                    <div>
                        <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-6 sticky top-24">
                            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 pb-3 border-b border-white/10">
                                <Store size={16} className="text-orange-500" />
                                Purchase Summary
                            </h2>

                            {/* Summary breakdown */}
                            <div className="space-y-3 text-xs sm:text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Motorcycle</span>
                                    <span className="font-bold text-white text-right">
                                        {bike.brand} {bike.name}
                                    </span>
                                </div>
                                {color && (
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Selected Color</span>
                                        <span className="font-semibold text-zinc-300">{color}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Dealership</span>
                                    <span className="font-semibold text-zinc-300 text-right truncate max-w-[180px]">
                                        {selectedDealer ? selectedDealer.name : "Not selected"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Scheduled Visit</span>
                                    <span className="font-semibold text-orange-400">
                                        {visitDate ? new Date(visitDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Select date"}
                                    </span>
                                </div>

                                <div className="border-t border-white/10 pt-3 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Ex-showroom Price</span>
                                        <span className="font-semibold">{inr(pricePreview?.exShowroom)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Road Tax (RTO)</span>
                                        <span className="font-semibold text-zinc-300">
                                            {pricePreview?.hasCityPrice ? inr(pricePreview.roadTax) : "Calculated per city"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Estimated Insurance</span>
                                        <span className="font-semibold text-zinc-300">
                                            {inr(pricePreview?.insurance)}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-white/10 pt-3 flex justify-between items-baseline">
                                    <span className="font-bold text-white">Estimated On-Road Total</span>
                                    <span className="text-lg font-black text-orange-400">
                                        {inr(pricePreview?.total)}
                                    </span>
                                </div>
                            </div>

                            {/* Payment Method Notice */}
                            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-zinc-400">
                                <p className="font-bold text-white">Payment Method: Offline</p>
                                <p className="mt-1 text-zinc-400">
                                    Pay {inr(pricePreview?.total)} at the dealership counter upon vehicle inspection.
                                </p>
                            </div>

                            {/* Submit Request Button */}
                            <button
                                id="submit-purchase-request-btn"
                                onClick={handleSubmitRequest}
                                disabled={submitting}
                                className="mt-6 w-full rounded-xl bg-orange-500 hover:bg-orange-600 py-3.5 text-sm font-extrabold text-black transition shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                                        Submitting Purchase Request...
                                    </>
                                ) : (
                                    <>
                                        <Store size={16} className="text-black" />
                                        Submit Purchase Request
                                    </>
                                )}
                            </button>

                            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-500">
                                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                                Dealership will confirm request • No online payment charged
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Checkout;
