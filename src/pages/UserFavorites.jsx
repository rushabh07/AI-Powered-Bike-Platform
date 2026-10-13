import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Heart,
    Star,
    Trash2,
    ArrowLeft,
    RefreshCw,
    Bike,
    Fuel,
    Gauge,
    BatteryCharging,
    Route,
    ExternalLink,
    AlertTriangle,
    X,
} from "lucide-react";
import Logo from "../components/Logo";
import BrandLogo from "../components/BrandLogo";
import UserAvatar from "../components/UserAvatar";
import { useWishlist } from "../context/WishlistContext";

// =====================================================
// FORMAT HELPERS
// =====================================================
const inr = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN")}`;

const isLoggedIn = () => {
    try {
        return !!(
            localStorage.getItem("token") &&
            localStorage.getItem("user")
        );
    } catch {
        return false;
    }
};

// =====================================================
// WISHLIST CARD
// =====================================================
function WishlistCard({ bike, onRemove, removing }) {
    const navigate = useNavigate();
    const isEV =
        String(bike.category || "").toLowerCase() === "electric";

    return (
        <article className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0f] transition-all duration-300 hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/[0.04]">

            {/* IMAGE */}
            <div className="relative h-52 overflow-hidden bg-zinc-900">
                {bike.image ? (
                    <img
                        src={bike.image}
                        alt={bike.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <Bike size={40} className="text-zinc-700" />
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* CATEGORY BADGE */}
                <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-semibold backdrop-blur-xl">
                    {bike.category || "—"}
                </div>

                {/* HEART BADGE */}
                <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/20 text-orange-400">
                    <Heart size={16} className="fill-current" />
                </div>
            </div>

            {/* CONTENT */}
            <div className="p-5">

                {/* BRAND + NAME */}
                <div className="flex items-center gap-3">
                    <BrandLogo
                        brand={bike.brand}
                        brandLogo={bike.brandLogo}
                        size={34}
                    />
                    <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold uppercase tracking-widest text-orange-500">
                            {bike.brand}
                        </p>
                        <h3 className="truncate text-lg font-black">
                            {bike.name}
                        </h3>
                    </div>
                </div>

                {/* RATING */}
                {bike.rating && (
                    <div className="mt-2.5 flex items-center gap-1.5">
                        <Star
                            size={14}
                            className="fill-orange-500 text-orange-500"
                        />
                        <span className="text-sm font-semibold">
                            {bike.rating}
                        </span>
                        <span className="text-zinc-700">•</span>
                        <span className="text-xs text-zinc-500">
                            {bike.fuel || (isEV ? "Electric" : "Petrol")}
                        </span>
                    </div>
                )}

                {/* SPECS */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {isEV ? (
                        <>
                            <SpecChip
                                icon={<BatteryCharging size={13} />}
                                label="Battery"
                                value={
                                    bike.batteryCapacity
                                        ? `${bike.batteryCapacity} kWh`
                                        : "N/A"
                                }
                            />
                            <SpecChip
                                icon={<Route size={13} />}
                                label="Range"
                                value={
                                    bike.range
                                        ? `${bike.range} km`
                                        : "N/A"
                                }
                            />
                        </>
                    ) : (
                        <>
                            <SpecChip
                                icon={<Gauge size={13} />}
                                label="Engine"
                                value={
                                    bike.engine
                                        ? `${bike.engine} CC`
                                        : "N/A"
                                }
                            />
                            <SpecChip
                                icon={<Fuel size={13} />}
                                label="Fuel"
                                value={bike.fuel || "N/A"}
                            />
                        </>
                    )}
                </div>

                {/* PRICE */}
                <div className="mt-4">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600">
                        Starting from
                    </p>
                    <p className="mt-1 text-xl font-black text-orange-500">
                        {inr(bike.price)}
                    </p>
                </div>

                {/* ACTIONS */}
                <div className="mt-5 flex gap-2">
                    <button
                        onClick={() =>
                            navigate(`/motorcycles/${bike._id}`)
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
                    >
                        <ExternalLink size={15} />
                        View Details
                    </button>

                    <button
                        onClick={() => onRemove(bike._id)}
                        disabled={removing === bike._id}
                        title="Remove from wishlist"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                        {removing === bike._id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400/30 border-t-red-400" />
                        ) : (
                            <Trash2 size={16} />
                        )}
                    </button>
                </div>
            </div>
        </article>
    );
}

function SpecChip({ icon, label, value }) {
    return (
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-2">
            <div className="flex items-center gap-1.5 text-zinc-600">
                {icon}
                <span className="text-[10px] uppercase tracking-wider">
                    {label}
                </span>
            </div>
            <p className="mt-1 text-sm font-semibold">{value}</p>
        </div>
    );
}

// =====================================================
// USER FAVORITES PAGE
// =====================================================
export default function UserFavorites() {
    const navigate = useNavigate();
    const { favorites, loading, error, refetch, toggle } =
        useWishlist();

    const [removing, setRemoving] = useState(null);
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    // Navbar user state
    const [currentUser] = useState(() => {
        try {
            const s = localStorage.getItem("user");
            return s ? JSON.parse(s) : null;
        } catch {
            return null;
        }
    });
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    // Redirect if not logged in
    if (!isLoggedIn()) {
        navigate("/login");
        return null;
    }

    const showToast = (msg, ok = true) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ msg, ok });
        toastTimer.current = setTimeout(() => setToast(null), 2800);
    };

    const handleRemove = async (bikeId) => {
        const bike = favorites.find(
            (b) => String(b._id) === String(bikeId)
        );
        setRemoving(bikeId);
        try {
            await toggle(bikeId, navigate);
            showToast(
                bike
                    ? `${bike.name} removed from wishlist.`
                    : "Removed from wishlist.",
                false
            );
        } catch {
            showToast("Failed to remove. Please try again.", false);
        } finally {
            setRemoving(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("wishlistClear"));
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-[#070708] text-white">

            {/* TOAST */}
            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className={`fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-sm font-semibold shadow-2xl backdrop-blur-xl transition-all duration-300 ${
                        toast.ok
                            ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                            : "border-red-500/30 bg-red-500/10 text-red-300"
                    }`}
                >
                    <Heart
                        size={16}
                        className={
                            toast.ok
                                ? "fill-orange-400 text-orange-400"
                                : "text-red-400"
                        }
                    />
                    {toast.msg}
                    <button
                        onClick={() => setToast(null)}
                        className="ml-1 rounded-full p-1 opacity-60 hover:opacity-100"
                    >
                        <X size={13} />
                    </button>
                </div>
            )}

            {/* =====================================================
                NAVBAR
            ===================================================== */}
            <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#070708]/90 backdrop-blur-2xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-6">

                    {/* LOGO */}
                    <Link to="/">
                        <Logo />
                    </Link>

                    {/* NAV LINKS */}
                    <div className="hidden items-center gap-8 md:flex">
                        <Link
                            to="/"
                            className="text-sm text-zinc-500 transition hover:text-white"
                        >
                            Home
                        </Link>
                        <Link
                            to="/motorcycles"
                            className="text-sm text-zinc-500 transition hover:text-white"
                        >
                            Motorcycles
                        </Link>
                        <Link
                            to="/ai-advisor"
                            className="text-sm text-zinc-500 transition hover:text-white"
                        >
                            AI Advisor
                        </Link>
                        <Link
                            to="/user/dashboard"
                            className="text-sm text-zinc-500 transition hover:text-white"
                        >
                            Dashboard
                        </Link>
                    </div>

                    {/* USER */}
                    <div className="flex items-center gap-2">
                        {currentUser ? (
                            <div className="relative">
                                <button
                                    onClick={() =>
                                        setUserMenuOpen(!userMenuOpen)
                                    }
                                    className="flex items-center gap-2.5 rounded-xl border border-white/10 py-1.5 pl-1.5 pr-3 transition hover:border-orange-500/40"
                                >
                                    <UserAvatar
                                        user={currentUser}
                                        size={32}
                                    />
                                    <span className="hidden text-left sm:block">
                                        <span className="block max-w-[120px] truncate text-sm font-semibold">
                                            {currentUser.name}
                                        </span>
                                        <span className="block text-xs capitalize text-orange-500">
                                            {currentUser.role}
                                        </span>
                                    </span>
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#111113] shadow-2xl">
                                        <div className="border-b border-white/10 px-4 py-3">
                                            <p className="truncate text-sm font-semibold">
                                                {currentUser.name}
                                            </p>
                                            <p className="truncate text-xs text-zinc-500">
                                                {currentUser.email}
                                            </p>
                                        </div>
                                        <Link
                                            to="/user/dashboard"
                                            onClick={() =>
                                                setUserMenuOpen(false)
                                            }
                                            className="block px-4 py-3 text-sm transition hover:bg-orange-500/10 hover:text-orange-400"
                                        >
                                            My Dashboard
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="block w-full px-4 py-3 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black shadow-lg transition hover:bg-orange-400"
                            >
                                Get Started
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* =====================================================
                HEADER
            ===================================================== */}
            <section className="relative overflow-hidden border-b border-white/[0.08]">
                {/* BG GLOWS */}
                <div className="pointer-events-none absolute -left-40 top-0 h-[400px] w-[400px] rounded-full bg-orange-500/[0.07] blur-[120px]" />
                <div className="pointer-events-none absolute right-[-100px] top-10 h-[300px] w-[300px] rounded-full bg-orange-500/[0.04] blur-[120px]" />

                {/* GRID */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
                        backgroundSize: "60px 60px",
                    }}
                />

                <div className="relative mx-auto max-w-7xl px-5 py-12 md:px-6 md:py-16">

                    {/* BACK */}
                    <button
                        onClick={() => navigate(-1)}
                        className="group mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-400 backdrop-blur-xl transition-all duration-300 hover:-translate-x-1 hover:border-orange-500/40 hover:text-orange-400"
                    >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] transition group-hover:bg-orange-500 group-hover:text-black">
                            <ArrowLeft size={14} />
                        </span>
                        Back
                    </button>

                    {/* TITLE ROW */}
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <div className="mb-4 flex items-center gap-2.5">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15">
                                    <Heart
                                        size={20}
                                        className="fill-orange-500 text-orange-500"
                                    />
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-400">
                                    My Wishlist
                                </span>
                            </div>

                            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                                Saved{" "}
                                <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                                    Motorcycles
                                </span>
                            </h1>

                            <p className="mt-3 text-zinc-400">
                                {loading
                                    ? "Loading your wishlist..."
                                    : favorites.length === 0
                                        ? "Your wishlist is empty."
                                        : `${favorites.length} motorcycle${favorites.length !== 1 ? "s" : ""} saved to your wishlist`}
                            </p>
                        </div>

                        {/* REFRESH */}
                        <button
                            onClick={refetch}
                            disabled={loading}
                            title="Refresh wishlist"
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-zinc-400 transition hover:border-orange-500/30 hover:text-white disabled:opacity-50"
                        >
                            <RefreshCw
                                size={15}
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>
                    </div>
                </div>
            </section>

            {/* =====================================================
                MAIN CONTENT
            ===================================================== */}
            <main className="mx-auto max-w-7xl px-5 py-10 md:px-6 md:py-12">

                {/* ERROR */}
                {error && !loading && (
                    <div className="mb-8 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
                        <AlertTriangle
                            size={18}
                            className="mt-0.5 shrink-0 text-red-400"
                        />
                        <div>
                            <p className="text-sm font-semibold text-red-300">
                                {error}
                            </p>
                            <button
                                onClick={refetch}
                                className="mt-1.5 text-xs text-red-400 underline hover:text-red-300"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                )}

                {/* LOADING */}
                {loading && (
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                                key={i}
                                className="h-[420px] animate-pulse rounded-2xl bg-white/[0.04]"
                            />
                        ))}
                    </div>
                )}

                {/* EMPTY */}
                {!loading && favorites.length === 0 && !error && (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] py-24 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-500/10">
                            <Heart
                                size={36}
                                className="text-orange-500"
                            />
                        </div>

                        <h2 className="mt-6 text-2xl font-bold">
                            Your wishlist is empty
                        </h2>
                        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                            Browse motorcycles and hit the ❤️ button to
                            save bikes you love. They'll show up here,
                            synced from your account.
                        </p>

                        <Link
                            to="/motorcycles"
                            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-7 py-3.5 text-sm font-bold text-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-400"
                        >
                            <Bike size={17} />
                            Explore Motorcycles
                        </Link>
                    </div>
                )}

                {/* GRID */}
                {!loading && favorites.length > 0 && (
                    <>
                        {/* QUICK STATS BAR */}
                        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15">
                                    <Heart
                                        size={17}
                                        className="fill-orange-500 text-orange-500"
                                    />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-500">
                                        Saved bikes
                                    </p>
                                    <p className="text-lg font-black">
                                        {favorites.length}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Link
                                    to="/motorcycles"
                                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-400 transition hover:border-orange-500/30 hover:text-orange-400"
                                >
                                    + Add More
                                </Link>
                                <Link
                                    to="/user/dashboard"
                                    className="rounded-xl bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-400 transition hover:bg-orange-500/20"
                                >
                                    View Dashboard
                                </Link>
                            </div>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {favorites.map((bike) => (
                                <WishlistCard
                                    key={bike._id}
                                    bike={bike}
                                    onRemove={handleRemove}
                                    removing={removing}
                                />
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="mt-12 flex justify-center">
                            <Link
                                to="/motorcycles"
                                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-4 text-sm font-semibold text-zinc-400 transition hover:border-orange-500/30 hover:bg-orange-500/5 hover:text-orange-400"
                            >
                                <Bike size={17} />
                                Discover More Motorcycles
                            </Link>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
