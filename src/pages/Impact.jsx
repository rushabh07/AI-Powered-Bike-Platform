import React from "react";
import { useNavigate } from "react-router-dom";
import {
    FaLeaf,
    FaUsers,
    FaBolt,
    FaRecycle,
    FaTree,
    FaWind,
    FaSolarPanel,
    FaBicycle,
    FaFacebook,
    FaInstagram,
    FaTwitter,
    FaYoutube,
    FaLinkedin,
    FaArrowRight,
    FaCheckCircle,
    FaEnvelope,
    FaMapMarkerAlt,
    FaPhoneAlt,
} from "react-icons/fa";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";

const impactStats = [
    { value: "12,500+", label: "Riders Guided", icon: FaUsers },
    { value: "₹8.2 Cr", label: "EV Savings Generated", icon: FaBolt },
    { value: "3,400 Tons", label: "CO₂ Offset", icon: FaWind },
    { value: "150+", label: "Dealer Partners", icon: FaTree },
];

const ecoTips = [
    {
        icon: FaBicycle,
        title: "Choose Electric",
        text: "Electric motorcycles produce zero direct emissions. Switching from a 150cc petrol bike to an EV saves ~2.6 tons of CO₂ per year.",
    },
    {
        icon: FaRecycle,
        title: "Maintain Your Ride",
        text: "Regular servicing keeps your engine efficient. A well-tuned motorcycle can improve fuel economy by up to 15%.",
    },
    {
        icon: FaWind,
        title: "Ride Smooth",
        text: "Avoid rapid acceleration and hard braking. Smooth riding can reduce fuel consumption by 20-30%.",
    },
    {
        icon: FaSolarPanel,
        title: "Charge Smart",
        text: "If you own an EV, charge during off-peak hours when the grid uses more renewable energy sources.",
    },
];

const joinSteps = [
    {
        step: "01",
        title: "Create Account",
        text: "Sign up for free and tell us about your riding style, budget, and preferences.",
    },
    {
        step: "02",
        title: "Get AI Recommendations",
        text: "Our AI analyzes thousands of data points to suggest the perfect motorcycle for you.",
    },
    {
        step: "03",
        title: "Compare & Decide",
        text: "Compare specs, prices, and reviews side-by-side to make a confident choice.",
    },
    {
        step: "04",
        title: "Connect & Ride",
        text: "Book a test ride through our dealer network and hit the road.",
    },
];

const socialIcons = [
    [FaFacebook, "Facebook"],
    [FaInstagram, "Instagram"],
    [FaTwitter, "Twitter"],
    [FaYoutube, "YouTube"],
    [FaLinkedin, "LinkedIn"],
];

