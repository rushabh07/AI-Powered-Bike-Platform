import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
    createMotorcycleVariant,
    deleteMotorcycleVariant,
    getAdminMotorcycleVariants,
    updateMotorcycleVariant,
} from "../../services/api";
import RegionalPriceFields from "./RegionalPriceFields";
import { stateForCity } from "../../context/RegionContext";

const emptyForm = () => ({
    variantName: "", variantCode: "", modelYear: new Date().getFullYear(), color: "",
    exShowroomPrice: "", onRoadPrice: "", engine: "", mileage: "", power: "",
    fuel: "Petrol", transmission: "Manual", isAvailable: true, description: "", images: [], cityPrices: [],
});

const fieldClass = "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50";
const labelClass = "block text-xs font-semibold text-zinc-400";

export default function MotorcycleVariantManager({ motorcycleId }) {
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [showEditor, setShowEditor] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadVariants = async () => {
        try {
            setLoading(true);
            const data = await getAdminMotorcycleVariants(motorcycleId);
            setVariants(data.variants || []);
            setError("");
        } catch (err) {
            setError(err.message || "Could not load variants.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { loadVariants(); }, [motorcycleId]);

    const change = (event) => {
        const { name, value, type, checked } = event.target;
        setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    };
    const startAdd = () => {
        setEditingId(null);
        setForm(emptyForm());
        setError("");
        setSuccess("");
        setShowEditor(true);
    };
    const startEdit = (variant) => {
        setEditingId(variant._id);
        setForm({
            ...emptyForm(), ...variant,
            modelYear: variant.modelYear || "",
            onRoadPrice: variant.onRoadPrice ?? "",
            images: Array.isArray(variant.images) ? variant.images : [],
            cityPrices: Array.isArray(variant.cityPrices) ? variant.cityPrices.map((row) => ({ ...row, state: row.state || stateForCity(row.city) })) : [],
        });
        setError("");
        setSuccess("");
        setShowEditor(true);
    };

    const save = async () => {
        setError("");
        setSuccess("");
        if (!form.variantName.trim()) return setError("Enter a variant name.");
        if (!Number.isInteger(Number(form.modelYear)) || Number(form.modelYear) < 1900 || Number(form.modelYear) > 2200) return setError("Enter a valid model year.");
        if (!Number.isFinite(Number(form.exShowroomPrice)) || Number(form.exShowroomPrice) <= 0) return setError("Enter a valid ex-showroom price.");
        const numeric = (value) => value === "" || value == null ? null : Number(value);
        const payload = {
            motorcycle: motorcycleId,
            variantName: form.variantName.trim(),
            variantCode: form.variantCode.trim(),
            modelYear: Number(form.modelYear),
            color: form.color.trim(),
            exShowroomPrice: Number(form.exShowroomPrice),
            onRoadPrice: numeric(form.onRoadPrice),
            cityPrices: form.cityPrices.map((row) => ({
                state: row.state.trim(), city: row.city.trim(), roadTax: Number(row.roadTax),
                insuranceAmount: row.insuranceAmount === "" || row.insuranceAmount == null ? null : Number(row.insuranceAmount),
                otherCharges: row.otherCharges === "" || row.otherCharges == null ? 0 : Number(row.otherCharges),
            })),
            engine: numeric(form.engine) ?? 0,
            mileage: numeric(form.mileage) ?? 0,
            power: numeric(form.power) ?? 0,
            fuel: form.fuel,
            transmission: form.transmission,
            isAvailable: !!form.isAvailable,
            description: form.description.trim(),
            images: form.images.filter((image) => image.url?.trim()).map((image, index) => ({
                url: image.url.trim(), label: (image.label || `View ${index + 1}`).trim(),
            })),
        };
        try {
            setSaving(true);
            if (editingId) await updateMotorcycleVariant(editingId, payload);
            else await createMotorcycleVariant(payload);
            await loadVariants();
            setShowEditor(false);
            setEditingId(null);
            setForm(emptyForm());
            setSuccess(editingId ? "Variant updated." : "Variant added.");
        } catch (err) {
            setError(err.message || "Could not save variant.");
        } finally {
            setSaving(false);
        }
    };
    const remove = async (variant) => {
        if (!window.confirm(`Remove ${variant.variantName}?`)) return;
        setError("");
        setSuccess("");
        try {
            setDeletingId(variant._id);
            await deleteMotorcycleVariant(variant._id);
            setVariants((current) => current.filter((item) => item._id !== variant._id));
            setSuccess(`${variant.variantName} removed.`);
            if (editingId === variant._id) setShowEditor(false);
        } catch (err) {
            setError(err.message || "Could not remove variant.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <section className="space-y-4 rounded-2xl border border-orange-500/20 bg-orange-500/[0.03] p-4 sm:p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h4 className="font-bold text-white">Motorcycle Variants</h4><p className="mt-1 text-xs text-zinc-500">Manage prices, specifications, colors, and images for this motorcycle.</p></div>
                <button type="button" onClick={startAdd} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3.5 py-2.5 text-xs font-bold text-black transition hover:bg-orange-400"><Plus size={15} />Add Variant</button>
            </div>
            {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            {success && <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{success}</p>}
            {loading ? <p className="flex items-center gap-2 py-2 text-sm text-zinc-400"><Loader2 size={15} className="animate-spin" />Loading variants…</p> : variants.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-zinc-500">No variants added yet.</p> : (
                <div className="grid gap-3 md:grid-cols-2">
                    {variants.map((variant) => <article key={variant._id} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        {variant.images?.[0]?.url ? <img src={variant.images[0].url} alt={`${variant.variantName} preview`} className="h-16 w-20 shrink-0 rounded-lg border border-white/10 object-cover" /> : <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-600"><ImagePlus size={20} /></div>}
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{variant.variantName}{variant.modelYear ? ` · ${variant.modelYear}` : ""}</p><p className="truncate text-xs text-zinc-400">{variant.color || "No color"} · ₹{Number(variant.exShowroomPrice || 0).toLocaleString("en-IN")}</p><p className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${variant.isAvailable ? "text-emerald-400" : "text-zinc-500"}`}>{variant.isAvailable ? "Available" : "Unavailable"}</p></div>
                        <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => startEdit(variant)} aria-label={`Edit ${variant.variantName}`} className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"><Pencil size={15} /></button><button type="button" disabled={deletingId === variant._id} onClick={() => remove(variant)} aria-label={`Remove ${variant.variantName}`} className="rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"><Trash2 size={15} /></button></div>
                    </article>)}
                </div>
            )}
            {showEditor && <div className="space-y-4 rounded-xl border border-white/10 bg-[#090909] p-4 sm:p-5">
                <div className="flex items-center justify-between"><h5 className="font-bold text-orange-400">{editingId ? "Edit Variant" : "New Variant"}</h5><button type="button" onClick={() => setShowEditor(false)} aria-label="Close variant editor" className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"><X size={17} /></button></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className={labelClass}>Variant name *<input className={`${fieldClass} mt-1.5`} name="variantName" value={form.variantName} onChange={change} maxLength={100} placeholder="ABS / Standard / Pro" /></label>
                    <label className={labelClass}>Model year *<input className={`${fieldClass} mt-1.5`} name="modelYear" type="number" min="1900" max="2200" value={form.modelYear} onChange={change} /></label>
                    <label className={labelClass}>Variant code<input className={`${fieldClass} mt-1.5`} name="variantCode" value={form.variantCode} onChange={change} placeholder="Optional SKU" /></label>
                    <label className={labelClass}>Color<input className={`${fieldClass} mt-1.5`} name="color" value={form.color} onChange={change} placeholder="Matte Black" /></label>
                    <label className={labelClass}>Ex-showroom price (₹) *<input className={`${fieldClass} mt-1.5`} name="exShowroomPrice" type="number" min="1" step="1" value={form.exShowroomPrice} onChange={change} placeholder="150000" /></label>
                    <label className={labelClass}>On-road price (₹)<input className={`${fieldClass} mt-1.5`} name="onRoadPrice" type="number" min="0" step="1" value={form.onRoadPrice} onChange={change} placeholder="Optional / city specific" /></label>
                    <label className={labelClass}>Engine capacity (cc)<input className={`${fieldClass} mt-1.5`} name="engine" type="number" min="0" step="1" value={form.engine} onChange={change} /></label>
                    <label className={labelClass}>Mileage (km/l)<input className={`${fieldClass} mt-1.5`} name="mileage" type="number" min="0" step="0.1" value={form.mileage} onChange={change} /></label>
                    <label className={labelClass}>Power (HP)<input className={`${fieldClass} mt-1.5`} name="power" type="number" min="0" step="0.1" value={form.power} onChange={change} /></label>
                    <label className={labelClass}>Fuel type<select className={`${fieldClass} mt-1.5`} name="fuel" value={form.fuel} onChange={change}><option>Petrol</option><option>Electric</option><option>Hybrid</option><option>Diesel</option></select></label>
                    <label className={labelClass}>Transmission<select className={`${fieldClass} mt-1.5`} name="transmission" value={form.transmission} onChange={change}><option>Manual</option><option>Automatic</option><option>AMT</option><option>CVT</option></select></label>
                    <label className="flex items-center gap-2 self-end pb-2 text-sm text-zinc-300"><input type="checkbox" name="isAvailable" checked={!!form.isAvailable} onChange={change} className="accent-orange-500" />Available for purchase</label>
                </div>
                <label className={`${labelClass} block`}>Description<textarea className={`${fieldClass} mt-1.5 resize-y`} name="description" rows="2" maxLength={2000} value={form.description} onChange={change} placeholder="Variant-specific details" /></label>
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className={labelClass}>Variant images</p><button type="button" onClick={() => setForm((current) => ({ ...current, images: [...current.images, { url: "", label: `View ${current.images.length + 1}` }] }))} className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs font-bold text-orange-400 hover:bg-orange-500/20"><ImagePlus size={14} />Add image</button></div>
                    {form.images.map((image, index) => <div key={`variant-image-${index}`} className="grid gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-[88px_1fr_1fr_auto] sm:items-center">
                        {image.url ? <img src={image.url} alt={image.label || `Variant view ${index + 1}`} className="h-16 w-[88px] rounded-lg object-cover" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} /> : <div className="flex h-16 w-[88px] items-center justify-center rounded-lg bg-white/[0.03] text-zinc-600"><ImagePlus size={18} /></div>}
                        <input className={fieldClass} aria-label="Variant image URL" type="url" placeholder="https:// image URL" value={image.url || ""} onChange={(event) => setForm((current) => ({ ...current, images: current.images.map((item, i) => i === index ? { ...item, url: event.target.value } : item) }))} />
                        <input className={fieldClass} aria-label="Image label" placeholder="Side view" value={image.label || ""} onChange={(event) => setForm((current) => ({ ...current, images: current.images.map((item, i) => i === index ? { ...item, label: event.target.value } : item) }))} />
                        <button type="button" onClick={() => setForm((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) }))} aria-label="Remove image" className="justify-self-end rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={16} /></button>
                    </div>)}
                </div>
                <RegionalPriceFields value={form.cityPrices} onChange={(cityPrices) => setForm((current) => ({ ...current, cityPrices }))} />
                {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowEditor(false)} disabled={saving} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5">Cancel</button><button type="button" onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-orange-400 disabled:opacity-60">{saving && <Loader2 size={15} className="animate-spin" />}{saving ? "Saving…" : editingId ? "Save variant" : "Add variant"}</button></div>
            </div>}
        </section>
    );
}
