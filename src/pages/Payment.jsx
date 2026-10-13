import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    ShieldCheck,
    AlertTriangle,
    Loader2,
    CreditCard,
    Lock,
} from "lucide-react";
import Navbar from "../components/Navbar";
import BrandLogo from "../components/BrandLogo";
import {
    ApiError,
    getOrder,
    createOrderPayment,
    verifyOrderPayment,
} from "../services/api";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const Payment = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [processing, setProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState("");

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");
            if (user?.role === "admin") {
                navigate("/admin", { replace: true });
            }
        } catch {
            /* ignore */
        }
    }, [navigate]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError("");
            try {
                const data = await getOrder(orderId);
                setOrder(data.order);
            } catch (err) {
                if (!(err instanceof ApiError && err.status === 401)) {
                    setError(err.message || "Could not load order.");
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [orderId]);

    const loadRazorpayScript = () =>
        new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });

    const handlePay = async () => {
        setProcessing(true);
        setError("");

        try {
            setProcessingStep("Creating payment order...");
            const paymentData = await createOrderPayment(orderId);

            if (paymentData.mode === "test") {
                setProcessingStep("Verifying payment...");
                await verifyOrderPayment(orderId, {
                    orderId: paymentData.orderId,
                });
                navigate("/payment-success", {
                    state: {
                        orderId,
                        paymentId: `pay_test_${Date.now()}`,
                        amount: paymentData.amount,
                    },
                });
                return;
            }

            setProcessingStep("Opening secure checkout...");
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                setError("Failed to load payment gateway. Please try again.");
                setProcessing(false);
                setProcessingStep("");
                return;
            }

            const options = {
                key: paymentData.keyId,
                amount: paymentData.amountPaise,
                currency: paymentData.currency,
                name: "MOTOAI",
                description: `Motorcycle Purchase — ${order?.motorcycle?.name || ""}`,
                order_id: paymentData.orderId,
                handler: async (response) => {
                    setProcessingStep("Verifying payment...");
                    try {
                        await verifyOrderPayment(orderId, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        navigate("/payment-success", {
                            state: {
                                orderId,
                                paymentId: response.razorpay_payment_id,
                                amount: paymentData.amount,
                            },
                        });
                    } catch (err) {
                        setError(err.message || "Payment verification failed.");
                        setProcessing(false);
                        setProcessingStep("");
                    }
                },
                modal: {
                    ondismiss: () => {
                        setProcessing(false);
                        setProcessingStep("");
                    },
                },
                theme: {
                    color: "#f97316",
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setError(err.message || "Payment failed.");
            }
            setProcessing(false);
            setProcessingStep("");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500 mx-auto" />
                    <p className="mt-4 text-sm text-zinc-500">Loading payment...</p>
                </div>
            </div>
        );
    }

    if (error && !order) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <AlertTriangle size={40} className="mx-auto text-red-400 mb-4" />
                    <p className="text-red-300">{error}</p>
                    <button
                        onClick={() => navigate("/motorcycles")}
                        className="mt-6 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black"
                    >
                        Back to Motorcycles
                    </button>
                </div>
            </div>
        );
    }

    if (!order) return null;

    const bike = order.motorcycle;
    const bikeImage = bike?.images?.[0]?.url || bike?.image || "";

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar activeTab="motorcycles" showTokens={true} />

            <main className="max-w-lg mx-auto px-5 sm:px-8 py-12">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition group mb-6"
                >
                    <ArrowLeft
                        size={18}
                        className="transition-transform group-hover:-translate-x-1"
                    />
                    Back
                </button>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                        Complete Your Payment
                    </h1>
                    <p className="text-sm text-zinc-500 mt-2">
                        Secure checkout powered by Razorpay
                    </p>
                </div>

                {error && (
                    <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
                    {/* Motorcycle Info */}
                    <div className="flex items-center gap-4 pb-6 border-b border-white/10">
                        {bikeImage ? (
                            <img
                                src={bikeImage}
                                alt={bike?.name}
                                className="h-16 w-16 rounded-2xl object-cover"
                            />
                        ) : (
                            <div className="h-16 w-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
                                <BrandLogo
                                    brand={bike?.brand || ""}
                                    brandLogo={bike?.brandLogo || ""}
                                    size={28}
                                />
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                                {bike?.brand}
                            </p>
                            <p className="font-bold">{bike?.name}</p>
                            {order.variantName && (
                                <p className="text-sm font-semibold text-orange-400">
                                    {order.variantName} Variant
                                </p>
                            )}
                            <p className="text-sm text-zinc-500 flex items-center gap-1 mt-0.5">
                                <CreditCard size={12} />
                                {order.city}
                            </p>
                        </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="py-5 border-b border-white/10 space-y-2.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Ex-showroom</span>
                            <span className="font-semibold">{inr(order.exShowroomPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Road Tax (RTO)</span>
                            <span className="font-semibold">{inr(order.roadTax)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Insurance (3%)</span>
                            <span className="font-semibold">{inr(order.insuranceAmount)}</span>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="py-6 text-center">
                        <p className="text-sm text-zinc-500 mb-2">Total Amount</p>
                        <p className="text-5xl font-black text-orange-400">
                            {inr(order.totalAmount)}
                        </p>
                    </div>

                    {/* Pay Button */}
                    <button
                        onClick={handlePay}
                        disabled={processing || order.status === "paid"}
                        className="mt-6 w-full rounded-xl bg-orange-500 py-4 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {processing ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                {processingStep || "Processing..."}
                            </>
                        ) : (
                            <>
                                <Lock size={16} />
                                Pay {inr(order.totalAmount)}
                            </>
                        )}
                    </button>

                    <div className="mt-5 flex items-center justify-center gap-2 text-xs text-zinc-500">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        Secure payment powered by Razorpay
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Payment;
