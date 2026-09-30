import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    GitCompare,
    Search,
    Plus,
    X,
    Check,
    Bike,
    Sparkles,
    Save,
    AlertTriangle,
    ChevronDown,
} from "lucide-react";
import Navbar from "../components/Navbar";
import BrandLogo from "../components/BrandLogo";
import {
    ApiError,
    searchMotorcycles,
    getAllMotorcycles,
    getMotorcycle,
    createComparison,
} from "../services/api";
import {
    formatPrice,
    formatEngine,
    formatMileage,
    formatPower,
    formatTorque,
    formatRange,
    formatBattery,
    formatCharging,
    formatTopSpeed,
    formatWeight,
    formatRating,
    isEV,
} from "../utils/format";

const MAX_BIKES = 4;

// A spec row: label + per-bike { text, key }.
// key=null renders "Not available"; differing keys highlight cells.
const buildRows = (bikes) => {
    const anyEV = bikes.some(isEV);
    const anyPetrol = bikes.some((b) => !isEV(b));

    const cell = (bike, text, key) => ({
        text: text || NA,
        key: key === undefined ? (text ?? null) : key,
        missing: !text,
    });

    const sections = [
        {
            title: "Basic Information",
            rows: [
                {
                    label: "Brand",
                    cells: (b) => cell(b, b.brand, b.brand),
                },
                {
                    label: "Model",
                    cells: (b) => cell(b, b.name, b.name),
                },
                {
                    label: "Category",
                    cells: (b) => cell(b, b.category, b.category),
                },
                {
                    label: "Fuel Type",
                    cells: (b) => cell(b, b.fuel, b.fuel),
                },
                {
                    label: "Price",
                    cells: (b) => cell(b, formatPrice(b.price), b.price),
                },
                {
                    label: "Rating",
                    cells: (b) => cell(b, formatRating(b.rating), b.rating),
                },
            ],
        },
        {
            title: "Performance",
            rows: [
                ...(anyPetrol
                    ? [
                          {
                              label: "Engine",
                              cells: (b) =>
                                  cell(
                                      b,
                                      !isEV(b)
                                          ? formatEngine(b.engine)
                                          : null,
                                      !isEV(b) ? b.engine : "ev-na"
                                  ),
                          },
                      ]
                    : []),
                {
                    label: "Power",
                    cells: (b) => cell(b, formatPower(b.power), b.power),
                },
                {
                    label: "Torque",
                    cells: (b) => cell(b, formatTorque(b.torque), b.torque),
                },
                {
                    label: "Top Speed",
                    cells: (b) =>
                        cell(b, formatTopSpeed(b.topSpeed), b.topSpeed),
                },
                {
                    label: "Transmission",
                    cells: (b) => cell(b, b.transmission, b.transmission),
                },
            ],
        },
        ...(anyEV
            ? [
                  {
                      title: "Battery & Charging",
                      rows: [
                          {
                              label: "Battery",
                              cells: (b) =>
                                  cell(
                                      b,
                                      isEV(b)
                                          ? formatBattery(b.batteryCapacity)
                                          : null,
                                      isEV(b)
                                          ? b.batteryCapacity
                                          : "ice-na"
                                  ),
                          },
                          {
                              label: "Range",
                              cells: (b) =>
                                  cell(
                                      b,
                                      isEV(b)
                                          ? formatRange(b.range)
                                          : null,
                                      isEV(b) ? b.range : "ice-na"
                                  ),
                          },
                          {
                              label: "Charging Time",
                              cells: (b) =>
                                  cell(
                                      b,
                                      isEV(b)
                                          ? formatCharging(b.chargingTime)
                                          : null,
                                      isEV(b)
                                          ? b.chargingTime
                                          : "ice-na"
                                  ),
                          },
                      ],
                  },
              ]
            : []),
        {
            title: "Practical",
            rows: [
                ...(anyPetrol
                    ? [
                          {
                              label: "Mileage",
                              cells: (b) =>
                                  cell(
                                      b,
                                      !isEV(b)
                                          ? formatMileage(b.mileage)
                                          : null,
                                      !isEV(b) ? b.mileage : "ev-na"
                                  ),
                          },
                      ]
                    : []),
                {
                    label: "Weight",
                    cells: (b) => cell(b, formatWeight(b.weight), b.weight),
                },
            ],
        },
    ];

    return sections.map((s) => ({
        ...s,
        rows: s.rows.map((r) => {
            const cells = bikes.map((b) => r.cells(b));
            const keys = cells.map((c) => c.key);
            const differs =
                new Set(keys.map((k) => String(k))).size > 1;
            return { label: r.label, cells, differs };
        }),
    }));
};

