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
    ShieldCheck
} from "lucide-react";
import UserAvatar from "../components/UserAvatar";
import BrandLogo from "../components/BrandLogo";

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

    const getToken = () => localStorage.getItem("token");

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

                            <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">
                                Admin
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="rounded-xl border border-white/10 p-2"
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

                                <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500">
                                    Admin Panel
                                </p>
                            </div>

                        </div>

                        {/* NAVIGATION */}

                        <nav className="flex-1 space-y-2 px-4 py-6">
                            {[
                                { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={19} /> },
                                { id: "motorcycles", label: "Motorcycles", icon: <Bike size={19} /> },
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
                                        <p className="truncate text-xs text-gray-500">
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

                                <p className="mt-2 max-w-xl text-sm text-gray-500">
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
                        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                            <StatCard
                                icon={<Bike size={20} />}
                                label="Total Motorcycles"
                                value={stats.total}
                            />

                            <StatCard
                                icon={<Database size={20} />}
                                label="Brands"
                                value={stats.brands}
                            />

                            <StatCard
                                icon={<Star size={20} />}
                                label="Average Rating"
                                value={stats.averageRating}
                            />

                            <StatCard
                                icon={<IndianRupee size={20} />}
                                label="Average Price"
                                value={formatPrice(stats.averagePrice)}
                            />

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

                                    <p className="mt-1 text-xs text-gray-500">
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

                                <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                                    <Bike size={45} className="mb-4 text-gray-700" />

                                    <h4 className="font-bold text-white">
                                        No motorcycles found
                                    </h4>

                                    <p className="mt-2 text-sm text-gray-500">
                                        Add a motorcycle or change your search.
                                    </p>
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

                                    <p className="mt-2 text-sm text-gray-500">
                                        Add a motorcycle or change your search.
                                    </p>

                                </div>

                            ) : (

                                <div className="overflow-x-auto">

                                    <table className="w-full min-w-[950px]">

                                        <thead>
                                            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-500">

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

                                            {filteredMotorcycles.map(
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
                                                                            src={bike.image}
                                                                            alt={bike.name}
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

                            )}

                        </section>
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
                                                                className="
                                                                self-start
                                                                rounded-lg
                                                                p-2
                                                                text-gray-500
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

            <p className="text-xs uppercase tracking-wider text-gray-500">
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
