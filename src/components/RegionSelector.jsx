import { useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { useRegion } from "../context/RegionContext";

export default function RegionSelector({ mobile = false }) {
    const { region, setRegion, regions } = useRegion();
    const [open, setOpen] = useState(false);

    return (
        <div className={`relative ${mobile ? "w-full" : "shrink-0"}`}>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={`Selected region: ${region.city}, ${region.state}. Change region`}
                className={`flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-zinc-200 transition hover:border-orange-500/40 hover:bg-orange-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${mobile ? "w-full justify-between" : "max-w-36 xl:max-w-40"}`}
            >
                <MapPin size={16} className="shrink-0 text-orange-400" aria-hidden="true" />
                <span className="min-w-0 truncate text-xs font-semibold">{region.city}</span>
                <ChevronDown size={13} className={`shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {open && <div role="dialog" aria-label="Choose your region" className={`${mobile ? "static mt-2 w-full" : "absolute right-0 top-[calc(100%+0.6rem)] w-72"} z-[70] rounded-2xl border border-white/10 bg-[#101012] p-4 shadow-2xl shadow-black/40`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">Your region</p>
                <label className="mb-3 block text-xs font-medium text-zinc-400">State
                    <select value={region.state} onChange={(event) => {
                        const selected = regions.find((item) => item.state === event.target.value);
                        setRegion({ state: selected.state, city: selected.cities[0] });
                    }} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50">
                        {regions.map((item) => <option key={item.state} value={item.state}>{item.state}</option>)}
                    </select>
                </label>
                <label className="block text-xs font-medium text-zinc-400">City
                    <select value={region.city} onChange={(event) => setRegion({ ...region, city: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50">
                        {regions.find((item) => item.state === region.state)?.cities.map((city) => <option key={city} value={city}>{city}</option>)}
                    </select>
                </label>
                <p className="mt-3 text-[11px] text-zinc-500">Prices show estimates when local charges are not configured.</p>
                <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-black hover:bg-orange-400">Done</button>
            </div>}
        </div>
    );
}
