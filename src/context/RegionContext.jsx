import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const REGIONS = [
    { state: "Maharashtra", cities: ["Pune", "Mumbai", "Nagpur"] },
    { state: "Delhi", cities: ["New Delhi", "Delhi"] },
    { state: "Karnataka", cities: ["Bengaluru", "Bangalore"] },
    { state: "Tamil Nadu", cities: ["Chennai"] },
    { state: "Telangana", cities: ["Hyderabad"] },
    { state: "West Bengal", cities: ["Kolkata"] },
    { state: "Gujarat", cities: ["Ahmedabad"] },
];

export const DEFAULT_REGION = { state: "Maharashtra", city: "Pune" };
export const stateForCity = (city) => REGIONS.find((item) => item.cities.some((candidate) => candidate.toLowerCase() === String(city || "").toLowerCase()))?.state || "";
const STORAGE_KEY = "motoai-region";
const RegionContext = createContext(null);

const normalizeRegion = (value) => {
    const state = REGIONS.find((item) => item.state === value?.state) || REGIONS[0];
    const city = state.cities.includes(value?.city) ? value.city : state.cities[0];
    return { state: state.state, city };
};

export const RegionProvider = ({ children }) => {
    const [region, setRegionState] = useState(() => {
        try { return normalizeRegion(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")); }
        catch { return DEFAULT_REGION; }
    });

    const setRegion = (value) => setRegionState(normalizeRegion(value));

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(region));
    }, [region]);

    useEffect(() => {
        const onStorage = (event) => {
            if (event.key !== STORAGE_KEY) return;
            try { setRegionState(normalizeRegion(JSON.parse(event.newValue || "null"))); }
            catch { setRegionState(DEFAULT_REGION); }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const value = useMemo(() => ({ region, setRegion, regions: REGIONS }), [region]);
    return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
};

export const useRegion = () => {
    const context = useContext(RegionContext);
    if (!context) throw new Error("useRegion must be used within RegionProvider");
    return context;
};
