import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    User,
    MessageSquare,
    Crown,
    Heart,
    GitCompare,
    IndianRupee,
    Calendar,
    Bell,
    Settings,
    LogOut,
    Menu,
    X,
    Coins,
    RefreshCw,
    Pencil,
    Trash2,
    Check,
    Eye,
    Save,
    Lock,
    AlertTriangle,
    ChevronRight,
} from "lucide-react";
import Navbar from "../components/Navbar";
import BrandLogo from "../components/BrandLogo";
import UserAvatar from "../components/UserAvatar";
import {
    ApiError,
    getUserDashboard,
    getUserProfile,
    updateUserProfile,
    getUserFavorites,
    removeUserFavorite,
    changeUserPassword,
    deleteUserAccount,
    getComparisons,
    createComparison,
    deleteComparison,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    getSubscriptionHistory,
    getSubscriptionStatus,
    getChats,
    renameChat,
    deleteChat,
} from "../services/api";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const fmtDate = (iso) =>
    iso
        ? new Date(iso).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "—";

const NAV = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "profile", label: "My Profile", icon: User },
    { id: "chats", label: "My Chats", icon: MessageSquare },
    { id: "plan", label: "AI Plan", icon: Crown },
    { id: "favorites", label: "My Favorites", icon: Heart },
    { id: "comparisons", label: "Comparisons", icon: GitCompare },
    { id: "subscriptions", label: "My Subscriptions", icon: IndianRupee },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "settings", label: "Settings", icon: Settings },
];

const Loading = ({ text }) => (
    <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
        <p className="mt-4 text-sm text-zinc-500">{text || "Loading..."}</p>
    </div>
);

const ErrorBox = ({ message, onRetry }) => (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <AlertTriangle size={28} className="mx-auto text-red-400" />
        <p className="mt-3 text-sm text-red-300">
            {message || "Unable to load data."}
        </p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="mt-4 rounded-xl border border-white/10 px-5 py-2.5 text-xs font-bold text-zinc-200 transition hover:border-orange-500/40 hover:text-orange-400"
            >
                Try Again
            </button>
        )}
    </div>
);

const EmptyBox = ({ icon, title, subtitle, action }) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
            {icon}
        </div>
        <p className="mt-4 font-bold">{title}</p>
        {subtitle && (
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
                {subtitle}
            </p>
        )}
        {action}
    </div>
);

const SectionTitle = ({ title, subtitle, right }) => (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {title}
            </h1>
            {subtitle && (
                <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
            )}
        </div>
        {right}
    </div>
);

