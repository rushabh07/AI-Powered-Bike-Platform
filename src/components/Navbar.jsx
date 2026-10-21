import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
    Newspaper,
    ChevronDown,
} from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import UserAvatar from "./UserAvatar";
import { getSubscriptionStatus } from "../services/api";

/* Single source of truth for the primary navigation.
   Order here is the order shown on desktop and mobile. */
const NAV_LINKS = [
    { label: "Home", path: "/" },
    { label: "Motorcycles", path: "/motorcycles" },
    { label: "Latest Updates", path: "/updates", icon: Newspaper },
    { label: "AI Advisor", path: "/ai-advisor", icon: Sparkles },
    { label: "AI Plan", path: "/ai-plan" },
    { label: "Compare", path: "/compare" },
    { label: "Contact", path: "/contact" },
];

/* Shared focus ring so every interactive control is keyboard-visible. */
const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070708]";

export default function Navbar({ activeTab, showTokens = true, position = "sticky", leading = null }) {
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

    const userMenuRef = useRef(null);
    const mobilePanelRef = useRef(null);
    const mobileToggleRef = useRef(null);

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
        try {
            setCurrentUser(JSON.parse(localStorage.getItem("user") || "null"));
        } catch {
            setCurrentUser(null);
        }
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
    }, [fetchStatus, location.pathname]);

    /* Any navigation closes both menus. Adjusting the state during
       render (instead of in an effect) keeps it in sync with the
       route change without a second render pass. */
    const [lastPath, setLastPath] = useState(location.pathname);
    if (lastPath !== location.pathname) {
        setLastPath(location.pathname);
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
    }

    /* Lock background scrolling while the mobile sheet is open. */
    useEffect(() => {
        if (!mobileMenuOpen) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [mobileMenuOpen]);

    /* Escape closes menus; outside clicks close the profile dropdown. */
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key !== "Escape") return;
            setUserMenuOpen(false);
            setMobileMenuOpen(false);
        };

        const handlePointerDown = (event) => {
            if (!userMenuOpen) return;
            const target = event.target;
            if (userMenuRef.current?.contains(target)) return;
            setUserMenuOpen(false);
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("mousedown", handlePointerDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("mousedown", handlePointerDown);
        };
    }, [userMenuOpen]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setCurrentUser(null);
        setPlanStatus(null);
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
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
    const isCustomer = currentUser?.role === "user" || currentUser?.role === "customer";
    const roleLabel = (currentUser?.role || "user").replace(/^./, (c) => c.toUpperCase());
    const planLabel = isPremium
        ? `Premium ${planType === "yearly" ? "Yearly" : "Monthly"}`
        : "Free Plan";
    const tokenLabel = `${Number(tokenCount).toLocaleString("en-IN")} Tokens`;

    /* Route-aware active state. `activeTab` wins when a page pins one. */
    const isLinkActive = (path) => {
        if (activeTab) {
            return activeTab.toLowerCase() === path.replace("/", "").toLowerCase();
        }
        const current = location.pathname;
        if (path === "/") return current === "/";
        return current === path || current.startsWith(`${path}/`);
    };

    const closeMobileMenu = () => setMobileMenuOpen(false);

    /* "fixed" is used by full-bleed pages (Homepage) that already
       reserve their own top spacing; everything else stays sticky. */
    const positionClass =
        position === "fixed" ? "fixed top-0 left-0 right-0" : "sticky top-0";

    return (
        <nav
            className={`${positionClass} z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#070708]/85`}
            aria-label="Main navigation"
        >
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between gap-3 sm:h-[72px] lg:h-20">
                    {/* ---------------------------------------------- Brand */}
                    <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
                        {/* Optional app-specific control (e.g. AI Advisor chat drawer) */}
                        {leading}

                        <Link
                            to="/"
                            className={`group flex items-center rounded-xl ${focusRing}`}
                            aria-label="MOTOAI home"
                        >
                            <Logo />
                        </Link>
                    </div>

                    {/* ---------------------------------- Desktop navigation */}
                    <nav
                        className="hidden min-w-0 flex-1 items-center justify-center gap-5 xl:flex xl:gap-7"
                        aria-label="Primary"
                    >
                        {NAV_LINKS.map(({ label, path, icon: Icon }) => {
                            const active = isLinkActive(path);
                            return (
                                <Link
                                    key={label}
                                    to={path}
                                    aria-current={active ? "page" : undefined}
                                    className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-md py-2 text-[13.5px] font-semibold tracking-tight transition-colors duration-200 ${focusRing} ${
                                        active
                                            ? "text-orange-600 dark:text-orange-500"
                                            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                    }`}
                                >
                                    {Icon && (
                                        <Icon
                                            size={15}
                                            className={active ? "text-orange-500" : "text-zinc-400 dark:text-zinc-500"}
                                            aria-hidden="true"
                                        />
                                    )}
                                    {label}
                                    {/* Restrained active indicator */}
                                    <span
                                        aria-hidden="true"
                                        className={`absolute -bottom-0.5 left-0 h-[2px] w-full rounded-full bg-orange-500 transition-opacity duration-200 ${
                                            active
                                                ? "opacity-100"
                                                : "opacity-0"
                                        }`}
                                    />
                                </Link>
                            );
                        })}
                    </nav>

                    {/* --------------------------------------- Right controls */}
                    <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
                        <ThemeToggle />

                        {/* Admin quick access */}
                        {currentUser?.role === "admin" && (
                            <Link
                                to="/admin"
                                title="Open admin panel"
                                className={`hidden items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1.5 text-xs font-bold text-orange-600 transition-colors duration-200 hover:bg-orange-500/20 dark:text-orange-400 xl:flex ${focusRing}`}
                            >
                                <Crown size={13} className="text-orange-500" aria-hidden="true" />
                                Admin Panel
                            </Link>
                        )}

                        {/* Subscription & Token Badge (customers only) */}
                        {isCustomer && (
                            <Link
                                to="/ai-plan"
                                title="Manage your MOTOAI plan"
                                className={`hidden items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors duration-200 xl:flex ${focusRing} ${
                                    isPremium
                                        ? "border-orange-500/30 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 dark:text-orange-400"
                                        : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-orange-500/30 hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-orange-500/30 dark:hover:text-white"
                                }`}
                            >
                                {isPremium ? (
                                    <>
                                        <Crown size={13} className="text-orange-500" aria-hidden="true" />
                                        <span>
                                            Premium {planType === "yearly" ? "Yearly" : "Monthly"}
                                            {showTokens ? ` • ${tokenLabel}` : ""}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Coins size={13} className="text-zinc-400" aria-hidden="true" />
                                        <span>{showTokens ? `Free • ${tokenLabel}` : "Free Plan"}</span>
                                    </>
                                )}
                            </Link>
                        )}

                        {/* User Profile / Menu */}
                        {currentUser ? (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setUserMenuOpen((open) => !open)}
                                    aria-haspopup="menu"
                                    aria-expanded={userMenuOpen}
                                    className={`flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-1 pr-2.5 transition-colors duration-200 hover:border-orange-500/40 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] sm:gap-2.5 ${focusRing}`}
                                >
                                    <UserAvatar user={currentUser} size={30} />
                                    <span className="hidden min-w-0 text-left sm:block">
                                        <span className="block max-w-[120px] truncate text-[13px] font-semibold leading-tight text-zinc-900 dark:text-white xl:max-w-[140px]">
                                            {currentUser.name}
                                        </span>
                                        <span className="block text-[10px] font-bold uppercase leading-tight tracking-[0.12em] text-orange-600 dark:text-orange-400">
                                            {roleLabel}
                                        </span>
                                    </span>
                                    <ChevronDown
                                        size={14}
                                        aria-hidden="true"
                                        className={`hidden shrink-0 text-zinc-400 transition-transform duration-200 sm:block ${
                                            userMenuOpen ? "rotate-180" : ""
                                        }`}
                                    />
                                </button>

                                {userMenuOpen && (
                                    <div
                                        role="menu"
                                        className="absolute right-0 top-[calc(100%+0.6rem)] w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-2xl shadow-zinc-900/10 dark:border-white/10 dark:bg-[#0d0d0f]"
                                    >
                                        <div className="border-b border-zinc-200/80 px-3 py-2.5 dark:border-white/[0.06]">
                                            <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                                                {currentUser.name}
                                            </p>
                                            <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-500">
                                                {currentUser.email}
                                            </p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                                    {roleLabel}
                                                </span>
                                                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                                                    {tokenLabel}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="py-1">
                                            <Link
                                                to={dashboardPath}
                                                role="menuitem"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-orange-500/10 hover:text-orange-600 dark:text-zinc-300 dark:hover:text-orange-400"
                                            >
                                                <LayoutDashboard size={14} aria-hidden="true" />
                                                My Dashboard
                                            </Link>
                                            {isCustomer && (
                                                <>
                                                    <Link
                                                        to="/user/profile"
                                                        role="menuitem"
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-orange-500/10 hover:text-orange-600 dark:text-zinc-300 dark:hover:text-orange-400"
                                                    >
                                                        <User size={14} aria-hidden="true" />
                                                        Profile
                                                    </Link>
                                                    <Link
                                                        to="/user/chats"
                                                        role="menuitem"
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-orange-500/10 hover:text-orange-600 dark:text-zinc-300 dark:hover:text-orange-400"
                                                    >
                                                        <Sparkles size={14} aria-hidden="true" />
                                                        My Chats
                                                    </Link>
                                                    <Link
                                                        to="/user/favorites"
                                                        role="menuitem"
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-orange-500/10 hover:text-orange-600 dark:text-zinc-300 dark:hover:text-orange-400"
                                                    >
                                                        <Heart size={14} aria-hidden="true" />
                                                        My Favorites
                                                    </Link>
                                                    <Link
                                                        to="/user/settings"
                                                        role="menuitem"
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-orange-500/10 hover:text-orange-600 dark:text-zinc-300 dark:hover:text-orange-400"
                                                    >
                                                        <Settings size={14} aria-hidden="true" />
                                                        Settings
                                                    </Link>
                                                </>
                                            )}
                                            <Link
                                                to="/ai-plan"
                                                role="menuitem"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-orange-500/10 hover:text-orange-600 dark:text-zinc-300 dark:hover:text-orange-400"
                                            >
                                                <Crown size={14} aria-hidden="true" />
                                                MOTOAI Plan
                                            </Link>
                                            <Link
                                                to="/motorcycles"
                                                role="menuitem"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-orange-500/10 hover:text-orange-600 dark:text-zinc-300 dark:hover:text-orange-400"
                                            >
                                                <Zap size={14} aria-hidden="true" />
                                                Browse Bikes
                                            </Link>
                                        </div>

                                        <div className="border-t border-zinc-200/80 pt-1 dark:border-white/[0.06]">
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={handleLogout}
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
                                            >
                                                <LogOut size={14} aria-hidden="true" />
                                                Log Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="hidden items-center gap-2 xl:flex">
                                <Link
                                    to="/login"
                                    className={`flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-bold text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white ${focusRing}`}
                                >
                                    <User size={13} aria-hidden="true" />
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className={`rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-black transition-colors hover:bg-orange-400 ${focusRing}`}
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu toggle */}
                        <button
                            ref={mobileToggleRef}
                            type="button"
                            onClick={() => setMobileMenuOpen((open) => !open)}
                            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                            aria-expanded={mobileMenuOpen}
                            aria-controls="motoai-mobile-menu"
                            className={`flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition-colors hover:border-orange-500/40 hover:text-orange-600 dark:border-white/10 dark:text-zinc-400 dark:hover:text-orange-400 xl:hidden ${focusRing}`}
                        >
                            {mobileMenuOpen ? (
                                <X size={18} aria-hidden="true" />
                            ) : (
                                <Menu size={18} aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ------------------------------------------------ Mobile sheet
                Rendered through a portal: the navbar uses backdrop-filter,
                which makes it the containing block for fixed children and
                would otherwise trap the sheet inside the bar. */}
            {mobileMenuOpen &&
                createPortal(
                    <>
                        <div
                            className="fixed inset-x-0 top-16 z-40 bg-black/50 backdrop-blur-sm sm:top-[72px] xl:hidden"
                            onClick={closeMobileMenu}
                            aria-hidden="true"
                        />
                        <nav
                            id="motoai-mobile-menu"
                            ref={mobilePanelRef}
                            aria-label="Mobile"
                            className="fixed inset-x-0 top-16 bottom-0 z-45 overflow-y-auto overscroll-contain border-t border-zinc-200 bg-white px-5 pb-10 pt-5 sm:top-[72px] xl:hidden dark:border-white/[0.07] dark:bg-[#0b0b0b]"
                        >
                        {/* Account card */}
                        {currentUser ? (
                            <div className="mb-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="flex items-center gap-3">
                                    <UserAvatar user={currentUser} size={40} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                                            {currentUser.name}
                                        </p>
                                        <p className="truncate text-[11px] uppercase tracking-[0.12em] text-orange-600 dark:text-orange-400">
                                            {roleLabel}
                                        </p>
                                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-500">
                                            {currentUser.email}
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    to="/ai-plan"
                                    onClick={closeMobileMenu}
                                    className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-bold text-zinc-700 ring-1 ring-zinc-200 dark:bg-white/[0.04] dark:text-zinc-300 dark:ring-white/10"
                                >
                                    <span className="flex items-center gap-1.5">
                                        {isPremium ? (
                                            <Crown size={13} className="text-orange-500" aria-hidden="true" />
                                        ) : (
                                            <Coins size={13} className="text-zinc-400" aria-hidden="true" />
                                        )}
                                        {planLabel}
                                    </span>
                                    <span>{tokenLabel}</span>
                                </Link>
                            </div>
                        ) : (
                            <div className="mb-5 grid grid-cols-2 gap-2">
                                <Link
                                    to="/login"
                                    onClick={closeMobileMenu}
                                    className={`rounded-xl border border-zinc-200 py-2.5 text-center text-xs font-bold text-zinc-700 dark:border-white/10 dark:text-zinc-300 ${focusRing}`}
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    onClick={closeMobileMenu}
                                    className={`rounded-xl bg-orange-500 py-2.5 text-center text-xs font-bold text-black ${focusRing}`}
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}

                        {/* Primary links */}
                        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                            Browse
                        </p>
                        <ul className="space-y-1">
                            {NAV_LINKS.map(({ label, path, icon: Icon }) => {
                                const active = isLinkActive(path);
                                return (
                                    <li key={label}>
                                        <Link
                                            to={path}
                                            onClick={closeMobileMenu}
                                            aria-current={active ? "page" : undefined}
                                            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                                                active
                                                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                                            }`}
                                        >
                                            {Icon ? (
                                                <Icon
                                                    size={17}
                                                    className={active ? "text-orange-500" : "text-zinc-400"}
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <span
                                                    aria-hidden="true"
                                                    className={`h-[17px] w-[17px] rounded-full border-2 ${
                                                        active
                                                            ? "border-orange-500"
                                                            : "border-zinc-300 dark:border-zinc-600"
                                                    }`}
                                                />
                                            )}
                                            {label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Theme switch */}
                        <p className="mb-2 mt-6 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                            Appearance
                        </p>
                        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Theme
                            </span>
                            <ThemeToggle />
                        </div>

                        {/* Account actions */}
                        {currentUser && (
                            <>
                                <p className="mb-2 mt-6 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                                    Account
                                </p>
                                <ul className="space-y-1">
                                    <li>
                                        <Link
                                            to={dashboardPath}
                                            onClick={closeMobileMenu}
                                            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                                        >
                                            <LayoutDashboard size={17} className="text-zinc-400" aria-hidden="true" />
                                            My Dashboard
                                        </Link>
                                    </li>
                                    {isCustomer && (
                                        <>
                                            <li>
                                                <Link
                                                    to="/user/profile"
                                                    onClick={closeMobileMenu}
                                                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                                                >
                                                    <User size={17} className="text-zinc-400" aria-hidden="true" />
                                                    Profile
                                                </Link>
                                            </li>
                                            <li>
                                                <Link
                                                    to="/user/chats"
                                                    onClick={closeMobileMenu}
                                                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                                                >
                                                    <Sparkles size={17} className="text-zinc-400" aria-hidden="true" />
                                                    My Chats
                                                </Link>
                                            </li>
                                            <li>
                                                <Link
                                                    to="/user/favorites"
                                                    onClick={closeMobileMenu}
                                                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                                                >
                                                    <Heart size={17} className="text-zinc-400" aria-hidden="true" />
                                                    My Favorites
                                                </Link>
                                            </li>
                                            <li>
                                                <Link
                                                    to="/user/settings"
                                                    onClick={closeMobileMenu}
                                                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                                                >
                                                    <Settings size={17} className="text-zinc-400" aria-hidden="true" />
                                                    Settings
                                                </Link>
                                            </li>
                                        </>
                                    )}
                                    <li>
                                        <Link
                                            to="/ai-plan"
                                            onClick={closeMobileMenu}
                                            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                                        >
                                            <Crown size={17} className="text-zinc-400" aria-hidden="true" />
                                            MOTOAI Plan
                                        </Link>
                                    </li>
                                    <li>
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
                                        >
                                            <LogOut size={17} className="text-red-500" aria-hidden="true" />
                                            Log Out
                                        </button>
                                    </li>
                                </ul>
                            </>
                        )}
                        </nav>
                    </>,
                    document.body
                )}
        </nav>
    );
}
