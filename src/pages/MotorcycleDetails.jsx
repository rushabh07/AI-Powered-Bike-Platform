import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { getMotorcycleVariants, getMotorcycleReviews, createReview, updateReview, deleteReview, getReviewEligibility } from "../services/api";
import BuyPurchaseModal from "../components/BuyPurchaseModal";
import Motorcycle3DViewer from "../components/Motorcycle3DViewer";
import {
    ArrowLeft,
    Bike,
    BatteryCharging,
    ChevronLeft,
    ChevronRight,
    Fuel,
    Gauge,
    Heart,
    Maximize2,
    Route,
    Settings2,
    Star,
    Weight,
    X,
    Zap,
    MapPin,
    Search,
    ShoppingCart,
    Check,
    Pencil,
    Trash2,
    Box,
    Images,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/motorcycles";

const MotorcycleDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [bike, setBike] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [activeImage, setActiveImage] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const [variants, setVariants] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [selectedCity, setSelectedCity] = useState("");
    const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
    const [citySearch, setCitySearch] = useState("");
    const cityDropdownRef = useRef(null);

    const [reviews, setReviews] = useState([]);
    const [reviewSummary, setReviewSummary] = useState(null);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewError, setReviewError] = useState("");

    const [selectedColor, setSelectedColor] = useState(null);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [viewMode, setViewMode] = useState("photos");

    const activeModelUrl =
        (selectedColor?.model3DUrl || "").trim() ||
        (bike?.model3DUrl || "").trim() ||
        "";
    const bikeColors = (bike?.colors || []).filter((c) => c.available !== false);
    const activeColorImage = selectedColor?.image || null;
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [editingReview, setEditingReview] = useState(null);
    const [reviewForm, setReviewForm] = useState({ title: "", category: "performance", rating: 0, comment: "" });
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [expandedCards, setExpandedCards] = useState({});

    const isLoggedIn = () => {
        try {
            return !!(localStorage.getItem("token") && localStorage.getItem("user"));
        } catch {
            return false;
        }
    };

    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    })();

    const fetchReviews = async () => {
        if (!bike?._id) return;
        setReviewsLoading(true);
        setReviewError("");
        try {
            const data = await getMotorcycleReviews(bike._id);
            setReviews(data.reviews || []);
            setReviewSummary(data.summary || null);
        } catch (err) {
            setReviewError(err.message || "Could not load reviews.");
        } finally {
            setReviewsLoading(false);
        }
    };

    useEffect(() => {
        if (bike) fetchReviews();
    }, [bike?._id]);

    const [reviewEligible, setReviewEligible] = useState(false);

    useEffect(() => {
        if (!bike?._id || !isLoggedIn()) {
            setReviewEligible(false);
            return;
        }
        getReviewEligibility(bike._id)
            .then((data) => setReviewEligible(!!data.eligible))
            .catch(() => setReviewEligible(false));
    }, [bike?._id]);

    const openReviewForm = (review = null) => {
        if (!isLoggedIn()) {
            navigate("/login");
            return;
        }
        if (!review && !reviewEligible && currentUser?.role !== "admin") {
            alert("Purchase this motorcycle to share your review.");
            return;
        }
        if (review) {
            setEditingReview(review);
            setReviewForm({ title: review.title, category: review.category, rating: review.rating, comment: review.comment });
        } else {
            setEditingReview(null);
            setReviewForm({ title: "", category: "performance", rating: 0, comment: "" });
        }
        setShowReviewForm(true);
    };

    const closeReviewForm = () => {
        setShowReviewForm(false);
        setEditingReview(null);
        setReviewForm({ title: "", category: "performance", rating: 0, comment: "" });
    };

    const submitReview = async () => {
        if (!reviewForm.title.trim()) { alert("Please enter a title."); return; }
        if (!reviewForm.rating || reviewForm.rating < 1) { alert("Please select a rating."); return; }
        if (!reviewForm.comment.trim()) { alert("Please write a comment."); return; }
        setReviewSubmitting(true);
        try {
            if (editingReview) {
                await updateReview(editingReview._id, reviewForm);
            } else {
                await createReview({ motorcycleId: bike._id, ...reviewForm });
            }
            closeReviewForm();
            await fetchReviews();
        } catch (err) {
            alert(err.message || "Failed to submit review.");
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Delete this review?")) return;
        try {
            await deleteReview(reviewId);
            await fetchReviews();
        } catch (err) {
            alert(err.message || "Failed to delete review.");
        }
    };

    const toggleExpand = (cat) => {
        setExpandedCards((prev) => ({ ...prev, [cat]: !prev[cat] }));
    };

    const CATEGORIES = [
        { key: "performance", label: "Power & Performance" },
        { key: "handling", label: "Ride Quality & Handling" },
        { key: "design", label: "Design & Quality" },
        { key: "mileage", label: "Mileage & Fuel Efficiency" },
        { key: "comfort", label: "Comfort & Features" },
    ];

    const baseExShowroom = bike?.exShowroomPrice || bike?.price || 0;
    const activeExShowroom = selectedVariant
        ? selectedVariant.exShowroomPrice
        : baseExShowroom;
    const activeCityPrices = selectedVariant
        ? selectedVariant.cityPrices
        : bike?.cityPrices || [];
    const availableCities = activeCityPrices.map((cp) => cp.city);
    const filteredCities = availableCities.filter((c) =>
        c.toLowerCase().includes(citySearch.toLowerCase())
    );
    const selectedCityPrice = activeCityPrices.find(
        (cp) => cp.city === selectedCity
    );
    const exShowroom = activeExShowroom;
    const insurance = Math.round(exShowroom * 0.03);
    const onRoadPrice = selectedCityPrice
        ? exShowroom + selectedCityPrice.roadTax + insurance
        : 0;

    // =====================================================
    // FETCH MOTORCYCLE
    // =====================================================
    useEffect(() => {
        const fetchMotorcycle = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(`${API_URL}/${id}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Failed to fetch motorcycle"
                    );
                }

                setBike(data.motorcycle);
                setActiveImage(0);
                setViewMode("photos");
            } catch (error) {
                console.error("Motorcycle details error:", error);
                setError(error.message || "Something went wrong");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchMotorcycle();
        }
    }, [id]);

    // Fetch variants
    useEffect(() => {
        if (!bike?._id) return;
        getMotorcycleVariants(bike._id)
            .then((data) => {
                setVariants(data.variants || []);
                if (data.variants && data.variants.length > 0) {
                    setSelectedVariant(data.variants[0]);
                }
            })
            .catch(() => {});
    }, [bike?._id]);

    // Fall back to photos if the selected color/bike has no 3D model
    useEffect(() => {
        if (viewMode === "3d" && !activeModelUrl) {
            setViewMode("photos");
        }
    }, [activeModelUrl, viewMode]);

    // Default to the first available color
    useEffect(() => {
        if (!bike) return;
        const first = (bike.colors || []).find((c) => c.available !== false);
        if (first) setSelectedColor(first);
    }, [bike?._id]);

    // Close city dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                cityDropdownRef.current &&
                !cityDropdownRef.current.contains(e.target)
            ) {
                setCityDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // =====================================================
    // CREATE IMAGE LIST
    // =====================================================
    const bikeImages = useMemo(() => {
        if (!bike) {
            return [];
        }

        // New MongoDB format
        if (Array.isArray(bike.images) && bike.images.length > 0) {
            return bike.images;
        }

        // Backward compatibility with old MongoDB records
        if (bike.image) {
            return [
                {
                    url: bike.image,
                    label: "Main View"
                }
            ];
        }

        return [];
    }, [bike]);

    // =====================================================
    // IMAGE NAVIGATION
    // =====================================================
    const nextImage = () => {
        if (bikeImages.length === 0) return;

        setActiveImage((current) =>
            current === bikeImages.length - 1 ? 0 : current + 1
        );
    };

    const previousImage = () => {
        if (bikeImages.length === 0) return;

        setActiveImage((current) =>
            current === 0 ? bikeImages.length - 1 : current - 1
        );
    };

    // =====================================================
    // KEYBOARD NAVIGATION FOR FULLSCREEN
    // =====================================================
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isFullScreen) return;
            if (e.key === "Escape") setIsFullScreen(false);
            if (e.key === "ArrowLeft") previousImage();
            if (e.key === "ArrowRight") nextImage();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isFullScreen, bikeImages.length]);

    // =====================================================
    // LOADING
    // =====================================================
    if (loading) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-5" />

                    <p className="text-gray-400">
                        Loading motorcycle...
                    </p>
                </div>
            </div>
        );
    }

    const isEV =
        String(bike?.category || "").toLowerCase() === "electric";

    // =====================================================
    // ERROR
    // =====================================================
    if (error || !bike) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <Bike className="w-14 h-14 text-orange-500 mx-auto mb-5" />

                    <h1 className="text-2xl font-bold mb-3">
                        Motorcycle Not Found
                    </h1>

                    <p className="text-gray-400 mb-7">
                        {error || "The requested motorcycle could not be found."}
                    </p>

                    <button
                        onClick={() => navigate("/motorcycles")}
                        className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition"
                    >
                        Back to Motorcycles
                    </button>
                </div>
            </div>
        );
    }

    const currentImage = bikeImages[activeImage];

    return (
        <div className="min-h-screen bg-[#070707] text-white">

            {/* =====================================================
                TOP NAVIGATION
            ===================================================== */}
            <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-7">

                <button
                    onClick={() => navigate("/motorcycles")}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition"
                >
                    <ArrowLeft size={18} />
                    Back to Motorcycles
                </button>

            </div>

            {/* =====================================================
                MAIN CONTENT
            ===================================================== */}
            <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8">

                <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10">

                    {/* =================================================
                        IMAGE GALLERY
                    ================================================= */}
                    <div>

                        {/* VIEW TABS */}
                        <div className="mb-4 flex items-center gap-2">
                            <button
                                onClick={() => setViewMode("photos")}
                                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                                    viewMode === "photos"
                                        ? "bg-orange-500 text-black"
                                        : "border border-white/10 text-zinc-400 hover:border-orange-500/40 hover:text-orange-400"
                                }`}
                            >
                                <Images size={15} />
                                Image Gallery
                            </button>
                            {activeModelUrl && (
                                <button
                                    onClick={() => setViewMode("3d")}
                                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                                        viewMode === "3d"
                                            ? "bg-orange-500 text-black"
                                            : "border border-white/10 text-zinc-400 hover:border-orange-500/40 hover:text-orange-400"
                                    }`}
                                >
                                    <Box size={15} />
                                    View 3D
                                </button>
                            )}
                        </div>

                        {viewMode === "3d" && activeModelUrl ? (
                            <div className="relative border border-white/10 rounded-3xl overflow-hidden">
                                <Motorcycle3DViewer
                                    modelUrl={activeModelUrl}
                                    poster={activeColorImage || currentImage?.url || ""}
                                    name={`${bike.brand} ${bike.name}`}
                                />
                            </div>
                        ) : (
                        <>
                        {/* MAIN IMAGE */}
                        <div className="relative bg-[#111] border border-white/10 rounded-3xl overflow-hidden group">

                            <div
                                className="aspect-[16/10] relative cursor-pointer"
                                onClick={() => setIsFullScreen(true)}
                            >

                                {activeColorImage || currentImage ? (
                                    <img
                                        src={activeColorImage || currentImage.url}
                                        alt={`${bike.name} - ${activeColorImage ? selectedColor?.name : currentImage.label}`}
                                        className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Bike className="w-20 h-20 text-gray-600" />
                                    </div>
                                )}

                                {/* FULLSCREEN BUTTON */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsFullScreen(true);
                                    }}
                                    title="View Full Screen"
                                    aria-label="View image full screen"
                                    className="absolute right-5 top-5 z-10 w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-orange-500 hover:border-orange-500 transition flex items-center justify-center shadow-lg"
                                >
                                    <Maximize2 size={18} />
                                </button>

                                {/* IMAGE LABEL */}
                                {currentImage?.label && (
                                    <div className="absolute left-5 bottom-5">
                                        <span className="px-4 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-sm font-medium">
                                            {currentImage.label}
                                        </span>
                                    </div>
                                )}

                                {/* PREVIOUS */}
                                {bikeImages.length > 1 && (
                                    <button
                                        aria-label="Previous image"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            previousImage();
                                        }}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-orange-500 transition flex items-center justify-center"
                                    >
                                        <ChevronLeft size={22} />
                                    </button>
                                )}

                                {/* NEXT */}
                                {bikeImages.length > 1 && (
                                    <button
                                        aria-label="Next image"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            nextImage();
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-orange-500 transition flex items-center justify-center"
                                    >
                                        <ChevronRight size={22} />
                                    </button>
                                )}

                                {/* IMAGE COUNT */}
                                {bikeImages.length > 0 && (
                                    <div className="absolute right-5 bottom-5">
                                        <span className="px-3 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs text-gray-300">
                                            {activeImage + 1} / {bikeImages.length}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* =================================================
                            THUMBNAILS
                        ================================================= */}
                        {bikeImages.length > 0 && (
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mt-4">

                                {bikeImages.map((image, index) => (
                                    <button
                                        key={`${image.url}-${index}`}
                                        aria-label={`View ${image.label}`}
                                        onClick={() => setActiveImage(index)}
                                        className={`
                                            relative aspect-square rounded-xl overflow-hidden
                                            border transition-all
                                            ${activeImage === index
                                                ? "border-orange-500 ring-2 ring-orange-500/30"
                                                : "border-white/10 hover:border-white/30"
                                            }
                                        `}
                                    >
                                        <img
                                            src={image.url}
                                            alt={`${bike.name} - ${image.label}`}
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover"
                                        />

                                        {/* THUMBNAIL LABEL */}
                                        <div className="absolute inset-x-0 bottom-0 bg-black/75 backdrop-blur-sm px-1.5 py-1">
                                            <p className="text-[10px] sm:text-xs text-white truncate">
                                                {image.label}
                                            </p>
                                        </div>
                                    </button>
                                ))}

                            </div>
                        )}

                        {/* =================================================
                            COLOR SELECTOR — below thumbnails, inside left col
                        ================================================= */}
                        {(bike?.colors || []).length > 0 && (
                            <div className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                                {/* Header row */}
                                <div className="flex items-center justify-between mb-3.5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                                        Available Colors
                                    </p>
                                    {selectedColor && (
                                        <span className="flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full ring-1 ring-black/20 shrink-0"
                                                style={{ backgroundColor: selectedColor.hexCode }}
                                            />
                                            <span className="text-[11px] font-semibold text-orange-400 leading-none">
                                                {selectedColor.name}
                                            </span>
                                        </span>
                                    )}
                                </div>

                                {/* Swatches */}
                                <div className="flex flex-wrap items-center gap-3">
                                    {(bike?.colors || []).map((color) => {
                                        const isAvailable = color.available !== false;
                                        const isSelected =
                                            selectedColor?._id
                                                ? selectedColor._id === color._id
                                                : selectedColor?.name === color.name;
                                        return (
                                            <div key={color._id || color.name} className="relative group/sw">
                                                <button
                                                    type="button"
                                                    onClick={() => { if (isAvailable) { setSelectedColor(color); setActiveImage(0); } }}
                                                    aria-label={`Select ${color.name}${!isAvailable ? ' (unavailable)' : ''}`}
                                                    aria-pressed={isSelected}
                                                    disabled={!isAvailable}
                                                    className={[
                                                        "relative w-9 h-9 rounded-full transition-all duration-200",
                                                        "border-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500",
                                                        isSelected
                                                            ? "border-orange-500 ring-[3px] ring-orange-500/25 scale-110 shadow-lg shadow-orange-500/20"
                                                            : isAvailable
                                                                ? "border-white/20 hover:border-white/50 hover:scale-110 cursor-pointer"
                                                                : "border-white/10 opacity-40 cursor-not-allowed",
                                                    ].join(" ")}
                                                    style={{ backgroundColor: color.hexCode }}
                                                >
                                                    {isSelected && (
                                                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                            <Check
                                                                size={13}
                                                                strokeWidth={3}
                                                                className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] text-white"
                                                            />
                                                        </span>
                                                    )}
                                                    {!isAvailable && (
                                                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-full">
                                                            <span className="block w-[130%] h-px bg-white/60 rotate-45" />
                                                        </span>
                                                    )}
                                                </button>

                                                {/* Tooltip */}
                                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg bg-zinc-900 border border-white/10 px-2.5 py-1 text-[10px] font-medium text-white shadow-xl pointer-events-none z-20 opacity-0 scale-90 group-hover/sw:opacity-100 group-hover/sw:scale-100 transition-all duration-150">
                                                    {color.name}{!isAvailable ? " · Unavailable" : ""}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        </>
                        )}

                    </div>

                    {/* =================================================
                        BIKE INFORMATION
                    ================================================= */}
                    <div className="flex flex-col">

                        {/* BRAND + LOGO */}
                        <div className="flex items-center gap-3 mb-4">
                            <BrandLogo
                                brand={bike.brand}
                                brandLogo={bike.brandLogo}
                                size={44}
                            />

                            <p className="text-orange-500 uppercase tracking-[0.2em] text-sm font-semibold">
                                {bike.brand}
                            </p>
                        </div>

                        {/* NAME */}
                        <div className="flex items-start justify-between gap-5">

                            <div>
                                <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
                                    {bike.name}
                                </h1>

                                <p className="text-gray-400 mt-3">
                                    {bike.category}
                                </p>
                            </div>

                            {/* FAVORITE */}
                            <button
                                aria-label={isFavorite ? `Remove ${bike.name} from favorites` : `Save ${bike.name} to favorites`}
                                aria-pressed={isFavorite}
                                onClick={() =>
                                    setIsFavorite(!isFavorite)
                                }
                                className={`
                                    shrink-0 w-12 h-12 rounded-full border
                                    flex items-center justify-center transition
                                    ${isFavorite
                                        ? "bg-orange-500/10 border-orange-500 text-orange-500"
                                        : "border-white/10 text-gray-400 hover:text-white"
                                    }
                                `}
                            >
                                <Heart
                                    size={21}
                                    fill={
                                        isFavorite
                                            ? "currentColor"
                                            : "none"
                                    }
                                />
                            </button>

                        </div>

                        {/* RATING */}
                        <div className="flex items-center gap-3 mt-6">

                            <div className="flex items-center gap-1 text-orange-400">
                                <Star
                                    size={18}
                                    fill="currentColor"
                                />

                                <span className="font-bold">
                                    {bike.rating ?? "N/A"}
                                </span>
                            </div>

                            <span className="text-gray-600">
                                •
                            </span>

                            <span className="text-gray-400">
                                {bike.category}
                            </span>

                        </div>

                        {/* VARIANT SELECTOR */}
                        {variants.length > 0 && (
                            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                                    Choose Variant
                                </p>
                                <div className="space-y-2">
                                    {variants.map((v) => (
                                        <button
                                            key={v._id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedVariant(v);
                                                setSelectedCity("");
                                            }}
                                            className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                                                selectedVariant?._id === v._id
                                                    ? "border-orange-500 bg-orange-500/5 shadow-lg shadow-orange-500/5"
                                                    : "border-white/10 hover:border-white/25 hover:bg-white/[0.02]"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                    selectedVariant?._id === v._id ? "border-orange-500" : "border-zinc-600"
                                                }`}>
                                                    {selectedVariant?._id === v._id && (
                                                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm text-white">{v.variantName}</p>
                                                    {v.features && v.features.length > 0 && (
                                                        <p className="text-xs text-zinc-500 truncate max-w-[200px]">
                                                            {v.features.slice(0, 2).join(" • ")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="font-bold text-orange-400 whitespace-nowrap">
                                                ₹{Number(v.exShowroomPrice).toLocaleString("en-IN")}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PRICE */}
                        <div className="mt-8">
                            <p className="text-sm text-gray-500 uppercase tracking-wider">
                                Ex-showroom Price
                            </p>
                            <p className="text-4xl font-black mt-1 text-white">
                                ₹{Number(exShowroom || 0).toLocaleString("en-IN")}
                            </p>
                            {selectedCityPrice && (
                                <p className="mt-2 text-lg font-bold text-orange-400">
                                    On-road ({selectedCity}): ₹{Number(onRoadPrice).toLocaleString("en-IN")}
                                </p>
                            )}
                        </div>

                        {/* BUY THIS BIKE BUTTON */}
                        <button
                            onClick={() => {
                                if (!isLoggedIn()) {
                                    navigate("/login");
                                    return;
                                }
                                setShowBuyModal(true);
                            }}
                            className="mt-6 w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg transition shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2"
                        >
                            <ShoppingCart size={20} />
                            Buy This Bike
                        </button>

                        {showBuyModal && (
                            <BuyPurchaseModal
                                bike={bike}
                                selectedVariant={selectedVariant}
                                selectedColor={selectedColor}
                                onClose={() => setShowBuyModal(false)}
                            />
                        )}

                        {/* CITY SELECTOR */}
                        {availableCities.length > 0 && (
                            <div className="mt-6" ref={cityDropdownRef}>
                                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                                    <MapPin size={12} className="inline mr-1" />
                                    Select City
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { setCityDropdownOpen(!cityDropdownOpen); setCitySearch(""); }}
                                    className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white transition hover:border-orange-500/40"
                                >
                                    <span>{selectedCity || "Choose your city"}</span>
                                    <span className="text-xs text-gray-500">{selectedCity ? "Change" : "Select"}</span>
                                </button>
                                {cityDropdownOpen && (
                                    <div className="mt-2 rounded-xl border border-white/10 bg-[#111] shadow-2xl overflow-hidden">
                                        <div className="p-3 border-b border-white/10">
                                            <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
                                                <Search size={14} className="text-gray-500" />
                                                <input
                                                    type="text"
                                                    value={citySearch}
                                                    onChange={(e) => setCitySearch(e.target.value)}
                                                    placeholder="Search cities..."
                                                    className="bg-transparent text-sm text-white outline-none w-full placeholder:text-gray-600"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {filteredCities.length === 0 ? (
                                                <p className="px-4 py-3 text-sm text-gray-500">No cities found</p>
                                            ) : (
                                                filteredCities.map((city) => {
                                                    const cp = activeCityPrices.find((c) => c.city === city);
                                                    return (
                                                        <button
                                                            key={city}
                                                            type="button"
                                                            onClick={() => { setSelectedCity(city); setCityDropdownOpen(false); }}
                                                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-orange-500/5 ${
                                                                selectedCity === city ? "text-orange-400" : "text-gray-300"
                                                            }`}
                                                        >
                                                            <span>{city}</span>
                                                            {cp && (
                                                                <span className="text-xs text-gray-500">
                                                                    ₹{Number(exShowroom + cp.roadTax + insurance).toLocaleString("en-IN")}
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* DESCRIPTION */}
                        {bike.description && (
                            <p className="text-gray-400 leading-7 mt-6">
                                {bike.description}
                            </p>
                        )}

                        {/* =================================================
                            SPECIFICATIONS
                        ================================================= */}
                        <div className="grid grid-cols-2 gap-3 mt-8">

                            {isEV ? (
                                <>
                                    <SpecCard
                                        icon={<BatteryCharging size={19} />}
                                        label="Battery"
                                        value={
                                            bike.batteryCapacity
                                                ? `${bike.batteryCapacity} kWh`
                                                : "N/A"
                                        }
                                    />

                                    <SpecCard
                                        icon={<Route size={19} />}
                                        label="Range"
                                        value={
                                            bike.range
                                                ? `${bike.range} km`
                                                : "N/A"
                                        }
                                    />

                                    <SpecCard
                                        icon={<Zap size={19} />}
                                        label="Charging Time"
                                        value={
                                            bike.chargingTime
                                                ? `${bike.chargingTime} hrs`
                                                : "N/A"
                                        }
                                    />
                                </>
                            ) : (
                                <SpecCard
                                    icon={<Gauge size={19} />}
                                    label="Engine"
                                    value={
                                        bike.engine
                                            ? `${bike.engine} CC`
                                            : "N/A"
                                    }
                                />
                            )}

                            <SpecCard
                                icon={<Zap size={19} />}
                                label="Power"
                                value={
                                    bike.power
                                        ? `${bike.power} HP`
                                        : "N/A"
                                }
                            />

                            <SpecCard
                                icon={<Zap size={19} />}
                                label="Torque"
                                value={
                                    bike.torque
                                        ? `${bike.torque} Nm`
                                        : "N/A"
                                }
                            />

                            <SpecCard
                                icon={<Gauge size={19} />}
                                label="Mileage"
                                value={
                                    bike.mileage
                                        ? `${bike.mileage} km/l`
                                        : "N/A"
                                }
                            />

                            <SpecCard
                                icon={<Fuel size={19} />}
                                label="Fuel"
                                value={bike.fuel || "N/A"}
                            />

                            <SpecCard
                                icon={<Settings2 size={19} />}
                                label="Transmission"
                                value={
                                    bike.transmission || "N/A"
                                }
                            />

                            <SpecCard
                                icon={<Weight size={19} />}
                                label="Weight"
                                value={
                                    bike.weight
                                        ? `${bike.weight} kg`
                                        : "N/A"
                                }
                            />

                            {bike.topSpeed ? (
                                <SpecCard
                                    icon={<Gauge size={19} />}
                                    label="Top Speed"
                                    value={`${bike.topSpeed} km/h`}
                                />
                            ) : null}

                            <SpecCard
                                icon={<Bike size={19} />}
                                label="Category"
                                value={bike.category || "N/A"}
                            />

                        </div>

                        {/* ACTION BUTTON — opens MotoMind with this bike as context */}
                        <button
                            onClick={() =>
                                navigate("/ai-advisor", {
                                    state: {
                                        askAbout: {
                                            brand: bike.brand,
                                            name: bike.name,
                                        },
                                    },
                                })
                            }
                            className="mt-8 w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg transition shadow-lg shadow-orange-500/10"
                        >
                            Ask MOTOAI About This Bike
                        </button>

                    </div>

                </div>

            </main>

            {/* =====================================================
                REVIEWS & RATINGS SECTION
            ===================================================== */}
            <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-16">
                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <h2 className="text-2xl font-black tracking-tight text-white">Reviews & Ratings</h2>
                        {(reviewEligible || currentUser?.role === "admin") ? (
                            <button
                                onClick={() => openReviewForm()}
                                className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400"
                            >
                                Write a Review
                            </button>
                        ) : (
                            <p className="text-xs text-zinc-500 rounded-xl border border-white/10 px-4 py-2.5">
                                Purchase this motorcycle to share your review.
                            </p>
                        )}
                    </div>

                    {/* Expert & User Rating Badges */}
                    {reviewSummary && (
                        <div className="grid gap-4 sm:grid-cols-3 mb-8">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Expert Rating</p>
                                <p className="text-3xl font-black text-orange-400">{reviewSummary.expertRating || "—"}</p>
                                <p className="text-xs text-zinc-500 mt-1">{reviewSummary.expertCount} expert reviews</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">User Rating</p>
                                <p className="text-3xl font-black text-orange-400">{reviewSummary.userRating || "—"}</p>
                                <p className="text-xs text-zinc-500 mt-1">{reviewSummary.userCount} user reviews</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Overall Rating</p>
                                <p className="text-3xl font-black text-orange-400">{reviewSummary.overallRating || "—"}</p>
                                <p className="text-xs text-zinc-500 mt-1">{reviewSummary.totalCount} total reviews</p>
                            </div>
                        </div>
                    )}

                    {reviewError && (
                        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{reviewError}</div>
                    )}

                    {/* Category Review Cards */}
                    {reviewsLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {CATEGORIES.map((cat) => {
                                const catReviews = reviews.filter((r) => r.category === cat.key);
                                const catSummary = reviewSummary?.categories?.[cat.key];
                                const expanded = expandedCards[cat.key];
                                return (
                                    <div key={cat.key} className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                                        {/* Category Header */}
                                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                                            <h3 className="font-bold text-white">{cat.label}</h3>
                                            {catSummary && catSummary.count > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <Star size={14} className="fill-orange-400 text-orange-400" />
                                                    <span className="text-sm font-bold text-orange-400">{catSummary.average}</span>
                                                    <span className="text-xs text-zinc-500">({catSummary.count})</span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Reviews */}
                                        {catReviews.length === 0 ? (
                                            <p className="px-5 py-6 text-sm text-zinc-500">No reviews yet for this category.</p>
                                        ) : (
                                            <div className="divide-y divide-white/5">
                                                {catReviews.map((review) => (
                                                    <div key={review._id} className="p-5">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm shrink-0">
                                                                    {review.user?.name?.charAt(0)?.toUpperCase() || "?"}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm text-white">{review.user?.name || "Anonymous"}</p>
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        {[1,2,3,4,5].map((s) => (
                                                                            <Star key={s} size={12} className={s <= review.rating ? "fill-orange-400 text-orange-400" : "text-zinc-600"} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {review.isExpert && (
                                                                    <span className="rounded-full bg-orange-500/10 border border-orange-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-400">Expert</span>
                                                                )}
                                                                {review.verifiedPurchase && (
                                                                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">Verified Purchase</span>
                                                                )}
                                                            </div>
                                                            {currentUser && review.user?._id === currentUser._id && (
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => openReviewForm(review)} className="rounded-lg p-1.5 text-zinc-500 hover:text-white transition"><Pencil size={14} /></button>
                                                                    <button onClick={() => handleDeleteReview(review._id)} className="rounded-lg p-1.5 text-zinc-500 hover:text-red-400 transition"><Trash2 size={14} /></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="mt-3 font-semibold text-white">{review.title}</p>
                                                        <p className={`mt-2 text-sm text-zinc-300 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
                                                            {review.comment}
                                                        </p>
                                                        {review.comment.length > 150 && (
                                                            <button onClick={() => toggleExpand(cat.key)} className="mt-2 text-xs font-bold text-orange-500 hover:text-orange-400 transition">
                                                                {expanded ? "Read Less" : "Read More"}
                                                            </button>
                                                        )}
                                                        {review.dealerResponse && (
                                                            <div className="mt-3 rounded-xl bg-white/[0.03] border border-white/10 p-3">
                                                                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-400">Dealer response</p>
                                                                <p className="mt-1 text-sm text-zinc-300">{review.dealerResponse.text}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* REVIEW FORM MODAL */}
            {showReviewForm && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
                        <h3 className="text-xl font-black mb-6 text-white">{editingReview ? "Edit Review" : "Write a Review"}</h3>
                        <div className="flex items-center gap-2 mb-5">
                            {[1,2,3,4,5].map((s) => (
                                <button key={s} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: s }))} className="transition hover:scale-110">
                                    <Star size={28} className={s <= reviewForm.rating ? "fill-orange-400 text-orange-400" : "text-zinc-600"} />
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-zinc-500">{reviewForm.rating > 0 ? `${reviewForm.rating}/5` : "Select rating"}</span>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Category</label>
                            <select
                                value={reviewForm.category}
                                onChange={(e) => setReviewForm((f) => ({ ...f, category: e.target.value }))}
                                className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c.key} value={c.key}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Title</label>
                            <input
                                value={reviewForm.title}
                                onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="Review title"
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                            />
                        </div>
                        <div className="mb-5">
                            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Comment</label>
                            <textarea
                                value={reviewForm.comment}
                                onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                                rows={4}
                                placeholder="Share your experience..."
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 resize-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={submitReview}
                                disabled={reviewSubmitting}
                                className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                            >
                                {reviewSubmitting ? "Submitting..." : editingReview ? "Update Review" : "Submit Review"}
                            </button>
                            <button onClick={closeReviewForm} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
                FULL SCREEN PHOTO MODAL
            ===================================================== */}
            {isFullScreen && currentImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6"
                    onClick={() => setIsFullScreen(false)}
                >
                    {/* TOP BAR */}
                    <div className="flex items-center justify-between z-10">
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-white">
                                {bike.brand} {bike.name}
                            </span>
                            {currentImage.label && (
                                <span className="px-3.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold">
                                    {currentImage.label}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {bikeImages.length > 0 && (
                                <span className="text-xs text-gray-400">
                                    {activeImage + 1} / {bikeImages.length}
                                </span>
                            )}

                            <button
                                onClick={() => setIsFullScreen(false)}
                                className="w-11 h-11 rounded-full bg-white/10 hover:bg-orange-500 text-white transition flex items-center justify-center shadow-lg"
                                title="Close Full Screen (Esc)"
                            >
                                <X size={22} />
                            </button>
                        </div>
                    </div>

                    {/* IMAGE VIEW CONTAINER */}
                    <div
                        className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* PREVIOUS BUTTON */}
                        {bikeImages.length > 1 && (
                            <button
                                onClick={previousImage}
                                className="absolute left-2 sm:left-6 z-10 w-12 h-12 rounded-full bg-black/70 border border-white/20 hover:bg-orange-500 hover:border-orange-500 transition text-white flex items-center justify-center shadow-2xl"
                                title="Previous Photo"
                            >
                                <ChevronLeft size={28} />
                            </button>
                        )}

                        {/* FULLSCREEN IMAGE */}
                        <img
                            src={currentImage.url}
                            alt={`${bike.name} - ${currentImage.label}`}
                            className="max-h-[76vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl transition-all duration-300 select-none"
                        />

                        {/* NEXT BUTTON */}
                        {bikeImages.length > 1 && (
                            <button
                                onClick={nextImage}
                                className="absolute right-2 sm:right-6 z-10 w-12 h-12 rounded-full bg-black/70 border border-white/20 hover:bg-orange-500 hover:border-orange-500 transition text-white flex items-center justify-center shadow-2xl"
                                title="Next Photo"
                            >
                                <ChevronRight size={28} />
                            </button>
                        )}
                    </div>

                    {/* BOTTOM THUMBNAILS BAR */}
                    {bikeImages.length > 0 && (
                        <div
                            className="flex items-center justify-center gap-3 overflow-x-auto py-2 z-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {bikeImages.map((image, index) => (
                                <button
                                    key={`fs-${image.url}-${index}`}
                                    onClick={() => setActiveImage(index)}
                                    className={`
                                        relative h-14 w-20 rounded-xl overflow-hidden border transition-all shrink-0
                                        ${activeImage === index
                                            ? "border-orange-500 ring-2 ring-orange-500/50 scale-105"
                                            : "border-white/20 opacity-60 hover:opacity-100"
                                        }
                                    `}
                                >
                                    <img
                                        src={image.url}
                                        alt={image.label}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


// =====================================================
// SPECIFICATION CARD
// =====================================================
const SpecCard = ({ icon, label, value }) => {
    return (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-4">

            <div className="flex items-center gap-2 text-orange-500 mb-2">
                {icon}

                <span className="text-xs uppercase tracking-wider text-gray-500">
                    {label}
                </span>
            </div>

            <p className="font-semibold text-white">
                {value}
            </p>

        </div>
    );
};

export default MotorcycleDetails;