export default function Compare() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [allBikes, setAllBikes] = useState([]);
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [bootLoading, setBootLoading] = useState(true);
    const [bootError, setBootError] = useState("");

    const [query, setQuery] = useState("");
    const [brand, setBrand] = useState("All");
    const [category, setCategory] = useState("All");
    const [fuel, setFuel] = useState("All");

    const [selected, setSelected] = useState([]);
    const [showTable, setShowTable] = useState(false);
    const [notice, setNotice] = useState("");
    const [saveMsg, setSaveMsg] = useState("");
    const [saving, setSaving] = useState(false);

    const tableRef = useRef(null);
    const debounceRef = useRef(null);

    // Boot: full list (filters) + preselected ?id=
    useEffect(() => {
        const boot = async () => {
            setBootLoading(true);
            setBootError("");
            try {
                const bikes = await getAllMotorcycles();
                setAllBikes(bikes);
                setResults(bikes);

                const preselect = searchParams.get("id");
                if (preselect) {
                    try {
                        const bike = await getMotorcycle(preselect);
                        setSelected([bike]);
                    } catch {
                        /* invalid id → ignore */
                    }
                }
            } catch (err) {
                setBootError(
                    err.message || "Unable to load motorcycles."
                );
            } finally {
                setBootLoading(false);
            }
        };
        boot();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounced backend search
    useEffect(() => {
        if (bootLoading) return;
        setSearching(true);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                const params = new URLSearchParams();
                if (query.trim()) params.set("search", query.trim());
                if (brand !== "All") params.set("brand", brand);
                if (category !== "All") params.set("category", category);
                const res = await fetch(
                    `http://localhost:5000/api/motorcycles?${params.toString()}`
                );
                if (!res.ok) throw new Error("Search failed");
                const data = await res.json();
                let list = data.motorcycles || [];
                if (fuel !== "All") {
                    list = list.filter(
                        (b) =>
                            String(b.fuel || "").toLowerCase() ===
                            fuel.toLowerCase()
                    );
                }
                setResults(list);
            } catch (err) {
                console.error("Compare search error:", err);
            } finally {
                setSearching(false);
            }
        }, 350);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, brand, category, fuel, bootLoading]);

    const brands = useMemo(() => {
        const set = new Set();
        allBikes.forEach((b) => b.brand && set.add(b.brand));
        return ["All", ...[...set].sort()];
    }, [allBikes]);

    const categories = useMemo(() => {
        const set = new Set();
        allBikes.forEach((b) => b.category && set.add(b.category));
        return ["All", ...[...set].sort()];
    }, [allBikes]);

    const fuels = useMemo(() => {
        const set = new Set();
        allBikes.forEach(
            (b) => b.fuel && set.add(b.fuel)
        );
        return ["All", ...[...set].sort()];
    }, [allBikes]);

    const selectedIds = useMemo(
        () => new Set(selected.map((b) => String(b._id))),
        [selected]
    );

    const addBike = (bike) => {
        setNotice("");
        if (selectedIds.has(String(bike._id))) {
            setNotice("This motorcycle is already selected.");
            return;
        }
        if (selected.length >= MAX_BIKES) {
            setNotice(
                `Maximum ${MAX_BIKES} motorcycles can be compared.`
            );
            return;
        }
        setSelected((prev) => [...prev, bike]);
    };

    const removeBike = (id) => {
        setNotice("");
        setSelected((prev) =>
            prev.filter((b) => String(b._id) !== String(id))
        );
    };

    const handleCompare = () => {
        if (selected.length < 2) {
            setNotice("Please select at least 2 motorcycles to compare.");
            return;
        }
        setNotice("");
        setShowTable(true);
        setTimeout(() => {
            tableRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
    };

    const handleSave = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login", { state: { from: "/compare" } });
            return;
        }
        if (selected.length < 2) {
            setSaveMsg("Select at least 2 motorcycles first.");
            return;
        }
        setSaving(true);
        setSaveMsg("");
        try {
            const data = await createComparison(
                selected.map((b) => b._id)
            );
            setSaveMsg(
                data.duplicate
                    ? "This comparison is already saved."
                    : "Comparison saved successfully."
            );
        } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) {
                setSaveMsg(err.message || "Could not save comparison.");
            }
        } finally {
            setSaving(false);
        }
    };

    const askMotoMind = () => {
        const names = selected.map((b) => ({
            brand: b.brand,
            name: b.name,
        }));
        navigate("/ai-advisor", {
            state: {
                askCompare: names,
                askText: `Compare ${names.map((n) => `${n.brand} ${n.name}`).join(", ")} — price, specs and which suits what riding?`,
            },
        });
    };

    const sections = useMemo(
        () => (selected.length >= 2 && showTable ? buildRows(selected) : []),
        [selected, showTable]
    );

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar activeTab="compare" />

            <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-orange-500">
                    <GitCompare size={15} />
                    Side-by-side
                </div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                    Compare Motorcycles
                </h1>
                <p className="mt-2 max-w-xl text-sm text-zinc-500">
                    Pick 2 to 4 motorcycles from the live showroom
                    database. Every spec below comes from MongoDB.
                </p>

                {bootLoading ? (
                    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="h-24 animate-pulse rounded-2xl bg-white/[0.04]"
                            />
                        ))}
                    </div>
                ) : bootError ? (
                    <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
                        <AlertTriangle
                            size={30}
                            className="mx-auto text-red-400"
                        />
                        <p className="mt-3 font-bold">
                            Unable to load motorcycles.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 rounded-xl border border-white/10 px-5 py-2.5 text-xs font-bold transition hover:border-orange-500/40 hover:text-orange-400"
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <>
                        {/* SELECTED CARDS */}
                        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {selected.map((bike) => {
                                const img =
                                    bike.image ||
                                    bike.images?.[0]?.url ||
                                    "";
                                return (
                                    <div
                                        key={bike._id}
                                        className="overflow-hidden rounded-2xl border border-orange-500/25 bg-[#0c0c0c]"
                                    >
                                        <div className="relative h-36 overflow-hidden bg-zinc-900">
                                            {img ? (
                                                <img
                                                    src={img}
                                                    alt={bike.name}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <Bike
                                                        size={34}
                                                        className="text-zinc-700"
                                                    />
                                                </div>
                                            )}
                                            <button
                                                onClick={() =>
                                                    removeBike(bike._id)
                                                }
                                                aria-label={`Remove ${bike.name}`}
                                                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-red-500 hover:text-white"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2.5 p-4">
                                            <BrandLogo
                                                brand={bike.brand}
                                                brandLogo={bike.brandLogo}
                                                size={34}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[11px] font-bold uppercase tracking-wider text-orange-500">
                                                    {bike.brand}
                                                </p>
                                                <p className="truncate font-bold">
                                                    {bike.name}
                                                </p>
                                                <p className="text-xs text-zinc-500">
                                                    {bike.category} •{" "}
                                                    {formatPrice(bike.price)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="px-4 pb-4">
                                            <button
                                                onClick={() =>
                                                    navigate(
                                                        `/motorcycles/${bike._id}`
                                                    )
                                                }
                                                className="w-full rounded-xl border border-white/10 py-2.5 text-xs font-bold transition hover:border-orange-500/40 hover:text-orange-400"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {selected.length < MAX_BIKES &&
                                Array.from({
                                    length:
                                        MAX_BIKES - selected.length,
                                }).map((_, i) => (
                                    <div
                                        key={`empty-${i}`}
                                        className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.015] p-6 text-center"
                                    >
                                        <Plus
                                            size={26}
                                            className="text-zinc-600"
                                        />
                                        <p className="mt-3 text-sm font-semibold text-zinc-500">
                                            Add Motorcycle
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-600">
                                            Search below to add
                                        </p>
                                    </div>
                                ))}
                        </div>

                        {notice && (
                            <p className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-center text-sm text-yellow-400">
                                {notice}
                            </p>
                        )}

                        {/* ACTIONS */}
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <button
                                onClick={handleCompare}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black transition hover:bg-orange-400"
                            >
                                <GitCompare size={17} />
                                Compare ({selected.length}/{MAX_BIKES})
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-3.5 text-sm font-bold transition hover:border-orange-500/40 hover:text-orange-400 disabled:opacity-50"
                            >
                                <Save size={17} />
                                {saving ? "Saving..." : "Save Comparison"}
                            </button>
                            {selected.length >= 2 && (
                                <button
                                    onClick={askMotoMind}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 py-3.5 text-sm font-bold text-orange-400 transition hover:bg-orange-500/20"
                                >
                                    <Sparkles size={17} />
                                    Ask MotoMind
                                </button>
                            )}
                        </div>
                        {saveMsg && (
                            <p
                                className={`mt-3 text-center text-sm ${
                                    saveMsg.includes("successfully")
                                        ? "text-emerald-400"
                                        : "text-zinc-400"
                                }`}
                            >
                                {saveMsg}
                            </p>
                        )}

                        {/* SEARCH + FILTERS */}
                        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                            <div className="relative">
                                <Search
                                    size={17}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                                />
                                <input
                                    value={query}
                                    onChange={(e) =>
                                        setQuery(e.target.value)
                                    }
                                    placeholder="Search motorcycle... (name, brand, category, fuel)"
                                    aria-label="Search motorcycles"
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-4 text-sm outline-none placeholder:text-zinc-600 focus:border-orange-500/50"
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {[
                                    ["Brand", brand, setBrand, brands],
                                    ["Category", category, setCategory, categories],
                                    ["Fuel Type", fuel, setFuel, fuels],
                                ].map(([label, value, setter, options]) => (
                                    <label
                                        key={label}
                                        className="block text-xs font-semibold text-zinc-500"
                                    >
                                        {label}
                                        <span className="relative mt-1.5 block">
                                            <select
                                                value={value}
                                                onChange={(e) =>
                                                    setter(e.target.value)
                                                }
                                                aria-label={label}
                                                className="w-full appearance-none rounded-xl border border-white/10 bg-[#111113] px-4 py-3 pr-10 text-sm text-white outline-none focus:border-orange-500/50"
                                            >
                                                {options.map((o) => (
                                                    <option
                                                        key={o}
                                                        value={o}
                                                    >
                                                        {o === "All"
                                                            ? `All ${label === "Fuel Type" ? "Fuels" : label + "s"}`
                                                            : o}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown
                                                size={15}
                                                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                                            />
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* RESULTS */}
                        <div className="mt-5">
                            {searching ? (
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="h-20 animate-pulse rounded-2xl bg-white/[0.04]"
                                        />
                                    ))}
                                </div>
                            ) : results.length === 0 ? (
                                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
                                    <Bike
                                        size={34}
                                        className="mx-auto text-zinc-700"
                                    />
                                    <p className="mt-4 font-bold">
                                        No motorcycles found
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-600">
                                        Try a different search or filter.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {results.map((bike) => {
                                        const added = selectedIds.has(
                                            String(bike._id)
                                        );
                                        return (
                                            <div
                                                key={bike._id}
                                                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0c0c0c] p-3"
                                            >
                                                <BrandLogo
                                                    brand={bike.brand}
                                                    brandLogo={
                                                        bike.brandLogo
                                                    }
                                                    size={38}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-bold">
                                                        {bike.brand}{" "}
                                                        {bike.name}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
                                                        {bike.category} •{" "}
                                                        {formatPrice(
                                                            bike.price
                                                        )}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        added
                                                            ? removeBike(
                                                                  bike._id
                                                              )
                                                            : addBike(bike)
                                                    }
                                                    aria-label={
                                                        added
                                                            ? `Remove ${bike.name}`
                                                            : `Add ${bike.name}`
                                                    }
                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                                                        added
                                                            ? "bg-emerald-500/15 text-emerald-400"
                                                            : "bg-orange-500 text-black hover:bg-orange-400"
                                                    }`}
                                                >
                                                    {added ? (
                                                        <Check size={17} />
                                                    ) : (
                                                        <Plus size={17} />
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* COMPARISON TABLE */}
                        {sections.length > 0 ? (
                            <div
                                ref={tableRef}
                                className="mt-10 scroll-mt-28 space-y-6"
                            >
                                    <h2 className="text-2xl font-black">
                                        Side-by-Side Comparison
                                    </h2>
                                    {sections.map((sec) => (
                                        <div
                                            key={sec.title}
                                            className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c]"
                                        >
                                            <div className="border-b border-white/10 px-5 py-4">
                                                <h3 className="font-bold text-orange-400">
                                                    {sec.title}
                                                </h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full min-w-[640px]">
                                                    <thead>
                                                        <tr className="border-b border-white/10">
                                                            <th className="min-w-[140px] px-5 py-3.5 text-left text-xs uppercase tracking-wider text-zinc-500">
                                                                Specification
                                                            </th>
                                                            {selected.map(
                                                                (b) => (
                                                                    <th
                                                                        key={
                                                                            b._id
                                                                        }
                                                                        className="min-w-[150px] px-5 py-3.5 text-left"
                                                                    >
                                                                        <span className="block truncate font-bold">
                                                                            {
                                                                                b.name
                                                                            }
                                                                        </span>
                                                                        <span className="block text-xs font-medium text-zinc-500">
                                                                            {
                                                                                b.brand
                                                                            }
                                                                        </span>
                                                                    </th>
                                                                )
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sec.rows.map(
                                                            (row) => (
                                                                <tr
                                                                    key={
                                                                        row.label
                                                                    }
                                                                    className="border-b border-white/5 last:border-0"
                                                                >
                                                                    <td className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                                                        {
                                                                            row.label
                                                                        }
                                                                    </td>
                                                                    {row.cells.map(
                                                                        (
                                                                            c,
                                                                            i
                                                                        ) => (
                                                                            <td
                                                                                key={
                                                                                    selected[
                                                                                        i
                                                                                    ]
                                                                                        ._id
                                                                                }
                                                                                className={`px-5 py-3 text-sm font-medium ${
                                                                                    row.differs
                                                                                        ? "bg-orange-500/[0.07] text-orange-200"
                                                                                        : "text-zinc-200"
                                                                                }`}
                                                                            >
                                                                                {
                                                                                    c.text
                                                                                }
                                                                            </td>
                                                                        )
                                                                    )}
                                                                </tr>
                                                            )
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                    <p className="text-xs text-zinc-600">
                                        Highlighted cells differ between
                                        motorcycles. Factual differences
                                        only — no automatic winner.
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.015] p-10 text-center sm:p-14">
                                    <GitCompare
                                        size={40}
                                        className="mx-auto text-zinc-700"
                                    />
                                    <h2 className="mt-5 text-2xl font-black">
                                        Compare Motorcycles
                                    </h2>
                                    <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                                        {selected.length === 1
                                            ? "One motorcycle selected — add at least one more, then press Compare."
                                            : "Select at least two motorcycles to compare their price, performance, specifications and features."}
                                    </p>
                                    <p className="mt-5 inline-block rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black">
                                        Select Motorcycle
                                    </p>
                                </div>
                            )}
                    </>
                )}
            </main>
        </div>
    );
}
