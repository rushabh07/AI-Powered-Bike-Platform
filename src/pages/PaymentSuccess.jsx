import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    CheckCircle,
    ShoppingBag,
    Bike,
    Calendar,
    MapPin,
    CreditCard,
    Hash,
} from "lucide-react";
import Navbar from "../components/Navbar";
import BrandLogo from "../components/BrandLogo";
import { ApiError, getOrder } from "../services/api";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const PaymentSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { orderId, paymentId, amount } = location.state || {};

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAnimation, setShowAnimation] = useState(true);

    useEffect(() => {
        if (!orderId) {
            navigate("/motorcycles");
            return;
        }
        const load = async () => {
            try {
                const data = await getOrder(orderId);
                setOrder(data.order);
            } catch (err) {
                if (!(err instanceof ApiError && err.status === 401)) {
                    // still show success page with state data
                }
            } finally {
                setLoading(false);
            }
        };
        load();
        const timer = setTimeout(() => setShowAnimation(false), 2000);
        return () => clearTimeout(timer);
    }, [orderId, navigate]);

    const bike = order?.motorcycle;
    const bikeImage = bike?.images?.[0]?.url || bike?.image || "";
    const displayAmount = amount || order?.totalAmount || 0;
    const displayPaymentId = paymentId || order?.paymentId || "";
    const orderDate = order?.createdAt
        ? new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
          })
        : "";

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar activeTab="motorcycles" showTokens={true} />

            <main className="max-w-2xl mx-auto px-5 sm:px-8 py-12">
                {/* Animated Success Icon */}
                <div className="text-center mb-8">
                    <div
                        className={`mx-auto w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 transition-all duration-700 ${
                            showAnimation
                                ? "scale-0 opacity-0"
                                : "scale-100 opacity-100"
                        }`}
                    >
                        <div
                            className={`w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center transition-all duration-500 delay-200 ${
                                showAnimation
                                    ? "scale-0"
                                    : "scale-100"
                            }`}
                        >
                            <CheckCircle
                                size={48}
                                className="text-emerald-400"
                            />
                        </div>
                    </div>
                    <h1
                        className={`text-3xl font-black tracking-tight transition-all duration-500 delay-300 ${
                            showAnimation
                                ? "opacity-0 translate-y-4"
                                : "opacity-100 translate-y-0"
                        }`}
                    >
                        Payment Successful
                    </h1>
                    <p
                        className={`text-zinc-500 mt-2 transition-all duration-500 delay-500 ${
                            showAnimation
                                ? "opacity-0 translate-y-4"
                                : "opacity-100 translate-y-0"
                        }`}
                    >
                        Your motorcycle order has been confirmed.
                    </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
                    {/* Motorcycle */}
                    <div className="flex items-center gap-4 pb-6 border-b border-white/10">
                        {bikeImage ? (
                            <img
                                src={bikeImage}
                                alt={bike?.name}
                                className="h-20 w-20 rounded-2xl object-cover"
                            />
                        ) : (
                            <div className="h-20 w-20 rounded-2xl bg-zinc-800 flex items-center justify-center">
                                <BrandLogo
                                    brand={bike?.brand || ""}
                                    brandLogo={bike?.brandLogo || ""}
                                    size={32}
                                />
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                                {bike?.brand || "Motorcycle"}
                            </p>
                            <p className="text-xl font-bold mt-1">
                                {bike?.name || "Order Placed"}
                            </p>
                            {order?.variantName && (
                                <p className="text-sm font-semibold text-orange-400 mt-0.5">
                                    {order.variantName} Variant
                                </p>
                            )}
                            <p className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
                                <MapPin size={12} />
                                {order?.city || ""}
                            </p>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="py-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-400">Ex-showroom</span>
                            <span className="font-semibold">{inr(order?.exShowroomPrice || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-400">Road Tax (RTO)</span>
                            <span className="font-semibold">{inr(order?.roadTax || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-400">Insurance (3%)</span>
                            <span className="font-semibold">{inr(order?.insuranceAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-white/10">
                            <span className="text-sm text-zinc-400 flex items-center gap-2">
                                <CreditCard size={14} />
                                Amount Paid
                            </span>
                            <span className="text-lg font-bold text-emerald-400">
                                {inr(displayAmount)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-400 flex items-center gap-2">
                                <Hash size={14} />
                                Payment ID
                            </span>
                            <span className="font-mono text-xs text-zinc-300">
                                {displayPaymentId || "—"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-400 flex items-center gap-2">
                                <Hash size={14} />
                                Order ID
                            </span>
                            <span className="font-mono text-xs text-zinc-300">
                                {orderId || "—"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-400 flex items-center gap-2">
                                <Calendar size={14} />
                                Date
                            </span>
                            <span className="text-sm text-zinc-300">
                                {orderDate || "—"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-zinc-400">Status</span>
                            <span className="text-xs font-bold uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                                Paid
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                    <Link
                        to="/user/orders"
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black transition hover:bg-orange-400"
                    >
                        <ShoppingBag size={16} />
                        View My Orders
                    </Link>
                    <Link
                        to="/motorcycles"
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3.5 text-sm font-bold transition hover:border-orange-500/40 hover:text-orange-400"
                    >
                        <Bike size={16} />
                        Continue Exploring
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default PaymentSuccess;
