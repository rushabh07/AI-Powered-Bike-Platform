import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    X,
    MapPin,
    Phone,
    Clock,
    Calendar,
    ShoppingCart,
    Bike,
    CheckCircle,
    Navigation,
    Star,
} from "lucide-react";
import {
    getDealershipsByCity,
    createBikeEnquiry,
} from "../services/api";

const BuyPurchaseModal = ({ bike, selectedVariant, selectedColor, onClose }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState("type");
    const [enquiryType, setEnquiryType] = useState("");
    const [city, setCity] = useState("");
    const [dealerships, setDealerships] = useState([]);
    const [selectedDealership, setSelectedDealership] = useState(null);
    const [visitDate, setVisitDate] = useState("");
    const [timeSlot, setTimeSlot] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [licenceConfirmed, setLicenceConfirmed] = useState(false);
    const [notes, setNotes] = useState("");
    const [enquiryId, setEnquiryId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [loadingDealers, setLoadingDealers] = useState(false);

    const bikeColors = (bike?.colors || []).filter((c) => c.available !== false);
    const [activeColor, setActiveColor] = useState(selectedColor || bikeColors[0] || null);

    const exShowroom = selectedVariant?.exShowroomPrice || bike?.exShowroomPrice || bike?.price || 0;
    const insurance = Math.round(exShowroom * 0.03);
    const onRoad = activeColor?.image ? exShowroom + insurance + 5000 : exShowroom + insurance;

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");
            if (user?.name) setContactName(user.name);
            if (user?.phone) setContactPhone(user.phone);
            if (user?.email) setContactEmail(user.email);
        } catch {}
    }, []);

    useEffect(() => {
        setTimeSlot("");
    }, [selectedDealership]);

    const dealerReqId = useRef(0);

    const fetchDealers = async (cityName) => {
        if (!cityName || cityName.trim().length < 2) {
            setDealerships([]);
            return;
        }
        const reqId = ++dealerReqId.current;
        setLoadingDealers(true);
        try {
            const data = await getDealershipsByCity(cityName.trim());
            if (dealerReqId.current === reqId) {
                setDealerships(data.dealerships || []);
            }
        } catch (err) {
            if (dealerReqId.current === reqId) {
                setDealerships([]);
            }
        } finally {
            if (dealerReqId.current === reqId) {
                setLoadingDealers(false);
            }
        }
    };

    useEffect(() => {
        if (step !== "dealer" || !city || city.trim().length < 2) {
            return;
        }
        const timer = setTimeout(() => fetchDealers(city), 500);
        return () => clearTimeout(timer);
    }, [city, step]);

    const todayStr = new Date().toISOString().split("T")[0];

    const handleSubmit = async () => {
        if (!enquiryType || !city || !selectedDealership || !visitDate || !contactName.trim() || !contactPhone.trim()) {
            setError("Please fill all required fields.");
            return;
        }
        if (visitDate < todayStr) {
            setError("Visit date cannot be in the past.");
            return;
        }
        if (enquiryType === "test_ride" && !licenceConfirmed) {
            setError("Please confirm you hold a valid driving licence for the test ride.");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            const data = await createBikeEnquiry({
                motorcycleId: bike._id,
                variantId: selectedVariant?._id || null,
                color: activeColor?.name || "",
                colorHex: activeColor?.hexCode || "",
                enquiryType,
                dealershipId: selectedDealership._id,
                visitDate,
                timeSlot,
                contactName: contactName.trim(),
                contactPhone: contactPhone.trim(),
                contactEmail: contactEmail.trim(),
                licenceConfirmed: enquiryType === "test_ride" ? true : licenceConfirmed,
                notes,
            });
            setEnquiryId(data.enquiry?.enquiryId || "");
            setSuccess(true);
        } catch (err) {
            setError(err.message || "Failed to submit enquiry.");
        } finally {
            setSubmitting(false);
        }
    };

    const stockBadge = (s) => {
        if (s === "in_stock") return "In Stock";
        if (s === "limited") return "Limited Stock";
        if (s === "out_of_stock") return "Out of Stock";
        return "Stock on Request";
    };

    const bikeImage = activeColor?.image || bike?.images?.[0]?.url || bike?.image || "";

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0c0c0c]">
                {success ? (
                    <div className="p-8 text-center">
                        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
                            <CheckCircle size={40} className="text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-black text-white">Enquiry Submitted!</h3>
                        <p className="text-zinc-400 mt-3">
                            Your {enquiryType === "test_ride" ? "test ride" : "purchase"} enquiry has been submitted. The dealership will contact you shortly.
                        </p>
                        {enquiryId && (
                            <p className="mt-4 inline-block rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 font-mono text-sm text-orange-400">
                                {enquiryId}
                            </p>
                        )}
                        <p className="text-xs text-zinc-500 mt-4">
                            Your booking is <span className="text-yellow-400 font-bold">Pending</span> — it is not confirmed until the dealership approves it.
                            Final price, stock, financing, and payment must be confirmed at the dealership.
                        </p>
                        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                            <button onClick={() => { onClose(); navigate("/user/enquiries"); }} className="rounded-xl bg-orange-500 px-8 py-3 text-sm font-bold text-black transition hover:bg-orange-400">
                                View My Enquiries
                            </button>
                            <button onClick={onClose} className="rounded-xl border border-white/10 px-8 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5">
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h3 className="text-xl font-black text-white">
                                {step === "type" ? "Choose Enquiry Type" : "Dealership Details"}
                            </h3>
                            <button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            {error && (
                                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
                            )}

                            {step === "type" && (
                                <>
                                    <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                                        {bikeImage ? (
                                            <img src={bikeImage} alt={bike.name} className="h-20 w-20 rounded-xl object-cover" />
                                        ) : (
                                            <div className="h-20 w-20 rounded-xl bg-zinc-800 flex items-center justify-center">
                                                <Bike size={28} className="text-zinc-600" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold uppercase tracking-wider text-orange-500">{bike.brand}</p>
                                            <p className="font-bold text-white">{bike.name}</p>
                                            {selectedVariant && <p className="text-xs text-zinc-500">{selectedVariant.variantName}</p>}
                                            <p className="text-sm font-bold text-orange-400 mt-1">₹{Number(exShowroom).toLocaleString("en-IN")}</p>
                                        </div>
                                    </div>

                                    {bikeColors.length > 0 && (
                                        <div className="mb-6">
                                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Select Color</p>
                                            <div className="flex flex-wrap gap-2">
                                                {bikeColors.map((color) => (
                                                    <button
                                                        key={color._id || color.name}
                                                        onClick={() => setActiveColor(color)}
                                                        title={color.name}
                                                        className={`w-9 h-9 rounded-full border-2 transition-all ${activeColor?._id === color._id ? "border-orange-500 scale-110" : "border-white/20 hover:border-white/40"}`}
                                                        style={{ backgroundColor: color.hexCode }}
                                                    />
                                                ))}
                                            </div>
                                            {activeColor && <p className="mt-2 text-sm text-orange-400">{activeColor.name}</p>}
                                        </div>
                                    )}

                                    <p className="text-xs text-zinc-500 mb-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 px-4 py-3">
                                        The final motorcycle price, stock availability, financing options, documents, and payment must be confirmed directly at the dealership.
                                    </p>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <button
                                            onClick={() => { setEnquiryType("test_ride"); setStep("dealer"); }}
                                            className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-orange-500/30 hover:bg-orange-500/5"
                                        >
                                            <Bike size={28} className="text-orange-500" />
                                            <span className="font-bold text-white">Book a Test Ride</span>
                                            <span className="text-xs text-zinc-500 text-center">Experience the bike before you buy</span>
                                        </button>
                                        <button
                                            onClick={() => { setEnquiryType("purchase"); setStep("dealer"); }}
                                            className="flex flex-col items-center gap-2 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 transition hover:border-orange-500/40 hover:bg-orange-500/10"
                                        >
                                            <ShoppingCart size={28} className="text-orange-500" />
                                            <span className="font-bold text-white">Purchase at Dealership</span>
                                            <span className="text-xs text-zinc-500 text-center">Pay and complete purchase at showroom</span>
                                        </button>
                                    </div>
                                </>
                            )}

                            {step === "dealer" && (
                                <>
                                    <button onClick={() => setStep("type")} className="text-xs text-zinc-500 hover:text-white mb-4 transition">&larr; Back</button>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="block text-xs font-semibold text-zinc-400">
                                            City *
                                            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Enter city" className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" />
                                        </label>
                                        <label className="block text-xs font-semibold text-zinc-400">
                                            Visit Date *
                                            <input type="date" min={todayStr} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" />
                                        </label>
                                        <label className="block text-xs font-semibold text-zinc-400">
                                            Time Slot
                                            <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50">
                                                <option value="">Any available slot</option>
                                                {(selectedDealership?.timeSlots || ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM"]).map((s) => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="block text-xs font-semibold text-zinc-400">
                                            Contact Name *
                                            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" />
                                        </label>
                                        <label className="block text-xs font-semibold text-zinc-400">
                                            Contact Phone *
                                            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" />
                                        </label>
                                        <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
                                            Email (optional)
                                            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" />
                                        </label>
                                    </div>

                                    {enquiryType === "test_ride" && (
                                        <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 cursor-pointer">
                                            <input type="checkbox" checked={licenceConfirmed} onChange={(e) => setLicenceConfirmed(e.target.checked)} className="mt-1 rounded" />
                                            <span className="text-xs text-zinc-300">
                                                I confirm I hold a valid motorcycle driving licence for this test ride. *
                                            </span>
                                        </label>
                                    )}

                                    {city && (
                                        <div className="mt-4">
                                            <p className="text-xs font-semibold text-zinc-400 mb-2">Select Dealership *</p>
                                            {loadingDealers ? (
                                                <div className="flex items-center justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" /></div>
                                            ) : dealerships.length === 0 ? (
                                                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-300">
                                                    No authorized dealerships found in {city}. Please try another city.
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                                    {dealerships.map((d) => (
                                                        <button
                                                            key={d._id}
                                                            onClick={() => setSelectedDealership(d)}
                                                            className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition ${selectedDealership?._id === d._id ? "border-orange-500 bg-orange-500/5" : "border-white/10 hover:border-white/25"}`}
                                                        >
                                                            <MapPin size={16} className="text-orange-500 mt-0.5 shrink-0" />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="font-bold text-sm text-white">{d.name}</p>
                                                                    <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-400">{stockBadge(d.stockStatus)}</span>
                                                                </div>
                                                                {d.brands && d.brands.length > 0 && (
                                                                    <p className="text-[11px] text-orange-400/80 mt-0.5">{d.brands.join(" • ")}</p>
                                                                )}
                                                                <p className="text-xs text-zinc-500 mt-0.5">{d.address}</p>
                                                                <div className="flex flex-wrap items-center gap-3 mt-1">
                                                                    <span className="flex items-center gap-1 text-xs text-zinc-400"><Phone size={11} />{d.phone}</span>
                                                                    <span className="flex items-center gap-1 text-xs text-zinc-400"><Clock size={11} />{d.openingHours}</span>
                                                                    {d.googleMapsUrl && (
                                                                        <a href={d.googleMapsUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-400">
                                                                            <Navigation size={11} /> Directions
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {selectedDealership?._id === d._id && <CheckCircle size={16} className="text-orange-500 shrink-0" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <label className="block text-xs font-semibold text-zinc-400 mt-4">
                                        Notes (optional)
                                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any questions or requirements..." className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50 resize-none" />
                                    </label>

                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="mt-6 w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                                    >
                                        {submitting ? "Submitting..." : "Submit Enquiry"}
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default BuyPurchaseModal;
