import { Plus, Trash2 } from "lucide-react";

const inputClass = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50";
const labelClass = "block text-[11px] font-semibold text-zinc-400";

export default function RegionalPriceFields({ value = [], onChange }) {
    const update = (index, key, fieldValue) => onChange(value.map((row, i) => i === index ? { ...row, [key]: fieldValue } : row));
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h5 className="text-sm font-bold text-white">Regional on-road pricing</h5><p className="mt-1 text-[11px] text-zinc-500">Configure RTO, insurance, and other charges for each city.</p></div>
                <button type="button" onClick={() => onChange([...value, { state: "", city: "", roadTax: "", insuranceAmount: "", otherCharges: "0" }])} className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs font-bold text-orange-400 hover:bg-orange-500/20"><Plus size={14} />Add city</button>
            </div>
            {value.length === 0 && <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-zinc-500">No city-specific charges configured. Customers will see clearly labeled estimates.</p>}
            {value.map((row, index) => <div key={`city-price-${index}`} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_repeat(3,minmax(110px,1fr))_auto] lg:items-end">
                <label className={labelClass}>State *<input className={`${inputClass} mt-1.5`} value={row.state || ""} maxLength={80} onChange={(event) => update(index, "state", event.target.value)} placeholder="Maharashtra" /></label>
                <label className={labelClass}>City *<input className={`${inputClass} mt-1.5`} value={row.city || ""} maxLength={80} onChange={(event) => update(index, "city", event.target.value)} placeholder="Pune" /></label>
                <label className={labelClass}>RTO / registration (₹) *<input className={`${inputClass} mt-1.5`} type="number" min="0" step="1" value={row.roadTax ?? ""} onChange={(event) => update(index, "roadTax", event.target.value)} placeholder="0" /></label>
                <label className={labelClass}>Insurance (₹)<input className={`${inputClass} mt-1.5`} type="number" min="0" step="1" value={row.insuranceAmount ?? ""} onChange={(event) => update(index, "insuranceAmount", event.target.value)} placeholder="Auto estimate" /></label>
                <label className={labelClass}>Other charges (₹)<input className={`${inputClass} mt-1.5`} type="number" min="0" step="1" value={row.otherCharges ?? "0"} onChange={(event) => update(index, "otherCharges", event.target.value)} placeholder="0" /></label>
                <button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label={`Remove ${row.city || "city"} pricing`} className="justify-self-end rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={16} /></button>
            </div>)}
        </div>
    );
}
