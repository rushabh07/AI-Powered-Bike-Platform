import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaMotorcycle,
    FaRobot,
    FaSearch,
    FaStar,
    FaArrowRight,
    FaCheckCircle,
    FaShieldAlt,
    FaBolt,
    FaUser,
    FaBars,
    FaTimes,
    FaHeart,
    FaExchangeAlt,
    FaMapMarkerAlt,
    FaFacebook,
    FaInstagram,
    FaTwitter,
    FaYoutube,
    FaLinkedin,
    FaChargingStation
} from "react-icons/fa";
import Logo from "../components/Logo";
import UserAvatar from "../components/UserAvatar";
import ThemeToggle from "../components/ThemeToggle";
import BrandLogo from "../components/BrandLogo";

// ==============================
// API + CATEGORY PRESENTATION META
// All motorcycle data (recommendations, categories) is loaded
// from MongoDB at runtime. This map only holds icons and
// taglines per category name — no motorcycle data.
// ==============================
const BIKES_API = "http://localhost:5000/api/motorcycles";

const CATEGORY_META = {
    Sports: { icon: "🏁", description: "Fast & performance focused" },
    Sport: { icon: "🏁", description: "Fast & performance focused" },
    Cruiser: { icon: "🛣️", description: "Relaxed long-distance rides" },
    Adventure: { icon: "🏔️", description: "Built for every journey" },
    Commuter: { icon: "🏙️", description: "Efficient everyday riding" },
    Street: { icon: "🏍️", description: "Nimble street machines for daily rides" },
    Roadster: { icon: "🏍️", description: "Classic roadsters with modern punch" },
    Electric: { icon: FaChargingStation, description: "Smart electric motorcycles for modern urban riding" },
};

const DEFAULT_CATEGORY_META = {
    icon: "🏍️",
    description: "Explore motorcycles in this category",
};

// ==============================
// TRUST FEATURES
// ==============================
const trustFeatures = [
    [
        FaRobot,
        "AI-Powered",
        "Intelligent recommendations based on your unique riding preferences."
    ],
    [
        FaShieldAlt,
        "Trusted Information",
        "Compare prices, specifications and features before making your decision."
    ],
    [
        FaBolt,
        "Faster Decisions",
        "Find the right motorcycle without spending hours searching."
    ]
];

// ==============================
// AI FEATURES
// ==============================
const aiFeatures = [
    "Personalized motorcycle recommendations",
    "Budget-based bike suggestions",
    "Riding style analysis",
    "Smart motorcycle comparison",
    "AI-powered buying assistance"
];

// ==============================
// FOOTER LINKS
// ==============================
const footerLinks = {
    Platform: [
        ["Explore Motorcycles", "/motorcycles"],
        ["AI Advisor", "/ai-advisor"],
        ["Compare Bikes", "/compare"],
        ["Our Impact", "/impact"],
        ["EMI Calculator", "/emi-calculator"],
        ["Book Test Ride", "/test-ride"]
    ],
    Company: [
        ["About MOTOAI", "/about"],
        ["How It Works", "/how-it-works"],
        ["Find Dealers", "/dealers"],
        ["Careers", "/careers"],
        ["Contact Us", "/contact"]
    ],
    Support: [
        ["Help Center", "/help"],
        ["FAQs", "/faq"],
        ["Privacy Policy", "/privacy"],
        ["Terms & Conditions", "/terms"],
        ["My Account", "/login"]
    ]
};

// ==============================
// SOCIAL ICONS
// ==============================
const socialIcons = [
    [FaFacebook, "Facebook"],
    [FaInstagram, "Instagram"],
    [FaTwitter, "Twitter"],
    [FaYoutube, "YouTube"],
    [FaLinkedin, "LinkedIn"]
];


// ==============================
// BUTTON
// ==============================
const Button = ({
    children,
    onClick,
    primary = false,
    className = ""
}) => (
    <button
        onClick={onClick}
        className={`px-5 py-2.5 rounded-xl transition ${primary
                ? "bg-orange-500 text-black font-bold hover:bg-orange-400"
                : "border border-gray-700 hover:border-orange-500 hover:text-orange-500"
            } ${className}`}
    >
        {children}
    </button>
);

