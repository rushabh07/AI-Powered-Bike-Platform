// Reusable motorcycle spec formatters.
// Missing/invalid values → "Not available" (never undefined/null/NaN).

export const NA = "Not available";

const num = (v) =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

export const formatPrice = (price) => {
    const v = num(price);
    if (v == null) return NA;
    if (v >= 100000) return `₹${(v / 100000).toFixed(2)} Lakh`;
    return `₹${v.toLocaleString("en-IN")}`;
};

export const formatPriceFull = (price) => {
    const v = num(price);
    if (v == null) return NA;
    return `₹${v.toLocaleString("en-IN")}`;
};

export const formatEngine = (cc) => {
    const v = num(cc);
    return v ? `${v} CC` : NA;
};

export const formatMileage = (kmpl) => {
    const v = num(kmpl);
    return v ? `${v} KM/L` : NA;
};

export const formatPower = (hp) => {
    const v = num(hp);
    return v ? `${v} HP` : NA;
};

export const formatTorque = (nm) => {
    const v = num(nm);
    return v ? `${v} Nm` : NA;
};

export const formatRange = (km) => {
    const v = num(km);
    return v ? `${v} km` : NA;
};

export const formatBattery = (kwh) => {
    const v = num(kwh);
    return v ? `${v} kWh` : NA;
};

export const formatCharging = (hrs) => {
    const v = num(hrs);
    return v ? `${v} hrs` : NA;
};

export const formatTopSpeed = (kmh) => {
    const v = num(kmh);
    return v ? `${v} km/h` : NA;
};

export const formatWeight = (kg) => {
    const v = num(kg);
    return v ? `${v} kg` : NA;
};

export const formatRating = (rating) => {
    const v = num(rating);
    return v != null ? `⭐ ${v}` : NA;
};

export const isEV = (bike) =>
    String(bike?.category || "").toLowerCase() === "electric" ||
    String(bike?.fuel || "").toLowerCase() === "electric";
