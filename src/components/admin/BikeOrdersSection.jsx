import React, { useCallback, useEffect, useState } from "react";
import { Search, Eye, Check, X, ShieldCheck, Package, RefreshCw, Calendar, Phone, MapPin, Store, AlertCircle } from "lucide-react";
import {
    getStaffOrders,
    getOrder,
    dealerConfirmOrder,
    dealerRejectOrder,
    verifyOfflineOrderPayment,
    updateOrderFulfilment,
} from "../../services/api";

const STAGE_LABELS = {
    pending_dealership_confirmation: "Awaiting Confirmation",
    confirmed: "Confirmed (Payment Pending)",
    ready_for_collection: "Ready for Collection",
    completed: "Collected / Delivered",
    cancelled: "Cancelled",
};

const badge = (o) => {
    const base = "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider";
    if (o.orderStatus === "completed") return `${base} bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`;
    if (o.orderStatus === "cancelled") return `${base} bg-zinc-500/10 text-zinc-500 border border-zinc-500/20`;
    if (o.orderStatus === "ready_for_collection") return `${base} bg-purple-500/10 text-purple-400 border border-purple-500/20`;
    if (o.orderStatus === "confirmed") {
        return o.paymentStatus === "paid"
            ? `${base} bg-blue-500/10 text-blue-400 border border-blue-500/20`
            : `${base} bg-yellow-500/10 text-yellow-400 border border-yellow-500/20`;
    }
    return `${base} bg-yellow-500/10 text-yellow-400 border border-yellow-500/20`;
};

const DEFAULT_METHODS = ["upi", "card", "cash", "bank_transfer"];