function Impact() {
    const navigate = useNavigate();

    const go = (path) => navigate(path);

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            {/* ================= NAVBAR ================= */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#070707]/95 backdrop-blur-xl border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Logo onClick={() => go("/")} />

                    <div className="hidden md:flex items-center gap-8">
                        {[
                            ["Home", "/"],
                            ["Motorcycles", "/motorcycles"],
                            ["AI Advisor", "/ai-advisor"],
                            ["Compare", "/compare"],
                            ["Impact", "/impact"],
                        ].map(([label, path]) => (
                            <button
                                key={label}
                                onClick={() => go(path)}
                                className={
                                    path === "/impact"
                                        ? "text-orange-500 font-medium"
                                        : "text-gray-400 hover:text-white transition"
                                }
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3 items-center">
                        <ThemeToggle />
                        <button
                            onClick={() => go("/register")}
                            className="bg-orange-500 text-black font-bold px-5 py-2.5 rounded-xl hover:bg-orange-400 transition"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            <main id="main-content">
                {/* ================= HERO ================= */}
                <section className="pt-36 pb-24 px-6 relative overflow-hidden">
                    <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/10 blur-[120px] rounded-full" />

                    <div className="max-w-7xl mx-auto text-center relative">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm">
                            <FaLeaf />
                            Our Impact
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black leading-[1.05] mt-7">
                            Riding Toward a
                            <br />
                            <span className="text-orange-500">
                                Greener Future.
                            </span>
                        </h1>

                        <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mx-auto mt-7">
                            At MOTOAI, we believe every ride can make a
                            positive impact. Discover how we're helping
                            riders make eco-friendly choices, one
                            motorcycle at a time.
                        </p>

                        <div className="flex justify-center gap-4 mt-9 flex-wrap">
                            <button
                                onClick={() => go("/ai-advisor")}
                                className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-8 py-4 rounded-xl flex items-center gap-3"
                            >
                                Find Your Eco Bike
                                <FaArrowRight />
                            </button>
                            <button
                                onClick={() => go("/motorcycles")}
                                className="border border-gray-700 hover:border-orange-500 hover:text-orange-500 px-8 py-4 rounded-xl transition"
                            >
                                Browse Bikes
                            </button>
                        </div>
                    </div>
                </section>

                {/* ================= IMPACT STATS ================= */}
                <section className="py-24 px-6 bg-[#0c0c0c]">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-14">
                            <p className="text-orange-500 font-semibold">
                                OUR IMPACT
                            </p>
                            <h2 className="text-4xl md:text-5xl font-black mt-3">
                                Making a{" "}
                                <span className="text-orange-500">
                                    Difference
                                </span>
                            </h2>
                            <p className="text-gray-500 mt-4 max-w-xl mx-auto">
                                Together with our community of riders,
                                we're reducing emissions and promoting
                                sustainable transportation.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {impactStats.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="p-8 bg-[#111] border border-gray-800 rounded-2xl text-center hover:border-orange-500/50 transition"
                                >
                                    <stat.icon className="text-orange-500 text-3xl mx-auto mb-4" />
                                    <h3 className="text-3xl font-black text-orange-500">
                                        {stat.value}
                                    </h3>
                                    <p className="text-gray-500 mt-2">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ================= ECO TIPS ================= */}
                <section className="py-24 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-14">
                            <p className="text-orange-500 font-semibold">
                                ECO TIPS
                            </p>
                            <h2 className="text-4xl md:text-5xl font-black mt-3">
                                Ride{" "}
                                <span className="text-orange-500">
                                    Responsibly
                                </span>
                            </h2>
                            <p className="text-gray-500 mt-4 max-w-xl mx-auto">
                                Small changes in how you ride can make a
                                big difference for the environment.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {ecoTips.map((tip) => (
                                <div
                                    key={tip.title}
                                    className="p-8 bg-[#111] border border-gray-800 rounded-2xl hover:border-orange-500/50 transition"
                                >
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                            <tip.icon className="text-orange-500 text-xl" />
                                        </div>
                                        <h3 className="text-xl font-bold">
                                            {tip.title}
                                        </h3>
                                    </div>
                                    <p className="text-gray-400 leading-relaxed">
                                        {tip.text}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 p-8 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                            <div className="flex items-start gap-4">
                                <FaLeaf className="text-orange-500 text-2xl flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="text-lg font-bold text-orange-500">
                                        Did You Know?
                                    </h3>
                                    <p className="text-gray-400 mt-2 leading-relaxed">
                                        If just 10% of Indian motorcycle
                                        riders switched to electric, we
                                        could reduce CO₂ emissions by
                                        over 1.5 million tons annually —
                                        equivalent to planting 65
                                        million trees.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ================= JOIN US ================= */}
                <section className="py-24 px-6 bg-[#0c0c0c]">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-14">
                            <p className="text-orange-500 font-semibold">
                                JOIN US
                            </p>
                            <h2 className="text-4xl md:text-5xl font-black mt-3">
                                Be Part of the{" "}
                                <span className="text-orange-500">
                                    Movement
                                </span>
                            </h2>
                            <p className="text-gray-500 mt-4 max-w-xl mx-auto">
                                Join thousands of riders who are making
                                smarter, greener choices every day.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {joinSteps.map((item) => (
                                <div
                                    key={item.step}
                                    className="p-7 bg-[#111] border border-gray-800 rounded-2xl hover:border-orange-500/50 transition"
                                >
                                    <span className="text-4xl font-black text-orange-500/30">
                                        {item.step}
                                    </span>
                                    <h3 className="text-xl font-bold mt-4">
                                        {item.title}
                                    </h3>
                                    <p className="text-gray-500 mt-3 text-sm leading-relaxed">
                                        {item.text}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* CTA BOX */}
                        <div className="mt-16 rounded-3xl border border-orange-500/20 bg-orange-500/10 p-8 md:p-14">
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div>
                                    <h2 className="text-4xl md:text-5xl font-black">
                                        Ready to Make
                                        <br />
                                        <span className="text-orange-500">
                                            an Impact?
                                        </span>
                                    </h2>
                                    <p className="text-gray-400 mt-6 leading-relaxed">
                                        Create your free account today and
                                        let our AI guide you toward the
                                        perfect eco-friendly motorcycle.
                                    </p>

                                    <div className="space-y-3 mt-7">
                                        {[
                                            "Free AI recommendations",
                                            "Compare 500+ motorcycles",
                                            "Access exclusive dealer offers",
                                        ].map((item) => (
                                            <div
                                                key={item}
                                                className="flex items-center gap-3"
                                            >
                                                <FaCheckCircle className="text-orange-500" />
                                                <span className="text-gray-300">
                                                    {item}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => go("/register")}
                                        className="mt-8 bg-orange-500 hover:bg-orange-400 text-black font-bold px-8 py-4 rounded-xl inline-flex items-center gap-3"
                                    >
                                        Join MOTOAI Free
                                        <FaArrowRight />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-6 bg-[#111] border border-gray-800 rounded-xl flex items-center gap-4">
                                        <FaEnvelope className="text-orange-500 text-xl" />
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Email Us
                                            </p>
                                            <p className="font-semibold">
                                                hello@motoai.in
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-[#111] border border-gray-800 rounded-xl flex items-center gap-4">
                                        <FaPhoneAlt className="text-orange-500 text-xl" />
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Call Us
                                            </p>
                                            <p className="font-semibold">
                                                +91 98765 43210
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-[#111] border border-gray-800 rounded-xl flex items-center gap-4">
                                        <FaMapMarkerAlt className="text-orange-500 text-xl" />
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                Visit Us
                                            </p>
                                            <p className="font-semibold">
                                                Mumbai, India
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* ================= FOOTER ================= */}
            <footer className="bg-[#050505] border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-6 py-16">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
                        <div className="lg:col-span-2">
                            <Logo onClick={() => go("/")} />
                            <p className="text-gray-500 mt-6 max-w-sm leading-relaxed">
                                AI-powered motorcycle discovery for a
                                greener tomorrow. Ride smart, ride
                                sustainable.
                            </p>
                            <div className="flex gap-3 mt-7">
                                {socialIcons.map(([Icon, label]) => (
                                    <button
                                        key={label}
                                        aria-label={`MOTOAI on ${label}`}
                                        className="w-10 h-10 rounded-lg bg-[#111] border border-gray-800 flex items-center justify-center hover:bg-orange-500 hover:text-black transition"
                                    >
                                        <Icon aria-hidden="true" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg mb-6">
                                Platform
                            </h3>
                            <div className="space-y-4 text-gray-500 text-sm">
                                {[
                                    ["Explore Motorcycles", "/motorcycles"],
                                    ["AI Advisor", "/ai-advisor"],
                                    ["Compare Bikes", "/compare"],
                                    ["Our Impact", "/impact"],
                                ].map(([label, path]) => (
                                    <button
                                        key={label}
                                        onClick={() => go(path)}
                                        className="block hover:text-orange-500 transition"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg mb-6">
                                Get Started
                            </h3>
                            <div className="space-y-4 text-gray-500 text-sm">
                                {[
                                    ["Create Account", "/register"],
                                    ["Login", "/login"],
                                    ["Book Test Ride", "/motorcycles"],
                                    ["Contact Us", "/impact"],
                                ].map(([label, path]) => (
                                    <button
                                        key={label}
                                        onClick={() => go(path)}
                                        className="block hover:text-orange-500 transition"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-14 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between gap-5">
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <FaMapMarkerAlt className="text-orange-500" />
                            India
                        </div>
                        <p className="text-gray-600 text-sm">
                            © 2026 MOTOAI. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Impact;
