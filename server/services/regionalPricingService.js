const DEFAULT_RTO_RATE = 0.1;
const DEFAULT_INSURANCE_RATE = 0.03;
const DEFAULT_REGION = { state: "Maharashtra", city: "Pune" };

const normalized = (value) => String(value || "").trim().toLowerCase();

const calculateRegionalPricing = ({ exShowroomPrice, cityPrices = [], state = DEFAULT_REGION.state, city = DEFAULT_REGION.city }) => {
    const base = Math.max(0, Number(exShowroomPrice) || 0);
    const requestedCity = String(city || "").trim();
    const requestedState = String(state || "").trim();
    const entry = (cityPrices || []).find((item) =>
        normalized(item.city) === normalized(requestedCity) &&
        (!item.state || !requestedState || normalized(item.state) === normalized(requestedState))
    );
    const isFallback = !entry || entry.insuranceAmount == null;
    const rtoCharges = entry ? Number(entry.roadTax) || 0 : Math.round(base * DEFAULT_RTO_RATE);
    const insuranceCharges = entry?.insuranceAmount != null
        ? Number(entry.insuranceAmount)
        : Math.round(base * DEFAULT_INSURANCE_RATE);
    const otherCharges = entry ? Number(entry.otherCharges) || 0 : 0;

    return {
        state: requestedState,
        city: requestedCity,
        exShowroomPrice: base,
        rtoCharges,
        insuranceCharges,
        otherCharges,
        onRoadPrice: base + rtoCharges + insuranceCharges + otherCharges,
        isFallback,
        label: isFallback ? `Estimated for ${requestedCity}` : `On-road in ${requestedCity}`,
    };
};

const validateRegionalPrices = (cityPrices) => {
    if (!Array.isArray(cityPrices)) return "Regional prices must be a list.";
    const seen = new Set();
    for (const item of cityPrices) {
        const state = normalized(item?.state);
        const city = normalized(item?.city);
        if (!state || !city) return "Every regional price needs a state and city.";
        const key = `${state}|${city}`;
        if (seen.has(key)) return `Duplicate regional price for ${item.state}, ${item.city}.`;
        seen.add(key);
        for (const field of ["roadTax", "insuranceAmount", "otherCharges"]) {
            const value = item[field];
            if (value == null && field !== "roadTax") continue;
            if (!Number.isFinite(Number(value)) || Number(value) < 0) return `${field} must be a non-negative number.`;
        }
    }
    return null;
};

module.exports = { calculateRegionalPricing, validateRegionalPrices, DEFAULT_REGION };
