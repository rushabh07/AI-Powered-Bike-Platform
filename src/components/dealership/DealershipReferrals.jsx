import { useCallback, useEffect, useState } from "react";
import { PhoneCall, RefreshCw, Save, Bike, CalendarDays } from "lucide-react";

const API = "/api";
const statuses = ["new", "contacted", "visit_scheduled", "negotiation", "converted", "rejected", "expired"];

const DealershipReferrals = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [saving, setSaving] = useState("");
    const [saleFor, setSaleFor] = useState("");
    const [sale, setSale] = useState({ customerName: "", customerPhone: "", amount: "", invoiceNo: "", saleAmountMeaning: "final_invoice", paymentMethod: "upi", evidenceUrl: "" });

    const request = async (path, options = {}) => {
        const response = await fetch(`${API}${path}`, {
            ...options,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}`, ...(options.headers || {}) },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Request failed.");
        return data;
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const query = new URLSearchParams({ limit: "50", ...(statusFilter ? { status: statusFilter } : {}) });
            const data = await request(`/provider/referrals?${query}`);
            setItems(data.referrals || []);
        } catch (err) {
            setError(err.message || "Could not load referrals.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    const update = async (referral, body, path = `/provider/referrals/${referral._id}/status`) => {
        setSaving(referral._id);
        setError("");
        try {
            await request(path, { method: path.endsWith("/contact-attempt") ? "POST" : "PATCH", body: JSON.stringify(body) });
            await load();
        } catch (err) {
            setError(err.message || "Could not update referral.");
        } finally { setSaving(""); }
    };

    const submitSale = async (referral) => {
        setSaving(referral._id);
        setError("");
        try {
            await request("/provider/sales", { method: "POST", body: JSON.stringify({
                referralId: referral._id,
                dealershipId: referral.dealership?._id || referral.dealership,
                motorcycleId: referral.motorcycle?._id || referral.motorcycle,
                motorcycleName: referral.motorcycle?.name || referral.variantName || "",
                customerName: sale.customerName || referral.contact?.name || "",
                customerPhone: sale.customerPhone || referral.contact?.phone || "",
                amount: Number(sale.amount), invoiceNo: sale.invoiceNo,
                saleAmountMeaning: sale.saleAmountMeaning,
                paymentMethod: sale.paymentMethod,
                evidenceUrl: sale.evidenceUrl,
            }) });
            setSaleFor("");
            setSale({ customerName: "", customerPhone: "", amount: "", invoiceNo: "", saleAmountMeaning: "final_invoice", paymentMethod: "upi", evidenceUrl: "" });
            await load();
        } catch (err) {
            setError(err.message || "Could not submit the sale.");
        } finally { setSaving(""); }
    };

    return <div className="space-y-4">
        {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white">
                <option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select>
            <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-300"><RefreshCw size={15} />Refresh</button>
        </div>
        {loading ? <div className="space-y-3">{[1, 2, 3].map((n) => <div key={n} className="h-32 animate-pulse rounded-2xl bg-zinc-900" />)}</div>
            : items.length === 0 ? <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 py-12 text-center text-sm text-zinc-500">No referrals assigned yet.</div>
                : <div className="space-y-3">{items.map((referral) => <article key={referral._id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><p className="font-mono text-xs text-orange-400">{referral.referralCode}</p>
                            <h3 className="mt-1 font-bold text-white">{referral.motorcycle?.brand} {referral.motorcycle?.name}{referral.variantName ? ` · ${referral.variantName}` : ""}</h3>
                            <p className="mt-1 text-xs text-zinc-400">{referral.consentToShare ? (referral.contact?.name || referral.customer?.name || "Customer") : "Customer contact not shared"}{referral.consentToShare && referral.contact?.phone ? ` · ${referral.contact.phone}` : ""}</p>
                            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500"><span className="inline-flex items-center gap-1"><CalendarDays size={13} />{new Date(referral.createdAt).toLocaleDateString()}</span><span>Expires {new Date(referral.expiresAt).toLocaleDateString()}</span><span>Source: {referral.source?.replaceAll("_", " ")}</span></p>
                        </div>
                        <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold capitalize text-orange-300">{referral.status?.replaceAll("_", " ")}</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                        <label className="text-xs text-zinc-500">Referral status<select disabled={Boolean(referral.sale)} value={referral.status} onChange={(event) => update(referral, { status: event.target.value, note: "Updated by dealership" })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-white disabled:opacity-50">{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
                        <button disabled={saving === referral._id} onClick={() => update(referral, { channel: "call", note: "Contact attempt recorded" }, `/provider/referrals/${referral._id}/contact-attempt`)} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 disabled:opacity-50"><PhoneCall size={15} />Log call</button>
                        {!referral.sale && <button onClick={() => { setSaleFor(saleFor === referral._id ? "" : referral._id); setSale({ customerName: referral.contact?.name || "", customerPhone: referral.contact?.phone || "", amount: "", invoiceNo: "", saleAmountMeaning: "final_invoice", paymentMethod: "upi", evidenceUrl: "" }); }} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-black"><Bike size={15} />Submit sale</button>}
                    </div>
                    <label className="mt-3 block text-xs text-zinc-500">Follow-up notes<textarea defaultValue={referral.notes || ""} key={`${referral._id}-${referral.updatedAt}`} rows={2} maxLength={2000} onBlur={(event) => { if (event.target.value !== (referral.notes || "")) update(referral, { notes: event.target.value }, `/provider/referrals/${referral._id}/notes`); }} className="mt-1 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200" placeholder="Add private dealership follow-up notes" /></label>
                    {saleFor === referral._id && <div className="mt-4 rounded-xl border border-orange-500/20 bg-black/40 p-4">
                        <h4 className="mb-3 text-sm font-bold text-white">Submit completed offline sale</h4>
                        <p className="mb-3 text-xs text-zinc-500">The sale will remain pending until MOTOAI admin verifies the invoice and details.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {[ ["Customer name", "customerName"], ["Customer phone", "customerPhone"], ["Sale amount (₹)", "amount"], ["Invoice number", "invoiceNo"], ["Invoice evidence URL", "evidenceUrl"] ].map(([label, field]) => <label key={field} className="text-xs text-zinc-500">{label}<input value={sale[field]} onChange={(event) => setSale({ ...sale, [field]: event.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white" /></label>)}
                            <label className="text-xs text-zinc-500">Amount means<select value={sale.saleAmountMeaning} onChange={(event) => setSale({ ...sale, saleAmountMeaning: event.target.value })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"><option value="final_invoice">Final invoice total</option><option value="ex_showroom">Ex-showroom price</option></select></label>
                        </div>
                        <div className="mt-3 flex justify-end"><button disabled={saving === referral._id || !sale.customerName || !sale.customerPhone || !Number(sale.amount) || !sale.invoiceNo} onClick={() => submitSale(referral)} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"><Save size={15} />{saving === referral._id ? "Submitting…" : "Submit for verification"}</button></div>
                    </div>}
                </article>)}</div>}
    </div>;
};

export default DealershipReferrals;
