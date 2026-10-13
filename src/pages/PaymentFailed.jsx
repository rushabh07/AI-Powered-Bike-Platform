import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { XCircle, RefreshCw, ArrowLeft, AlertTriangle } from "lucide-react";
import Navbar from "../components/Navbar";

const PaymentFailed = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { orderId } = location.state || {};

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar activeTab="motorcycles" showTokens={true} />

            <main className="max-w-2xl mx-auto px-5 sm:px-8 py-12">
                <div className="text-center mb-8">
                    <div className="mx-auto w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <XCircle size={48} className="text-amber-400" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight">
                        Payment Failed
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Something went wrong while processing your payment.
                    </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
                    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                        <AlertTriangle
                            size={18}
                            className="text-amber-400 shrink-0 mt-0.5"
                        />
                        <div>
                            <p className="text-sm font-semibold text-amber-300">
                                Your order has not been marked as paid.
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                                No money has been deducted. You can retry the
                                payment or go back to checkout.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                    {orderId && (
                        <Link
                            to={`/payment/${orderId}`}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black transition hover:bg-orange-400"
                        >
                            <RefreshCw size={16} />
                            Try Payment Again
                        </Link>
                    )}
                    <Link
                        to="/motorcycles"
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3.5 text-sm font-bold transition hover:border-orange-500/40 hover:text-orange-400"
                    >
                        <ArrowLeft size={16} />
                        Back to Motorcycles
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default PaymentFailed;
