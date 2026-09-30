import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
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
    Zap
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

                        {/* MAIN IMAGE */}
                        <div className="relative bg-[#111] border border-white/10 rounded-3xl overflow-hidden group">

                            <div
                                className="aspect-[16/10] relative cursor-pointer"
                                onClick={() => setIsFullScreen(true)}
                            >

                                {currentImage ? (
                                    <img
                                        src={currentImage.url}
                                        alt={`${bike.name} - ${currentImage.label}`}
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

                        {/* PRICE */}
                        <div className="mt-8">

                            <p className="text-sm text-gray-500 uppercase tracking-wider">
                                Starting Price
                            </p>

                            <p className="text-4xl font-black mt-1">
                                ₹{Number(bike.price || 0).toLocaleString("en-IN")}
                            </p>

                        </div>

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