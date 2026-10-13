import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    ArrowLeft,
    MapPin,
    ShieldCheck,
    ShoppingCart,
    AlertTriangle,
    Check,
    Lock,
} from "lucide-react";
import Navbar from "../components/Navbar";
import BrandLogo from "../components/BrandLogo";
import { ApiError, createOrder, getUserProfile, getVariant } from "../services/api";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const steps = ["Bike", "Checkout", "Payment", "Complete"];

const Loading = () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
        <p className="mt-4 text-sm text-zinc-500">Loading checkout...</p>
    </div>
);

const MotorcycleCheckout = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const city = searchParams.get("city") || "";
    const variantId = searchParams.get("variant") || "";

    const [bike, setBike] = useState(null);
    const [variant, setVariant] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [creating, setCreating] = useState(false);
    const [address, setAddress] = useState("");
    const [editingAddress, setEditingAddress] = useState(false);

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");
            if (user?.role === "admin") {
                navigate("/admin", { replace: true });
            }
        } catch {
            /* ignore */
        }
    }, [navigate]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError("");
            try {
                const requests = [
                    fetch(`http://localhost:5000/api/motorcycles/${id}`).then(
                        (r) => r.json()
                    ),
                    getUserProfile(),
                ];
                if (variantId) {
                    requests.push(getVariant(variantId, city));
                }
                const [bikeRes, profileRes, variantRes] = await Promise.all(requests);
                if (!bikeRes.motorcycle) {
                    setError("Motorcycle not found.");
                    return;
                }
                setBike(bikeRes.motorcycle);
                setProfile(profileRes.user);
                setAddress(profileRes.user?.address || "");
                if (variantRes && variantRes.variant) {
                    setVariant(variantRes.variant);
                }
            } catch (err) {
                if (!(err instanceof ApiError && err.status === 401)) {
                    setError(err.message || "Failed to load checkout.");
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const handlePlaceOrder = async () => {
        if (!city) {
            setError("Please select a city.");
            return;
        }
        if (!address.trim()) {
            setError("Please provide a delivery address.");
            return;
        }
        setCreating(true);
        setError("");
        try {
            const payload = { motorcycleId: id, city };
            if (variantId) {
                payload.variantId = variantId;
            }
            const data = await createOrder(payload);
            navigate(`/payment/${data.order._id}`);
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message || "Could not create order.");
            }
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <Loading />;

    if (error && !bike) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <AlertTriangle size={40} className="mx-auto text-red-400 mb-4" />
                    <p className="text-red-300">{error}</p>
                    <button
                        onClick={() => navigate("/motorcycles")}
                        className="mt-6 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black"
                    >
                        Back to Motorcycles
                    </button>
                </div>
            </div>
        );
    }

    if (!bike) return <Loading />;

    const activeExShowroom = variant ? variant.exShowroomPrice : bike.exShowroomPrice || bike.price || 0;
    const activeCityPrices = variant ? variant.cityPrices : bike.cityPrices || [];
    const cityPrice = activeCityPrices.find(
        (cp) => cp.city.toLowerCase() === city.toLowerCase()
    );
    const exShowroom = activeExShowroom;
    const insurance = Math.round(exShowroom * 0.03);
    const onRoad = cityPrice ? exShowroom + cityPrice.roadTax + insurance : 0;
    const total = onRoad;
    const bikeImage = variant?.images?.[0]?.url || bike.images?.[0]?.url || bike.image || "";

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar activeTab="motorcycles" showTokens={true} />

            <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
                {/* Progress Stepper */}
                <div className="flex items-center justify-center gap-0 mb-10">
                    {steps.map((step, i) => (
                        <React.Fragment key={step}>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                                        i <= 1
                                            ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20"
                                            : "bg-white/5 text-zinc-500 border border-white/10"
                                    }`}
                                >
                                    {i < 1 ? <Check size={16} /> : i + 1}
                                </div>
                                <span
                                    className={`mt-2 text-xs font-semibold ${
                                        i <= 1 ? "text-orange-400" : "text-zinc-600"
                                    }`}
                                >
                                    {step}
                                </span>
                            </div>
                            {i < steps.length - 1 && (
                                <div
                                    className={`w-12 sm:w-20 h-0.5 mx-2 mb-6 transition-all duration-300 ${
                                        i < 1 ? "bg-orange-500" : "bg-white/10"
                                    }`}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <button
                    onClick={() => navigate(`/motorcycles/${id}`)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition group mb-6"
                >
                    <ArrowLeft
                        size={18}
                        className="transition-transform group-hover:-translate-x-1"
                    />
                    Back to Motorcycle
                </button>

                <h1 className="text-2xl font-black tracking-tight sm:text-3xl mb-8">
                    Checkout
                </h1>

                {error && (
                    <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                    {/* LEFT — Order Details */}
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-5">
                                Your Motorcycle
                            </h3>
                            <div className="flex items-center gap-5">
                                {bikeImage ? (
                                    <img
                                        src={bikeImage}
                                        alt={bike.name}
                                        className="h-24 w-24 rounded-2xl object-cover"
                                    />
                                ) : (
                                    <div className="h-24 w-24 rounded-2xl bg-zinc-800 flex items-center justify-center">
                                        <BrandLogo
                                            brand={bike.brand}
                                            brandLogo={bike.brandLogo}
                                            size={36}
                                        />
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                                        {bike.brand}
                                    </p>
                                    <p className="text-xl font-bold mt-1">
                                        {bike.name}
                                    </p>
                                    {variant && (
                                        <p className="text-sm font-semibold text-orange-400 mt-0.5">
                                            {variant.variantName} Variant
                                        </p>
                                    )}
                                    <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1">
                                        <MapPin size={12} />
                                        {city}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">
                                        Ex-showroom Price
                                    </span>
                                    <span className="font-semibold">
                                        {inr(exShowroom)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">
                                        Road Tax (RTO)
                                    </span>
                                    <span className="font-semibold">
                                        {cityPrice ? inr(cityPrice.roadTax) : "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">
                                        Insurance (3%)
                                    </span>
                                    <span className="font-semibold">
                                        {cityPrice ? inr(Math.round(exShowroom * 0.03)) : "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-orange-400">
                                        On-road Price
                                    </span>
                                    <span className="text-orange-400">
                                        {cityPrice
                                            ? inr(
                                                  exShowroom +
                                                      cityPrice.roadTax +
                                                      Math.round(exShowroom * 0.03)
                                              )
                                            : "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Quantity</span>
                                    <span className="font-semibold">1</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-5">
                                Delivery Details
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-zinc-500">Name</p>
                                    <p className="font-semibold mt-1">
                                        {profile?.name || "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-500">Phone</p>
                                    <p className="font-semibold mt-1">
                                        {profile?.phone || "—"}
                                    </p>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-zinc-500">
                                            Address
                                        </p>
                                        <button
                                            onClick={() =>
                                                setEditingAddress(!editingAddress)
                                            }
                                            className="text-xs font-semibold text-orange-500 hover:text-orange-400 transition"
                                        >
                                            {editingAddress ? "Done" : "Edit"}
                                        </button>
                                    </div>
                                    {editingAddress ? (
                                        <textarea
                                            value={address}
                                            onChange={(e) =>
                                                setAddress(e.target.value)
                                            }
                                            rows={3}
                                            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 resize-none transition"
                                        />
                                    ) : (
                                        <p className="font-semibold mt-1">
                                            {address || "—"}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT — Price Summary */}
                    <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-6 h-fit sticky top-24">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-5">
                            Price Summary
                        </h3>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-zinc-400">
                                    Ex-showroom
                                </span>
                                <span className="font-semibold">
                                    {inr(exShowroom)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-400">
                                    Road Tax (RTO)
                                </span>
                                <span className="font-semibold">
                                    {cityPrice ? inr(cityPrice.roadTax) : "N/A"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-400">
                                    Insurance (3%)
                                </span>
                                <span className="font-semibold">
                                    {cityPrice ? inr(Math.round(exShowroom * 0.03)) : "N/A"}
                                </span>
                            </div>
                            <div className="border-t border-white/10 pt-3 flex justify-between text-base font-black">
                                <span>On-road Total</span>
                                <span className="text-orange-400">
                                    {cityPrice
                                        ? inr(
                                              exShowroom +
                                                  cityPrice.roadTax +
                                                  Math.round(exShowroom * 0.03)
                                          )
                                        : "N/A"}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handlePlaceOrder}
                            disabled={creating || !cityPrice}
                            className="mt-6 w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {creating ? (
                                "Placing Order..."
                            ) : (
                                <>
                                    <Lock size={14} />
                                    Proceed to Payment
                                </>
                            )}
                        </button>

                        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                            <ShieldCheck size={14} className="text-emerald-400" />
                            Secure payment via Razorpay
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MotorcycleCheckout;
