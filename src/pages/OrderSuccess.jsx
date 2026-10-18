import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    CheckCircle2,
    MapPin,
    Package,
    ArrowRight,
    Store,
    Calendar,
    Phone,
    Clock,
    CreditCard,
    ShieldAlert,
    Info,
    ChevronRight,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { ApiError, getOrder } from "../services/api";

const PROGRESS_STEPS = [
    { key: "submitted", label: "Request Submitted" },
    { key: "awaiting_confirmation", label: "Awaiting Dealer Confirmation" },
    { key: "confirmed", label: "Confirmed by Dealership" },
    { key: "payment_pending", label: "Payment Pending at Showroom" },
    { key: "paid", label: "Payment Verified" },
    { key: "ready_for_collection", label: "Ready for Collection" },
    { key: "completed", label: "Collected / Delivered" },
];

const OrderSuccess = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const data = await getOrder(id);
                setOrder(data.order);
            } catch (err) {
                if (!(err instanceof ApiError && err.status === 401)) {
                    setError(err.message || "Failed to load order.");
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                    <p className="mt-4 text-xs font-semibold text-zinc-500">Loading order details...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center px-5">
                <div className="text-center max-w-md">
                    <p className="text-zinc-400">{error || "Order not found."}</p>
                    <button
                        onClick={() => navigate("/motorcycles")}
                        className="mt-5 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black"
                    >
                        Browse Motorcycles
                    </button>
                </div>
            </div>
        );
    }

    // Determine current progression index
    let currentStepIndex = 1; // Default: awaiting confirmation
    if (order.orderStatus === "cancelled") {
        currentStepIndex = -1;
    } else if (order.orderStatus === "completed") {
        currentStepIndex = 6;
    } else if (order.orderStatus === "ready_for_collection") {
        currentStepIndex = 5;
    } else if (order.paymentStatus === "paid") {
        currentStepIndex = 4;
    } else if (order.orderStatus === "confirmed") {
        currentStepIndex = 3; // Confirmed, payment pending at showroom
    } else if (order.orderStatus === "pending_dealership_confirmation") {
        currentStepIndex = 1;
    }

    const isCancelled = order.orderStatus === "cancelled";
    const visitDateFormatted = order.visitDate
        ? new Date(order.visitDate).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
          })
        : order.customerDetails?.preferredVisitDate || "To be scheduled with dealer";

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar activeTab="motorcycles" />
            <main className="mx-auto max-w-3xl px-4 sm:px-8 py-10">
                {/* Header Confirmation Banner */}
                <div className="text-center">
                    {isCancelled ? (
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-4 border border-red-500/20">
                            <ShieldAlert size={32} />
                        </div>
                    ) : (
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
                            <CheckCircle2 size={36} />
                        </div>
                    )}

                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                        {isCancelled
                            ? "Purchase Request Cancelled"
                            : "Purchase Request Submitted!"}
                    </h1>

                    <p className="mt-2 text-sm text-zinc-400 max-w-lg mx-auto">
                        {isCancelled
                            ? order.cancelReason || "This purchase request has been cancelled."
                            : "Your request has been received by the authorized dealership. Payment is pending and will be made in person at the showroom."}
                    </p>
                </div>

                {/* Main Order Card */}
                <div className="mt-8 rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
                    {/* Order Reference Number */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
                        <div>
                            <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                                Order Reference
                            </p>
                            <p className="font-mono text-xl font-black text-orange-400 mt-0.5">
                                {order.orderNumber}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                                Request Date
                            </p>
                            <p className="text-sm font-semibold text-zinc-300 mt-0.5">
                                {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Motorcycle Details */}
                    <div className="mt-5 flex items-center gap-4">
                        {order.motorcycle?.image ? (
                            <img
                                src={order.motorcycle.image}
                                alt={order.motorcycle.name}
                                className="h-20 w-24 rounded-2xl object-cover border border-white/10"
                            />
                        ) : (
                            <div className="h-20 w-24 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-600">
                                <Package size={28} />
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                                {order.motorcycle?.brand}
                            </p>
                            <p className="text-lg font-black text-white">
                                {order.motorcycle?.name}
                            </p>
                            {order.selectedColor && (
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Selected Color: <span className="text-white font-semibold">{order.selectedColor}</span>
                                </p>
                            )}
                            <p className="text-sm font-black text-orange-400 mt-1.5">
                                Total Amount: ₹{Number(order.totalAmount).toLocaleString("en-IN")}
                            </p>
                        </div>
                    </div>

                    {/* Dealership Details & Next Steps */}
                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400 mb-3">
                            <Store size={15} />
                            Authorized Dealership Information
                        </div>

                        {order.dealership ? (
                            <div className="space-y-2 text-xs sm:text-sm">
                                <p className="font-extrabold text-white text-base">
                                    {order.dealership.name}
                                </p>
                                <p className="flex items-start gap-1.5 text-zinc-300">
                                    <MapPin size={14} className="text-orange-500 shrink-0 mt-0.5" />
                                    {order.dealership.address}, {order.dealership.city}
                                </p>
                                <div className="flex flex-wrap gap-4 pt-1 text-zinc-400 text-xs">
                                    {order.dealership.phone && (
                                        <span className="flex items-center gap-1">
                                            <Phone size={12} className="text-zinc-500" />
                                            {order.dealership.phone}
                                        </span>
                                    )}
                                    {order.dealership.openingHours && (
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} className="text-zinc-500" />
                                            {order.dealership.openingHours}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-zinc-400">Dealership information pending confirmation.</p>
                        )}

                        <div className="mt-4 border-t border-white/10 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="text-zinc-400 flex items-center gap-1">
                                <Calendar size={13} className="text-orange-400" /> Scheduled Visit Date:
                            </span>
                            <span className="font-bold text-white bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                                {visitDateFormatted}
                            </span>
                        </div>
                    </div>

                    {/* Offline Payment Status & Breakdown */}
                    <div className="mt-5 grid gap-2.5 text-xs sm:text-sm border-t border-white/10 pt-5">
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Payment Method</span>
                            <span className="font-semibold text-white">
                                Offline (Pay at Dealership)
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Preferred Showroom Payment</span>
                            <span className="font-semibold uppercase text-orange-400">
                                {order.offlinePaymentType || "Cash / Card / UPI"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Payment Status</span>
                            <span
                                className={`font-black uppercase text-xs px-2.5 py-0.5 rounded-full ${
                                    order.paymentStatus === "paid"
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                }`}
                            >
                                {order.paymentStatus === "paid" ? "Payment Verified" : "Pending (Pay at Dealership)"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Order Status</span>
                            <span className="font-bold text-white capitalize">
                                {(order.orderStatus || "").replace(/_/g, " ")}
                            </span>
                        </div>
                    </div>

                    {/* Visual 7-Stage Progress Tracker */}
                    {!isCancelled && (
                        <div className="mt-8 border-t border-white/10 pt-6">
                            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
                                Order Progress Timeline
                            </p>
                            <div className="space-y-3">
                                {PROGRESS_STEPS.map((step, idx) => {
                                    const isDone = idx < currentStepIndex;
                                    const isCurrent = idx === currentStepIndex;
                                    const isUpcoming = idx > currentStepIndex;

                                    return (
                                        <div key={step.key} className="flex items-center gap-3">
                                            <div
                                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                                    isDone
                                                        ? "bg-emerald-500 text-black"
                                                        : isCurrent
                                                        ? "bg-orange-500 text-black ring-4 ring-orange-500/20"
                                                        : "bg-white/10 text-zinc-500"
                                                }`}
                                            >
                                                {isDone ? "✓" : idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p
                                                    className={`text-xs font-bold ${
                                                        isCurrent
                                                            ? "text-orange-400"
                                                            : isDone
                                                            ? "text-white"
                                                            : "text-zinc-500"
                                                    }`}
                                                >
                                                    {step.label}
                                                    {isCurrent && " (Current Status)"}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Offline Purchase Instructions */}
                    <div className="mt-8 rounded-2xl border border-white/10 bg-[#111] p-5">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white mb-2">
                            <Info size={14} className="text-orange-500" />
                            Next Steps for Your Dealership Purchase:
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 text-xs text-zinc-400 leading-relaxed">
                            <li>The dealership staff will review your purchase request and reserve the motorcycle.</li>
                            <li>Visit the showroom on your visit date ({visitDateFormatted}).</li>
                            <li>Inspect the motorcycle, select any optional accessories, and confirm paperwork.</li>
                            <li>Make offline payment at the dealership counter via Cash, UPI, or Card.</li>
                            <li>Dealership staff will verify payment and hand over the keys and registration documents!</li>
                        </ol>
                    </div>
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Link
                        to="/user/orders"
                        className="flex-1 rounded-xl bg-orange-500 py-3.5 text-center text-sm font-bold text-black transition hover:bg-orange-400 shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2"
                    >
                        <Package size={16} /> View My Orders
                    </Link>
                    <Link
                        to="/motorcycles"
                        className="flex-1 rounded-xl border border-white/10 py-3.5 text-center text-sm font-bold text-zinc-200 transition hover:border-orange-500/40 hover:text-orange-400 flex items-center justify-center gap-2"
                    >
                        Continue Browsing <ArrowRight size={16} />
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default OrderSuccess;