// ==============================
// RECOMMENDATION / MOTORCYCLE CARD (database-driven)
// Displays images, brand, name, variants, specifications,
// ex-showroom price, and city-wise on-road price.
// ==============================
const RecommendationCard = ({ bike, navigate, isAdmin = false }) => {
    const isEV = String(bike.category || "").toLowerCase() === "electric";
    const variants = bike.variants || [];
    const [selectedVariant, setSelectedVariant] = useState(variants[0] || null);
    const [activeImgIndex, setActiveImgIndex] = useState(0);

    const baseExShowroom = bike.exShowroomPrice || bike.price || 0;
    const activeExShowroom = selectedVariant
        ? selectedVariant.exShowroomPrice
        : baseExShowroom;

    const activeCityPrices = (selectedVariant?.cityPrices && selectedVariant.cityPrices.length > 0)
        ? selectedVariant.cityPrices
        : (bike.cityPrices || []);

    const defaultCity = activeCityPrices[0]?.city || "Mumbai";
    const [selectedCity, setSelectedCity] = useState(defaultCity);

    const activeCityPrice = activeCityPrices.find(
        (cp) => cp.city.toLowerCase() === selectedCity.toLowerCase()
    ) || activeCityPrices[0];

    const roadTax = activeCityPrice ? activeCityPrice.roadTax : 0;
    const insurance = Math.round(activeExShowroom * 0.03);
    const onRoadPrice = activeExShowroom + roadTax + insurance;

    const imagesList = Array.isArray(bike.images) && bike.images.length > 0
        ? bike.images
        : (bike.image ? [{ url: bike.image, label: "Main" }] : []);

    const currentImage = imagesList[activeImgIndex]?.url || bike.image || "";

    const priceText = `₹${(activeExShowroom / 100000).toFixed(2)} Lakh`;
    const onRoadText = `₹${(onRoadPrice / 100000).toFixed(2)} Lakh`;

    const engineText = isEV
        ? (bike.range ? `${bike.range} km range` : "Electric")
        : (selectedVariant?.engine || bike.engine ? `${selectedVariant?.engine || bike.engine} CC` : "N/A");

    const mileageText = isEV
        ? (bike.batteryCapacity ? `${bike.batteryCapacity} kWh` : "Electric")
        : (selectedVariant?.mileage || bike.mileage ? `${selectedVariant?.mileage || bike.mileage} KM/L` : "N/A");

    const powerText = isEV
        ? (bike.power ? `${bike.power} kW` : "N/A")
        : (selectedVariant?.power || bike.power ? `${selectedVariant?.power || bike.power} HP` : "N/A");

    const matchText =
        bike.match ||
        `${Math.min(99, Math.round(((Number(bike.rating) || 4.5) / 5) * 100))}%`;

    return (
        <div className="group bg-[#151515] border border-gray-800 rounded-2xl overflow-hidden hover:border-orange-500/50 transition flex flex-col">
            {/* CARD IMAGE */}
            <div className="relative h-56 overflow-hidden bg-black/40">
                {currentImage ? (
                    <img
                        src={currentImage}
                        alt={bike.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#0d0d0d]">
                        <FaMotorcycle className="text-orange-500 text-5xl" />
                    </div>
                )}

                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="bg-orange-500 text-black px-2.5 py-1 rounded-lg text-xs font-black">
                        {matchText} MATCH
                    </span>
                    {isAdmin && (
                        <span className="bg-amber-500/90 text-black px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            Admin Inspection
                        </span>
                    )}
                </div>

                <button
                    onClick={() => navigate("/login")}
                    aria-label={`Save ${bike.name} to wishlist`}
                    aria-pressed="false"
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center hover:bg-orange-500 hover:text-black transition text-white"
                >
                    <FaHeart aria-hidden="true" />
                </button>

                {/* Multiple Images Dots */}
                {imagesList.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/70 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        {imagesList.slice(0, 5).map((img, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveImgIndex(idx);
                                }}
                                className={`w-2 h-2 rounded-full transition ${
                                    activeImgIndex === idx
                                        ? "bg-orange-500 w-4"
                                        : "bg-white/40 hover:bg-white"
                                }`}
                                title={img.label || `Image ${idx + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* CARD BODY */}
            <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                    {/* Brand & Category & Rating */}
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                                {bike.brandLogo && (
                                    <BrandLogo
                                        brand={bike.brand}
                                        brandLogo={bike.brandLogo}
                                        size={22}
                                    />
                                )}
                                <span className="text-orange-500 text-xs font-bold uppercase tracking-wider">
                                    {bike.brand}
                                </span>
                                <span className="text-zinc-600">•</span>
                                <span className="text-zinc-400 text-xs font-medium">
                                    {bike.category}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold mt-1 text-white">
                                {bike.name}
                            </h3>
                        </div>

                        <span className="flex items-center gap-1 text-yellow-400 text-sm font-semibold">
                            <FaStar /> {bike.rating}
                        </span>
                    </div>

                    {/* Variants Inspection Pills */}
                    {variants.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/[0.06]">
                            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                                <span className="font-semibold text-zinc-300">
                                    Variants ({variants.length})
                                </span>
                                {selectedVariant && (
                                    <span className="text-orange-400 font-bold">
                                        {selectedVariant.variantName}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {variants.map((v) => {
                                    const isSel = selectedVariant?._id === v._id;
                                    return (
                                        <button
                                            key={v._id}
                                            onClick={() => setSelectedVariant(v)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                                isSel
                                                    ? "bg-orange-500 text-black shadow-md shadow-orange-500/20"
                                                    : "bg-white/5 text-zinc-400 border border-white/10 hover:border-orange-500/30 hover:text-white"
                                            }`}
                                        >
                                            {v.variantName}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Ex-Showroom & City On-Road Price Box */}
                    <div className="mt-4 rounded-xl bg-[#0d0d0d] p-3.5 border border-white/[0.06]">
                        <div className="flex items-baseline justify-between">
                            <div>
                                <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                                    Ex-Showroom Price
                                </p>
                                <p className="text-xl font-black text-white mt-0.5">
                                    {priceText}
                                </p>
                            </div>

                            {/* City Dropdown */}
                            {activeCityPrices.length > 0 && (
                                <div className="text-right">
                                    <label htmlFor={`city-sel-${bike._id}`} className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block mb-0.5">
                                        Select City
                                    </label>
                                    <select
                                        id={`city-sel-${bike._id}`}
                                        aria-label={`Select city for ${bike.name}`}
                                        value={selectedCity}
                                        onChange={(e) => setSelectedCity(e.target.value)}
                                        className="bg-[#181818] text-xs font-bold text-orange-400 border border-white/10 rounded-lg px-2.5 py-1 outline-none focus:border-orange-500 cursor-pointer"
                                    >
                                        {activeCityPrices.map((cp) => (
                                            <option key={cp.city} value={cp.city}>
                                                {cp.city}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* On-Road Price Output */}
                        <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                            <span className="text-xs text-zinc-400 font-medium">
                                On-Road ({activeCityPrice?.city || selectedCity}):
                            </span>
                            <span className="text-sm font-black text-orange-400">
                                {onRoadText}
                            </span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-zinc-500 text-right">
                            (RTO: ₹{roadTax.toLocaleString("en-IN")} + Ins: ₹{insurance.toLocaleString("en-IN")})
                        </p>
                    </div>

                    {/* Specifications Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="bg-[#0d0d0d] rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-zinc-500 font-semibold uppercase">
                                {isEV ? "Range" : "Engine"}
                            </p>
                            <p className="font-bold text-xs mt-0.5 text-white truncate">
                                {engineText}
                            </p>
                        </div>
                        <div className="bg-[#0d0d0d] rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-zinc-500 font-semibold uppercase">
                                {isEV ? "Battery" : "Mileage"}
                            </p>
                            <p className="font-bold text-xs mt-0.5 text-white truncate">
                                {mileageText}
                            </p>
                        </div>
                        <div className="bg-[#0d0d0d] rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-zinc-500 font-semibold uppercase">
                                Power
                            </p>
                            <p className="font-bold text-xs mt-0.5 text-white truncate">
                                {powerText}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex gap-2.5 mt-5 pt-4 border-t border-white/[0.06]">
                    <Button
                        primary
                        onClick={() => navigate(bike._id ? `/motorcycles/${bike._id}` : "/motorcycles")}
                        className="flex-1 text-sm font-bold py-2.5"
                    >
                        View Details
                    </Button>

                    <Button
                        onClick={() => navigate(`/compare?id=${bike._id}`)}
                        aria-label={`Compare ${bike.name}`}
                        className="w-12 px-0 flex items-center justify-center text-zinc-400 hover:text-orange-500"
                    >
                        <FaExchangeAlt aria-hidden="true" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ==============================
// HOMEPAGE
// ==============================
function Homepage() {
    const navigate = useNavigate();

    const [menuOpen, setMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    // Load logged-in user (shows avatar + dashboard links in navbar)
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
        setMenuOpen(false);
        navigate("/login");
    };

    const dashboardPath = currentUser?.role === "admin"
        ? "/admin"
        : currentUser?.role === "provider"
            ? "/provider"
            : "/user/dashboard";

    // SEARCH
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

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

    // DATABASE-DRIVEN SECTIONS (no hardcoded bikes/categories)
    const [featuredBikes, setFeaturedBikes] = useState([]);
    const [dbCategories, setDbCategories] = useState([]);
    const [sectionsLoading, setSectionsLoading] = useState(true);

    useEffect(() => {
        const loadSections = async () => {
            try {
                const response = await fetch(
                    `${BIKES_API}?sort=rating`
                );
                if (!response.ok) throw new Error("Failed to load motorcycles");
                const data = await response.json();
                const bikes = data.motorcycles || [];

                // Top 3 rated → AI recommendations
                setFeaturedBikes(bikes.slice(0, 3));

                // Unique categories with counts → category cards
                const seen = new Map();
                bikes.forEach((bike) => {
                    const name = (bike.category || "").trim();
                    if (!name) return;
                    const key = name.toLowerCase();
                    if (seen.has(key)) {
                        seen.get(key).count += 1;
                    } else {
                        seen.set(key, { name, count: 1 });
                    }
                });
                setDbCategories([...seen.values()]);
            } catch (error) {
                console.error("Homepage sections error:", error);
                setFeaturedBikes([]);
                setDbCategories([]);
            } finally {
                setSectionsLoading(false);
            }
        };
        loadSections();
    }, []);

    // ==============================
    // NAVIGATION
    // ==============================
    const go = (path) => {
        setMenuOpen(false);
        setShowSuggestions(false);
        navigate(path);
    };

    // ==============================
    // DATABASE SEARCH
    // ==============================
    useEffect(() => {
        const searchDatabase = async () => {
            const query = searchQuery.trim();

            if (!query) {
                setSuggestions([]);
                setSearchLoading(false);
                return;
            }

            setSearchLoading(true);

            try {
                const response = await fetch(
                    `http://localhost:5000/api/motorcycles?search=${encodeURIComponent(
                        query
                    )}`
                );

                if (!response.ok) {
                    throw new Error("Search request failed");
                }

                const data = await response.json();

                if (data.success) {
                    setSuggestions(data.motorcycles || []);
                } else {
                    setSuggestions([]);
                }
            } catch (error) {
                console.error("Motorcycle search error:", error);
                setSuggestions([]);
            } finally {
                setSearchLoading(false);
            }
        };

        // Debounce API request
        const timer = setTimeout(searchDatabase, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ==============================
    // SEARCH BUTTON
    // ==============================
    const handleSearch = () => {
        const query = searchQuery.trim();

        if (!query) return;

        setShowSuggestions(false);

        navigate(
            `/motorcycles?search=${encodeURIComponent(query)}`
        );
    };

    // ==============================
    // SELECT SEARCH RESULT
    // ==============================
    const searchFor = (value) => {
        setSearchQuery(value);
        setShowSuggestions(false);

        navigate(
            `/motorcycles?search=${encodeURIComponent(value)}`
        );
    };

    return (
        <div className="min-h-screen bg-[#070707] text-white">

            {/* ================= NAVBAR ================= */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#070707]/95 backdrop-blur-xl border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

                    <Logo onClick={() => go("/")} />

                    {/* DESKTOP MENU */}
                    <div className="hidden md:flex items-center gap-8">
                        {[
                            ["Home", "/"],
                            ["Motorcycles", "/motorcycles"],
                            ["AI Advisor", "/ai-advisor"],
                            ["AI Plan", "/ai-plan"],
                            ["Compare", "/compare"],
                            ["Impact", "/impact"]
                        ].map(([label, path], index) => (
                            <button
                                key={label}
                                onClick={() => go(path)}
                                className={
                                    index === 0
                                        ? "text-orange-500 font-medium"
                                        : "text-gray-400 hover:text-white transition"
                                }
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* DESKTOP BUTTONS */}
                    <div className="hidden md:flex gap-3 items-center">
                        <ThemeToggle />
                        {currentUser &&
                            (planBadge?.plan === "premium" ? (
                                <button
                                    onClick={() => go("/ai-plan")}
                                    title="MOTOAI Premium active"
                                    className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-400 transition hover:bg-orange-500/20"
                                >
                                    <span aria-hidden="true">👑</span>
                                    Premium{" "}
                                    {planBadge.planType === "yearly"
                                        ? "Yearly"
                                        : "Monthly"}
                                </button>
                            ) : (
                                <button
                                    onClick={() => go("/ai-plan")}
                                    title="Free plan — view AI plans"
                                    className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-400 transition hover:text-white"
                                >
                                    Free Plan
                                </button>
                            ))}
                        {currentUser ? (
                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-3 rounded-xl border border-gray-700 hover:border-orange-500 pl-1.5 pr-3 py-1.5 transition"
                                >
                                    <UserAvatar user={currentUser} size={32} />
                                    <span className="text-left">
                                        <span className="block text-sm font-semibold max-w-[140px] truncate">
                                            {currentUser.name}
                                        </span>
                                        <span className="block text-xs text-orange-500 capitalize">
                                            {currentUser.role}
                                        </span>
                                    </span>
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-800 bg-[#111] shadow-2xl overflow-hidden">
                                        <div className="px-4 py-3 border-b border-gray-800">
                                            <p className="text-sm font-semibold truncate">{currentUser.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                                        </div>
                                        <button
                                            onClick={() => { setUserMenuOpen(false); go(dashboardPath); }}
                                            className="block w-full text-left px-4 py-3 text-sm hover:bg-orange-500/10 hover:text-orange-500 transition"
                                        >
                                            My Dashboard
                                        </button>
                                        <button
                                            onClick={() => { setUserMenuOpen(false); go("/motorcycles"); }}
                                            className="block w-full text-left px-4 py-3 text-sm hover:bg-orange-500/10 hover:text-orange-500 transition"
                                        >
                                            Browse Bikes
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="block w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Button onClick={() => go("/login")}>
                                    <span className="flex items-center gap-2">
                                        <FaUser />
                                        Login
                                    </span>
                                </Button>

                                <Button
                                    primary
                                    onClick={() => go("/register")}
                                >
                                    Get Started
                                </Button>
                            </>
                        )}
                    </div>

                    {/* MOBILE MENU BUTTON */}
                    <div className="md:hidden flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            className="text-xl"
                            aria-label={menuOpen ? "Close menu" : "Open menu"}
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen(!menuOpen)}
                        >
                            {menuOpen ? <FaTimes aria-hidden="true" /> : <FaBars aria-hidden="true" />}
                        </button>
                    </div>
                </div>

                {/* MOBILE MENU */}
                {menuOpen && (
                    <div className="md:hidden bg-[#111] border-t border-gray-800 px-6 py-5 space-y-3">
                        {currentUser && (
                            <>
                                <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-[#0d0d0d] p-3">
                                    <UserAvatar user={currentUser} size={40} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold truncate">{currentUser.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                                    </div>
                                    <span className="text-xs text-orange-500 capitalize">{currentUser.role}</span>
                                </div>
                                <button
                                    onClick={() => go("/ai-plan")}
                                    className={`w-full rounded-xl px-4 py-2.5 text-left text-xs font-bold transition ${
                                        currentUser.aiPlan === "premium"
                                            ? "bg-orange-500/10 text-orange-400"
                                            : "bg-white/5 text-zinc-400"
                                    }`}
                                >
                                    {currentUser.aiPlan === "premium"
                                        ? "👑 Premium Plan"
                                        : "Free Plan — Upgrade"}
                                </button>
                            </>
                        )}
                        {[
                            ["Home", "/"],
                            ["Motorcycles", "/motorcycles"],
                            ["AI Advisor", "/ai-advisor"],
                            ["AI Plan", "/ai-plan"],
                            ["Compare", "/compare"],
                            ["Impact", "/impact"],
                            ...(currentUser
                                ? [["My Dashboard", dashboardPath]]
                                : [["Login", "/login"], ["Get Started", "/register"]]),
                        ].map(([label, path]) => (
                            <button
                                key={label}
                                onClick={() => go(path)}
                                className={`block w-full text-left py-3 ${label === "Get Started"
                                        ? "bg-orange-500 text-black text-center rounded-xl font-bold"
                                        : ""
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                        {currentUser && (
                            <button
                                onClick={handleLogout}
                                className="block w-full text-left py-3 text-red-400"
                            >
                                Logout
                            </button>
                        )}
                    </div>
                )}
            </nav>

            <main id="main-content">
            {/* ================= HERO ================= */}
            <section className="pt-36 pb-24 px-6 relative overflow-hidden">

                <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/10 blur-[120px] rounded-full" />

                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center relative">

                    {/* HERO CONTENT */}
                    <div>

                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm">
                            <FaRobot />
                            AI-Powered Motorcycle Discovery
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black leading-[1.05] mt-7">
                            Find Your
                            <br />
                            <span className="text-orange-500">
                                Perfect Ride.
                            </span>
                        </h1>

                        <p className="text-gray-400 text-lg leading-relaxed max-w-xl mt-7">
                            Tell MOTOAI your budget, riding style and
                            requirements. Our intelligent recommendation
                            system finds motorcycles that match your
                            lifestyle.
                        </p>

                        {/* ================= SEARCH ================= */}
                        <div className="relative max-w-2xl mt-8">

                            <div className="flex flex-col sm:flex-row gap-3">

                                <div className="relative flex-1">

                                    <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" />

                                    <input
                                        value={searchQuery}
                                        aria-label="Search motorcycles"
                                        onChange={(e) => {
                                            setSearchQuery(
                                                e.target.value
                                            );

                                            setShowSuggestions(
                                                !!e.target.value.trim()
                                            );
                                        }}
                                        onFocus={() => {
                                            if (
                                                searchQuery.trim()
                                            ) {
                                                setShowSuggestions(
                                                    true
                                                );
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter"
                                            ) {
                                                handleSearch();
                                            }
                                        }}
                                        placeholder="Search motorcycles, brands, types..."
                                        className="w-full bg-[#111] border border-gray-700 rounded-xl py-4 pl-12 pr-5 focus:outline-none focus:border-orange-500 transition"
                                    />
                                </div>

                                <button
                                    onClick={handleSearch}
                                    className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-7 py-4 rounded-xl flex items-center justify-center gap-2"
                                >
                                    <FaSearch />
                                    Search
                                </button>
                            </div>

                            {/* ================= SEARCH SUGGESTIONS ================= */}
                            {showSuggestions &&
                                searchQuery.trim() && (
                                    <div className="absolute z-40 left-0 right-0 mt-2 bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">

                                        {/* LOADING */}
                                        {searchLoading ? (
                                            <div className="p-5 text-center">
                                                <div className="flex justify-center mb-3">
                                                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                                </div>

                                                <p className="text-gray-400 text-sm">
                                                    Searching motorcycles...
                                                </p>
                                            </div>
                                        ) : suggestions.length > 0 ? (
                                            <>
                                                <p className="px-4 py-3 text-xs text-gray-500 uppercase border-b border-gray-800">
                                                    Motorcycle Suggestions
                                                </p>

                                                {suggestions
                                                    .slice(0, 6)
                                                    .map((bike) => (
                                                        <button
                                                            key={
                                                                bike._id
                                                            }
                                                            onClick={() =>
                                                                searchFor(
                                                                    bike.name
                                                                )
                                                            }
                                                            className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-orange-500/10 transition"
                                                        >
                                                            {/* IMAGE */}
                                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#0d0d0d] flex-shrink-0">
                                                                {bike.image ? (
                                                                    <img
                                                                        src={
                                                                            bike.image
                                                                        }
                                                                        alt={
                                                                            bike.name
                                                                        }
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <FaMotorcycle className="text-orange-500" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* INFO */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-sm truncate">
                                                                    {
                                                                        bike.name
                                                                    }
                                                                </p>

                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {
                                                                        bike.brand
                                                                    }{" "}
                                                                    •{" "}
                                                                    {
                                                                        bike.category
                                                                    }{" "}
                                                                    •{" "}
                                                                    {
                                                                        bike.engine
                                                                    }{" "}
                                                                    CC
                                                                </p>

                                                                <p className="text-xs text-orange-500 mt-1 font-semibold">
                                                                    ₹
                                                                    {(
                                                                        bike.price /
                                                                        100000
                                                                    ).toFixed(
                                                                        2
                                                                    )}{" "}
                                                                    Lakh
                                                                </p>
                                                            </div>

                                                            <FaArrowRight className="text-gray-600 flex-shrink-0" />
                                                        </button>
                                                    ))}
                                            </>
                                        ) : (
                                            /* NO RESULTS */
                                            <div className="p-5 text-center">

                                                <FaSearch className="mx-auto text-gray-600 text-2xl mb-3" />

                                                <p className="text-gray-400 text-sm">
                                                    No motorcycles found
                                                </p>

                                                <p className="text-gray-600 text-xs mt-1">
                                                    Try a brand, model,
                                                    category or engine
                                                    size
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                            {/* POPULAR SEARCHES */}
                            <div className="flex flex-wrap gap-2 mt-4 text-sm">

                                <span className="text-gray-500">
                                    Popular:
                                </span>

                                {[
                                    "Royal Enfield",
                                    "KTM",
                                    "Yamaha",
                                    "Kawasaki"
                                ].map((brand) => (
                                    <button
                                        key={brand}
                                        onClick={() =>
                                            searchFor(brand)
                                        }
                                        className="px-3 py-1.5 rounded-full bg-[#111] border border-gray-800 text-gray-400 hover:text-orange-500 hover:border-orange-500 transition"
                                    >
                                        {brand}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* HERO BUTTONS */}
                        <div className="flex flex-wrap gap-4 mt-8">

                            <Button
                                primary
                                onClick={() =>
                                    go("/ai-advisor")
                                }
                                className="px-7 py-4"
                            >
                                <span className="flex items-center gap-3">
                                    <FaRobot />
                                    Ask MotoMind AI
                                    <FaArrowRight />
                                </span>
                            </Button>

                            <Button
                                onClick={() =>
                                    go("/motorcycles")
                                }
                                className="px-7 py-4"
                            >
                                <span className="flex items-center gap-3">
                                    <FaSearch />
                                    Explore Bikes
                                </span>
                            </Button>
                        </div>

                        {/* STATS */}
                        <div className="flex flex-wrap gap-12 mt-14">
                            {[
                                ["500+", "Motorcycles"],
                                ["50K+", "Riders"],
                                ["98%", "Satisfaction"]
                            ].map(([value, label]) => (
                                <div key={label}>
                                    <h3 className="text-3xl font-bold">
                                        {value}
                                    </h3>

                                    <p className="text-gray-500 text-sm">
                                        {label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* HERO IMAGE */}
                    <div className="relative">

                        <div className="absolute inset-0 bg-orange-500/20 blur-[100px]" />

                        <div className="relative rounded-3xl overflow-hidden border border-gray-800 bg-[#111]">

                            <img
                                src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1000&q=70"
                                alt="Royal Enfield Hunter 350 motorcycle"
                                fetchPriority="high"
                                decoding="async"
                                className="w-full h-[450px] object-cover"
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                            <div className="absolute bottom-0 p-7">

                                <p className="text-orange-400 text-sm">
                                    AI Recommended
                                </p>

                                <h2 className="text-3xl font-bold mt-1">
                                    Royal Enfield Hunter 350
                                </h2>

                                <div className="flex items-center gap-4 mt-3 text-sm">
                                    <span>349 CC</span>
                                    <span>•</span>
                                    <span>36 KM/L</span>
                                    <span>•</span>

                                    <span className="flex items-center gap-1 text-yellow-400">
                                        <FaStar />
                                        4.7
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= RECOMMENDATIONS ================= */}
            <section className="py-24 px-6 bg-[#0c0c0c]">

                <div className="max-w-7xl mx-auto">

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">

                        <div>

                            <div className="flex items-center gap-2 text-orange-500 font-semibold mb-3">
                                <FaRobot />
                                AI RECOMMENDATIONS
                            </div>

                            <h2 className="text-4xl md:text-5xl font-black">
                                Bikes Picked{" "}
                                <span className="text-orange-500">
                                    For You
                                </span>
                            </h2>

                            <p className="text-gray-500 mt-4 max-w-xl">
                                Our AI analyzes your preferences and
                                highlights motorcycles that best match
                                your requirements.
                            </p>
                        </div>

                        <button
                            onClick={() =>
                                go("/motorcycles")
                            }
                            className="flex items-center gap-2 text-orange-500 hover:text-orange-400"
                        >
                            View All Bikes
                            <FaArrowRight />
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">

                        {sectionsLoading ? (
                            [1, 2, 3].map((item) => (
                                <div
                                    key={item}
                                    className="h-[480px] animate-pulse rounded-2xl bg-white/[0.04]"
                                />
                            ))
                        ) : featuredBikes.length > 0 ? (
                            featuredBikes.map((bike) => (
                                <RecommendationCard
                                    key={bike._id}
                                    bike={bike}
                                    navigate={navigate}
                                />
                            ))
                        ) : (
                            <p className="text-gray-500 text-sm col-span-full">
                                Top-rated motorcycles will appear here
                                once they are added to the database.
                            </p>
                        )}

                    </div>
                </div>
            </section>

            {/* ================= CATEGORIES ================= */}
            <section className="py-24 px-6">

                <div className="max-w-7xl mx-auto">

                    <div className="text-center mb-14">

                        <p className="text-orange-500 font-semibold">
                            EXPLORE BY STYLE
                        </p>

                        <h2 className="text-4xl md:text-5xl font-black mt-3">
                            What Kind of Rider Are You?
                        </h2>

                        <p className="text-gray-500 mt-4">
                            Choose a category and discover motorcycles
                            built for you.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">

                        {sectionsLoading ? (
                            [1, 2, 3, 4, 5].map((item) => (
                                <div
                                    key={item}
                                    className="h-64 animate-pulse rounded-2xl bg-white/[0.04]"
                                />
                            ))
                        ) : dbCategories.length > 0 ? (
                            dbCategories.map(({ name, count }) => {
                                const meta =
                                    CATEGORY_META[name] ||
                                    DEFAULT_CATEGORY_META;
                                const IconComp =
                                    typeof meta.icon !== "string"
                                        ? meta.icon
                                        : null;
                                return (
                                <button
                                    key={name}
                                    onClick={() =>
                                        go(
                                            `/motorcycles?category=${encodeURIComponent(
                                                name
                                            )}`
                                        )
                                    }
                                    className="group text-left p-7 rounded-2xl bg-[#111] border border-gray-800 hover:border-orange-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300"
                                >
                                    <div className="text-4xl mb-6 text-orange-500">
                                        {IconComp
                                            ? <IconComp aria-hidden="true" />
                                            : meta.icon}
                                    </div>

                                    <h3 className="text-xl font-bold">
                                        {name}
                                    </h3>

                                    <p className="text-gray-500 text-sm mt-2">
                                        {meta.description}
                                    </p>

                                    <p className="mt-2 text-xs font-semibold text-orange-500/80">
                                        {count} {count === 1 ? "bike" : "bikes"}
                                    </p>

                                    <div className="mt-4 flex items-center gap-2 text-orange-500 opacity-0 group-hover:opacity-100 transition">
                                        Explore
                                        <FaArrowRight />
                                    </div>
                                </button>
                                );
                            })
                        ) : (
                            <p className="text-gray-500 text-sm col-span-full text-center">
                                Categories will appear here once
                                motorcycles are added to the database.
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* ================= AI ADVISOR ================= */}
            <section className="py-24 px-6 bg-[#0c0c0c]">

                <div className="max-w-6xl mx-auto">

                    <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-8 md:p-14">

                        <div className="grid md:grid-cols-2 gap-12 items-center">

                            <div>

                                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center">
                                    <FaRobot className="text-black text-3xl" />
                                </div>

                                <h2 className="text-4xl md:text-5xl font-black mt-7">
                                    Your Personal
                                    <br />
                                    <span className="text-orange-500">
                                        Motorcycle AI
                                    </span>
                                </h2>

                                <p className="text-gray-400 mt-6 leading-relaxed">
                                    Answer a few simple questions about
                                    your budget, experience and riding
                                    style. MotoMind AI will analyze your
                                    requirements and recommend the right
                                    motorcycles for you.
                                </p>

                                <Button
                                    primary
                                    onClick={() =>
                                        go("/ai-advisor")
                                    }
                                    className="mt-8 px-7 py-4"
                                >
                                    <span className="flex items-center gap-3">
                                        Start AI Recommendation
                                        <FaArrowRight />
                                    </span>
                                </Button>
                            </div>

                            <div className="space-y-4">

                                {aiFeatures.map((item) => (
                                    <div
                                        key={item}
                                        className="flex items-center gap-4 p-5 bg-[#111] border border-gray-800 rounded-xl"
                                    >
                                        <FaCheckCircle className="text-orange-500 text-xl" />

                                        <span className="text-gray-300">
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= TRUST ================= */}
            <section className="py-20 px-6">

                <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">

                    {trustFeatures.map(
                        ([Icon, title, text]) => (
                            <div
                                key={title}
                                className="p-7 bg-[#111] border border-gray-800 rounded-2xl"
                            >
                                <Icon className="text-orange-500 text-3xl mb-5" />

                                <h3 className="text-xl font-bold">
                                    {title}
                                </h3>

                                <p className="text-gray-500 mt-3">
                                    {text}
                                </p>
                            </div>
                        )
                    )}
                </div>
            </section>

            {/* ================= CTA ================= */}
            <section className="py-24 px-6">

                <div className="max-w-5xl mx-auto text-center">

                    <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <FaMotorcycle className="text-orange-500 text-2xl" />
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black mt-7">
                        Your Dream Bike
                        <br />
                        <span className="text-orange-500">
                            Is Waiting.
                        </span>
                    </h2>

                    <p className="text-gray-500 mt-6 max-w-xl mx-auto">
                        Let MOTOAI help you discover the motorcycle
                        that perfectly matches your lifestyle and
                        budget.
                    </p>

                    <div className="flex justify-center gap-4 mt-9 flex-wrap">

                        <Button
                            primary
                            onClick={() =>
                                go("/ai-advisor")
                            }
                            className="px-8 py-4"
                        >
                            Find My Bike
                        </Button>

                        <Button
                            onClick={() =>
                                go("/motorcycles")
                            }
                            className="px-8 py-4"
                        >
                            Browse Motorcycles
                        </Button>
                    </div>
                </div>
            </section>

            </main>

            {/* ================= FOOTER ================= */}
            <footer className="bg-[#050505] border-t border-gray-800">

                <div className="max-w-7xl mx-auto px-6 py-16">

                    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-12">

                        <div className="lg:col-span-2">

                            <Logo onClick={() => go("/")} />

                            <p className="text-gray-500 mt-6 max-w-sm leading-relaxed">
                                An AI-powered motorcycle purchasing
                                platform that helps riders discover,
                                compare and choose their perfect
                                motorcycle.
                            </p>

                            <div className="flex gap-3 mt-7">

                                {socialIcons.map(([Icon, label]) => (
                                    <button
                                        key={label}
                                        aria-label={`MOTOAI on ${label}`}
                                        className="w-10 h-10 rounded-lg bg-[#111] border border-gray-800 flex items-center justify-center hover:bg-orange-500 hover:text-black transition"
                                    >
                                        <Icon aria-hidden="true" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {Object.entries(footerLinks).map(
                            ([title, links]) => (
                                <div key={title}>

                                    <h3 className="font-bold text-lg mb-6">
                                        {title}
                                    </h3>

                                    <div className="space-y-4 text-gray-500 text-sm">

                                        {links.map(
                                            ([label, path]) => (
                                                <button
                                                    key={label}
                                                    onClick={() =>
                                                        go(path)
                                                    }
                                                    className="block hover:text-orange-500 transition"
                                                >
                                                    {label}
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>

                    <div className="mt-14 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between gap-5">

                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <FaMapMarkerAlt className="text-orange-500" />
                            India
                        </div>

                        <p className="text-gray-600 text-sm">
                            AI-powered motorcycle discovery for modern
                            riders.
                        </p>
                    </div>
                </div>

                <div className="border-t border-gray-800">

                    <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between gap-3 text-sm">

                        <p className="text-gray-600">
                            © 2026 MOTOAI. All rights reserved.
                        </p>

                        <p className="text-gray-700">
                            Built for riders. Powered by AI.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Homepage;