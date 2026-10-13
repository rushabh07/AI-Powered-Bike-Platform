import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useWishlist } from "../context/WishlistContext";
import {
    getMotorcycleReviews,
    createReview,
    updateReview,
    deleteReview,
    getMotorcycleVariants,
} from "../services/api";
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
    Pencil,
    Trash2,
    Send,
    MapPin,
    Search,
    ShoppingCart,
    GitCompare,
    Check,
    LayoutDashboard,
    ShieldCheck,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/motorcycles";

const MotorcycleDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [bike, setBike] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [activeImage, setActiveImage] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const { isFavorite, toggle: toggleFavorite } = useWishlist();

    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);
    const showToast = (msg, ok = true) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ msg, ok });
        toastTimer.current = setTimeout(() => setToast(null), 2800);
    };

    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState(null);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewError, setReviewError] = useState("");
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [editingReview, setEditingReview] = useState(null);
    const [reviewForm, setReviewForm] = useState({ rating: 0, comment: "" });
    const [reviewSubmitting, setReviewSubmitting] = useState(false);

    const isLoggedIn = () => {
        try {
            return !!(
                localStorage.getItem("token") && localStorage.getItem("user")
            );
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

    const isAdmin = currentUser?.role === "admin";

    const fetchReviews = async () => {
        if (!bike) return;
        setReviewsLoading(true);
        setReviewError("");
        try {
            const data = await getMotorcycleReviews(bike._id);
            setReviews(data.reviews || []);
            setReviewStats(data.stats || null);
        } catch (err) {
            setReviewError(err.message || "Could not load reviews.");
        } finally {
            setReviewsLoading(false);
        }
    };

    useEffect(() => {
        if (bike) {
            fetchReviews();
            getMotorcycleVariants(bike._id)
                .then((data) => {
                    setVariants(data.variants || []);
                    if (data.variants && data.variants.length > 0) {
                        setSelectedVariant(data.variants[0]);
                    }
                })
                .catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, bike?._id]);

    const openReviewForm = (review = null) => {
        if (!isLoggedIn()) {
            navigate("/login");
            return;
        }
        if (review) {
            setEditingReview(review);
            setReviewForm({ rating: review.rating, comment: review.comment });
        } else {
            setEditingReview(null);
            setReviewForm({ rating: 0, comment: "" });
        }
        setShowReviewForm(true);
    };

    const closeReviewForm = () => {
        setShowReviewForm(false);
        setEditingReview(null);
        setReviewForm({ rating: 0, comment: "" });
    };

    const submitReview = async () => {
        if (!reviewForm.rating || reviewForm.rating < 1 || reviewForm.rating > 5) {
            showToast("Please select a rating between 1 and 5.", false);
            return;
        }
        if (!reviewForm.comment.trim()) {
            showToast("Please write a comment.", false);
            return;
        }
        setReviewSubmitting(true);
        try {
            if (editingReview) {
                await updateReview(editingReview._id, {
                    rating: reviewForm.rating,
                    comment: reviewForm.comment.trim(),
                });
                showToast("Review updated successfully!");
            } else {
                await createReview({
                    motorcycleId: bike._id,
                    rating: reviewForm.rating,
                    comment: reviewForm.comment.trim(),
                });
                showToast("Review submitted successfully!");
            }
            closeReviewForm();
            await fetchReviews();
        } catch (err) {
            showToast(err.message || "Failed to submit review.", false);
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Delete this review permanently?")) return;
        try {
            await deleteReview(reviewId);
            showToast("Review deleted successfully!");
            await fetchReviews();
        } catch (err) {
            showToast(err.message || "Failed to delete review.", false);
        }
    };

    const handleToggleFavorite = async () => {
        if (!bike) return;
        const wasLiked = isFavorite(bike._id);
        try {
            await toggleFavorite(bike._id, navigate);
            showToast(
                wasLiked
                    ? `Removed ${bike.name} from wishlist`
                    : `${bike.name} added to wishlist!`,
                !wasLiked
            );
        } catch {
            showToast("Failed to update wishlist. Please try again.", false);
        }
    };

    const [variants, setVariants] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState(null);

    const [selectedCity, setSelectedCity] = useState("");
    const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
    const [citySearch, setCitySearch] = useState("");
    const cityDropdownRef = useRef(null);

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

    const handleBuyNow = () => {
        if (isAdmin) {
            showToast("Admin accounts cannot purchase motorcycles.", false);
            return;
        }
        if (!isLoggedIn()) {
            navigate("/login");
            return;
        }
        if (!selectedCity) {
            showToast("Please select a city first.", false);
            return;
        }
        if (!selectedCityPrice) {
            showToast("On-road price not available for selected city.", false);
            return;
        }
        const params = new URLSearchParams({ city: selectedCity });
        if (selectedVariant) {
            params.set("variant", selectedVariant._id);
        }
        navigate(`/motorcycles/${id}/checkout?${params.toString()}`);
    };

    const handleCompare = () => {
        navigate("/compare", { state: { preselect: bike._id } });
    };

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

    const bikeImages = useMemo(() => {
        if (!bike) return [];
        if (Array.isArray(bike.images) && bike.images.length > 0) {
            return bike.images;
        }
        if (bike.image) {
            return [{ url: bike.image, label: "Main View" }];
        }
        return [];
    }, [bike]);

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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-5" />
                    <p className="text-gray-400">Loading motorcycle...</p>
                </div>
            </div>
        );
    }

    const isEV = String(bike?.category || "").toLowerCase() === "electric";

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
    const onRoad = onRoadPrice;

    return (
        <div className="min-h-screen bg-[#070707] text-white">
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
                </div>
            )}

            <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-7 flex items-center justify-between">
                <button
                    onClick={() => navigate("/motorcycles")}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition group"
                >
                    <ArrowLeft
                        size={18}
                        className="transition-transform group-hover:-translate-x-1"
                    />
                    Back to Motorcycles
                </button>

                {isAdmin && (
                    <button
                        onClick={() => navigate("/admin")}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-bold hover:bg-amber-500/20 transition shadow-lg shadow-amber-500/5"
                    >
                        <LayoutDashboard size={14} />
                        Return to Admin Dashboard
                    </button>
                )}
            </div>

            <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
                <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10">
                    {/* LEFT — IMAGE GALLERY */}
                    <div>
                        <div className="relative bg-[#111] border border-white/10 rounded-3xl overflow-hidden group">
                            <div
                                className="aspect-[16/10] relative cursor-pointer"
                                onClick={() => setIsFullScreen(true)}
                            >
                                {currentImage ? (
                                    <img
                                        src={currentImage.url}
                                        alt={`${bike.name} - ${currentImage.label}`}
                                        className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Bike className="w-20 h-20 text-gray-600" />
                                    </div>
                                )}

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

                                {currentImage?.label && (
                                    <div className="absolute left-5 bottom-5">
                                        <span className="px-4 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-sm font-medium">
                                            {currentImage.label}
                                        </span>
                                    </div>
                                )}

                                {bikeImages.length > 1 && (
                                    <>
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
                                    </>
                                )}

                                {bikeImages.length > 0 && (
                                    <div className="absolute right-5 bottom-5">
                                        <span className="px-3 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs text-gray-300">
                                            {activeImage + 1} / {bikeImages.length}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {bikeImages.length > 0 && (
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mt-4">
                                {bikeImages.map((image, index) => (
                                    <button
                                        key={`${image.url}-${index}`}
                                        aria-label={`View ${image.label}`}
                                        onClick={() => setActiveImage(index)}
                                        className={`relative aspect-square rounded-xl overflow-hidden border transition-all duration-300 ${
                                            activeImage === index
                                                ? "border-orange-500 ring-2 ring-orange-500/30 scale-[1.02]"
                                                : "border-white/10 hover:border-white/30 opacity-70 hover:opacity-100"
                                        }`}
                                    >
                                        <img
                                            src={image.url}
                                            alt={`${bike.name} - ${image.label}`}
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 bg-black/75 backdrop-blur-sm px-1.5 py-1">
                                            <p className="text-[10px] sm:text-xs text-white truncate">
                                                {image.label}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT — BIKE INFORMATION */}
                    <div className="flex flex-col">
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

                        <div className="flex items-start justify-between gap-5">
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                                    {bike.name}
                                </h1>
                                <p className="text-gray-400 mt-3">{bike.category}</p>
                            </div>
                            <button
                                aria-label={
                                    isFavorite(bike._id)
                                        ? `Remove ${bike.name} from favorites`
                                        : `Save ${bike.name} to favorites`
                                }
                                aria-pressed={isFavorite(bike._id)}
                                onClick={handleToggleFavorite}
                                title={
                                    isFavorite(bike._id)
                                        ? "In Wishlist"
                                        : "Add to Wishlist"
                                }
                                className={`shrink-0 flex items-center gap-2 rounded-2xl border px-4 py-2.5 transition-all duration-200 ${
                                    isFavorite(bike._id)
                                        ? "border-orange-500 bg-orange-500/10 text-orange-400 shadow-lg shadow-orange-500/10"
                                        : "border-white/10 text-gray-400 hover:border-orange-500/40 hover:bg-orange-500/5 hover:text-orange-400"
                                }`}
                            >
                                <Heart
                                    size={18}
                                    fill={
                                        isFavorite(bike._id)
                                            ? "currentColor"
                                            : "none"
                                    }
                                />
                                <span className="text-sm font-semibold">
                                    {isFavorite(bike._id)
                                        ? "In Wishlist"
                                        : "Add to Wishlist"}
                                </span>
                            </button>
                        </div>

                        <div className="flex items-center gap-3 mt-6">
                            <div className="flex items-center gap-1 text-orange-400">
                                <Star size={18} fill="currentColor" />
                                <span className="font-bold">
                                    {bike.rating ?? "N/A"}
                                </span>
                            </div>
                            <span className="text-gray-600">•</span>
                            <span className="text-gray-400">{bike.category}</span>
                        </div>

                        {/* VARIANT SELECTOR */}
                        {variants.length > 0 && (
                            <div className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                                    Choose Variant
                                </p>
                                <div className="space-y-2">
                                    {variants.map((v) => (
                                        <button
                                            key={v._id}
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
                                                <div
                                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                        selectedVariant?._id ===
                                                        v._id
                                                            ? "border-orange-500"
                                                            : "border-zinc-600"
                                                    }`}
                                                >
                                                    {selectedVariant?._id ===
                                                        v._id && (
                                                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm">
                                                        {v.variantName}
                                                    </p>
                                                    {v.features &&
                                                        v.features.length > 0 && (
                                                            <p className="text-xs text-zinc-500 truncate max-w-[200px]">
                                                                {v.features
                                                                    .slice(0, 2)
                                                                    .join(" • ")}
                                                            </p>
                                                        )}
                                                </div>
                                            </div>
                                            <span className="font-bold text-orange-400 whitespace-nowrap">
                                                ₹
                                                {Number(
                                                    v.exShowroomPrice
                                                ).toLocaleString("en-IN")}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PRICE SECTION */}
                        <div className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-6">
                            <div className="flex items-baseline justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                                        Ex-showroom
                                    </p>
                                    <p className="text-2xl font-bold text-gray-300 mt-1">
                                        ₹{Number(exShowroom).toLocaleString("en-IN")}
                                    </p>
                                </div>
                                {selectedCityPrice && (
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">
                                            On-road • {selectedCity}
                                        </p>
                                        <p className="text-3xl font-black text-orange-400 mt-1">
                                            ₹{Number(onRoad).toLocaleString("en-IN")}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* CITY SELECTOR */}
                            {availableCities.length > 0 && (
                                <div className="mt-5" ref={cityDropdownRef}>
                                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                                        <MapPin size={12} className="inline mr-1" />
                                        Select City
                                    </label>
                                    <button
                                        onClick={() => {
                                            setCityDropdownOpen(
                                                !cityDropdownOpen
                                            );
                                            setCitySearch("");
                                        }}
                                        className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white transition hover:border-orange-500/40"
                                    >
                                        <span>
                                            {selectedCity || "Choose your city"}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {selectedCity
                                                ? "Change City"
                                                : "Select"}
                                        </span>
                                    </button>

                                    {cityDropdownOpen && (
                                        <div className="mt-2 rounded-xl border border-white/10 bg-[#111] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-3 border-b border-white/10">
                                                <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
                                                    <Search
                                                        size={14}
                                                        className="text-gray-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={citySearch}
                                                        onChange={(e) =>
                                                            setCitySearch(
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Search cities..."
                                                        className="bg-transparent text-sm text-white outline-none w-full placeholder:text-gray-600"
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                                {filteredCities.length === 0 ? (
                                                    <p className="px-4 py-3 text-sm text-gray-500">
                                                        No cities found
                                                    </p>
                                                ) : (
                                                    filteredCities.map((city) => {
                                                        const cp = (
                                                            bike.cityPrices || []
                                                        ).find(
                                                            (c) =>
                                                                c.city === city
                                                        );
                                                        return (
                                                            <button
                                                                key={city}
                                                                onClick={() => {
                                                                    setSelectedCity(
                                                                        city
                                                                    );
                                                                    setCityDropdownOpen(
                                                                        false
                                                                    );
                                                                }}
                                                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition hover:bg-orange-500/5 ${
                                                                    selectedCity ===
                                                                    city
                                                                        ? "text-orange-400"
                                                                        : "text-gray-300"
                                                                }`}
                                                            >
                                                                <span>{city}</span>
                                                                {cp && (
                                                                    <span className="text-xs text-gray-500">
                                                                        ₹
                                                                        {Number(
                                                                            exShowroom +
                                                                                cp.roadTax +
                                                                                Math.round(
                                                                                    exShowroom *
                                                                                        0.03
                                                                                )
                                                                        ).toLocaleString(
                                                                            "en-IN"
                                                                        )}
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
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            {isAdmin ? (
                                <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-amber-200">Admin Mode — Purchases Disabled</p>
                                            <p className="text-xs text-amber-300/80">You can inspect specifications, variants, and city-wise pricing without purchasing.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate("/admin")}
                                        className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition flex items-center gap-2"
                                    >
                                        <LayoutDashboard size={15} />
                                        Return to Dashboard
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleBuyNow}
                                    className="flex-1 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg transition shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2"
                                >
                                    <ShoppingCart size={20} />
                                    Buy Now
                                </button>
                            )}
                            <button
                                onClick={handleCompare}
                                className="px-5 py-4 rounded-2xl border border-white/10 text-gray-400 hover:border-orange-500/40 hover:text-orange-400 transition flex items-center justify-center gap-2"
                                title="Compare"
                            >
                                <GitCompare size={20} />
                                <span className="text-sm font-semibold sm:hidden">Compare</span>
                            </button>
                        </div>

                        {bike.description && (
                            <p className="text-gray-400 leading-7 mt-6">
                                {bike.description}
                            </p>
                        )}

                        {/* SPECIFICATIONS */}
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
                                    bike.power ? `${bike.power} HP` : "N/A"
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
                                value={bike.transmission || "N/A"}
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

            {/* REVIEWS & RATINGS SECTION */}
            <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-16">
                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">
                                Reviews & Ratings
                            </h2>
                            <p className="text-sm text-zinc-500 mt-1">
                                Real reviews from verified riders
                            </p>
                        </div>
                        <button
                            onClick={() => openReviewForm()}
                            className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400"
                        >
                            <Send size={15} />
                            Write a Review
                        </button>
                    </div>

                    {reviewError && (
                        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            {reviewError}
                        </div>
                    )}

                    {reviewsLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                        </div>
                    ) : (
                        <>
                            {reviewStats && reviewStats.total > 0 && (
                                <div className="grid gap-6 md:grid-cols-[auto_1fr] mb-10">
                                    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-6 min-w-[180px]">
                                        <p className="text-5xl font-black text-orange-400">
                                            {reviewStats.average}
                                        </p>
                                        <div className="flex items-center gap-0.5 mt-2">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    size={18}
                                                    className={
                                                        s <=
                                                        Math.round(
                                                            reviewStats.average
                                                        )
                                                            ? "fill-orange-400 text-orange-400"
                                                            : "text-zinc-600"
                                                    }
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-zinc-500 mt-2">
                                            {reviewStats.total} review
                                            {reviewStats.total !== 1 ? "s" : ""}
                                        </p>
                                    </div>

                                    <div className="flex flex-col justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                                        {[5, 4, 3, 2, 1].map((star) => {
                                            const count =
                                                reviewStats.distribution?.[
                                                    star
                                                ] || 0;
                                            const pct =
                                                reviewStats.total > 0
                                                    ? (count /
                                                          reviewStats.total) *
                                                      100
                                                    : 0;
                                            return (
                                                <div
                                                    key={star}
                                                    className="flex items-center gap-3"
                                                >
                                                    <span className="text-xs font-bold text-zinc-400 w-8">
                                                        {star}★
                                                    </span>
                                                    <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-orange-500 transition-all duration-500"
                                                            style={{
                                                                width: `${pct}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-zinc-500 w-8 text-right">
                                                        {count}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {reviews.length === 0 ? (
                                <div className="text-center py-12">
                                    <Star
                                        size={40}
                                        className="mx-auto text-zinc-700 mb-4"
                                    />
                                    <p className="text-zinc-500">
                                        No reviews yet. Be the first to review!
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {reviews.map((review) => {
                                        const isOwn =
                                            currentUser &&
                                            review.user?._id ===
                                                currentUser._id;
                                        return (
                                            <div
                                                key={review._id}
                                                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm">
                                                            {review.user?.name?.charAt(
                                                                0
                                                            )?.toUpperCase() || "?"}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm">
                                                                {review.user?.name ||
                                                                    "Anonymous"}
                                                            </p>
                                                            <p className="text-xs text-zinc-500">
                                                                {new Date(
                                                                    review.createdAt
                                                                ).toLocaleDateString(
                                                                    "en-IN",
                                                                    {
                                                                        day: "numeric",
                                                                        month: "short",
                                                                        year: "numeric",
                                                                    }
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {[1, 2, 3, 4, 5].map(
                                                            (s) => (
                                                                <Star
                                                                    key={s}
                                                                    size={14}
                                                                    className={
                                                                        s <=
                                                                        review.rating
                                                                            ? "fill-orange-400 text-orange-400"
                                                                            : "text-zinc-600"
                                                                    }
                                                                />
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
                                                    {review.comment}
                                                </p>
                                                {isOwn && (
                                                    <div className="mt-4 flex items-center gap-2">
                                                        <button
                                                            onClick={() =>
                                                                openReviewForm(
                                                                    review
                                                                )
                                                            }
                                                            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-orange-500/40 hover:text-orange-400"
                                                        >
                                                            <Pencil size={12} />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteReview(
                                                                    review._id
                                                                )
                                                            }
                                                            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-red-500/40 hover:text-red-400"
                                                        >
                                                            <Trash2 size={12} />
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* REVIEW FORM MODAL */}
            {showReviewForm && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
                        <h3 className="text-xl font-black mb-6">
                            {editingReview ? "Edit Review" : "Write a Review"}
                        </h3>

                        <div className="flex items-center gap-2 mb-5">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                    key={s}
                                    onClick={() =>
                                        setReviewForm((f) => ({
                                            ...f,
                                            rating: s,
                                        }))
                                    }
                                    className="transition hover:scale-110"
                                >
                                    <Star
                                        size={28}
                                        className={
                                            s <= reviewForm.rating
                                                ? "fill-orange-400 text-orange-400"
                                                : "text-zinc-600"
                                        }
                                    />
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-zinc-500">
                                {reviewForm.rating > 0
                                    ? `${reviewForm.rating}/5`
                                    : "Select rating"}
                            </span>
                        </div>

                        <textarea
                            value={reviewForm.comment}
                            onChange={(e) =>
                                setReviewForm((f) => ({
                                    ...f,
                                    comment: e.target.value,
                                }))
                            }
                            placeholder="Share your experience with this motorcycle..."
                            rows={4}
                            maxLength={1000}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 resize-none"
                        />
                        <p className="text-xs text-zinc-600 mt-1 text-right">
                            {reviewForm.comment.length}/1000
                        </p>

                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={submitReview}
                                disabled={reviewSubmitting}
                                className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                            >
                                {reviewSubmitting
                                    ? "Submitting..."
                                    : editingReview
                                      ? "Update Review"
                                      : "Submit Review"}
                            </button>
                            <button
                                onClick={closeReviewForm}
                                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL SCREEN PHOTO MODAL */}
            {isFullScreen && currentImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6"
                    onClick={() => setIsFullScreen(false)}
                >
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

                    <div
                        className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {bikeImages.length > 1 && (
                            <>
                                <button
                                    onClick={previousImage}
                                    className="absolute left-2 sm:left-6 z-10 w-12 h-12 rounded-full bg-black/70 border border-white/20 hover:bg-orange-500 hover:border-orange-500 transition text-white flex items-center justify-center shadow-2xl"
                                    title="Previous Photo"
                                >
                                    <ChevronLeft size={28} />
                                </button>
                                <button
                                    onClick={nextImage}
                                    className="absolute right-2 sm:right-6 z-10 w-12 h-12 rounded-full bg-black/70 border border-white/20 hover:bg-orange-500 hover:border-orange-500 transition text-white flex items-center justify-center shadow-2xl"
                                    title="Next Photo"
                                >
                                    <ChevronRight size={28} />
                                </button>
                            </>
                        )}

                        <img
                            src={currentImage.url}
                            alt={`${bike.name} - ${currentImage.label}`}
                            className="max-h-[76vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl transition-all duration-300 select-none"
                        />
                    </div>

                    {bikeImages.length > 0 && (
                        <div
                            className="flex items-center justify-center gap-3 overflow-x-auto py-2 z-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {bikeImages.map((image, index) => (
                                <button
                                    key={`fs-${image.url}-${index}`}
                                    onClick={() => setActiveImage(index)}
                                    className={`relative h-14 w-20 rounded-xl overflow-hidden border transition-all shrink-0 ${
                                        activeImage === index
                                            ? "border-orange-500 ring-2 ring-orange-500/50 scale-105"
                                            : "border-white/20 opacity-60 hover:opacity-100"
                                    }`}
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

const SpecCard = ({ icon, label, value }) => {
    return (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-orange-500 mb-2">
                {icon}
                <span className="text-xs uppercase tracking-wider text-gray-500">
                    {label}
                </span>
            </div>
            <p className="font-semibold text-white">{value}</p>
        </div>
    );
};

export default MotorcycleDetails;