export default function BikeOrdersSection() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [payStatus, setPayStatus] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [payForm, setPayForm] = useState({ type: "upi", ref: "" });
    const [confirmBox, setConfirmBox] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getStaffOrders({
                paymentMethod: "offline",
                orderStatus: status,
                paymentStatus: payStatus,
                search,
                page,
                limit: 15,
            });
            setItems(data.orders || []);
            setPages(data.pages || 1);
        } catch (err) {
            if (err?.status !== 401) setError(err.message || "Could not load orders.");
        } finally {
            setLoading(false);
        }
    }, [status, payStatus, search, page]);

    useEffect(() => {
        const t = setTimeout(load, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [load]);

    const openDetail = async (id) => {
        setDetailLoading(true);
        try {
            const data = await getOrder(id);
            setDetail(data.order);
            const supported = data.order.dealership?.acceptedPaymentMethods?.length
                ? data.order.dealership.acceptedPaymentMethods
                : DEFAULT_METHODS;
            setPayForm({ type: supported[0] || "upi", ref: "" });
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        } finally {
            setDetailLoading(false);
        }
    };

    const refreshDetail = async (id) => {
        try {
            const data = await getOrder(id);
            setDetail(data.order);
            setItems((prev) => prev.map((o) => (o._id === id ? data.order : o)));
        } catch {
            /* ignore */
        }
    };

    const act = async (fn, id, label) => {
        if (label && !window.confirm(`${label}?`)) return;
        try {
            await fn();
            setConfirmBox(null);
            await refreshDetail(id);
            load();
        } catch (err) {
            if (err?.status !== 401) alert(err.message || "Action failed.");
        }
    };

    return (
        <div>
            {error && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Filter controls */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-bold text-orange-400 flex items-center gap-1.5">
                    <Store size={14} /> Method: Offline Dealership
                </div>

                <select
                    value={status}
                    onChange={(e) => {
                        setStatus(e.target.value);
                        setPage(1);
                    }}
                    aria-label="Filter by order status"
                    className="rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 text-xs font-semibold text-white outline-none"
                >
                    <option value="">All Order Statuses</option>
                    {Object.entries(STAGE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                            {l}
                        </option>
                    ))}
                </select>

                <select
                    value={payStatus}
                    onChange={(e) => {
                        setPayStatus(e.target.value);
                        setPage(1);
                    }}
                    aria-label="Filter by payment status"
                    className="rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 text-xs font-semibold text-white outline-none"
                >
                    <option value="">Any Payment Status</option>
                    <option value="pending">Pending Payment</option>
                    <option value="paid">Payment Verified (Paid)</option>
                </select>

                <div className="relative min-w-[200px] flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by order no, customer, phone..."
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-orange-500/50"
                    />
                </div>

                <button
                    onClick={load}
                    aria-label="Refresh orders"
                    className="rounded-xl border border-white/10 p-2.5 text-zinc-400 hover:text-white transition"
                >
                    <RefreshCw size={15} />
                </button>
            </div>

            {/* Orders list */}
            {loading ? (
                <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.03]" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-white/10">
                    <Store size={32} className="mx-auto text-zinc-600 mb-2" />
                    <p className="text-sm font-semibold text-zinc-400">No offline purchase requests found.</p>
                    <p className="text-xs text-zinc-600 mt-1">Customer purchase requests for your dealership will appear here.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((o) => (
                        <div
                            key={o._id}
                            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0c0c0c] p-4 sm:p-5 transition hover:border-orange-500/20"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-orange-400">
                                        {o.orderNumber}
                                    </span>
                                    <span className="text-zinc-600">•</span>
                                    <span className="text-xs text-zinc-400">
                                        {new Date(o.createdAt).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </span>
                                    <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-400">
                                        Offline Purchase
                                    </span>
                                </div>

                                <p className="mt-1 truncate text-sm font-extrabold text-white">
                                    {o.motorcycle?.brand} {o.motorcycle?.name}
                                    {o.selectedColor ? ` • ${o.selectedColor}` : ""}
                                </p>

                                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                                    <span>
                                        Customer: <strong className="text-zinc-300">{o.customerDetails?.name || "—"}</strong> ({o.customerDetails?.phone || "—"})
                                    </span>
                                    {o.dealership && (
                                        <span>
                                            Dealership: <strong className="text-zinc-300">{o.dealership.name}</strong>
                                        </span>
                                    )}
                                    {o.visitDate && (
                                        <span className="text-orange-400 font-semibold">
                                            Visit Date: {new Date(o.visitDate).toLocaleDateString("en-IN")}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                    <span className="font-bold text-white">
                                        ₹{Number(o.totalAmount).toLocaleString("en-IN")}
                                    </span>
                                    <span className="text-zinc-600">•</span>
                                    <span
                                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                            o.paymentStatus === "paid"
                                                ? "bg-emerald-500/10 text-emerald-400"
                                                : "bg-yellow-500/10 text-yellow-400"
                                        }`}
                                    >
                                        Payment: {o.paymentStatus === "paid" ? `Verified (${o.offlinePaymentType || "Offline"})` : "Pending"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <span className={badge(o)}>
                                    {STAGE_LABELS[o.orderStatus] || o.orderStatus}
                                </span>
                                <button
                                    onClick={() => openDetail(o._id)}
                                    aria-label="View order details"
                                    className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-orange-500/40 hover:text-orange-400"
                                >
                                    <Eye size={14} /> View
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                <span>Page {page} of {pages}</span>
                <div className="flex gap-2">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40"
                    >
                        Prev
                    </button>
                    <button
                        disabled={page >= pages}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Detail Modal / Panel */}
            {detailLoading && <p className="mt-4 text-center text-xs text-zinc-500">Loading order details...</p>}
            {detail && !detailLoading && (
                <div className="mt-6 rounded-3xl border border-orange-500/30 bg-[#0c0c0c] p-6 shadow-2xl">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-base font-black text-orange-400">
                                    {detail.orderNumber}
                                </span>
                                <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-300">
                                    Offline Dealership Purchase
                                </span>
                            </div>
                            <h3 className="mt-1 text-xl font-black text-white">
                                {detail.motorcycle?.brand} {detail.motorcycle?.name}
                                {detail.selectedColor ? ` • ${detail.selectedColor}` : ""}
                            </h3>
                            <p className="mt-1 text-xs text-zinc-400">
                                Customer: <strong className="text-white">{detail.customerDetails?.name}</strong> • Phone: <strong className="text-white">{detail.customerDetails?.phone}</strong>
                                {detail.customerDetails?.email ? ` • ${detail.customerDetails.email}` : ""}
                            </p>
                            {detail.customerDetails?.address && (
                                <p className="mt-0.5 text-xs text-zinc-400">
                                    Address: {detail.customerDetails.address}
                                </p>
                            )}
                        </div>
                        <span className={badge(detail)}>
                            {STAGE_LABELS[detail.orderStatus] || detail.orderStatus}
                        </span>
                    </div>

                    {/* Showroom & Pricing Info Grid */}
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 text-xs">
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                            <p className="font-bold text-white uppercase tracking-wider text-[11px] mb-2">
                                Dealership & Visit
                            </p>
                            {detail.dealership && (
                                <>
                                    <p className="font-bold text-white text-sm">{detail.dealership.name}</p>
                                    <p className="text-zinc-400 mt-0.5">{detail.dealership.address}, {detail.dealership.city}</p>
                                    <p className="text-zinc-400 mt-0.5">{detail.dealership.phone} • {detail.dealership.openingHours}</p>
                                </>
                            )}
                            <div className="mt-3 border-t border-white/10 pt-2 text-orange-400 font-semibold">
                                Scheduled Visit: {detail.visitDate ? new Date(detail.visitDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : detail.customerDetails?.preferredVisitDate || "To be arranged"}
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                            <p className="font-bold text-white uppercase tracking-wider text-[11px] mb-2">
                                Financial & Payment Status
                            </p>
                            <p className="text-lg font-black text-orange-400">
                                Total: ₹{Number(detail.totalAmount).toLocaleString("en-IN")}
                            </p>
                            <p className="text-zinc-400 mt-0.5">
                                Ex-showroom: ₹{Number(detail.unitPrice).toLocaleString("en-IN")} • Road Tax: ₹{Number(detail.roadTax || detail.taxAmount).toLocaleString("en-IN")} • Insurance: ₹{Number(detail.insuranceAmount).toLocaleString("en-IN")}
                            </p>
                            <div className="mt-3 border-t border-white/10 pt-2">
                                <span className={`font-bold ${detail.paymentStatus === "paid" ? "text-emerald-400" : "text-yellow-400"}`}>
                                    Status: {detail.paymentStatus === "paid" ? `Paid (${detail.offlinePaymentType?.toUpperCase() || "OFFLINE"})` : "Pending Offline Payment"}
                                </span>
                                {detail.offlinePaymentReference && (
                                    <span className="text-zinc-400 ml-2">Ref: {detail.offlinePaymentReference}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Audit History Log */}
                    {detail.statusHistory?.length > 0 && (
                        <div className="mt-5 border-t border-white/10 pt-4">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                                Audit History & Status Changes
                            </p>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                {detail.statusHistory.map((h, i) => (
                                    <div key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                                        <span className="font-mono text-zinc-500 shrink-0">
                                            {new Date(h.at).toLocaleString("en-IN")}:
                                        </span>
                                        <span className="font-semibold text-white uppercase">{h.status}</span>
                                        {h.note && <span className="text-zinc-400">— {h.note}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Staff Actions Toolbar */}
                    <div className="mt-6 border-t border-white/10 pt-4 flex flex-wrap items-center gap-3">
                        {/* 1. Confirm or Reject when pending confirmation */}
                        {detail.orderStatus === "pending_dealership_confirmation" && (
                            <>
                                <button
                                    onClick={() => act(() => dealerConfirmOrder(detail._id), detail._id, "Confirm this purchase request and reserve vehicle stock")}
                                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-black transition"
                                >
                                    <Check size={14} /> Confirm Request & Reserve Stock
                                </button>
                                <button
                                    onClick={() => {
                                        const r = window.prompt("Reason for rejecting purchase request:");
                                        if (r !== null) act(() => dealerRejectOrder(detail._id, r || "Rejected by showroom"), detail._id);
                                    }}
                                    className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-4 py-2.5 text-xs font-bold text-red-400 transition"
                                >
                                    <X size={14} /> Reject Request
                                </button>
                            </>
                        )}

                        {/* 2. Verify Offline Payment when confirmed and pending payment */}
                        {detail.orderStatus === "confirmed" && detail.paymentStatus === "pending" && (
                            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-3">
                                <span className="text-xs font-bold text-white">Record Showroom Payment:</span>
                                <select
                                    value={payForm.type}
                                    onChange={(e) => setPayForm({ ...payForm, type: e.target.value })}
                                    aria-label="Offline payment method"
                                    className="rounded-xl border border-white/20 bg-[#111] px-3 py-2 text-xs font-bold text-white outline-none"
                                >
                                    {(detail.dealership?.acceptedPaymentMethods?.length
                                        ? detail.dealership.acceptedPaymentMethods
                                        : DEFAULT_METHODS
                                    ).map((m) => (
                                        <option key={m} value={m}>
                                            {m.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    value={payForm.ref}
                                    onChange={(e) => setPayForm({ ...payForm, ref: e.target.value })}
                                    placeholder="Receipt / Reference No"
                                    className="w-40 rounded-xl border border-white/20 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none"
                                />
                                <button
                                    onClick={() => setConfirmBox({ action: "verify" })}
                                    className="flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs font-extrabold text-black transition"
                                >
                                    <ShieldCheck size={14} /> Verify Payment
                                </button>
                            </div>
                        )}

                        {/* 3. Mark Ready for Collection once payment is paid */}
                        {detail.paymentStatus === "paid" && detail.orderStatus === "confirmed" && (
                            <button
                                onClick={() => act(() => updateOrderFulfilment(detail._id, { orderStatus: "ready_for_collection", note: "Vehicle prepped and ready for showroom pickup" }), detail._id, "Mark vehicle ready for collection")}
                                className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/[0.03] hover:border-orange-500/40 hover:text-orange-400 px-4 py-2.5 text-xs font-bold text-white transition"
                            >
                                <Package size={14} /> Mark Ready for Collection
                            </button>
                        )}

                        {/* 4. Mark Collected / Completed */}
                        {detail.orderStatus === "ready_for_collection" && (
                            <button
                                onClick={() => act(() => updateOrderFulfilment(detail._id, { orderStatus: "completed", note: "Handover completed; customer collected motorcycle" }), detail._id, "Mark order as completed / delivered")}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-black transition"
                            >
                                <Check size={14} /> Complete Handover / Delivered
                            </button>
                        )}

                        {/* 5. Cancel request if eligible */}
                        {["pending_dealership_confirmation", "confirmed"].includes(detail.orderStatus) && detail.paymentStatus !== "paid" && (
                            <button
                                onClick={() => {
                                    const r = window.prompt("Reason for cancelling this request:");
                                    if (r !== null) act(() => updateOrderFulfilment(detail._id, { orderStatus: "cancelled", reason: r || "Cancelled by staff" }), detail._id);
                                }}
                                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-red-400 transition"
                            >
                                Cancel Request
                            </button>
                        )}

                        <button
                            onClick={() => setDetail(null)}
                            className="ml-auto rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                        >
                            Close
                        </button>
                    </div>

                    {/* Verification confirmation prompt */}
                    {confirmBox?.action === "verify" && (
                        <div className="mt-4 rounded-2xl border border-orange-500/40 bg-orange-500/10 p-5">
                            <p className="text-sm font-bold text-white">
                                Confirm Payment Receipt:
                            </p>
                            <p className="text-xs text-zinc-300 mt-1">
                                Confirm that you have physically received payment of ₹{Number(detail.totalAmount).toLocaleString("en-IN")} via {payForm.type.toUpperCase()}{payForm.ref ? ` (Ref: ${payForm.ref})` : ""}?
                            </p>
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={() => act(() => verifyOfflineOrderPayment(detail._id, { offlinePaymentType: payForm.type, offlinePaymentReference: payForm.ref }), detail._id)}
                                    className="rounded-xl bg-orange-500 hover:bg-orange-600 px-5 py-2.5 text-xs font-extrabold text-black"
                                >
                                    Yes, Payment Received
                                </button>
                                <button
                                    onClick={() => setConfirmBox(null)}
                                    className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
