import React, { useEffect, useState } from "react";
import {
    LayoutDashboard,
    User,
    Mail,
    Phone,
    MapPin,
    CalendarDays,
    IndianRupee,
    Clock,
    CheckCircle2,
    XCircle,
    PlayCircle,
    ShieldCheck,
    Edit3,
    LogOut,
    Menu,
    X,
    RefreshCw,
    AlertCircle,
    Bike,
    Briefcase,
    TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

const ProviderDashboard = () => {
    const navigate = useNavigate();

    // =========================
    // STATE
    // =========================

    const [provider, setProvider] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [bookings, setBookings] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [mobileMenu, setMobileMenu] = useState(false);
    const [activeSection, setActiveSection] = useState("dashboard");

    const [actionLoading, setActionLoading] = useState(null);

    // Edit Profile
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const [profileForm, setProfileForm] = useState({
        name: "",
        phone: "",
        address: "",
    });

    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState("");
    const [profileError, setProfileError] = useState("");

    // =========================
    // GET TOKEN
    // =========================

    const getToken = () => {
        return (
            localStorage.getItem("token") ||
            localStorage.getItem("motoai_token")
        );
    };

    // =========================
    // API REQUEST
    // =========================

    const apiRequest = async (endpoint, options = {}) => {
        const token = getToken();

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(token
                    ? {
                        Authorization: `Bearer ${token}`,
                    }
                    : {}),
                ...(options.headers || {}),
            },
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                `Request failed with status ${response.status}`
            );
        }

        return data;
    };

    // =========================
    // LOAD DATA
    // =========================

    const loadData = async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }

            setError("");

            const [dashboardData, profileData, bookingsData] =
                await Promise.all([
                    apiRequest("/provider/dashboard"),
                    apiRequest("/provider/profile"),
                    apiRequest("/provider/bookings"),
                ]);

            setDashboard(
                dashboardData.data ||
                dashboardData.dashboard ||
                dashboardData
            );

            setProvider(
                profileData.data ||
                profileData.provider ||
                profileData.user ||
                profileData
            );

            setBookings(
                bookingsData.data ||
                bookingsData.bookings ||
                []
            );
        } catch (err) {
            console.error("Provider dashboard error:", err);

            setError(
                err.message ||
                "Unable to load provider dashboard."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // =========================
    // INITIAL LOAD
    // =========================

    useEffect(() => {
        const token = getToken();

        if (!token) {
            navigate("/login");
            return;
        }

        loadData(true);
    }, []);

    // =========================
    // REFRESH
    // =========================

    const handleRefresh = () => {
        loadData(false);
    };

    // =========================
    // BOOKING ACTION
    // =========================

    const handleBookingAction = async (bookingId, action) => {
        try {
            setActionLoading(`${bookingId}-${action}`);

            let endpoint = "";

            switch (action) {
                case "accept":
                    endpoint = `/provider/bookings/${bookingId}/accept`;
                    break;

                case "reject":
                    endpoint = `/provider/bookings/${bookingId}/reject`;
                    break;

                case "start":
                    endpoint = `/provider/bookings/${bookingId}/start`;
                    break;

                case "complete":
                    endpoint = `/provider/bookings/${bookingId}/complete`;
                    break;

                default:
                    return;
            }

            await apiRequest(endpoint, {
                method: "PUT",
            });

            await loadData(false);
        } catch (err) {
            console.error(
                `Booking ${action} error:`,
                err
            );

            alert(
                err.message ||
                `Unable to ${action} booking.`
            );
        } finally {
            setActionLoading(null);
        }
    };

    // =========================
    // LOGOUT
    // =========================

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        localStorage.removeItem("motoai_token");
        localStorage.removeItem("motoai_user");

        navigate("/login");
    };

    // =========================
    // SECTION SCROLL
    // =========================

    const scrollToSection = (section) => {
        setActiveSection(section);
        setMobileMenu(false);

        const element =
            document.getElementById(section);

        if (element) {
            element.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    };

    // =========================
    // EDIT PROFILE
    // =========================

    const openEditProfile = () => {
        setProfileForm({
            name: provider?.name || "",
            phone: provider?.phone || "",
            address: provider?.address || "",
        });

        setProfileMessage("");
        setProfileError("");

        setIsEditingProfile(true);
    };

    // =========================
    // PROFILE FORM CHANGE
    // =========================

    const handleProfileChange = (e) => {
        const { name, value } = e.target;

        setProfileForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // =========================
    // SAVE PROFILE
    // =========================

    const handleProfileSubmit = async (e) => {
        e.preventDefault();

        setProfileError("");
        setProfileMessage("");

        if (!profileForm.name.trim()) {
            setProfileError(
                "Please enter your name."
            );
            return;
        }

        try {
            setProfileSaving(true);

            const data = await apiRequest(
                "/provider/profile",
                {
                    method: "PUT",
                    body: JSON.stringify({
                        name: profileForm.name.trim(),
                        phone: profileForm.phone.trim(),
                        address: profileForm.address.trim(),
                    }),
                }
            );

            const updatedProvider =
                data.data ||
                data.provider ||
                data.user ||
                data;

            setProvider((prev) => ({
                ...prev,
                ...updatedProvider,
            }));

            // Update localStorage
            const currentUser =
                JSON.parse(
                    localStorage.getItem("user") ||
                    localStorage.getItem(
                        "motoai_user"
                    ) ||
                    "null"
                ) || {};

            const updatedUser = {
                ...currentUser,
                ...updatedProvider,
            };

            localStorage.setItem(
                "user",
                JSON.stringify(updatedUser)
            );

            localStorage.setItem(
                "motoai_user",
                JSON.stringify(updatedUser)
            );

            setProfileMessage(
                "Profile updated successfully."
            );

            setTimeout(() => {
                setIsEditingProfile(false);
            }, 1000);
        } catch (err) {
            console.error(
                "Profile update error:",
                err
            );

            setProfileError(
                err.message ||
                "Unable to update profile."
            );
        } finally {
            setProfileSaving(false);
        }
    };

    // =========================
    // STATUS BADGE
    // =========================

    const StatusBadge = ({ status }) => {
        const normalizedStatus =
            String(status || "pending").toLowerCase();

        const statusConfig = {
            pending: {
                label: "Pending",
                className:
                    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
            },

            accepted: {
                label: "Accepted",
                className:
                    "bg-blue-500/10 text-blue-400 border-blue-500/20",
            },

            confirmed: {
                label: "Confirmed",
                className:
                    "bg-blue-500/10 text-blue-400 border-blue-500/20",
            },

            ongoing: {
                label: "Ongoing",
                className:
                    "bg-purple-500/10 text-purple-400 border-purple-500/20",
            },

            started: {
                label: "Started",
                className:
                    "bg-purple-500/10 text-purple-400 border-purple-500/20",
            },

            completed: {
                label: "Completed",
                className:
                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            },

            rejected: {
                label: "Rejected",
                className:
                    "bg-red-500/10 text-red-400 border-red-500/20",
            },

            cancelled: {
                label: "Cancelled",
                className:
                    "bg-red-500/10 text-red-400 border-red-500/20",
            },
        };

        const config =
            statusConfig[normalizedStatus] ||
            statusConfig.pending;

        return (
            <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${config.className}`}
            >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {config.label}
            </span>
        );
    };

    // =========================
    // PROFILE ITEM
    // =========================

    const ProfileItem = ({
        icon: Icon,
        label,
        value,
    }) => {
        return (
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-zinc-800 flex items-center justify-center">
                    <Icon
                        size={18}
                        className="text-orange-400"
                    />
                </div>

                <div className="min-w-0">
                    <p className="text-xs text-zinc-500 mb-1">
                        {label}
                    </p>

                    <p className="text-sm text-white break-words">
                        {value || "Not provided"}
                    </p>
                </div>
            </div>
        );
    };

    // =========================
    // LOADING
    // =========================

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin mx-auto mb-5" />

                    <p className="text-zinc-400">
                        Loading provider dashboard...
                    </p>
                </div>
            </div>
        );
    }

    // =========================
    // MAIN UI
    // =========================

    return (
        <div className="min-h-screen bg-[#09090b] text-white">
            {/* =======================
                MOBILE HEADER
            ======================= */}

            <header className="lg:hidden sticky top-0 z-50 bg-[#09090b]/95 backdrop-blur-xl border-b border-zinc-800">
                <div className="h-16 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
                            <Bike
                                size={20}
                                className="text-black"
                            />
                        </div>

                        <div>
                            <p className="font-bold">
                                MOTOAI
                            </p>

                            <p className="text-[10px] text-zinc-500">
                                PROVIDER
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setMobileMenu(
                                !mobileMenu
                            )
                        }
                        className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center"
                    >
                        {mobileMenu ? (
                            <X size={20} />
                        ) : (
                            <Menu size={20} />
                        )}
                    </button>
                </div>

                {mobileMenu && (
                    <div className="border-t border-zinc-800 p-4 bg-[#111113]">
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() =>
                                    scrollToSection(
                                        "dashboard"
                                    )
                                }
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800 text-left"
                            >
                                <LayoutDashboard
                                    size={18}
                                />
                                Dashboard
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    scrollToSection(
                                        "bookings"
                                    )
                                }
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800 text-left"
                            >
                                <CalendarDays
                                    size={18}
                                />
                                Bookings
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    scrollToSection(
                                        "profile"
                                    )
                                }
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800 text-left"
                            >
                                <User size={18} />
                                Profile
                            </button>

                            <button
                                type="button"
                                onClick={
                                    handleLogout
                                }
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 text-left"
                            >
                                <LogOut
                                    size={18}
                                />
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* =======================
                DESKTOP SIDEBAR
            ======================= */}

            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-72 bg-[#0d0d0f] border-r border-zinc-800 flex-col">
                {/* Logo */}

                <div className="h-20 px-6 flex items-center border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center">
                            <Bike
                                size={23}
                                className="text-black"
                            />
                        </div>

                        <div>
                            <h1 className="font-bold text-lg">
                                MOTOAI
                            </h1>

                            <p className="text-[10px] tracking-[0.2em] text-zinc-500">
                                AI MOTORS
                            </p>
                        </div>
                    </div>
                </div>

                {/* Provider */}

                <div className="p-5">
                    <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                                {provider?.name
                                    ?.charAt(0)
                                    ?.toUpperCase() ||
                                    "P"}
                            </div>

                            <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">
                                    {provider?.name ||
                                        "Provider"}
                                </p>

                                <p className="text-xs text-zinc-500 truncate">
                                    {provider?.email ||
                                        "Provider account"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Active Provider
                        </div>
                    </div>
                </div>

                {/* Navigation */}

                <nav className="px-4 space-y-2 flex-1">
                    <button
                        type="button"
                        onClick={() =>
                            scrollToSection(
                                "dashboard"
                            )
                        }
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${activeSection ===
                                "dashboard"
                                ? "bg-orange-500 text-black font-semibold"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                            }`}
                    >
                        <LayoutDashboard
                            size={18}
                        />
                        Dashboard
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            scrollToSection(
                                "bookings"
                            )
                        }
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${activeSection ===
                                "bookings"
                                ? "bg-orange-500 text-black font-semibold"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                            }`}
                    >
                        <CalendarDays
                            size={18}
                        />
                        Bookings
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            scrollToSection(
                                "profile"
                            )
                        }
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${activeSection ===
                                "profile"
                                ? "bg-orange-500 text-black font-semibold"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                            }`}
                    >
                        <User size={18} />
                        My Profile
                    </button>
                </nav>

                {/* Logout */}

                <div className="p-4 border-t border-zinc-800">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* =======================
                MAIN CONTENT
            ======================= */}

            <main className="lg:ml-72">
                {/* Top bar */}

                <div className="hidden lg:flex sticky top-0 z-40 h-20 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800 px-8 items-center justify-between">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">
                            Provider Portal
                        </p>

                        <h2 className="text-xl font-bold mt-1">
                            Welcome back,{" "}
                            {provider?.name ||
                                "Provider"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 hover:text-white hover:border-zinc-700 transition disabled:opacity-50"
                    >
                        <RefreshCw
                            size={16}
                            className={
                                refreshing
                                    ? "animate-spin"
                                    : ""
                            }
                        />

                        {refreshing
                            ? "Refreshing..."
                            : "Refresh"}
                    </button>
                </div>

                <div className="p-4 sm:p-6 lg:p-8 space-y-8">
                    {/* Error */}

                    {error && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                            <AlertCircle
                                size={20}
                                className="text-red-400 shrink-0"
                            />

                            <div>
                                <p className="font-medium text-red-400">
                                    Unable to load dashboard
                                </p>

                                <p className="text-sm text-red-400/80 mt-1">
                                    {error}
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        loadData(
                                            true
                                        )
                                    }
                                    className="mt-3 text-sm underline text-red-300"
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    )}

                    {/* =======================
                        DASHBOARD
                    ======================= */}

                    <section id="dashboard">
                        <div className="mb-6">
                            <p className="text-sm text-orange-400 font-medium">
                                Provider Dashboard
                            </p>

                            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
                                Manage Your Services
                            </h1>

                            <p className="text-zinc-500 mt-2 text-sm">
                                Track bookings, earnings
                                and your provider
                                profile.
                            </p>
                        </div>

                        {/* Stats */}

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            {/* Total Bookings */}

                            <div className="p-5 rounded-2xl bg-[#111113] border border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <Briefcase
                                            size={20}
                                            className="text-blue-400"
                                        />
                                    </div>

                                    <span className="text-xs text-zinc-600">
                                        TOTAL
                                    </span>
                                </div>

                                <p className="text-2xl font-bold mt-5">
                                    {dashboard?.totalBookings ??
                                        dashboard?.stats
                                            ?.totalBookings ??
                                        bookings.length ??
                                        0}
                                </p>

                                <p className="text-sm text-zinc-500 mt-1">
                                    Total Bookings
                                </p>
                            </div>

                            {/* Pending */}

                            <div className="p-5 rounded-2xl bg-[#111113] border border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <div className="w-11 h-11 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                                        <Clock
                                            size={20}
                                            className="text-yellow-400"
                                        />
                                    </div>

                                    <span className="text-xs text-zinc-600">
                                        PENDING
                                    </span>
                                </div>

                                <p className="text-2xl font-bold mt-5">
                                    {dashboard?.pendingBookings ??
                                        dashboard?.stats
                                            ?.pendingBookings ??
                                        bookings.filter(
                                            (b) =>
                                                String(
                                                    b.status
                                                ).toLowerCase() ===
                                                "pending"
                                        ).length}
                                </p>

                                <p className="text-sm text-zinc-500 mt-1">
                                    Pending Requests
                                </p>
                            </div>

                            {/* Completed */}

                            <div className="p-5 rounded-2xl bg-[#111113] border border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        <CheckCircle2
                                            size={20}
                                            className="text-emerald-400"
                                        />
                                    </div>

                                    <span className="text-xs text-zinc-600">
                                        DONE
                                    </span>
                                </div>

                                <p className="text-2xl font-bold mt-5">
                                    {dashboard?.completedBookings ??
                                        dashboard?.stats
                                            ?.completedBookings ??
                                        bookings.filter(
                                            (b) =>
                                                String(
                                                    b.status
                                                ).toLowerCase() ===
                                                "completed"
                                        ).length}
                                </p>

                                <p className="text-sm text-zinc-500 mt-1">
                                    Completed Jobs
                                </p>
                            </div>

                            {/* Earnings */}

                            <div className="p-5 rounded-2xl bg-[#111113] border border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                        <IndianRupee
                                            size={20}
                                            className="text-orange-400"
                                        />
                                    </div>

                                    <TrendingUp
                                        size={17}
                                        className="text-emerald-400"
                                    />
                                </div>

                                <p className="text-2xl font-bold mt-5">
                                    ₹
                                    {Number(
                                        dashboard?.totalEarnings ??
                                        dashboard
                                            ?.stats
                                            ?.totalEarnings ??
                                        dashboard?.earnings ??
                                        0
                                    ).toLocaleString(
                                        "en-IN"
                                    )}
                                </p>

                                <p className="text-sm text-zinc-500 mt-1">
                                    Total Earnings
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* =======================
                        BOOKINGS
                    ======================= */}

                    <section
                        id="bookings"
                        className="scroll-mt-24"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                            <div>
                                <h2 className="text-xl font-bold">
                                    Recent Bookings
                                </h2>

                                <p className="text-sm text-zinc-500 mt-1">
                                    Manage your customer
                                    service requests.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 hover:text-white transition"
                            >
                                <RefreshCw
                                    size={15}
                                    className={
                                        refreshing
                                            ? "animate-spin"
                                            : ""
                                    }
                                />
                                Refresh
                            </button>
                        </div>

                        {bookings.length === 0 ? (
                            <div className="p-10 rounded-2xl bg-[#111113] border border-zinc-800 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-4">
                                    <CalendarDays
                                        size={25}
                                        className="text-zinc-500"
                                    />
                                </div>

                                <h3 className="font-semibold text-white">
                                    No bookings yet
                                </h3>

                                <p className="text-sm text-zinc-500 mt-2">
                                    New service requests
                                    will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {bookings.map(
                                    (
                                        booking,
                                        index
                                    ) => {
                                        const bookingId =
                                            booking._id ||
                                            booking.id ||
                                            index;

                                        const status =
                                            String(
                                                booking.status ||
                                                "pending"
                                            ).toLowerCase();

                                        const customer =
                                            booking.customer ||
                                            booking.user ||
                                            {};

                                        const service =
                                            booking.service ||
                                            booking.serviceName ||
                                            booking.title ||
                                            "Motorcycle Service";

                                        const price =
                                            booking.price ||
                                            booking.amount ||
                                            booking.totalAmount ||
                                            0;

                                        return (
                                            <div
                                                key={
                                                    bookingId
                                                }
                                                className="p-5 rounded-2xl bg-[#111113] border border-zinc-800 hover:border-zinc-700 transition"
                                            >
                                                <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                                                    {/* Customer */}

                                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                                        <div className="w-12 h-12 shrink-0 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
                                                            {(
                                                                customer.name ||
                                                                booking.customerName ||
                                                                "C"
                                                            )
                                                                .charAt(
                                                                    0
                                                                )
                                                                .toUpperCase()}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <h3 className="font-semibold text-white truncate">
                                                                {customer.name ||
                                                                    booking.customerName ||
                                                                    "Customer"}
                                                            </h3>

                                                            <p className="text-sm text-zinc-500 truncate">
                                                                {service}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Details */}

                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:w-auto">
                                                        <div>
                                                            <p className="text-xs text-zinc-600 mb-1">
                                                                Date
                                                            </p>

                                                            <p className="text-sm text-zinc-300 flex items-center gap-1.5">
                                                                <CalendarDays
                                                                    size={
                                                                        14
                                                                    }
                                                                    className="text-zinc-500"
                                                                />

                                                                {booking.date ||
                                                                    booking.bookingDate ||
                                                                    "Not set"}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-xs text-zinc-600 mb-1">
                                                                Amount
                                                            </p>

                                                            <p className="text-sm text-orange-400 font-semibold">
                                                                ₹
                                                                {Number(
                                                                    price
                                                                ).toLocaleString(
                                                                    "en-IN"
                                                                )}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-xs text-zinc-600 mb-1">
                                                                Status
                                                            </p>

                                                            <StatusBadge
                                                                status={
                                                                    status
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}

                                                <div className="mt-5 pt-4 border-t border-zinc-800 flex flex-wrap gap-2">
                                                    {status ===
                                                        "pending" && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        actionLoading ===
                                                                        `${bookingId}-accept`
                                                                    }
                                                                    onClick={() =>
                                                                        handleBookingAction(
                                                                            bookingId,
                                                                            "accept"
                                                                        )
                                                                    }
                                                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium disabled:opacity-50"
                                                                >
                                                                    <CheckCircle2
                                                                        size={
                                                                            16
                                                                        }
                                                                    />

                                                                    {actionLoading ===
                                                                        `${bookingId}-accept`
                                                                        ? "Accepting..."
                                                                        : "Accept"}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        actionLoading ===
                                                                        `${bookingId}-reject`
                                                                    }
                                                                    onClick={() =>
                                                                        handleBookingAction(
                                                                            bookingId,
                                                                            "reject"
                                                                        )
                                                                    }
                                                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-medium disabled:opacity-50"
                                                                >
                                                                    <XCircle
                                                                        size={
                                                                            16
                                                                        }
                                                                    />

                                                                    {actionLoading ===
                                                                        `${bookingId}-reject`
                                                                        ? "Rejecting..."
                                                                        : "Reject"}
                                                                </button>
                                                            </>
                                                        )}

                                                    {(status ===
                                                        "accepted" ||
                                                        status ===
                                                        "confirmed") && (
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    actionLoading ===
                                                                    `${bookingId}-start`
                                                                }
                                                                onClick={() =>
                                                                    handleBookingAction(
                                                                        bookingId,
                                                                        "start"
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-sm font-medium disabled:opacity-50"
                                                            >
                                                                <PlayCircle
                                                                    size={
                                                                        16
                                                                    }
                                                                />

                                                                {actionLoading ===
                                                                    `${bookingId}-start`
                                                                    ? "Starting..."
                                                                    : "Start Job"}
                                                            </button>
                                                        )}

                                                    {(status ===
                                                        "ongoing" ||
                                                        status ===
                                                        "started") && (
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    actionLoading ===
                                                                    `${bookingId}-complete`
                                                                }
                                                                onClick={() =>
                                                                    handleBookingAction(
                                                                        bookingId,
                                                                        "complete"
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium disabled:opacity-50"
                                                            >
                                                                <CheckCircle2
                                                                    size={
                                                                        16
                                                                    }
                                                                />

                                                                {actionLoading ===
                                                                    `${bookingId}-complete`
                                                                    ? "Completing..."
                                                                    : "Complete Job"}
                                                            </button>
                                                        )}

                                                    {status ===
                                                        "completed" && (
                                                            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/5 text-emerald-400 text-sm">
                                                                <CheckCircle2
                                                                    size={
                                                                        16
                                                                    }
                                                                />
                                                                Job Completed
                                                            </div>
                                                        )}

                                                    {(status ===
                                                        "rejected" ||
                                                        status ===
                                                        "cancelled") && (
                                                            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-500 text-sm">
                                                                <XCircle
                                                                    size={
                                                                        16
                                                                    }
                                                                />
                                                                No actions
                                                                available
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </section>

                    {/* =======================
                        PROFILE
                    ======================= */}

                    <section
                        id="profile"
                        className="scroll-mt-24"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
                            <div>
                                <p className="text-sm text-orange-400 font-medium">
                                    Account
                                </p>

                                <h2 className="text-2xl font-bold mt-1">
                                    My Profile
                                </h2>

                                <p className="text-sm text-zinc-500 mt-1">
                                    Manage your provider
                                    account information.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    openEditProfile
                                }
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all text-sm font-medium"
                            >
                                <Edit3 size={16} />
                                Edit Profile
                            </button>
                        </div>

                        <div className="rounded-3xl bg-[#111113] border border-zinc-800 overflow-hidden">
                            {/* Profile Header */}

                            <div className="relative p-6 sm:p-8 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-purple-500/10 pointer-events-none" />

                                <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/20 flex items-center justify-center text-3xl font-bold text-orange-400">
                                        {provider?.name
                                            ?.charAt(
                                                0
                                            )
                                            ?.toUpperCase() ||
                                            "P"}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-2xl font-bold">
                                                {provider?.name ||
                                                    "Provider"}
                                            </h3>

                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium">
                                                <ShieldCheck
                                                    size={
                                                        13
                                                    }
                                                />
                                                Provider
                                            </span>
                                        </div>

                                        <p className="text-zinc-500 mt-1">
                                            {provider?.email ||
                                                "No email available"}
                                        </p>

                                        <div className="flex flex-wrap gap-3 mt-3">
                                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                Active
                                            </span>

                                            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                                                <ShieldCheck
                                                    size={
                                                        13
                                                    }
                                                />
                                                Verified
                                                Account
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Profile Information */}

                            <div className="p-6 sm:p-8 border-t border-zinc-800">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ProfileItem
                                        icon={User}
                                        label="Full Name"
                                        value={
                                            provider?.name
                                        }
                                    />

                                    <ProfileItem
                                        icon={Mail}
                                        label="Email Address"
                                        value={
                                            provider?.email
                                        }
                                    />

                                    <ProfileItem
                                        icon={Phone}
                                        label="Phone Number"
                                        value={
                                            provider?.phone
                                        }
                                    />

                                    <ProfileItem
                                        icon={MapPin}
                                        label="Service Address"
                                        value={
                                            provider?.address
                                        }
                                    />
                                </div>
                            </div>

                            {/* Account Status */}

                            <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                                <CheckCircle2
                                                    size={
                                                        19
                                                    }
                                                    className="text-emerald-400"
                                                />
                                            </div>

                                            <div>
                                                <p className="text-sm font-semibold">
                                                    Account
                                                    Status
                                                </p>

                                                <p className="text-xs text-zinc-500 mt-0.5">
                                                    Your provider
                                                    account is
                                                    currently
                                                    active.
                                                </p>
                                            </div>
                                        </div>

                                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                                            ACTIVE
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Footer */}

                    <footer className="pt-4 pb-6 border-t border-zinc-800">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
                            <p>
                                ©{" "}
                                {new Date().getFullYear()}{" "}
                                MOTOAI. All rights reserved.
                            </p>

                            <p>
                                Provider Portal • AI
                                Motors
                            </p>
                        </div>
                    </footer>
                </div>
            </main>

            {/* =================================================
                EDIT PROFILE MODAL
            ================================================= */}

            {isEditingProfile && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Overlay */}

                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => {
                            if (!profileSaving) {
                                setIsEditingProfile(
                                    false
                                );
                            }
                        }}
                    />

                    {/* Modal */}

                    <div className="relative w-full max-w-lg bg-[#111113] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        {/* Header */}

                        <div className="relative px-6 py-5 border-b border-zinc-800">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-purple-500/10 pointer-events-none" />

                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                        <Edit3
                                            size={
                                                19
                                            }
                                            className="text-orange-400"
                                        />
                                    </div>

                                    <div>
                                        <h2 className="text-lg font-bold text-white">
                                            Edit Profile
                                        </h2>

                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            Update your
                                            provider
                                            information
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    disabled={
                                        profileSaving
                                    }
                                    onClick={() =>
                                        setIsEditingProfile(
                                            false
                                        )
                                    }
                                    className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition disabled:opacity-50"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Form */}

                        <form
                            onSubmit={
                                handleProfileSubmit
                            }
                            className="p-6"
                        >
                            {/* Avatar */}

                            <div className="flex justify-center mb-6">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/20 flex items-center justify-center text-3xl font-bold text-orange-400">
                                        {profileForm.name
                                            ?.charAt(
                                                0
                                            )
                                            ?.toUpperCase() ||
                                            "P"}
                                    </div>

                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-[#111113]" />
                                </div>
                            </div>

                            {/* Error */}

                            {profileError && (
                                <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <AlertCircle
                                        size={
                                            17
                                        }
                                        className="text-red-400 shrink-0 mt-0.5"
                                    />

                                    <p className="text-sm text-red-400">
                                        {
                                            profileError
                                        }
                                    </p>
                                </div>
                            )}

                            {/* Success */}

                            {profileMessage && (
                                <div className="mb-5 flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <CheckCircle2
                                        size={
                                            17
                                        }
                                        className="text-emerald-400"
                                    />

                                    <p className="text-sm text-emerald-400">
                                        {
                                            profileMessage
                                        }
                                    </p>
                                </div>
                            )}

                            {/* Name */}

                            <div className="mb-4">
                                <label className="block text-xs font-medium text-zinc-400 mb-2">
                                    Full Name
                                </label>

                                <div className="relative">
                                    <User
                                        size={17}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                                    />

                                    <input
                                        type="text"
                                        name="name"
                                        value={
                                            profileForm.name
                                        }
                                        onChange={
                                            handleProfileChange
                                        }
                                        placeholder="Enter your full name"
                                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#18181b] border border-zinc-800 text-white placeholder-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition"
                                    />
                                </div>
                            </div>

                            {/* Email */}

                            <div className="mb-4">
                                <label className="block text-xs font-medium text-zinc-400 mb-2">
                                    Email Address
                                </label>

                                <div className="relative">
                                    <Mail
                                        size={17}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600"
                                    />

                                    <input
                                        type="email"
                                        value={
                                            provider?.email ||
                                            ""
                                        }
                                        disabled
                                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-500 cursor-not-allowed"
                                    />
                                </div>

                                <p className="text-[11px] text-zinc-600 mt-1.5">
                                    Email address
                                    cannot be changed
                                    here.
                                </p>
                            </div>

                            {/* Phone */}

                            <div className="mb-4">
                                <label className="block text-xs font-medium text-zinc-400 mb-2">
                                    Phone Number
                                </label>

                                <div className="relative">
                                    <Phone
                                        size={17}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                                    />

                                    <input
                                        type="tel"
                                        name="phone"
                                        value={
                                            profileForm.phone
                                        }
                                        onChange={
                                            handleProfileChange
                                        }
                                        placeholder="Enter phone number"
                                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#18181b] border border-zinc-800 text-white placeholder-zinc-600 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition"
                                    />
                                </div>
                            </div>

                            {/* Address */}

                            <div className="mb-6">
                                <label className="block text-xs font-medium text-zinc-400 mb-2">
                                    Service Address
                                </label>

                                <div className="relative">
                                    <MapPin
                                        size={17}
                                        className="absolute left-3.5 top-4 text-zinc-500"
                                    />

                                    <textarea
                                        name="address"
                                        value={
                                            profileForm.address
                                        }
                                        onChange={
                                            handleProfileChange
                                        }
                                        placeholder="Enter your service address"
                                        rows={3}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#18181b] border border-zinc-800 text-white placeholder-zinc-600 outline-none resize-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition"
                                    />
                                </div>
                            </div>

                            {/* Buttons */}

                            <div className="flex flex-col-reverse sm:flex-row gap-3">
                                <button
                                    type="button"
                                    disabled={
                                        profileSaving
                                    }
                                    onClick={() =>
                                        setIsEditingProfile(
                                            false
                                        )
                                    }
                                    className="flex-1 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition font-medium text-sm disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        profileSaving
                                    }
                                    className="flex-1 h-12 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {profileSaving ? (
                                        <>
                                            <RefreshCw
                                                size={
                                                    17
                                                }
                                                className="animate-spin"
                                            />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2
                                                size={
                                                    17
                                                }
                                            />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProviderDashboard;