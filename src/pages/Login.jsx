import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import {
    FaArrowLeft,
    FaRobot,
    FaEnvelope,
    FaLock,
    FaUser,
    FaTools,
    FaShieldAlt,
    FaMotorcycle,
    FaStore,
    FaCog,
} from "react-icons/fa";

/* ─────────────────────────────────────────
   Role definitions
───────────────────────────────────────── */
const ROLES = [
    {
        id: "user",
        label: "Customer",
        subtitle: "Browse & buy motorcycles",
        icon: FaUser,
        accent: "orange",
        gradient: "from-orange-500/20 to-orange-600/5",
        border: "border-orange-500/40",
        ring: "ring-orange-500/30",
        iconBg: "bg-orange-500/15",
        iconColor: "text-orange-400",
        badgeBg: "bg-orange-500/10",
        badgeBorder: "border-orange-500/20",
        badgeText: "text-orange-400",
        redirect: "/",
    },
    {
        id: "provider",
        label: "Provider",
        subtitle: "List & manage listings",
        icon: FaStore,
        accent: "blue",
        gradient: "from-blue-500/20 to-blue-600/5",
        border: "border-blue-500/40",
        ring: "ring-blue-500/30",
        iconBg: "bg-blue-500/15",
        iconColor: "text-blue-400",
        badgeBg: "bg-blue-500/10",
        badgeBorder: "border-blue-500/20",
        badgeText: "text-blue-400",
        redirect: "/provider",
    },
    {
        id: "admin",
        label: "Admin",
        subtitle: "Full platform control",
        icon: FaShieldAlt,
        accent: "purple",
        gradient: "from-purple-500/20 to-purple-600/5",
        border: "border-purple-500/40",
        ring: "ring-purple-500/30",
        iconBg: "bg-purple-500/15",
        iconColor: "text-purple-400",
        badgeBg: "bg-purple-500/10",
        badgeBorder: "border-purple-500/20",
        badgeText: "text-purple-400",
        redirect: "/admin",
    },
];

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    // Page the user came from (e.g. "/ai-advisor" gate) —
    // return there after a successful login.
    const redirectTo = location.state?.from;

    /* ── selected role (for UI only; server decides actual role) ── */
    const [selectedRole, setSelectedRole] = useState("user");

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    /* Current role config object */
    const roleConfig = ROLES.find((r) => r.id === selectedRole) || ROLES[0];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!formData.email || !formData.password) {
            setError("Please enter email and password.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                "http://localhost:5000/api/auth/login",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Login failed.");
            }

            /* ── Role-based access control ─────────────────────────────
               The server is the source of truth for the user's role.
               If the user selects a role that doesn't match their actual
               account role, block access and show a clear error.
            ────────────────────────────────────────────────────────── */
            const serverRole = data.user?.role;

            /* Normalise: "customer" is treated same as "user" */
            const normalise = (r) => (r === "customer" ? "user" : r);
            const normServerRole = normalise(serverRole);
            const normSelectedRole = normalise(selectedRole);

            if (normServerRole !== normSelectedRole) {
                const roleLabel =
                    ROLES.find((r) => r.id === normServerRole)?.label ||
                    serverRole;
                throw new Error(
                    `This account is registered as a "${roleLabel}". Please select "${roleLabel}" and try again.`
                );
            }

            /* Save credentials only after role is verified */
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            /* Return to the gated page the user came from
               (keeping any AI context: single bike or compare set) */
            if (redirectTo) {
                const kept = {};
                if (location.state?.askAbout)
                    kept.askAbout = location.state.askAbout;
                if (location.state?.askCompare) {
                    kept.askCompare = location.state.askCompare;
                    if (location.state?.askText)
                        kept.askText = location.state.askText;
                }
                navigate(redirectTo, {
                    state:
                        Object.keys(kept).length > 0 ? kept : undefined,
                });
                return;
            }

            /* Navigate to the role-specific destination */
            const matched = ROLES.find((r) => r.id === normServerRole);
            navigate(matched ? matched.redirect : "/");
        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    /* Spinner / dot colour mapped per role */
    const spinnerClass =
        selectedRole === "admin"
            ? "border-purple-400/30 border-t-purple-400"
            : selectedRole === "provider"
                ? "border-blue-400/30 border-t-blue-400"
                : "border-black/30 border-t-black";

    const btnClass =
        selectedRole === "admin"
            ? "bg-purple-600 hover:bg-purple-500 shadow-purple-500/20 text-white"
            : selectedRole === "provider"
                ? "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20 text-white"
                : "bg-orange-500 hover:bg-orange-400 shadow-orange-500/20 text-black";

    return (
        <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden">

            {/* ── Dynamic background glow per role ── */}
            <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px] blur-[130px] rounded-full pointer-events-none transition-all duration-700 ${selectedRole === "admin"
                        ? "bg-purple-600/12"
                        : selectedRole === "provider"
                            ? "bg-blue-600/12"
                            : "bg-orange-500/10"
                    }`}
            />

            <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-md">

                    {/* ── Back button ── */}
                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 mb-7 text-gray-400 hover:text-orange-500 transition group"
                    >
                        <FaArrowLeft className="group-hover:-translate-x-1 transition" />
                        <span>Back to Home</span>
                    </button>

                    {/* ── Brand ── */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-6">
                            <Logo onClick={() => navigate("/")} size="lg" />
                        </div>
                        <h2 className="text-2xl font-bold mt-7">Welcome Back</h2>
                        <p className="mt-2 text-gray-500">
                            Login to continue your motorcycle journey
                        </p>
                    </div>

                    {/* ── Main Card ── */}
                    <div className="rounded-2xl border border-gray-800 bg-[#111]/95 p-7 md:p-8 shadow-2xl">

                        {/* AI Badge */}
                        <div className="flex items-center justify-center mb-5">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all duration-500 ${roleConfig.badgeBg} ${roleConfig.badgeBorder} ${roleConfig.badgeText}`}>
                                <FaRobot />
                                AI-Powered Motorcycle Platform
                            </div>
                        </div>

                        {/* ════════════════════════════════════
                            ROLE SELECTOR
                        ════════════════════════════════════ */}
                        <div className="mb-6">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 text-center">
                                Select your role
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {ROLES.map((role) => {
                                    const Icon = role.icon;
                                    const isActive = selectedRole === role.id;
                                    return (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => { setSelectedRole(role.id); setError(""); }}
                                            className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300 group
                                                ${isActive
                                                    ? `bg-gradient-to-b ${role.gradient} ${role.border} ring-2 ${role.ring} scale-[1.03]`
                                                    : "border-gray-800 bg-[#0d0d0d] hover:border-gray-600 hover:scale-[1.01]"
                                                }`}
                                        >
                                            {/* Icon circle */}
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? role.iconBg : "bg-gray-800/60"}`}>
                                                <Icon className={`text-sm transition-all duration-300 ${isActive ? role.iconColor : "text-gray-500"}`} />
                                            </div>
                                            <div className="text-center">
                                                <p className={`text-xs font-bold leading-tight transition-colors duration-300 ${isActive ? "text-white" : "text-gray-400"}`}>
                                                    {role.label}
                                                </p>
                                                <p className={`text-[9px] leading-tight mt-0.5 transition-colors duration-300 ${isActive ? "text-gray-400" : "text-gray-600"}`}>
                                                    {role.subtitle}
                                                </p>
                                            </div>
                                            {/* Active dot */}
                                            {isActive && (
                                                <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${role.iconColor.replace("text-", "bg-")}`} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ════════════════════════════════════
                            FORM
                        ════════════════════════════════════ */}
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Error */}
                            {error && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                    {error}
                                </div>
                            )}

                            {/* Role info hint */}
                            <div className={`rounded-xl px-4 py-2.5 border text-xs flex items-center gap-2 transition-all duration-500 ${roleConfig.badgeBg} ${roleConfig.badgeBorder} ${roleConfig.badgeText}`}>
                                {selectedRole === "admin" && <FaShieldAlt />}
                                {selectedRole === "provider" && <FaStore />}
                                {selectedRole === "user" && <FaMotorcycle />}
                                <span>
                                    {selectedRole === "admin" && "Logging in as Admin — full platform control."}
                                    {selectedRole === "provider" && "Logging in as Provider — manage your listings."}
                                    {selectedRole === "user" && "Logging in as Customer — explore motorcycles."}
                                </span>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-300">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                    <input
                                        type="email"
                                        name="email"
                                        id="login-email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Enter your email"
                                        className={`w-full rounded-xl border bg-[#090909] py-3.5 pl-11 pr-4 text-white outline-none placeholder:text-gray-600 transition focus:ring-2 ${selectedRole === "admin"
                                                ? "border-gray-800 focus:border-purple-500 focus:ring-purple-500/10"
                                                : selectedRole === "provider"
                                                    ? "border-gray-800 focus:border-blue-500 focus:ring-blue-500/10"
                                                    : "border-gray-800 focus:border-orange-500 focus:ring-orange-500/10"
                                            }`}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-300">
                                        Password
                                    </label>
                                    <Link
                                        to="/forgot-password"
                                        className="text-sm text-orange-500 hover:text-orange-400 transition"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        id="login-password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Enter your password"
                                        className={`w-full rounded-xl border bg-[#090909] py-3.5 pl-11 pr-20 text-white outline-none placeholder:text-gray-600 transition focus:ring-2 ${selectedRole === "admin"
                                                ? "border-gray-800 focus:border-purple-500 focus:ring-purple-500/10"
                                                : selectedRole === "provider"
                                                    ? "border-gray-800 focus:border-blue-500 focus:ring-blue-500/10"
                                                    : "border-gray-800 focus:border-orange-500 focus:ring-orange-500/10"
                                            }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium transition ${selectedRole === "admin" ? "text-purple-400 hover:text-purple-300"
                                                : selectedRole === "provider" ? "text-blue-400 hover:text-blue-300"
                                                    : "text-orange-500 hover:text-orange-400"
                                            }`}
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>

                            {/* Remember me */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    className="h-4 w-4 rounded border-gray-700 bg-[#090909] accent-orange-500"
                                />
                                <label htmlFor="remember" className="text-sm text-gray-500 cursor-pointer">
                                    Remember me
                                </label>
                            </div>

                            {/* Login button */}
                            <button
                                type="submit"
                                id="login-submit"
                                disabled={loading}
                                className={`w-full rounded-xl py-3.5 font-bold shadow-lg transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 ${btnClass}`}
                            >
                                {loading ? (
                                    <>
                                        <span className={`w-5 h-5 border-2 rounded-full animate-spin ${spinnerClass}`} />
                                        Logging in...
                                    </>
                                ) : (
                                    <>
                                        Sign In as {roleConfig.label}
                                        <FaArrowLeft className="rotate-180" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="my-6 flex items-center gap-4">
                            <div className="h-px flex-1 bg-gray-800" />
                            <span className="text-xs text-gray-600">OR</span>
                            <div className="h-px flex-1 bg-gray-800" />
                        </div>

                        {/* Register link */}
                        <p className="text-center text-sm text-gray-500">
                            Don't have an account?{" "}
                            <Link
                                to="/register"
                                state={
                                    redirectTo
                                        ? {
                                              from: redirectTo,
                                              ...(location.state?.askAbout
                                                  ? {
                                                        askAbout:
                                                            location.state
                                                                .askAbout,
                                                    }
                                                  : {}),
                                              ...(location.state?.askCompare
                                                  ? {
                                                        askCompare:
                                                            location.state
                                                                .askCompare,
                                                        ...(location.state
                                                            ?.askText
                                                            ? {
                                                                  askText:
                                                                      location
                                                                          .state
                                                                          .askText,
                                                              }
                                                            : {}),
                                                    }
                                                  : {}),
                                          }
                                        : undefined
                                }
                                className="font-semibold text-orange-500 hover:text-orange-400 transition"
                            >
                                Create Account
                            </Link>
                        </p>

                    </div>

                    {/* Security note */}
                    <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-600">
                        <FaLock className="text-orange-500" />
                        <span>Your account information is securely protected</span>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-700">© 2026 MOTOAI. All rights reserved.</p>
                        <div className="flex justify-center gap-5 mt-3 text-xs text-gray-700">
                            <Link to="/privacy" className="hover:text-orange-500 transition">Privacy</Link>
                            <Link to="/terms" className="hover:text-orange-500 transition">Terms</Link>
                            <Link to="/help" className="hover:text-orange-500 transition">Help</Link>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Login;