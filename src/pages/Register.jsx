import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import {
    FaArrowLeft,
    FaMotorcycle,
    FaRobot,
    FaUser,
    FaEnvelope,
    FaPhone,
    FaLock,
    FaEye,
    FaEyeSlash,
} from "react-icons/fa";

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    // Preserve return destination (e.g. "/ai-advisor" gate)
    // plus any AI context (single bike or compare set).
    const redirectTo = location.state?.from;
    const askAbout = location.state?.askAbout;
    const askCompare = location.state?.askCompare;
    const askText = location.state?.askText;
    const keptAskState = {
        ...(askAbout ? { askAbout } : {}),
        ...(askCompare
            ? { askCompare, ...(askText ? { askText } : {}) }
            : {}),
    };

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        role: "user",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        // Validation
        if (
            !formData.name ||
            !formData.email ||
            !formData.phone ||
            !formData.password ||
            !formData.confirmPassword
        ) {
            setError("Please fill in all fields.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                "http://localhost:5000/api/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        password: formData.password,
                        role: formData.role,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Registration failed.");
            }

            setSuccess("Registration successful! Redirecting to login...");

            // Clear form (preserve selected role so a
            // provider registration isn't silently reset to "user")
            setFormData((prev) => ({
                name: "",
                email: "",
                phone: "",
                password: "",
                confirmPassword: "",
                role: prev.role || "user",
            }));

            // Go to login after 1.5 seconds (keep return destination)
            setTimeout(() => {
                if (redirectTo) {
                    navigate("/login", {
                        state: {
                            from: redirectTo,
                            ...keptAskState,
                        },
                    });
                } else {
                    navigate("/login");
                }
            }, 1500);
        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-10">

            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-orange-600/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-72 h-72 bg-red-600/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-md">

                {/* Back Button */}
                <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 mb-6 text-gray-400 hover:text-orange-500 transition group"
                >
                    <FaArrowLeft className="group-hover:-translate-x-1 transition" />
                    <span>Back to Home</span>
                </button>

                {/* Card */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-7 shadow-2xl">

                    {/* Logo */}
                    <div className="flex justify-center mb-5">
                        <Logo onClick={() => navigate("/")} />
                    </div>

                    {/* AI Badge */}
                    <div className="flex justify-center mb-4">
                        <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs">
                            <FaRobot />
                            AI-Powered Motorcycle Platform
                        </span>
                    </div>

                    {/* Heading */}
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold mb-2">
                            Create Your Account
                        </h2>

                        <p className="text-gray-400 text-sm">
                            Join MOTOAI and find your perfect motorcycle
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                            {success}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Name */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">
                                Full Name
                            </label>

                            <div className="relative">
                                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />

                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">
                                Email Address
                            </label>

                            <div className="relative">
                                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />

                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                    className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">
                                Phone Number
                            </label>

                            <div className="relative">
                                <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />

                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Enter your phone number"
                                    className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                                />
                            </div>
                        </div>

                        {/* Account Role */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">
                                Account Role
                            </label>

                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full bg-black border border-zinc-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition"
                            >
                                <option value="user">User / Customer</option>
                                <option value="admin">Admin</option>
                                <option value="provider">Provider</option>
                            </select>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">
                                Password
                            </label>

                            <div className="relative">
                                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />

                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Create a password"
                                    className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-11 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-500"
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">
                                Confirm Password
                            </label>

                            <div className="relative">
                                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />

                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm your password"
                                    className="w-full bg-black border border-zinc-700 rounded-lg py-3 pl-11 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(!showConfirmPassword)
                                    }
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-500"
                                >
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="flex items-start gap-2 text-sm text-gray-400">
                            <input
                                type="checkbox"
                                required
                                className="mt-1 accent-orange-500"
                            />

                            <p>
                                I agree to the{" "}
                                <Link
                                    to="/terms"
                                    className="text-orange-500 hover:underline"
                                >
                                    Terms & Conditions
                                </Link>{" "}
                                and{" "}
                                <Link
                                    to="/privacy"
                                    className="text-orange-500 hover:underline"
                                >
                                    Privacy Policy
                                </Link>
                                .
                            </p>
                        </div>

                        {/* Register Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-800 disabled:cursor-not-allowed text-black font-bold py-3 rounded-lg transition"
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="text-center mt-6 pt-5 border-t border-zinc-800">
                        <p className="text-gray-400 text-sm">
                            Already have an account?{" "}
                            <Link
                                to="/login"
                                state={
                                    redirectTo
                                        ? {
                                              from: redirectTo,
                                              ...keptAskState,
                                          }
                                        : undefined
                                }
                                className="text-orange-500 font-semibold hover:underline"
                            >
                                Login
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-600 text-xs mt-5">
                    © 2026 MOTOAI. Smart choices. Better rides.
                </p>
            </div>
        </div>
    );
};

export default Register;

