import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo";
import UserAvatar from "../components/UserAvatar";
import BrandLogo from "../components/BrandLogo";
import {
    Search,
    SlidersHorizontal,
    Heart,
    Star,
    GitCompare,
    X,
    ChevronDown,
    ArrowLeft,
    Sparkles,
    Bike,
} from "lucide-react";

const API = "http://localhost:5000/api/motorcycles";

const categories = [
    "All",
    "Street",
    "Sports",
    "Cruiser",
    "Roadster",
    "Electric",
];

const formatPrice = (price) =>
    `₹${(price / 100000).toFixed(2)} Lakh`;

export default function Motorcycles() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Logged-in user (same source as Homepage navbar)
    const [currentUser, setCurrentUser] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    useEffect(() => {
        const loadUser = () => {
            try {
                const token = localStorage.getItem("token");
                const stored = localStorage.getItem("user");
                if (token && stored) {
                    setCurrentUser(JSON.parse(stored));
                } else {
                    setCurrentUser(null);
                }
            } catch {
                setCurrentUser(null);
            }
        };
        loadUser();
        window.addEventListener("storage", loadUser);
        return () => window.removeEventListener("storage", loadUser);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setCurrentUser(null);
        setUserMenuOpen(false);
        navigate("/login");
    };

    const dashboardPath =
        currentUser?.role === "admin"
            ? "/admin"
            : currentUser?.role === "provider"
              ? "/provider"
              : "/user/dashboard";

    const [bikes, setBikes] = useState([]);

    const [search, setSearch] = useState(
        searchParams.get("search") || ""
    );

    const [category, setCategory] = useState(
        searchParams.get("category") || "All"
    );

    const [brand, setBrand] = useState("All");
    const [maxPrice, setMaxPrice] = useState(1000000);
    const [minEngine, setMinEngine] = useState(0);
    const [sort, setSort] = useState("default");

    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [wishlist, setWishlist] = useState([]);

    // Plan badge (backend is the source of truth)
    const [planBadge, setPlanBadge] = useState(null);
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setPlanBadge(null);
            return;
        }
        fetch("http://localhost:5000/api/subscription/status", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data && data.success) setPlanBadge(data);
            })
            .catch(() => {
                /* badge stays hidden */
            });
    }, [currentUser]);

    // All motorcycles (unfiltered) — used ONLY to derive the
    // dynamic brand filter options (unique brand + first logo).
    const [allBikes, setAllBikes] = useState([]);

    useEffect(() => {
        fetch(API)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) setAllBikes(data.motorcycles || []);
            })
            .catch((error) => {
                console.error(
                    "Brand options fetch error:",
                    error
                );
            });
    }, []);

    // Unique brands with their first available logo (dynamic, from API)
    const brandOptions = allBikes.reduce((list, bike) => {
        if (!bike.brand) return list;
        const existing = list.find(
            (item) =>
                item.brand.toLowerCase() ===
                bike.brand.toLowerCase()
        );
        if (existing) {
            if (!existing.brandLogo && bike.brandLogo) {
                existing.brandLogo = bike.brandLogo;
            }
            return list;
        }
        return [
            ...list,
            {
                brand: bike.brand,
                brandLogo: bike.brandLogo || "",
            },
        ];
    }, []);

    // =====================================
    // SYNC SEARCH FROM URL
    // =====================================
    useEffect(() => {
        const value = searchParams.get("search") || "";
        setSearch(value);

        const urlCategory =
            searchParams.get("category") || "All";

        setCategory(urlCategory);
    }, [searchParams]);

    // =====================================
    // FETCH MOTORCYCLES
    // =====================================
    useEffect(() => {
        setLoading(true);

        const params = new URLSearchParams();

        if (search.trim()) {
            params.set("search", search.trim());
        }

        if (category !== "All") {
            params.set("category", category);
        }

        if (brand !== "All") {
            params.set("brand", brand);
        }

        if (maxPrice < 1000000) {
            params.set("maxPrice", maxPrice);
        }

        if (minEngine > 0) {
            params.set("minEngine", minEngine);
        }

        if (sort !== "default") {
            params.set("sort", sort);
        }

        fetch(`${API}?${params.toString()}`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error(
                        "Failed to fetch motorcycles"
                    );
                }

                return res.json();
            })
            .then((data) => {
                setBikes(data.motorcycles || []);
                setLoading(false);
            })
            .catch((error) => {
                console.error(
                    "Motorcycle fetch error:",
                    error
                );

                setBikes([]);
                setLoading(false);
            });
    }, [
        search,
        category,
        brand,
        maxPrice,
        minEngine,
        sort,
    ]);

    // =====================================
    // UPDATE SEARCH
    // =====================================
    const updateSearch = (value) => {
        setSearch(value);

        const params = new URLSearchParams(searchParams);

        if (value.trim()) {
            params.set("search", value.trim());
        } else {
            params.delete("search");
        }

        setSearchParams(params);
    };

    // =====================================
    // WISHLIST
    // =====================================
    const toggleWishlist = (id) => {
        setWishlist((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        );
    };

    // =====================================
    // CLEAR FILTERS
    // =====================================
    const clearFilters = () => {
        setSearch("");
        setCategory("All");
        setBrand("All");
        setMaxPrice(1000000);
        setMinEngine(0);
        setSort("default");
        setSearchParams({});
    };

    return (
        <div className="min-h-screen bg-[#070708] text-white">

            {/* =====================================
                NAVBAR
            ===================================== */}
            <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#070708]/85 backdrop-blur-2xl">

                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-6">

                    {/* LOGO */}
                    <Link to="/">
                        <Logo />
                    </Link>

                    {/* DESKTOP NAV */}
                    <div className="hidden items-center gap-9 md:flex">

                        <Link
                            to="/"
                            className="text-sm text-zinc-500 transition hover:text-white"
                        >
                            Home
                        </Link>

                        <span className="relative text-sm font-semibold text-white">
                            Motorcycles

                            <span className="absolute -bottom-5 left-0 h-0.5 w-full rounded-full bg-orange-500" />
                        </span>

                        <Link
                            to="/ai-advisor"
                            className="flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-white"
                        >
                            <Sparkles size={14} />
                            AI Advisor
                        </Link>

                        <Link
                            to="/ai-plan"
                            className="text-sm text-zinc-500 transition hover:text-white"
                        >
                            AI Plan
                        </Link>

                        <Link
                            to="/compare"
                            className="text-sm text-zinc-500 transition hover:text-white"
                        >
                            Compare
                        </Link>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex items-center gap-2">
                        {currentUser &&
                            (planBadge?.plan === "premium" ? (
                                <Link
                                    to="/ai-plan"
                                    title="MOTOAI Premium active"
                                    className="hidden items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-400 transition hover:bg-orange-500/20 sm:flex"
                                >
                                    <span aria-hidden="true">👑</span>
                                    Premium{" "}
                                    {planBadge.planType === "yearly"
                                        ? "Yearly"
                                        : "Monthly"}{" "}
                                    • {planBadge.tokens} Tokens
                                </Link>
                            ) : (
                                <Link
                                    to="/ai-plan"
                                    title="Free plan — view AI plans"
                                    className="hidden rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-400 transition hover:text-white sm:block"
                                >
                                    Free •{" "}
                                    {planBadge?.tokens ?? "—"} Tokens
                                </Link>
                            ))}
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
                                            to={dashboardPath}
                                            onClick={() =>
                                                setUserMenuOpen(false)
                                            }
                                            className="block px-4 py-3 text-left text-sm transition hover:bg-orange-500/10 hover:text-orange-400"
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
                            <>
                                <Link
                                    to="/login"
                                    className="hidden rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white sm:block"
                                >
                                    Login
                                </Link>

                                <Link
                                    to="/register"
                                    className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-orange-500/10 transition hover:bg-orange-400 hover:shadow-orange-500/20"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* =====================================
                PREMIUM HEADER
            ===================================== */}
            <section className="relative overflow-hidden border-b border-white/[0.08]">

                {/* Background Glow */}
                <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-orange-500/[0.08] blur-[120px]" />

                <div className="pointer-events-none absolute right-[-150px] top-20 h-[400px] w-[400px] rounded-full bg-orange-500/[0.05] blur-[120px]" />

                {/* Grid Background */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.035]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
                        backgroundSize: "60px 60px",
                    }}
                />

                <div className="relative mx-auto max-w-7xl px-5 py-14 md:px-6 md:py-20">

                    {/* BACK BUTTON */}
                    <Link
                        to="/"
                        className="group mb-9 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-400 shadow-lg shadow-black/10 backdrop-blur-xl transition-all duration-300 hover:-translate-x-1 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-400"
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] transition group-hover:bg-orange-500 group-hover:text-black">
                            <ArrowLeft size={15} />
                        </span>

                        <span>Back to Home</span>
                    </Link>

                    {/* LABEL */}
                    <div className="mb-5 flex items-center gap-3">

                        <div className="flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3.5 py-1.5">

                            <Sparkles
                                size={14}
                                className="text-orange-400"
                            />

                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-400">
                                AI Motorcycle Discovery
                            </span>

                        </div>
                    </div>

                    {/* HEADING */}
                    <h1 className="max-w-4xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-7xl">

                        Find Your
                        <br />

                        <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                            Perfect Bike.
                        </span>

                    </h1>

                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
                        Explore motorcycles based on your budget,
                        riding style, performance and preferences.
                        Find the machine that fits your journey.
                    </p>

                    {/* =====================================
                        SEARCH
                    ===================================== */}
                    <div className="mt-9 max-w-4xl">

                        <div className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.045] p-2 shadow-2xl shadow-black/20 backdrop-blur-xl transition-all duration-300 focus-within:border-orange-500/40 focus-within:bg-white/[0.06] sm:flex-row sm:items-center">

                            <div className="relative flex-1">

                                <Search
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 transition group-focus-within:text-orange-500"
                                    size={21}
                                />

                                <input
                                    value={search}
                                    aria-label="Search motorcycles"
                                    onChange={(e) =>
                                        updateSearch(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Search bikes, brands, categories or engine..."
                                    className="w-full bg-transparent px-12 py-3.5 text-sm text-white outline-none placeholder:text-zinc-600 md:text-base"
                                />

                                {search && (
                                    <button
                                        aria-label="Clear search"
                                        onClick={() =>
                                            updateSearch("")
                                        }
                                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-white"
                                    >
                                        <X size={17} />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    if (search.trim()) {
                                        setSearchParams({
                                            search: search.trim(),
                                        });
                                    }
                                }}
                                className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3.5 text-sm font-bold text-black shadow-lg shadow-orange-500/10 transition hover:bg-orange-400 hover:shadow-orange-500/20"
                            >
                                <Search size={17} />
                                Search Bikes
                            </button>

                        </div>

                        {/* SEARCH HINTS */}
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">

                            <span className="mr-1 text-zinc-600">
                                Try:
                            </span>

                            {[
                                "KTM",
                                "Yamaha",
                                "Royal Enfield",
                                "349",
                            ].map((item) => (
                                <button
                                    key={item}
                                    onClick={() =>
                                        updateSearch(item)
                                    }
                                    className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-zinc-500 transition hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-400"
                                >
                                    {item}
                                </button>
                            ))}

                        </div>

                    </div>

                </div>
            </section>

            {/* =====================================
                MAIN
            ===================================== */}
            <main className="mx-auto max-w-7xl px-5 py-10 md:px-6 md:py-12">

                {/* TOP CONTROLS */}
                <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">

                    <div>

                        <div className="flex items-center gap-3">

                            <h2 className="text-2xl font-black">
                                Explore Motorcycles
                            </h2>

                            {search && (
                                <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
                                    "{search}"
                                </span>
                            )}

                        </div>

                        <p className="mt-2 text-sm text-zinc-500">
                            {loading
                                ? "Finding motorcycles..."
                                : `${bikes.length} motorcycles found`}
                        </p>

                    </div>

                    <div className="flex gap-3">

                        {/* MOBILE FILTER */}
                        <button
                            aria-expanded={showFilters}
                            onClick={() =>
                                setShowFilters(
                                    !showFilters
                                )
                            }
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium transition hover:border-orange-500/30 hover:bg-orange-500/10 lg:hidden"
                        >
                            <SlidersHorizontal size={17} />
                            Filters
                        </button>

                        {/* SORT */}
                        <div className="relative">

                            <select
                                value={sort}
                                aria-label="Sort motorcycles"
                                onChange={(e) =>
                                    setSort(e.target.value)
                                }
                                className="appearance-none rounded-xl border border-white/10 bg-[#111113] px-5 py-3 pr-11 text-sm outline-none transition hover:border-white/20 focus:border-orange-500/50"
                            >
                                <option value="default">
                                    Sort: Recommended
                                </option>

                                <option value="price-low">
                                    Price: Low to High
                                </option>

                                <option value="price-high">
                                    Price: High to Low
                                </option>

                                <option value="rating">
                                    Top Rated
                                </option>

                                <option value="mileage">
                                    Best Mileage
                                </option>
                            </select>

                            <ChevronDown
                                size={16}
                                className="pointer-events-none absolute right-3 top-3.5 text-zinc-500"
                            />

                        </div>

                    </div>
                </div>

                {/* =====================================
                    CONTENT
                ===================================== */}
                <div className="grid gap-8 lg:grid-cols-[250px_1fr]">

                    {/* =====================================
                        FILTERS
                    ===================================== */}
                    <aside
                        className={`${showFilters
                            ? "block"
                            : "hidden"
                            } h-fit rounded-2xl border border-white/10 bg-white/[0.025] p-5 lg:block`}
                    >

                        <div className="mb-6 flex items-center justify-between">

                            <div className="flex items-center gap-2">

                                <SlidersHorizontal
                                    size={17}
                                    className="text-orange-500"
                                />

                                <h3 className="font-bold">
                                    Filters
                                </h3>

                            </div>

                            <button
                                onClick={clearFilters}
                                className="text-xs font-medium text-orange-500 hover:text-orange-400"
                            >
                                Clear All
                            </button>

                        </div>

                        <FilterTitle title="Category" />

                        <div className="space-y-1.5">

                            {categories.map((item) => (
                                <button
                                    key={item}
                                    onClick={() =>
                                        setCategory(item)
                                    }
                                    className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${category === item
                                        ? "bg-orange-500 font-semibold text-black shadow-lg shadow-orange-500/10"
                                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    {item}
                                </button>
                            ))}

                        </div>

                        <FilterTitle title="Maximum Price" />

                        <input
                            type="range"
                            min="100000"
                            max="1000000"
                            step="25000"
                            value={maxPrice}
                            onChange={(e) =>
                                setMaxPrice(
                                    Number(e.target.value)
                                )
                            }
                            className="w-full accent-orange-500"
                        />

                        <div className="mt-2 flex justify-between text-xs text-zinc-500">
                            <span>₹1 L</span>
                            <span>₹10 L</span>
                        </div>

                        <p className="mt-3 text-sm font-semibold text-orange-500">
                            Up to {formatPrice(maxPrice)}
                        </p>

                        <FilterTitle title="Minimum Engine" />

                        <select
                            value={minEngine}
                            onChange={(e) =>
                                setMinEngine(
                                    Number(e.target.value)
                                )
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#111113] px-3 py-3 text-sm outline-none focus:border-orange-500/50"
                        >
                            <option value="0">
                                Any Engine
                            </option>

                            <option value="150">
                                150+ CC
                            </option>

                            <option value="200">
                                200+ CC
                            </option>

                            <option value="250">
                                250+ CC
                            </option>

                            <option value="300">
                                300+ CC
                            </option>

                            <option value="400">
                                400+ CC
                            </option>
                        </select>

                    </aside>

                    {/* =====================================
                        BIKES
                    ===================================== */}
                    <section>

                        {/* =====================================
                            BRAND FILTER (dynamic from API)
                        ===================================== */}
                        {brandOptions.length > 0 && (
                            <div className="mb-8">
                                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                                    Shop by Brand
                                </p>

                                <div className="flex gap-3 overflow-x-auto pb-3">
                                    {/* ALL BRANDS */}
                                    <button
                                        onClick={() =>
                                            setBrand("All")
                                        }
                                        className={`flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl border p-3 transition ${brand === "All"
                                            ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10"
                                            : "border-white/10 bg-white/[0.025] hover:border-orange-500/40 hover:bg-orange-500/5"
                                            }`}
                                    >
                                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15 text-xs font-black text-orange-400">
                                            ALL
                                        </span>
                                        <span
                                            className={`text-xs font-semibold ${brand === "All"
                                                ? "text-orange-400"
                                                : "text-zinc-400"
                                                }`}
                                        >
                                            All Brands
                                        </span>
                                    </button>

                                    {brandOptions.map(
                                        (item) => {
                                            const isActive =
                                                brand ===
                                                item.brand;
                                            return (
                                                <button
                                                    key={
                                                        item.brand
                                                    }
                                                    onClick={() =>
                                                        setBrand(
                                                            item.brand
                                                        )
                                                    }
                                                    className={`flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl border p-3 transition ${isActive
                                                        ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10"
                                                        : "border-white/10 bg-white/[0.025] hover:border-orange-500/40 hover:bg-orange-500/5"
                                                        }`}
                                                >
                                                    <BrandLogo
                                                        brand={
                                                            item.brand
                                                        }
                                                        brandLogo={
                                                            item.brandLogo
                                                        }
                                                        size={36}
                                                    />
                                                    <span
                                                        className={`max-w-full truncate text-xs font-semibold ${isActive
                                                            ? "text-orange-400"
                                                            : "text-zinc-400"
                                                            }`}
                                                    >
                                                        {
                                                            item.brand
                                                        }
                                                    </span>
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        )}

                        {loading ? (

                            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">

                                {[1, 2, 3, 4, 5, 6].map(
                                    (item) => (
                                        <div
                                            key={item}
                                            className="h-[430px] animate-pulse rounded-2xl bg-white/[0.04]"
                                        />
                                    )
                                )}

                            </div>

                        ) : bikes.length === 0 ? (

                            <div className="rounded-3xl border border-white/10 bg-white/[0.025] py-24 text-center">

                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-500/10">

                                    <Search
                                        size={32}
                                        className="text-orange-500"
                                    />

                                </div>

                                <h3 className="mt-6 text-xl font-bold">
                                    No motorcycles found
                                </h3>

                                <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                                    We couldn't find bikes
                                    matching your current
                                    search and filters. Try
                                    another brand, model or
                                    category.
                                </p>

                                <button
                                    onClick={clearFilters}
                                    className="mt-7 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
                                >
                                    Clear Filters
                                </button>

                            </div>

                        ) : (

                            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">

                                {bikes.map((bike) => (

                                    <BikeCard
                                        key={bike._id}
                                        bike={bike}
                                        liked={wishlist.includes(
                                            bike._id
                                        )}
                                        onWishlist={() =>
                                            toggleWishlist(
                                                bike._id
                                            )
                                        }
                                        onCompare={() =>
                                            navigate(
                                                `/compare?id=${bike._id}`
                                            )
                                        }
                                    />

                                ))}

                            </div>

                        )}

                    </section>
                </div>
            </main>
        </div>
    );
}

// =====================================
// FILTER TITLE
// =====================================
function FilterTitle({ title }) {
    return (
        <h4 className="mb-3 mt-7 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600">
            {title}
        </h4>
    );
}

// =====================================
// BIKE CARD
// =====================================
function BikeCard({
    bike,
    liked,
    onWishlist,
    onCompare,
}) {
    const isEV =
        String(bike.category || "").toLowerCase() === "electric";

    return (
        <article className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/30 hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-orange-500/[0.04]">

            {/* IMAGE */}
            <div className="relative h-56 overflow-hidden bg-zinc-900">

                <img
                    src={bike.image}
                    alt={bike.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* CATEGORY */}
                <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-semibold backdrop-blur-xl">
                    {bike.category}
                </div>

                {/* WISHLIST */}
                <button
                    onClick={onWishlist}
                    aria-label={liked ? `Remove ${bike.name} from wishlist` : `Save ${bike.name} to wishlist`}
                    aria-pressed={liked}
                    className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 backdrop-blur-xl transition ${liked
                        ? "bg-orange-500 text-black"
                        : "bg-black/60 text-white hover:bg-orange-500 hover:text-black"
                        }`}
                >
                    <Heart
                        size={18}
                        className={
                            liked
                                ? "fill-current"
                                : ""
                        }
                    />
                </button>

            </div>

            {/* CONTENT */}
            <div className="p-5">

                <div className="flex items-center gap-3">
                    <BrandLogo
                        brand={bike.brand}
                        brandLogo={bike.brandLogo}
                        size={36}
                    />

                    <div className="min-w-0">
                        <p className="truncate text-xs font-bold uppercase tracking-wider text-orange-500">
                            {bike.brand}
                        </p>

                        <h3 className="truncate text-xl font-bold">
                            {bike.name}
                        </h3>
                    </div>
                </div>

                <div className="mt-3 flex items-center gap-2">

                    <Star
                        size={15}
                        className="fill-orange-500 text-orange-500"
                    />

                    <span className="text-sm font-medium">
                        {bike.rating}
                    </span>

                    <span className="text-zinc-700">
                        •
                    </span>

                    <span className="text-sm text-zinc-500">
                        {isEV && bike.range
                            ? `${bike.range} km range`
                            : `${bike.mileage} KM/L`}
                    </span>

                </div>

                {/* SPECS */}
                <div className="mt-5 grid grid-cols-2 gap-2">

                    {isEV ? (
                        <>
                            <Spec
                                label="Range"
                                value={
                                    bike.range
                                        ? `${bike.range} km`
                                        : "N/A"
                                }
                            />

                            <Spec
                                label="Battery"
                                value={
                                    bike.batteryCapacity
                                        ? `${bike.batteryCapacity} kWh`
                                        : "N/A"
                                }
                            />
                        </>
                    ) : (
                        <>
                            <Spec
                                label="Engine"
                                value={`${bike.engine} CC`}
                            />

                            <Spec
                                label="Power"
                                value={`${bike.power} HP`}
                            />
                        </>
                    )}

                </div>

                {/* PRICE */}
                <div className="mt-5">

                    <p className="text-xs text-zinc-600">
                        Starting from
                    </p>

                    <p className="mt-1 text-xl font-black text-orange-500">
                        {formatPrice(bike.price)}
                    </p>

                </div>

                {/* BUTTONS */}
                <div className="mt-5 grid grid-cols-2 gap-2">

                    <Link
                        to={`/motorcycles/${bike._id}`}
                        className="rounded-xl bg-orange-500 py-3 text-center text-sm font-bold text-black transition hover:bg-orange-400"
                    >
                        View Details
                    </Link>

                    <button
                        onClick={onCompare}
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-semibold text-zinc-300 transition hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-400"
                    >
                        <GitCompare size={16} />
                        Compare
                    </button>

                </div>
            </div>
        </article>
    );
}

// =====================================
// SPEC
// =====================================
function Spec({ label, value }) {
    return (
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-2.5">

            <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                {label}
            </p>

            <p className="mt-1 text-sm font-semibold">
                {value}
            </p>
        </div>
    );
}