const StatCard = ({ icon, label, value, sub }) => (
    <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5 transition hover:border-orange-500/20">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
            {icon}
        </div>
        <p className="text-xs uppercase tracking-wider text-zinc-500">
            {label}
        </p>
        <p className="mt-1.5 text-2xl font-black">{value}</p>
        {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
    </div>
);

// ==============================
// DASHBOARD HOME
// ==============================
const DashboardHome = ({ navigate }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            setData(await getUserDashboard());
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    if (loading) return <Loading text="Loading dashboard..." />;
    if (error) return <ErrorBox message={error} onRetry={load} />;
    if (!data) return null;

    const { user, stats, subscription, recentChats, favorites, recentActivity } =
        data;
    const planLabel =
        user.aiPlan === "premium"
            ? `Premium ${user.aiPlanType === "yearly" ? "Yearly" : "Monthly"}`
            : "Free";

    return (
        <div>
            <SectionTitle
                title={`Welcome back, ${user.name?.split(" ")[0] || "Rider"}`}
                subtitle="Your MOTOAI overview, live from the database."
                right={
                    <button
                        onClick={load}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold transition hover:bg-white/10"
                    >
                        <RefreshCw size={15} />
                        Refresh
                    </button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard
                    icon={<Coins size={20} />}
                    label="AI Tokens"
                    value={stats.aiTokens}
                    sub={`Used ${stats.aiTokensUsed} • ${planLabel}`}
                />
                <StatCard
                    icon={<Crown size={20} />}
                    label="Current Plan"
                    value={planLabel}
                    sub={
                        subscription?.expiresAt
                            ? `Expires ${fmtDate(subscription.expiresAt)}`
                            : "No expiry"
                    }
                />
                <StatCard
                    icon={<Heart size={20} />}
                    label="Saved Motorcycles"
                    value={stats.savedMotorcycles}
                    sub="Across your favorites"
                />
                <StatCard
                    icon={<MessageSquare size={20} />}
                    label="AI Chats"
                    value={stats.chats}
                    sub="Persistent conversations"
                />
                <StatCard
                    icon={<GitCompare size={20} />}
                    label="Comparisons"
                    value={stats.comparisons}
                    sub="Saved bike comparisons"
                />
                <StatCard
                    icon={<IndianRupee size={20} />}
                    label="Subscriptions"
                    value={stats.subscriptions}
                    sub="Payment records"
                />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                {/* Recent chats */}
                <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-bold">Recent Chats</h3>
                        <Link
                            to="/user/chats"
                            className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-400"
                        >
                            View all <ChevronRight size={14} />
                        </Link>
                    </div>
                    {recentChats.length === 0 ? (
                        <p className="py-4 text-center text-sm text-zinc-600">
                            No chats yet. Ask MotoMind anything.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {recentChats.map((c) => (
                                <button
                                    key={c._id}
                                    onClick={() => {
                                        localStorage.setItem(
                                            "motoai_active_chat",
                                            c._id
                                        );
                                        navigate("/ai-advisor");
                                    }}
                                    className="block w-full rounded-xl bg-white/[0.03] px-4 py-3 text-left transition hover:bg-orange-500/5"
                                >
                                    <p className="truncate text-sm font-semibold">
                                        {c.title}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-zinc-600">
                                        {c.preview || fmtDate(c.updatedAt)}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Favorites preview */}
                <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-bold">Saved Motorcycles</h3>
                        <Link
                            to="/user/favorites"
                            className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-400"
                        >
                            View all <ChevronRight size={14} />
                        </Link>
                    </div>
                    {favorites.length === 0 ? (
                        <p className="py-4 text-center text-sm text-zinc-600">
                            No saved motorcycles yet.{" "}
                            <Link
                                to="/motorcycles"
                                className="text-orange-500 hover:underline"
                            >
                                Explore Motorcycles
                            </Link>
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {favorites.slice(0, 4).map((b) => (
                                <button
                                    key={b._id}
                                    onClick={() =>
                                        navigate(`/motorcycles/${b._id}`)
                                    }
                                    className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-orange-500/5"
                                >
                                    <BrandLogo
                                        brand={b.brand}
                                        brandLogo={b.brandLogo}
                                        size={32}
                                    />
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-semibold">
                                            {b.brand} {b.name}
                                        </span>
                                        <span className="block text-xs text-zinc-600">
                                            ₹
                                            {Number(
                                                b.price || 0
                                            ).toLocaleString("en-IN")}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent activity */}
            {recentActivity.length > 0 && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                    <h3 className="mb-4 font-bold">Recent Activity</h3>
                    <div className="space-y-2.5">
                        {recentActivity.map((n) => (
                            <div
                                key={n._id}
                                className="flex items-start gap-3 rounded-xl bg-white/[0.02] px-4 py-3"
                            >
                                <Bell
                                    size={15}
                                    className="mt-0.5 shrink-0 text-orange-500"
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold">
                                        {n.title}
                                    </p>
                                    <p className="truncate text-xs text-zinc-500">
                                        {n.message}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ==============================
// PROFILE
// ==============================
const ProfileSection = () => {
    const [profile, setProfile] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        name: "",
        phone: "",
        address: "",
        profileImage: "",
    });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getUserProfile();
            setProfile(data.user);
            setWallet(data.wallet);
            setForm({
                name: data.user.name || "",
                phone: data.user.phone || "",
                address: data.user.address || "",
                profileImage: data.user.profileImage || "",
            });
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg("");
        setError("");
        try {
            const data = await updateUserProfile(form);
            setProfile(data.user);
            try {
                const stored = JSON.parse(
                    localStorage.getItem("user") || "{}"
                );
                localStorage.setItem(
                    "user",
                    JSON.stringify({ ...stored, ...data.user })
                );
            } catch {
                /* ignore */
            }
            setEditing(false);
            setMsg("Profile updated successfully.");
            window.dispatchEvent(new Event("userUpdated"));
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loading text="Loading profile..." />;
    if (error && !profile)
        return <ErrorBox message={error} onRetry={load} />;
    if (!profile) return null;

    return (
        <div>
            <SectionTitle
                title="My Profile"
                subtitle="Your MOTOAI account details."
            />

            {msg && (
                <div className="mb-5 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                    {msg}
                </div>
            )}
            {error && (
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 text-center">
                    <div className="mx-auto w-fit">
                        <UserAvatar user={profile} size={80} />
                    </div>
                    <h3 className="mt-4 text-xl font-bold">
                        {profile.name}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                        {profile.email}
                    </p>
                    <span className="mt-3 inline-block rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs capitalize text-orange-400">
                        {profile.role}
                    </span>
                    <p className="mt-4 text-xs text-zinc-600">
                        Member since {fmtDate(profile.createdAt)}
                    </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 lg:col-span-2">
                    <div className="mb-5 flex items-center justify-between">
                        <h3 className="text-lg font-bold">
                            {editing ? "Edit profile" : "Details"}
                        </h3>
                        {!editing && (
                            <button
                                onClick={() => setEditing(true)}
                                className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-xs font-bold transition hover:border-orange-500/40 hover:text-orange-400"
                            >
                                <Pencil size={14} />
                                Edit
                            </button>
                        )}
                    </div>

                    {editing ? (
                        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-zinc-400">
                                Full Name
                                <input
                                    value={form.name}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            name: e.target.value,
                                        })
                                    }
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                />
                            </label>
                            <label className="block text-xs font-semibold text-zinc-400">
                                Phone
                                <input
                                    value={form.phone}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            phone: e.target.value,
                                        })
                                    }
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                />
                            </label>
                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
                                Address
                                <input
                                    value={form.address}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            address: e.target.value,
                                        })
                                    }
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                />
                            </label>
                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
                                Profile Image URL
                                <input
                                    value={form.profileImage}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            profileImage: e.target.value,
                                        })
                                    }
                                    placeholder="https://..."
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                />
                            </label>
                            <div className="flex gap-3 sm:col-span-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                                >
                                    <Save size={16} />
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {[
                                ["Email", profile.email],
                                ["Phone", profile.phone || "—"],
                                ["Address", profile.address || "—"],
                                [
                                    "AI Plan",
                                    `${profile.aiPlan === "premium" ? "Premium " + (profile.aiPlanType === "yearly" ? "Yearly" : "Monthly") : "Free"} • ${wallet?.tokens ?? "—"} tokens`,
                                ],
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    className="rounded-xl bg-white/[0.02] p-4"
                                >
                                    <p className="text-xs text-zinc-500">
                                        {label}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold">
                                        {value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ==============================
// CHATS
// ==============================
const ChatsSection = ({ navigate }) => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getChats();
            setChats(data.chats || []);
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openChat = (id) => {
        localStorage.setItem("motoai_active_chat", id);
        navigate("/ai-advisor");
    };

    const doRename = async (id) => {
        const title = renameValue.trim();
        if (!title) {
            setRenamingId(null);
            return;
        }
        try {
            await renameChat(id, title);
            setChats((prev) =>
                prev.map((c) =>
                    c._id === id ? { ...c, title } : c
                )
            );
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        } finally {
            setRenamingId(null);
            setRenameValue("");
        }
    };

    const doDelete = async (id) => {
        if (!window.confirm("Delete this chat permanently?")) return;
        try {
            await deleteChat(id);
            setChats((prev) => prev.filter((c) => c._id !== id));
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        }
    };

    return (
        <div>
            <SectionTitle
                title="My Chats"
                subtitle="Persistent MotoMind conversations."
                right={
                    <Link
                        to="/ai-advisor"
                        className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-orange-400"
                    >
                        + New Chat
                    </Link>
                }
            />
            {error && (
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}
            {loading ? (
                <Loading text="Loading chats..." />
            ) : chats.length === 0 ? (
                <EmptyBox
                    icon={<MessageSquare size={26} />}
                    title="No chats yet"
                    subtitle="Start a conversation with MotoMind."
                    action={
                        <Link
                            to="/ai-advisor"
                            className="mt-5 inline-block rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
                        >
                            Open AI Advisor
                        </Link>
                    }
                />
            ) : (
                <div className="space-y-2.5">
                    {chats.map((c) => (
                        <div
                            key={c._id}
                            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0c0c0c] p-3"
                        >
                            <button
                                onClick={() => openChat(c._id)}
                                className="min-w-0 flex-1 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/[0.03]"
                            >
                                {renamingId === c._id ? (
                                    <span
                                        className="flex items-center gap-1"
                                        onClick={(e) =>
                                            e.stopPropagation()
                                        }
                                    >
                                        <input
                                            value={renameValue}
                                            autoFocus
                                            onChange={(e) =>
                                                setRenameValue(
                                                    e.target.value
                                                )
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                    doRename(c._id);
                                                if (e.key === "Escape")
                                                    setRenamingId(null);
                                            }}
                                            aria-label="Chat title"
                                            className="min-w-0 flex-1 rounded-lg border border-orange-500/40 bg-black/40 px-2 py-1.5 text-sm outline-none"
                                        />
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => doRename(c._id)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                    doRename(c._id);
                                            }}
                                            aria-label="Save title"
                                            className="rounded-lg p-1.5 text-emerald-400 hover:bg-white/5"
                                        >
                                            <Check size={16} />
                                        </span>
                                    </span>
                                ) : (
                                    <>
                                        <p className="truncate text-sm font-bold">
                                            {c.title}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-zinc-600">
                                            {c.preview || fmtDate(c.updatedAt)}
                                        </p>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => openChat(c._id)}
                                aria-label="Open chat"
                                title="Open"
                                className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white"
                            >
                                <Eye size={16} />
                            </button>
                            <button
                                onClick={() => {
                                    setRenamingId(c._id);
                                    setRenameValue(c.title);
                                }}
                                aria-label="Rename chat"
                                title="Rename"
                                className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white"
                            >
                                <Pencil size={16} />
                            </button>
                            <button
                                onClick={() => doDelete(c._id)}
                                aria-label="Delete chat"
                                title="Delete"
                                className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ==============================
// FAVORITES
// ==============================
const FavoritesSection = ({ navigate }) => {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getUserFavorites();
            setFavorites(data.favorites || []);
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const remove = async (id) => {
        try {
            const data = await removeUserFavorite(id);
            setFavorites(data.favorites || []);
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        }
    };

    return (
        <div>
            <SectionTitle
                title="My Favorites"
                subtitle="Motorcycles you saved, stored in MongoDB."
            />
            {error && (
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}
            {loading ? (
                <Loading text="Loading favorites..." />
            ) : favorites.length === 0 ? (
                <EmptyBox
                    icon={<Heart size={26} />}
                    title="No saved motorcycles yet"
                    subtitle="Browse the showroom and save bikes you love."
                    action={
                        <Link
                            to="/motorcycles"
                            className="mt-5 inline-block rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
                        >
                            Explore Motorcycles
                        </Link>
                    }
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {favorites.map((b) => (
                        <div
                            key={b._id}
                            className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] transition hover:border-orange-500/30"
                        >
                            <button
                                onClick={() =>
                                    navigate(`/motorcycles/${b._id}`)
                                }
                                className="block w-full text-left"
                            >
                                <div className="flex h-36 items-center justify-center overflow-hidden bg-zinc-900">
                                    {b.image ? (
                                        <img
                                            src={b.image}
                                            alt={b.name}
                                            loading="lazy"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <Heart
                                            size={30}
                                            className="text-zinc-700"
                                        />
                                    )}
                                </div>
                                <div className="flex items-center gap-2.5 p-4 pb-1">
                                    <BrandLogo
                                        brand={b.brand}
                                        brandLogo={b.brandLogo}
                                        size={30}
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-bold uppercase tracking-wider text-orange-500">
                                            {b.brand}
                                        </p>
                                        <p className="truncate font-bold">
                                            {b.name}
                                        </p>
                                    </div>
                                </div>
                                <p className="px-4 pb-3 text-sm font-black text-orange-400">
                                    ₹
                                    {Number(
                                        b.price || 0
                                    ).toLocaleString("en-IN")}
                                </p>
                            </button>
                            <div className="px-4 pb-4">
                                <button
                                    onClick={() => remove(b._id)}
                                    className="w-full rounded-xl border border-red-500/20 py-2.5 text-xs font-bold text-red-400 transition hover:bg-red-500/10"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ==============================
// COMPARISONS
// ==============================
const ComparisonsSection = ({ navigate }) => {
    const [items, setItems] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState([]);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const [c, f] = await Promise.all([
                getComparisons(),
                getUserFavorites(),
            ]);
            setItems(c.comparisons || []);
            setFavorites(f.favorites || []);
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const toggle = (id) => {
        setSelected((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : prev.length >= 3
                  ? prev
                  : [...prev, id]
        );
    };

    const save = async () => {
        if (selected.length < 2) return;
        setSaving(true);
        setError("");
        try {
            const data = await createComparison(selected);
            setItems((prev) => [data.comparison, ...prev]);
            setSelected([]);
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id) => {
        if (!window.confirm("Delete this comparison?")) return;
        try {
            await deleteComparison(id);
            setItems((prev) => prev.filter((c) => c._id !== id));
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        }
    };

    return (
        <div>
            <SectionTitle
                title="Comparisons"
                subtitle="Save 2–3 favorites side by side."
            />
            {error && (
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}
            {loading ? (
                <Loading text="Loading comparisons..." />
            ) : (
                <>
                    <div className="mb-8 rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                        <h3 className="font-bold">
                            New comparison from favorites
                        </h3>
                        {favorites.length < 2 ? (
                            <p className="mt-2 text-sm text-zinc-500">
                                Save at least 2 motorcycles to your
                                favorites first.{" "}
                                <Link
                                    to="/motorcycles"
                                    className="text-orange-500 hover:underline"
                                >
                                    Explore Motorcycles
                                </Link>
                            </p>
                        ) : (
                            <>
                                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                    {favorites.map((b) => (
                                        <button
                                            key={b._id}
                                            onClick={() => toggle(b._id)}
                                            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                                                selected.includes(b._id)
                                                    ? "border-orange-500 bg-orange-500/10"
                                                    : "border-white/10 hover:border-white/25"
                                            }`}
                                        >
                                            <span
                                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                                                    selected.includes(b._id)
                                                        ? "border-orange-500 bg-orange-500 text-black"
                                                        : "border-white/20 text-transparent"
                                                }`}
                                            >
                                                <Check size={13} />
                                            </span>
                                            <span className="truncate text-sm font-semibold">
                                                {b.brand} {b.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={save}
                                    disabled={
                                        saving || selected.length < 2
                                    }
                                    className="mt-4 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {saving
                                        ? "Saving..."
                                        : `Save Comparison (${selected.length}/3)`}
                                </button>
                            </>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <EmptyBox
                            icon={<GitCompare size={26} />}
                            title="No saved comparisons"
                            subtitle="Pick 2–3 favorites above to compare them anytime."
                        />
                    ) : (
                        <div className="space-y-4">
                            {items.map((c) => (
                                <div
                                    key={c._id}
                                    className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c]"
                                >
                                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                                        <p className="text-xs text-zinc-500">
                                            {new Date(
                                                c.createdAt
                                            ).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </p>
                                        <button
                                            onClick={() => remove(c._id)}
                                            aria-label="Delete comparison"
                                            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[560px] text-sm">
                                            <tbody>
                                                <tr className="border-b border-white/5">
                                                    <td className="px-5 py-3 text-xs uppercase tracking-wider text-zinc-500">
                                                        Bike
                                                    </td>
                                                    {c.motorcycles.map(
                                                        (b) =>
                                                            b && (
                                                                <td
                                                                    key={b._id}
                                                                    className="px-5 py-3"
                                                                >
                                                                    <button
                                                                        onClick={() =>
                                                                            navigate(
                                                                                `/motorcycles/${b._id}`
                                                                            )
                                                                        }
                                                                        className="flex items-center gap-2 hover:opacity-80"
                                                                    >
                                                                        <BrandLogo
                                                                            brand={
                                                                                b.brand
                                                                            }
                                                                            brandLogo={
                                                                                b.brandLogo
                                                                            }
                                                                            size={26}
                                                                        />
                                                                        <span className="font-bold">
                                                                            {
                                                                                b.name
                                                                            }
                                                                        </span>
                                                                    </button>
                                                                </td>
                                                            )
                                                    )}
                                                </tr>
                                                {[
                                                    ["Price", (b) => `₹${Number(b.price || 0).toLocaleString("en-IN")}`],
                                                    ["Category", (b) => b.category || "—"],
                                                    ["Engine", (b) => (b.category === "Electric" ? `${b.batteryCapacity || "—"} kWh` : `${b.engine || "—"} CC`)],
                                                    ["Mileage/Range", (b) => (b.category === "Electric" ? `${b.range || "—"} km` : `${b.mileage || "—"} KM/L`)],
                                                    ["Power", (b) => `${b.power || "—"} HP`],
                                                    ["Rating", (b) => b.rating ?? "—"],
                                                ].map(([label, fn]) => (
                                                    <tr
                                                        key={label}
                                                        className="border-b border-white/5 last:border-0"
                                                    >
                                                        <td className="px-5 py-2.5 text-xs uppercase tracking-wider text-zinc-500">
                                                            {label}
                                                        </td>
                                                        {c.motorcycles.map(
                                                            (b) =>
                                                                b && (
                                                                    <td
                                                                        key={b._id}
                                                                        className="px-5 py-2.5 text-zinc-200"
                                                                    >
                                                                        {fn(b)}
                                                                    </td>
                                                                )
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ==============================
// SUBSCRIPTIONS
// ==============================
const SubscriptionsSection = ({ navigate }) => {
    const [status, setStatus] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const [s, h] = await Promise.all([
                getSubscriptionStatus(),
                (await import("../services/api")).getSubscriptionHistory(),
            ]);
            setStatus(s);
            setHistory(h.subscriptions || []);
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    if (loading) return <Loading text="Loading subscriptions..." />;
    if (error) return <ErrorBox message={error} onRetry={load} />;

    const isPremium = status?.plan === "premium";

    return (
        <div>
            <SectionTitle
                title="My Subscriptions"
                subtitle="Current plan and payment history from MongoDB."
                right={
                    <button
                        onClick={() => navigate("/ai-plan")}
                        className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-orange-400"
                    >
                        {isPremium ? "Manage Plan" : "Upgrade"}
                    </button>
                }
            />

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    icon={<Crown size={20} />}
                    label="Current Plan"
                    value={
                        isPremium
                            ? `Premium ${status.planType === "yearly" ? "Yearly" : "Monthly"}`
                            : "Free"
                    }
                />
                <StatCard
                    icon={<Coins size={20} />}
                    label="Remaining Tokens"
                    value={status?.tokens ?? "—"}
                    sub={`Used ${status?.tokensUsed ?? 0}`}
                />
                <StatCard
                    icon={<Calendar size={20} />}
                    label="Expires"
                    value={
                        status?.expiresAt
                            ? fmtDate(status.expiresAt)
                            : "—"
                    }
                    sub={
                        status?.daysRemaining != null
                            ? `${status.daysRemaining} days left`
                            : "No expiry"
                    }
                />
                <StatCard
                    icon={<Check size={20} />}
                    label="Payments"
                    value={history.length}
                    sub="Records on file"
                />
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c]">
                <div className="border-b border-white/10 p-5">
                    <h3 className="font-bold">Payment History</h3>
                </div>
                {history.length === 0 ? (
                    <p className="p-8 text-center text-sm text-zinc-600">
                        No payments yet. Free plan is active.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-500">
                                    <th className="px-5 py-3.5">Plan</th>
                                    <th className="px-5 py-3.5 text-right">
                                        Amount
                                    </th>
                                    <th className="px-5 py-3.5 text-right">
                                        Tokens
                                    </th>
                                    <th className="px-5 py-3.5">Status</th>
                                    <th className="px-5 py-3.5">Start</th>
                                    <th className="px-5 py-3.5">Expiry</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((s) => (
                                    <tr
                                        key={s._id}
                                        className="border-b border-white/5 last:border-0"
                                    >
                                        <td className="px-5 py-3 font-semibold capitalize">
                                            {s.plan}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            ₹
                                            {Number(
                                                s.amount || 0
                                            ).toLocaleString("en-IN")}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            {(s.tokens ?? 0).toLocaleString(
                                                "en-IN"
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                                                    s.status === "paid"
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : s.status ===
                                                            "created"
                                                          ? "bg-yellow-500/10 text-yellow-400"
                                                          : "bg-red-500/10 text-red-400"
                                                }`}
                                            >
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-zinc-400">
                                            {fmtDate(s.startedAt)}
                                        </td>
                                        <td className="px-5 py-3 text-zinc-400">
                                            {fmtDate(s.expiresAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==============================
// NOTIFICATIONS
// ==============================
const NotificationsSection = () => {
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getNotifications();
            setItems(data.notifications || []);
            setUnread(data.unread || 0);
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const readOne = async (id) => {
        try {
            await markNotificationRead(id);
            setItems((prev) =>
                prev.map((n) =>
                    n._id === id ? { ...n, read: true } : n
                )
            );
            setUnread((u) => Math.max(0, u - 1));
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        }
    };

    const readAll = async () => {
        try {
            await markAllNotificationsRead();
            setItems((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnread(0);
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        }
    };

    const remove = async (id) => {
        try {
            await deleteNotification(id);
            setItems((prev) => {
                const gone = prev.find((n) => n._id === id);
                if (gone && !gone.read) setUnread((u) => Math.max(0, u - 1));
                return prev.filter((n) => n._id !== id);
            });
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message);
            }
        }
    };

    return (
        <div>
            <SectionTitle
                title="Notifications"
                subtitle={
                    unread > 0
                        ? `${unread} unread in-app notification${unread === 1 ? "" : "s"}.`
                        : "You're all caught up."
                }
                right={
                    unread > 0 && (
                        <button
                            onClick={readAll}
                            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold transition hover:border-orange-500/40 hover:text-orange-400"
                        >
                            <Check size={14} />
                            Mark all read
                        </button>
                    )
                }
            />
            {error && (
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}
            {loading ? (
                <Loading text="Loading notifications..." />
            ) : items.length === 0 ? (
                <EmptyBox
                    icon={<Bell size={26} />}
                    title="No notifications"
                    subtitle="Premium activations, payments and security alerts will appear here."
                />
            ) : (
                <div className="space-y-2.5">
                    {items.map((n) => (
                        <div
                            key={n._id}
                            className={`flex items-start gap-3 rounded-2xl border p-4 transition ${
                                n.read
                                    ? "border-white/5 bg-white/[0.015]"
                                    : "border-orange-500/20 bg-orange-500/[0.04]"
                            }`}
                        >
                            <Bell
                                size={17}
                                className={`mt-0.5 shrink-0 ${n.read ? "text-zinc-600" : "text-orange-500"}`}
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-bold">
                                        {n.title}
                                    </p>
                                    {!n.read && (
                                        <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                                    )}
                                </div>
                                {n.message && (
                                    <p className="mt-0.5 text-xs text-zinc-500">
                                        {n.message}
                                    </p>
                                )}
                                <p className="mt-1 text-[11px] text-zinc-600">
                                    {new Date(
                                        n.createdAt
                                    ).toLocaleString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                                {!n.read && (
                                    <button
                                        onClick={() => readOne(n._id)}
                                        aria-label="Mark as read"
                                        title="Mark as read"
                                        className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-emerald-400"
                                    >
                                        <Check size={15} />
                                    </button>
                                )}
                                <button
                                    onClick={() => remove(n._id)}
                                    aria-label="Delete notification"
                                    title="Delete"
                                    className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ==============================
// SETTINGS
// ==============================
const SettingsSection = ({ navigate, onChanged }) => {
    const [pw, setPw] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [pwMsg, setPwMsg] = useState("");
    const [pwErr, setPwErr] = useState("");
    const [pwSaving, setPwSaving] = useState(false);
    const [delConfirm, setDelConfirm] = useState(false);
    const [delErr, setDelErr] = useState("");

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("motoai_active_chat");
        navigate("/login");
    };

    const savePassword = async (e) => {
        e.preventDefault();
        setPwErr("");
        setPwMsg("");
        setPwSaving(true);
        try {
            const data = await changeUserPassword(pw);
            setPwMsg(data.message || "Password changed successfully.");
            setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
            if (onChanged) onChanged();
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setPwErr(err.message);
            }
        } finally {
            setPwSaving(false);
        }
    };

    const wipeAccount = async () => {
        if (!delConfirm) {
            setDelConfirm(true);
            return;
        }
        setDelErr("");
        try {
            await deleteUserAccount();
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("motoai_active_chat");
            navigate("/");
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setDelErr(err.message);
            }
            setDelConfirm(false);
        }
    };

    return (
        <div>
            <SectionTitle
                title="Settings"
                subtitle="Account security and preferences."
            />

            <div className="grid gap-6 lg:grid-cols-2">
                <form
                    onSubmit={savePassword}
                    className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6"
                >
                    <h3 className="flex items-center gap-2 text-lg font-bold">
                        <Lock size={18} className="text-orange-500" />
                        Change Password
                    </h3>
                    {pwMsg && (
                        <p className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-2.5 text-xs text-green-400">
                            {pwMsg}
                        </p>
                    )}
                    {pwErr && (
                        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                            {pwErr}
                        </p>
                    )}
                    <div className="mt-4 space-y-3">
                        {[
                            ["currentPassword", "Current Password"],
                            ["newPassword", "New Password (min 6 chars)"],
                            ["confirmPassword", "Confirm New Password"],
                        ].map(([name, label]) => (
                            <label
                                key={name}
                                className="block text-xs font-semibold text-zinc-400"
                            >
                                {label}
                                <input
                                    type="password"
                                    value={pw[name]}
                                    onChange={(e) =>
                                        setPw({
                                            ...pw,
                                            [name]: e.target.value,
                                        })
                                    }
                                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50"
                                />
                            </label>
                        ))}
                    </div>
                    <button
                        type="submit"
                        disabled={pwSaving}
                        className="mt-5 w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                    >
                        {pwSaving ? "Updating..." : "Update Password"}
                    </button>
                </form>

                <div className="space-y-6">
                    <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6">
                        <h3 className="text-lg font-bold">Session</h3>
                        <p className="mt-1 text-xs text-zinc-500">
                            Log out of MOTOAI on this device.
                        </p>
                        <button
                            onClick={logout}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-bold transition hover:border-orange-500/40 hover:text-orange-400"
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    </div>

                    <div className="rounded-3xl border border-red-500/20 bg-red-500/[0.03] p-6">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-red-400">
                            <AlertTriangle size={18} />
                            Danger Zone
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500">
                            Deletes your profile, chats, favorites,
                            comparisons and notifications. Payment
                            records are kept for audit.
                        </p>
                        {delErr && (
                            <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                                {delErr}
                            </p>
                        )}
                        <button
                            onClick={wipeAccount}
                            className={`mt-4 w-full rounded-xl py-3 text-sm font-bold transition ${
                                delConfirm
                                    ? "bg-red-500 text-white hover:bg-red-400"
                                    : "border border-red-500/30 text-red-400 hover:bg-red-500/10"
                            }`}
                        >
                            {delConfirm
                                ? "Click again to permanently delete"
                                : "Delete My Account"}
                        </button>
                        {delConfirm && (
                            <button
                                onClick={() => setDelConfirm(false)}
                                className="mt-2 w-full py-2 text-xs font-semibold text-zinc-500 hover:text-white"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==============================
// AI PLAN (in-panel overview)
// ==============================
const PlanSection = ({ navigate }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        getSubscriptionStatus()
            .then((data) => setStatus(data))
            .catch((err) => {
                if (!(err instanceof ApiError && err.status === 401)) {
                    setError(err.message);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loading text="Loading your plan..." />;
    if (error) return <ErrorBox message={error} onRetry={() => window.location.reload()} />;
    if (!status) return null;

    const isPremium = status.plan === "premium";
    const planName = isPremium
        ? `Premium ${status.planType === "yearly" ? "Yearly" : "Monthly"}`
        : "Free";
    const features = isPremium
        ? [
              "Advanced AI Motorcycle Advisor",
              "Personalized recommendations & comparisons",
              "Detailed bike information",
              "Message editing & response regeneration",
              "Priority AI features",
          ]
        : [
              "Basic AI questions",
              "Motorcycle recommendations",
              "Motorcycle database access",
              "Chat history",
          ];

    return (
        <div>
            <SectionTitle
                title="AI Plan"
                subtitle="Your MotoMind subscription, live from the database."
                right={
                    <button
                        onClick={() => navigate("/ai-plan")}
                        className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-orange-400"
                    >
                        {isPremium ? "Manage Plan" : "View Pricing"}
                    </button>
                }
            />

            <div className="overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-b from-orange-500/10 to-transparent p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-black">
                            <Crown size={26} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black">{planName}</h3>
                            <p className="text-xs text-zinc-500">
                                {isPremium && status.expiresAt
                                    ? `Expires ${fmtDate(status.expiresAt)} • ${status.daysRemaining ?? "—"} days left`
                                    : "No expiry • forever free"}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="flex items-center justify-end gap-1.5 text-3xl font-black">
                            <Coins size={22} className="text-orange-500" />
                            {(status.tokens ?? 0).toLocaleString("en-IN")}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                            tokens left • used {status.tokensUsed ?? 0}
                        </p>
                    </div>
                </div>

                <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                    {features.map((f) => (
                        <li
                            key={f}
                            className="flex items-center gap-2.5 text-sm text-zinc-200"
                        >
                            <Check
                                size={16}
                                className="shrink-0 text-emerald-400"
                            />
                            {f}
                        </li>
                    ))}
                </ul>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <button
                        onClick={() => navigate("/ai-plan")}
                        className="flex-1 rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black transition hover:bg-orange-400"
                    >
                        {isPremium ? "Change Plan" : "Upgrade to Premium"}
                    </button>
                    <button
                        onClick={() => navigate("/ai-advisor")}
                        disabled={(status.tokens ?? 0) <= 0}
                        className="flex-1 rounded-xl border border-white/10 py-3.5 text-sm font-bold transition hover:border-orange-500/40 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Chat with Advisor
                    </button>
                </div>
                {(status.tokens ?? 0) <= 0 && (
                    <p className="mt-3 text-center text-xs text-red-400">
                        You're out of tokens — upgrade to keep chatting.
                    </p>
                )}
            </div>
        </div>
    );
};

// ==============================
// SHELL
// ==============================
export default function UserDashboard({ section = "dashboard" }) {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notifCount, setNotifCount] = useState(0);
    const [me, setMe] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });

    // Keep the sidebar profile card in sync (same-tab profile edits
    // dispatch "userUpdated"; other tabs come through "storage").
    useEffect(() => {
        const syncMe = () => {
            try {
                setMe(JSON.parse(localStorage.getItem("user") || "null"));
            } catch {
                setMe(null);
            }
        };
        window.addEventListener("userUpdated", syncMe);
        window.addEventListener("storage", syncMe);
        return () => {
            window.removeEventListener("userUpdated", syncMe);
            window.removeEventListener("storage", syncMe);
        };
    }, []);

    useEffect(() => {
        getNotifications()
            .then((d) => setNotifCount(d.unread || 0))
            .catch(() => {
                /* badge stays hidden on error */
            });
    }, [section]);

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("motoai_active_chat");
        navigate("/login");
    };

    const go = (item) => {
        setSidebarOpen(false);
        if (item.link) navigate(item.link);
        else navigate(`/user/${item.id === "dashboard" ? "dashboard" : item.id}`);
    };

    const sidebar = (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-black">
                    <User size={20} />
                </div>
                <div>
                    <p className="font-black tracking-wide">MOTOAI</p>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                        User Panel
                    </p>
                </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {NAV.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                        !item.link && section === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => go(item)}
                            className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                                isActive
                                    ? "bg-orange-500/10 text-orange-400"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                            <Icon size={18} />
                            {item.label}
                            {item.id === "notifications" &&
                                notifCount > 0 && (
                                    <span className="ml-auto rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-black">
                                        {notifCount}
                                    </span>
                                )}
                        </button>
                    );
                })}
            </nav>

            <div className="border-t border-white/10 p-4">
                <button
                    onClick={() => go({ id: "profile" })}
                    className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-orange-500/30"
                >
                    <UserAvatar user={me} size={40} />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">
                            {me?.name || "Rider"}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                            {me?.email || "View profile"}
                        </span>
                    </span>
                </button>
                <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
                >
                    <LogOut size={18} />
                    Logout
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar activeTab="" showTokens={true} />

            {/* Mobile top bar */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 lg:hidden">
                <button
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Open user menu"
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm font-semibold"
                >
                    <Menu size={17} />
                    Menu
                </button>
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    User Panel
                </span>
                <span className="w-[86px]" />
            </div>

            <div className="mx-auto flex max-w-7xl">
                <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-64 shrink-0 border-r border-white/10 bg-[#0b0b0b] lg:block">
                    {sidebar}
                </aside>

                {sidebarOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <div
                            className="absolute inset-0 bg-black/70"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-white/10 bg-[#0b0b0b]">
                            <div className="flex justify-end p-3">
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    aria-label="Close menu"
                                    className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
                                >
                                    <X size={19} />
                                </button>
                            </div>
                            <div className="h-[calc(100%-60px)]">
                                {sidebar}
                            </div>
                        </aside>
                    </div>
                )}

                <main className="min-w-0 flex-1 px-5 py-7 sm:px-8">
                    {section === "dashboard" && (
                        <DashboardHome navigate={navigate} />
                    )}
                    {section === "profile" && <ProfileSection />}
                    {section === "chats" && (
                        <ChatsSection navigate={navigate} />
                    )}
                    {section === "favorites" && (
                        <FavoritesSection navigate={navigate} />
                    )}
                    {section === "comparisons" && (
                        <ComparisonsSection navigate={navigate} />
                    )}
                    {section === "subscriptions" && (
                        <SubscriptionsSection navigate={navigate} />
                    )}
                    {section === "plan" && (
                        <PlanSection navigate={navigate} />
                    )}
                    {section === "notifications" && (
                        <NotificationsSection />
                    )}
                    {section === "settings" && (
                        <SettingsSection
                            navigate={navigate}
                            onChanged={() => {
                                getNotifications()
                                    .then((d) =>
                                        setNotifCount(d.unread || 0)
                                    )
                                    .catch(() => {});
                            }}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}
