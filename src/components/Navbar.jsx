import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Sparkles,
    Crown,
    Coins,
    Menu,
    X,
    User,
    LogOut,
    LayoutDashboard,
    Zap,
    Settings,
    Heart,
} from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import UserAvatar from "./UserAvatar";
import { getSubscriptionStatus } from "../services/api";

export default function Navbar({ activeTab, showTokens = true }) {
    const location = useLocation();
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });

    const [planStatus, setPlanStatus] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const fetchStatus = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setPlanStatus(null);
            return;
        }
        try {
            const data = await getSubscriptionStatus();
            if (data && data.success) {
                setPlanStatus(data);
                // Update local storage user if plan fields changed
                try {
                    const stored = JSON.parse(localStorage.getItem("user") || "{}");
                    localStorage.setItem(
                        "user",
                        JSON.stringify({
                            ...stored,
                            aiPlan: data.plan,
                            aiPlanType: data.planType,
                        })
                    );
                } catch {
                    /* ignore */
                }
            }
        } catch (err) {
            console.warn("Could not fetch subscription status:", err.message);
        }
    }, []);

    useEffect(() => {
        fetchStatus();

        const handleStorageOrSubUpdate = () => {
            try {
                setCurrentUser(JSON.parse(localStorage.getItem("user") || "null"));
            } catch {
                setCurrentUser(null);
            }
            fetchStatus();
        };

        window.addEventListener("subscriptionUpdated", handleStorageOrSubUpdate);
        window.addEventListener("storage", handleStorageOrSubUpdate);
        window.addEventListener("focus", fetchStatus);

        return () => {
            window.removeEventListener("subscriptionUpdated", handleStorageOrSubUpdate);
            window.removeEventListener("storage", handleStorageOrSubUpdate);
            window.removeEventListener("focus", fetchStatus);
        };
    }, [fetchStatus]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setCurrentUser(null);
        setPlanStatus(null);
        setUserMenuOpen(false);
        navigate("/login");
    };

    const dashboardPath =
        currentUser?.role === "admin"
            ? "/admin"
            : currentUser?.role === "provider"
            ? "/provider"
            : "/user/dashboard";

    const isPremium = planStatus?.plan === "premium" || currentUser?.aiPlan === "premium";
    const planType = planStatus?.planType || currentUser?.aiPlanType || "monthly";
    const tokenCount = planStatus?.tokens ?? currentUser?.aiTokens ?? 0;

    const navLinks = [
        { label: "Home", path: "/" },
        { label: "Motorcycles", path: "/motorcycles" },
        { label: "AI Advisor", path: "/ai-advisor", icon: Sparkles },
        { label: "AI Plan", path: "/ai-plan" },
        { label: "Compare", path: "/compare" },
    ];

    const isLinkActive = (path) => {
        if (activeTab) return activeTab.toLowerCase() === path.replace("/", "").toLowerCase();
        if (path === "/" && location.pathname === "/") return true;
        if (path !== "/" && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#070708]/90 backdrop-blur-2xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 md:px-6">
                {/* Brand Logo */}
                <Link to="/" className="flex items-center">
                    <Logo />
                </Link>

                {/* Desktop Navigation Links */}
                <div className="hidden items-center gap-8 md:flex">
                    {navLinks.map(({ label, path, icon: Icon }) => {
                        const active = isLinkActive(path);
                        return (
                            <Link
                                key={label}
                                to={path}
                                className={`relative flex items-center gap-1.5 text-sm font-medium transition ${
                                    active
                                        ? "font-semibold text-white"
                                        : "text-zinc-400 hover:text-white"
                                }`}
                            >
                                {Icon && <Icon size={14} className={active ? "text-orange-500" : "text-zinc-400"} />}
                                {label}
                                {active && (
                                    <span className="absolute -bottom-4 left-0 h-0.5 w-full rounded-full bg-orange-500" />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-3">
                    <ThemeToggle />

                    {/* Subscription & Token Badge */}
                    {currentUser && (
                        <Link
                            to="/ai-plan"
                            title="Manage your MOTOAI plan"
                            className={`hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition sm:flex ${
                                isPremium
                                    ? "border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                                    : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:border-orange-500/30 hover:text-white"
                            }`}
                        >
                            {isPremium ? (
                                <>
                                    <span className="text-sm leading-none" aria-hidden="true">👑</span>
                                    <span>
                                        Premium {planType === "yearly" ? "Yearly" : "Monthly"}{showTokens ? ` • ${Number(tokenCount).toLocaleString("en-IN")} Tokens` : ""}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Coins size={13} className="text-zinc-400" />
                                    <span>
                                        {showTokens ? `Free • ${Number(tokenCount).toLocaleString("en-IN")} Tokens` : "Free Plan"}
                                    </span>
                                </>
                            )}
                        </Link>
                    )}

                    {/* User Profile / Menu */}
                    {currentUser ? (
                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] py-1 pl-1.5 pr-2.5 transition hover:border-orange-500/40"
                            >
                                <UserAvatar user={currentUser} size={28} />
                                <span className="hidden text-left sm:block">
                                    <span className="block max-w-[120px] truncate text-xs font-bold text-white">
                                        {currentUser.name}
                                    </span>
                                </span>
                            </button>

                            {userMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0f] p-1.5 shadow-2xl backdrop-blur-2xl">
                                    <div className="border-b border-white/[0.06] px-3 py-2.5">
                                        <p className="truncate text-xs font-bold text-white">{currentUser.name}</p>
                                        <p className="truncate text-[11px] text-zinc-500">{currentUser.email}</p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-400">
                                                {currentUser.role || "user"}
                                            </span>
                                            <span className="text-[11px] font-semibold text-zinc-400">
                                                {tokenCount} Tokens
                                            </span>
                                        </div>
                                    </div>

                                    <div className="py-1">
                                        <Link
                                            to={dashboardPath}
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-orange-500/10 hover:text-orange-400"
                                        >
                                            <LayoutDashboard size={14} />
                                            My Dashboard
                                        </Link>
                                        {(currentUser?.role === "user" ||
                                            currentUser?.role === "customer") && (
                                            <>
                                                <Link
                                                    to="/user/profile"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-orange-500/10 hover:text-orange-400"
                                                >
                                                    <User size={14} />
                                                    Profile
                                                </Link>
                                                <Link
                                                    to="/user/chats"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-orange-500/10 hover:text-orange-400"
                                                >
                                                    <Sparkles size={14} />
                                                    My Chats
                                                </Link>
                                                <Link
                                                    to="/user/favorites"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-orange-500/10 hover:text-orange-400"
                                                >
                                                    <Heart size={14} />
                                                    My Favorites
                                                </Link>
                                                <Link
                                                    to="/user/settings"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-orange-500/10 hover:text-orange-400"
                                                >
                                                    <Settings size={14} />
                                                    Settings
                                                </Link>
                                            </>
                                        )}
                                        <Link
                                            to="/ai-plan"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-orange-500/10 hover:text-orange-400"
                                        >
                                            <Crown size={14} />
                                            MOTOAI Plan
                                        </Link>
                                        <Link
                                            to="/motorcycles"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-orange-500/10 hover:text-orange-400"
                                        >
                                            <Zap size={14} />
                                            Browse Bikes
                                        </Link>
                                    </div>

                                    <div className="border-t border-white/[0.06] pt-1">
                                        <button
                                            onClick={handleLogout}
                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
                                        >
                                            <LogOut size={14} />
                                            Log Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="hidden items-center gap-2 md:flex">
                            <Link
                                to="/login"
                                className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-xs font-bold text-zinc-300 transition hover:border-white/20 hover:text-white"
                            >
                                <User size={13} />
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-black transition hover:bg-orange-400"
                            >
                                Get Started
                            </Link>
                        </div>
                    )}

                    {/* Mobile Hamburger Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                        className="rounded-xl border border-white/10 p-2 text-zinc-400 transition hover:text-white md:hidden"
                    >
                        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {mobileMenuOpen && (
                <div className="border-t border-white/[0.08] bg-[#070708] px-5 py-4 md:hidden">
                    {currentUser && (
                        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="flex items-center gap-3">
                                <UserAvatar user={currentUser} size={36} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-white">{currentUser.name}</p>
                                    <p className="truncate text-xs text-zinc-500">{currentUser.email}</p>
                                </div>
                            </div>
                            <Link
                                to="/ai-plan"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold ${
                                    isPremium
                                        ? "bg-orange-500/10 text-orange-400"
                                        : "bg-white/5 text-zinc-300"
                                }`}
                            >
                                <span>{isPremium ? `👑 Premium ${planType === "yearly" ? "Yearly" : "Monthly"}` : "Free Plan"}</span>
                                <span>{Number(tokenCount).toLocaleString("en-IN")} Tokens</span>
                            </Link>
                        </div>
                    )}

                    <div className="space-y-1">
                        {navLinks.map(({ label, path }) => (
                            <Link
                                key={label}
                                to={path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                                    isLinkActive(path)
                                        ? "bg-orange-500 text-black font-bold"
                                        : "text-zinc-300 hover:bg-white/5 hover:text-white"
                                }`}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>

                    {!currentUser && (
                        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.08] pt-4">
                            <Link
                                to="/login"
                                onClick={() => setMobileMenuOpen(false)}
                                className="rounded-xl border border-white/10 py-2.5 text-center text-xs font-bold text-zinc-300"
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                onClick={() => setMobileMenuOpen(false)}
                                className="rounded-xl bg-orange-500 py-2.5 text-center text-xs font-bold text-black"
                            >
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
}
