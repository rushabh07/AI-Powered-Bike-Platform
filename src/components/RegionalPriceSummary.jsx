const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function RegionalPriceSummary({ pricing, compact = false, className = "" }) {
    if (!pricing) return null;
    return (
        <div className={className}>
            <p className="text-lg font-black text-white">{money(pricing.onRoadPrice)}</p>
            <p className={`text-[11px] font-semibold ${pricing.isFallback ? "text-amber-400" : "text-orange-400"}`}>
                {pricing.label || `On-road in ${pricing.city}`}
            </p>
            {!compact && <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/10 pt-3 text-xs text-zinc-400">
                <span>Ex-showroom</span><span className="text-right text-zinc-200">{money(pricing.exShowroomPrice)}</span>
                <span>RTO / registration</span><span className="text-right text-zinc-200">{money(pricing.rtoCharges)}</span>
                <span>Insurance</span><span className="text-right text-zinc-200">{money(pricing.insuranceCharges)}</span>
                <span>Other charges</span><span className="text-right text-zinc-200">{money(pricing.otherCharges)}</span>
                {pricing.isFallback && <p className="col-span-2 mt-1 text-[10px] leading-relaxed text-amber-400/80">Local charges are not configured. This is an estimate, not an exact city quote.</p>}
            </div>}
        </div>
    );
}
