import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import RegionalPriceFields from "./RegionalPriceFields";
import { updateMotorcycleRegionalPricing } from "../../services/api";
import { stateForCity } from "../../context/RegionContext";

const normalize = (value) => String(value || "").trim().toLowerCase();

export default function RegionalPricingManager({ motorcycleId, initialCityPrices = [] }) {
    const [prices, setPrices] = useState(initialCityPrices);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => setPrices((initialCityPrices || []).map((row) => ({ ...row, state: row.state || stateForCity(row.city) }))), [motorcycleId, initialCityPrices]);

    const save = async () => {
        setError("");
        setSuccess("");
        const keys = prices.map((row) => `${normalize(row.state)}|${normalize(row.city)}`);
        if (prices.some((row) => !normalize(row.state) || !normalize(row.city))) return setError("Enter a state and city for every regional price.");
        if (new Set(keys).size !== keys.length) return setError("Each state and city combination must be unique.");
        if (prices.some((row) => !Number.isFinite(Number(row.roadTax)) || Number(row.roadTax) < 0 || [row.insuranceAmount, row.otherCharges].some((amount) => amount !== "" && amount != null && (!Number.isFinite(Number(amount)) || Number(amount) < 0)))) return setError("Charges must be non-negative numbers.");
        const payload = prices.map((row) => ({
            state: row.state.trim(), city: row.city.trim(), roadTax: Number(row.roadTax),
            insuranceAmount: row.insuranceAmount === "" || row.insuranceAmount == null ? null : Number(row.insuranceAmount),
            otherCharges: row.otherCharges === "" || row.otherCharges == null ? 0 : Number(row.otherCharges),
        }));
        try {
            setSaving(true);
            await updateMotorcycleRegionalPricing(motorcycleId, payload);
            setPrices(payload);
            setSuccess("Regional pricing saved.");
        } catch (err) {
            setError(err.message || "Could not save regional pricing.");
        } finally {
            setSaving(false);
        }
    };

    return <section className="space-y-4 rounded-2xl border border-orange-500/20 bg-orange-500/[0.03] p-4 sm:p-5 lg:col-span-2">
        <RegionalPriceFields value={prices} onChange={setPrices} />
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {success && <p role="status" className="text-sm text-emerald-300">{success}</p>}
        <div className="flex justify-end"><button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-orange-400 disabled:opacity-60">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{saving ? "Saving…" : "Save regional pricing"}</button></div>
    </section>;
}
