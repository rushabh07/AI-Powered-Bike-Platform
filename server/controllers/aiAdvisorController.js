const Motorcycle = require("../models/Motorcycle");
const {
    creditsFor,
    effectivePlan,
    walletOf,
    tokenGate,
    deductToken,
} = require("../utils/aiTokens");

// Attach context-based usage to any generated answer.
// Billable context = conversation sent + user message + reply.
const withUsage = (text, history, result) => {
    const promptText = [
        ...(Array.isArray(history)
            ? history.map((m) => m.content)
            : []),
        text,
    ].join("\n");
    const usage = creditsFor(promptText, result.reply);
    return { ...result, usage, tokensCharged: usage.tokensCharged };
};

/*
========================================
AI ADVISOR CONTROLLER
POST /api/ai-advisor/chat

- Reads the AI provider from backend .env only
  (AI_API_KEY / AI_API_URL / AI_MODEL).
- Never returns the key to the frontend.
- Sends live MongoDB catalog context so answers
  use only motorcycles that actually exist.
- Understands intent: budget, brand, model names,
  category, fuel, engine, mileage, EV specs,
  daily distance, purpose, comparison, follow-ups.
- Falls back to a local intent engine when the AI
  API is missing, slow or fails.
========================================
*/

const AI_TIMEOUT_MS = 45000;
const MAX_HISTORY = 8;

const isEV = (bike) =>
    String(bike.category || "").toLowerCase() === "electric" ||
    String(bike.fuel || "").toLowerCase() === "electric";

const inr = (n) => `Rs.${Number(n || 0).toLocaleString("en-IN")}`;

// Compact one-line catalog entry for the AI prompt
const describeBike = (bike) => {
    const parts = [
        `${bike.brand} ${bike.name}`,
        `category: ${bike.category}`,
        `price: Rs.${bike.price}`,
        `fuel: ${bike.fuel || "Petrol"}`,
        `rating: ${bike.rating ?? "N/A"}/5`,
    ];

    if (isEV(bike)) {
        if (bike.batteryCapacity)
            parts.push(`battery: ${bike.batteryCapacity} kWh`);
        if (bike.range) parts.push(`range: ${bike.range} km`);
        if (bike.chargingTime)
            parts.push(`charging: ${bike.chargingTime} hrs`);
        if (bike.power) parts.push(`power: ${bike.power} HP`);
        if (bike.torque) parts.push(`torque: ${bike.torque} Nm`);
        if (bike.topSpeed) parts.push(`top speed: ${bike.topSpeed} km/h`);
    } else {
        if (bike.engine) parts.push(`engine: ${bike.engine} CC`);
        if (bike.power) parts.push(`power: ${bike.power} HP`);
        if (bike.torque) parts.push(`torque: ${bike.torque} Nm`);
        if (bike.mileage) parts.push(`mileage: ${bike.mileage} km/l`);
        if (bike.topSpeed) parts.push(`top speed: ${bike.topSpeed} km/h`);
    }

    if (bike.weight) parts.push(`weight: ${bike.weight} kg`);
    if (bike.transmission) parts.push(`gears: ${bike.transmission}`);

    return `- ${parts.join(", ")}`;
};

const SYSTEM_PROMPT = `You are MotoMind, a professional motorcycle buying assistant for the Indian market (prices in Rs.).

CORE RULE: always answer the user's actual question. Never give the same generic response twice. Understand intent, budget, brand, model names, category (Street/Sport/Sports/Cruiser/Adventure/Roadster/Commuter/Electric), fuel (Petrol/Electric), engine CC, mileage, EV battery/range/charging time, top speed, power, torque, daily distance, purpose (commuting, city, office, touring, sport, adventure), comfort, maintenance and comparisons. Remember constraints from earlier messages (a budget stated before still applies to "mostly city riding" now).

DATABASE RULES:
1. Recommend ONLY motorcycles from the catalog below, using exact "Brand Name". Never invent models or specs. If a value is missing, write "Not available".
2. If an asked model is not in the catalog, say clearly it was not found instead of making up specs.
3. For EVs NEVER show engine CC or "0" specs — use battery, range, charging time, top speed, power, torque.

RESPONSE FORMAT (the "reply" value is GitHub-flavored markdown, rendered in chat):
- Recommendations: start with "### MOTOAI Recommendation", a "Based on your requirements" summary line, then "### Recommended Motorcycles" with one compact block per bike (name, brand, price, category, fuel, 2-3 key specs, rating) followed by 1-2 line "Why it suits you". Then "### MOTOAI Insight" (short, personal, no unsupported claims, no "best" unless asked) and end with a "Next Step" follow-up question (e.g. "Would you like me to compare these in detail?" after 2+ bikes, or "Want options with better mileage, performance, or lower price?" after one). Prose and bullets only — no tables here.
- Single-bike detail ("tell me everything about X"): "### Bike Overview" (name/brand/category/price/fuel), "### Performance" (engine-or-battery/power/torque/top speed/transmission), "### Efficiency / Range" (mileage or range), "### Practical Details" (weight, charging for EV), "### Rating", "### MOTOAI Insight" (who it suits, from data + stated needs only).
- Comparisons ("Compare A and B", 2-3 bikes, petrol-vs-electric welcome): a markdown table | Specification | Bike 1 | Bike 2 | with rows Price, Category, Fuel, Engine/Battery, Power, Torque, Mileage/Range, Top Speed, Weight, Transmission, Rating (missing values read "Not available"), then one short paragraph per bike and "### MOTOAI Insight" on documented differences only. Tables belong ONLY to explicit comparisons.
- Budget questions: filter price <= budget and present the shortlist (never pricier bikes without saying so).
- Daily-distance questions: use mileage/range, price and fuel; show approximate running cost ONLY when data suffices, stating assumptions.
- Beginners ("first bike", "learning"): prefer friendly price, manageable power (<=25 HP), lighter weight and high rating; say why in plain words.
- No match: "### No Exact Match Found" + which requirement to relax (budget, category, fuel, engine). Never invent.
- General questions ("tell me about X"): natural answer with headings/bullets, no forced tables.
- Off-topic: politely say you specialize in motorcycle buying advice and suggest a bike question.
- Recommendation names: list exact "Brand Name" strings only. Do NOT add any "reason" field — the platform attaches reasons itself.
- Style: clear, friendly, professional, concise, scannable (headings, bold, bullets, tables only for comparisons). No huge paragraph, no repeated question, no mention of APIs/keys/prompts/databases.

CONVERSATION BEHAVIOR (this is a continuous chat, not isolated questions):
- An "Ongoing rider context" summary may precede the history: persistent prefs there still apply unless the latest message contradicts them (latest wins, e.g. new budget replaces old).
- Resolve it/its/this/that/them/which one/the first one/the second one against previously discussed motorcycles. "Compare the first two" means the first two bikes of your last answer. "Which one is lighter" compares the same set again.
- Short follow-ups ("What about mileage?", "And its price?", "Tell me more about the second one") get short focused answers — never full re-recommendations, never re-ask known info.
- New unrelated topics ("How does ABS work?") are answered directly without forcing old budget context; "which of those" returns to prior bikes.
- General knowledge beyond the catalog: answer briefly, marking anything unverifiable as "Not available in the current database".

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"reply": "your formatted markdown answer", "recommendations": ["Brand Exact Name", "..."]}`;

// Best-effort JSON extraction from model output
const extractJson = (text) => {
    if (!text || typeof text !== "string") return null;
    const cleaned = text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start !== -1 && end > start) {
            try {
                return JSON.parse(cleaned.slice(start, end + 1));
            } catch (err) {
                return null;
            }
        }
        return null;
    }
};

// Map recommended "Brand Name" strings to DB documents
const mapToDocs = (names, catalog) => {
    if (!Array.isArray(names)) return [];
    const picked = [];
    names.forEach((raw) => {
        const needle = String(raw || "").toLowerCase().trim();
        if (!needle) return;
        const found = catalog.find((bike) => {
            const full = `${bike.brand} ${bike.name}`.toLowerCase();
            return (
                full === needle ||
                full.includes(needle) ||
                needle.includes(full)
            );
        });
        if (found && !picked.some((b) => String(b._id) === String(found._id))) {
            picked.push(found);
        }
    });
    return picked.slice(0, 3);
};

/*
========================================
LOCAL INTENT ENGINE (no AI needed)
Extracts requirements from the message
(+ conversation history) and answers from
real database values.
========================================
*/

const parseBudget = (text) => {
    // NOTE: number must start with a digit so "Rs.2 lakh"
    // parses as 2 lakh (not ".2 lakh" = 0.2 lakh).
    const lakh = text.match(/(\d[\d,]*\.?\d*)\s*(lakh|lac)\b/i);
    if (lakh)
        return Math.round(
            parseFloat(lakh[1].replace(/,/g, "")) * 100000
        );
    const thou = text.match(/(\d[\d,]*\.?\d*)\s*(thousand|k)\b/i);
    if (thou)
        return Math.round(
            parseFloat(thou[1].replace(/,/g, "")) * 1000
        );
    const rs = text.match(/(?:rs\.?|₹|inr)\s*(\d[\d,]*)/i);
    if (rs) return parseInt(rs[1].replace(/,/g, ""), 10);
    return null;
};

const parseDailyKm = (text) => {
    let m = text.match(/(\d[\d,]*)\s*kms?\b.{0,25}\b(day|daily)\b/i);
    if (m) return parseInt(m[1].replace(/,/g, ""), 10);
    m = text.match(
        /\b(daily|every\s*day|per\s*day)\b.{0,25}(\d[\d,]*)\s*kms?\b/i
    );
    if (m) return parseInt(m[2].replace(/,/g, ""), 10);
    m = text.match(/\btravels?\b.{0,25}(\d[\d,]*)\s*kms?\b/i);
    if (m) return parseInt(m[1].replace(/,/g, ""), 10);
    return null;
};

const CATEGORY_KEYS = [
    "street",
    "sport",
    "sports",
    "cruiser",
    "adventure",
    "roadster",
    "commuter",
    "electric",
];

// Spec attributes for "which one / its X" questions
const ATTR_PATTERNS = [
    { id: "mileage", pattern: /\bmileage\b|\baverage\b|\bkm\/?l\b|\befficient\b|\bfuel efficiency\b/, higherBetter: true },
    { id: "price", pattern: /\bprice\b|\bcost\b|\bcheap/, higherBetter: false },
    { id: "range", pattern: /\brange\b/, higherBetter: true },
    { id: "power", pattern: /\bpower\b|\bhp\b|\bbhp\b|\bperformance\b/, higherBetter: true },
    { id: "weight", pattern: /\bweight\b|\blight|\bheavy\b/, higherBetter: false },
    { id: "rating", pattern: /\brating\b|\brated\b/, higherBetter: true },
    { id: "battery", pattern: /\bbattery\b/, higherBetter: true },
    { id: "charging", pattern: /\bcharg/, higherBetter: false },
    { id: "torque", pattern: /\btorque\b/, higherBetter: true },
    { id: "engine", pattern: /\bengine\b|\bcc\b/, higherBetter: true },
    { id: "topSpeed", pattern: /\btop speed\b/, higherBetter: true },
];

const ORDINAL_INDEX = {
    first: 0, "1st": 0,
    second: 1, "2nd": 1,
    third: 2, "3rd": 2,
};

const attrValue = (bike, attr) => {
    switch (attr) {
        case "mileage": return bike.mileage || null;
        case "price": return bike.price ?? null;
        case "range": return bike.range || null;
        case "power": return bike.power || null;
        case "weight": return bike.weight || null;
        case "rating": return bike.rating ?? null;
        case "battery": return bike.batteryCapacity || null;
        case "charging": return bike.chargingTime || null;
        case "torque": return bike.torque || null;
        case "engine": return bike.engine || null;
        case "topSpeed": return bike.topSpeed || null;
        default: return null;
    }
};

const attrDisplay = (bike, attr) => {
    const v = attrValue(bike, attr);
    if (v == null) return "Not available in the current database";
    switch (attr) {
        case "mileage": return `${v} km/l`;
        case "price": return inr(v);
        case "range": return `${v} km`;
        case "power": return `${v} HP`;
        case "weight": return `${v} kg`;
        case "rating": return `⭐ ${v}/5`;
        case "battery": return `${v} kWh`;
        case "charging": return `${v} hrs`;
        case "torque": return `${v} Nm`;
        case "engine": return `${v} CC`;
        case "topSpeed": return `${v} km/h`;
        default: return String(v);
    }
};

const detectAttribute = (text) => {
    const found = ATTR_PATTERNS.find((a) => a.pattern.test(text));
    return found ? found.id : null;
};

const isComparative = (text) =>
    /\bbetter\b|\bbest\b|\bhigher\b|\bhighest\b|\bmore\b|\bmost\b|\bcheaper\b|\bcheapest\b|\blower\b|\blowest\b|\blonger\b|\blongest\b|\bfaster\b|\bfastest\b|\blighter\b|\blightest\b|\bheavier\b|\bgreater\b|\bgreatest\b/.test(
        text
    );

const ASPECTS = [
    { id: "touring", pattern: /\btour/i },
    {
        id: "commute",
        pattern: /\bcommut|\bcity\b|\boffice\b|\btraffic\b|\bdaily\b/,
    },
    {
        id: "sport",
        pattern: /\bsporty?\b|\bfast\b|\bspeed\b|\bracing\b|\bperformance\b|\bpowerful\b/,
    },
    { id: "comfort", pattern: /\bcomfort/ },
    {
        id: "mileage",
        pattern: /\bmileage\b|\baverage\b|\befficient\b|\bfuel efficiency\b|\brunning cost\b/,
    },
    {
        id: "maintenance",
        pattern: /\bmaint|\bservice\b|\bownership\b|\bcost\b/,
    },
    {
        id: "beginner",
        pattern: /\bbeginner|\blearn|\bfirst bike\b|\bnew rider\b|\bstarting out\b/,
    },
    {
        id: "adventure",
        pattern: /\badventure\b|\boff.?road\b|\bladakh\b|\bmountain|\bhills?\b/,
    },
];

const MOTO_SIGNALS = [
    "bike",
    "motorcycle",
    "scoot",
    "ride",
    "riding",
    "rider",
    "commut",
    "tour",
    "mileage",
    "engine",
    "petrol",
    "electric",
    "ev",
    "battery",
    "charging",
    "charge",
    "price",
    "budget",
    "lakh",
    "rs",
    "₹",
    "cc",
    "km",
    "bhp",
    "hp",
    "buy",
    "buying",
    "suggest",
    "recommend",
    "compare",
    "comparison",
    "versus",
    "best",
    "show",
    "under",
    "below",
    "top speed",
    "torque",
    "power",
    "comfort",
    "maint",
    "service",
    "sport",
    "cruiser",
    "adventure",
    "street",
    "roadster",
    "commuter",
    "city",
    "office",
    "daily",
];

// Per-message constraint extraction
const extractFromMessage = (text, catalog) => {
    const out = {
        budget: parseBudget(text),
        dailyKm: parseDailyKm(text),
        fuel: null,
        category: null,
        brands: [],
        names: [],
        aspects: [],
        compareWords: false,
        hasMotoSignal: false,
    };

    if (/\belectric\b|\bev\b|\bbattery\b|\bcharging\b/.test(text) && !/\bpetrol\b/.test(text))
        out.fuel = "electric";
    else if (/\bpetrol\b/.test(text)) out.fuel = "petrol";

    if (/\bsporty\b/.test(text)) {
        out.category = "sports";
    } else {
        const cat = CATEGORY_KEYS.find((c) => {
            if (c === "sports") return /\bsports?\b/.test(text);
            return new RegExp(`\\b${c}\\b`).test(text);
        });
        if (cat) out.category = cat === "sports" ? "sports" : cat;
    }

    catalog.forEach((bike) => {
        if (
            bike.brand &&
            text.includes(String(bike.brand).toLowerCase()) &&
            !out.brands.some(
                (b) =>
                    b.toLowerCase() === String(bike.brand).toLowerCase()
            )
        ) {
            out.brands.push(bike.brand);
        }
        if (bike.name) {
            const full = `${bike.brand} ${bike.name}`.toLowerCase();
            const short = String(bike.name).toLowerCase();
            if (
                (text.includes(full) ||
                    (short.length > 3 && text.includes(short))) &&
                !out.names.some(
                    (n) => String(n._id) === String(bike._id)
                )
            ) {
                out.names.push(bike);
            }
        }
    });

    ASPECTS.forEach((a) => {
        if (a.pattern.test(text) && !out.aspects.includes(a.id))
            out.aspects.push(a.id);
    });

    out.compareWords =
        /\bcompare\b|\bcomparison\b|\bvs\b|\bversus\b|\bdifference\b|\bbetter\b.*\bor\b|\bor\b.*\bbetter\b/.test(
            text
        );
    out.hasMotoSignal = MOTO_SIGNALS.some((s) => text.includes(s));

    return out;
};

// Merge history (oldest→newest): last-specified scalar wins.
// Names, brands, aspects, fuel, category, budget and compare
// intent come from USER messages only — assistant replies
// merely echo bike names and must not pollute extraction.
const mergeConstraints = (messages, catalog) => {
    const merged = {
        budget: null,
        dailyKm: null,
        fuel: null,
        category: null,
        brands: [],
        names: [],
        aspects: [],
        compareWords: false,
        hasMotoSignal: false,
    };

    messages.forEach((m) => {
        const text = String(m.content || "").toLowerCase();
        const c = extractFromMessage(text, catalog);
        if (c.hasMotoSignal) merged.hasMotoSignal = true;
        // Only the user sets requirements; assistant text is ignored
        // (it echoes bike names that would corrupt extraction).
        if (m.role !== "user") return;
        if (c.budget) merged.budget = c.budget;
        if (c.dailyKm) merged.dailyKm = c.dailyKm;
        if (c.fuel) merged.fuel = c.fuel;
        if (c.category) merged.category = c.category;
        if (c.compareWords) merged.compareWords = true;
        c.brands.forEach((b) => {
            if (
                !merged.brands.some(
                    (x) => x.toLowerCase() === b.toLowerCase()
                )
            )
                merged.brands.push(b);
        });
        c.names.forEach((b) => {
            if (
                !merged.names.some(
                    (x) => String(x._id) === String(b._id)
                )
            )
                merged.names.push(b);
        });
        c.aspects.forEach((a) => {
            if (!merged.aspects.includes(a)) merged.aspects.push(a);
        });
    });

    return merged;
};

// Motorcycles discussed in earlier turns (from assistant messages'
// saved recommendation ids), oldest set first.
const discussedSets = (history, catalog) => {
    const sets = [];
    (Array.isArray(history) ? history : []).forEach((m) => {
        if (m.role !== "assistant") return;
        const recs = Array.isArray(m.recommendations)
            ? m.recommendations
            : [];
        if (recs.length === 0) return;
        const docs = [];
        recs.forEach((r) => {
            const id = String((r && r._id) || r);
            const found = catalog.find(
                (b) => String(b._id) === id
            );
            if (
                found &&
                !docs.some(
                    (d) => String(d._id) === String(found._id)
                )
            ) {
                docs.push(found);
            }
        });
        if (docs.length > 0) sets.push(docs);
    });
    return sets;
};

/*
Resolve pronouns/ordinals against discussed bikes:
- "compare the first two" → first two of the last discussed set
- "which one is lighter / has better mileage" → compare last set
- "its price / tell me more about the second one" → single bike
- "what about mileage?" (aspect only) → focused aspect answer
Returns null when nothing references prior context.
*/
const resolveReference = (text, current, lastSet, allDiscussed) => {
    const pool =
        lastSet.length > 0 ? lastSet : allDiscussed.slice(0, 3);
    if (pool.length === 0) return null;

    const ordinalMatch = text.match(
        /\b(first|second|third|1st|2nd|3rd|last)\b/
    );
    const ordinalIndex = ordinalMatch
        ? ordinalMatch[1] === "last"
            ? pool.length - 1
            : (ORDINAL_INDEX[ordinalMatch[1]] ?? null)
        : null;

    const wantsCompare =
        current.compareWords ||
        /\bcompare\b|\bvs\b|\bversus\b|\bboth\b|\bthese\b|\bthose\b|\bthem\b/.test(
            text
        );

    // "compare the first two" / "first and second"
    if (wantsCompare && /two|both|first|second|these|those|them/.test(text)) {
        let picks = [];
        const ordinals = [...text.matchAll(
            /\b(first|second|third|1st|2nd|3rd|last)\b/g
        )].map((m) =>
            m[1] === "last"
                ? pool.length - 1
                : ORDINAL_INDEX[m[1]]
        );
        if (/\btwo\b|\bboth\b|\bthese\b|\bthose\b|\bthem\b/.test(text)) {
            picks = [pool[0], pool[1]].filter(Boolean);
        } else if (ordinals.length >= 2) {
            picks = ordinals
                .slice(0, 3)
                .map((i) => pool[i])
                .filter(Boolean);
        } else {
            picks = pool.slice(0, 3);
        }
        if (picks.length >= 2) {
            return { kind: "compare", bikes: picks.slice(0, 3) };
        }
    }

    // "which one is lighter / has better mileage / is cheaper"
    if (
        /\bwhich one\b|\bwhich of (those|them|these)\b|\bwhich is better\b/.test(
            text
        )
    ) {
        const attribute = detectAttribute(text);
        if (pool.length >= 2) {
            return {
                kind: "which",
                bikes: pool.slice(0, 3),
                attribute,
            };
        }
    }

    // Single target: "its X", "the second one", "tell me more"
    if (
        ordinalIndex != null ||
        /\bits\b|\bit's\b|\bthat bike\b|\bthis (bike|motorcycle|one)\b|\bthat one\b|\btell me more\b/.test(
            text
        )
    ) {
        const target =
            ordinalIndex != null
                ? pool[ordinalIndex]
                : pool[pool.length - 1];
        if (target) {
            return {
                kind: "single",
                bikes: [target],
                attribute: detectAttribute(text),
            };
        }
    }

    // Bare aspect follow-up: "what about mileage?"
    const aspectAttr = detectAttribute(text);
    if (
        aspectAttr ||
        /\bmileage\b|\baverage\b/.test(text) ||
        current.aspects.length > 0
    ) {
        const hasNewFilters =
            current.budget ||
            current.fuel ||
            current.category ||
            current.brands.length > 0 ||
            current.names.length > 0;
        if (!hasNewFilters) {
            return {
                kind: "aspect",
                bikes: pool.slice(0, 3),
                attribute:
                    aspectAttr ||
                    (current.aspects.includes("mileage")
                        ? "mileage"
                        : null),
            };
        }
    }

    return null;
};

// Focused short answer for one attribute across bikes
const aspectAnswer = (bikes, attribute) => {
    if (!attribute) {
        return {
            reply: `Based on what we've discussed: ${bikes.map((b) => `${b.brand} ${b.name}`).join(", ")}. Ask me about a specific one — price, mileage, range or specs.`,
            recommendations: bikes,
        };
    }
    const meta = ATTR_PATTERNS.find((a) => a.id === attribute);
    const lines = bikes.map(
        (b) => `• **${b.brand} ${b.name}:** ${attrDisplay(b, attribute)}`
    );
    const valued = bikes
        .map((b) => ({ b, v: attrValue(b, attribute) }))
        .filter((x) => x.v != null);
    let takeaway = "";
    if (valued.length > 1) {
        const best = valued.reduce((x, y) =>
            meta.higherBetter
                ? x.v >= y.v
                    ? x
                    : y
                : x.v <= y.v
                  ? x
                  : y
        );
        takeaway = `\n\nSo the **${best.b.brand} ${best.b.name}** leads here at ${attrDisplay(best.b, attribute)}.`;
    }
    return {
        reply: `${lines.join("\n")}${takeaway}`,
        recommendations: bikes,
    };
};

// Verdict on one bike, optionally focused on one attribute
const singleVerdict = (bike, attribute, aspects) => {
    if (attribute) {
        // Price/rating are already the headline — don't echo them
        const extra =
            attribute === "price" || attribute === "rating"
                ? ""
                : whyLine(bike, aspects);
        return {
            reply: `The **${bike.brand} ${bike.name}** has ${attribute} of ${attrDisplay(bike, attribute)}.${extra ? ` ${extra}.` : ""}`,
            recommendations: [bike],
        };
    }
    const line = whyLine(bike, aspects);
    return {
        reply: `The **${bike.brand} ${bike.name}** (${inr(bike.price)}, rated ⭐ ${bike.rating ?? "Not available"}/5): ${line || "it matches your requirements"}. Tap the card below for full specifications.`,
        recommendations: [bike],
    };
};

// Monthly running-cost estimate (assumptions stated to user)
const monthlyCostOf = (bike, dailyKm) => {
    const monthlyKm = dailyKm * 30;
    if (isEV(bike)) {
        if (!bike.range || !bike.batteryCapacity) return null;
        return ((monthlyKm / bike.range) * bike.batteryCapacity * 8);
    }
    if (!bike.mileage) return null;
    return ((monthlyKm / bike.mileage) * 105);
};

// Attach a per-bike "reason" (why it matches) used by the
// frontend recommendation cards. Purely additive.
const attachReasons = (result, aspects) => {
    if (!result || !Array.isArray(result.recommendations))
        return result;
    result.recommendations = result.recommendations.map((b) => {
        if (!b || !b.brand) return b;
        try {
            const line = whyLine(b, aspects || []);
            if (line) b.reason = line;
        } catch (e) {
            /* leave reason empty */
        }
        return b;
    });
    return result;
};

// One-line "why this bike" using real specs + asked aspects.
// With no explicit aspects, fall back to the most telling
// specs so verdicts never read as price-only.
const whyLine = (bike, aspects) => {
    const bits = [];
    const asp =
        aspects.length > 0
            ? aspects
            : isEV(bike)
              ? ["commute"]
              : ["sport"];

    if (isEV(bike)) {
        if (bike.range) bits.push(`${bike.range} km range`);
        if (bike.batteryCapacity)
            bits.push(`${bike.batteryCapacity} kWh battery`);
        if (
            bike.chargingTime &&
            (asp.includes("commute") || asp.includes("maintenance"))
        )
            bits.push(`${bike.chargingTime}h charging`);
    } else {
        if (bike.mileage && (asp.includes("commute") || asp.includes("mileage")))
            bits.push(`${bike.mileage} km/l mileage`);
        if (
            bike.engine &&
            (asp.includes("sport") || asp.includes("touring") || asp.includes("adventure"))
        )
            bits.push(`${bike.engine} CC engine`);
    }
    if (bike.power && (asp.includes("sport") || asp.includes("touring")))
        bits.push(`${bike.power} HP`);
    if (bike.topSpeed && (asp.includes("sport") || asp.includes("touring")))
        bits.push(`${bike.topSpeed} km/h top speed`);
    if (asp.includes("beginner")) {
        if (bike.power) bits.push(`manageable ${bike.power} HP`);
        if (bike.weight) bits.push(`${bike.weight} kg`);
    }
    if (bike.price) bits.push(`${inr(bike.price)}`);
    if (bits.length === 0 && bike.rating)
        bits.push(`rated ${bike.rating}/5`);

    return bits.join(" • ");
};

// Spec-by-spec comparison of 2-3 real bikes.
// Unknown specs are omitted (never shown as "?" or "0").
const specList = (b) => {
    const specs = [`price ${inr(b.price)}`];
    if (isEV(b)) {
        if (b.batteryCapacity)
            specs.push(`battery ${b.batteryCapacity} kWh`);
        if (b.range) specs.push(`range ${b.range} km`);
        if (b.chargingTime)
            specs.push(`charging ${b.chargingTime} hrs`);
    } else {
        if (b.engine) specs.push(`engine ${b.engine} CC`);
        if (b.mileage) specs.push(`mileage ${b.mileage} km/l`);
    }
    if (b.power) specs.push(`power ${b.power} HP`);
    if (b.torque) specs.push(`torque ${b.torque} Nm`);
    if (b.topSpeed) specs.push(`top speed ${b.topSpeed} km/h`);
    if (b.weight) specs.push(`weight ${b.weight} kg`);
    if (b.fuel && !isEV(b)) specs.push(`fuel ${b.fuel}`);
    if (b.rating != null) specs.push(`rating ${b.rating}/5`);
    return specs;
};

// Comparison answer: spec table (comparisons are the one place
// tables belong) + short per-bike notes + documented differences.
// Unknown specs read "Not available", never "?" or "0".
const na = (v) => (v ? String(v) : "Not available");

const compareReply = (bikes) => {
    const names = bikes.map((b) => `${b.brand} ${b.name}`);
    const mid = (b) =>
        isEV(b)
            ? b.batteryCapacity
                ? `${b.batteryCapacity} kWh`
                : null
            : b.engine
              ? `${b.engine} CC`
              : null;
    const eff = (b) =>
        isEV(b)
            ? b.range
                ? `${b.range} km`
                : null
            : b.mileage
              ? `${b.mileage} km/l`
              : null;
    const row = (label, fn) =>
        `| ${label} | ${bikes.map((b) => na(fn(b))).join(" | ")} |`;

    const lines = [
        "### 🏍️ Motorcycle Comparison",
        "",
        `| Specification | ${names.join(" | ")} |`,
        `| --- | ${names.map(() => "---").join(" | ")} |`,
        row("Price", (b) => inr(b.price)),
        row("Category", (b) => b.category),
        row("Fuel", (b) => b.fuel),
        row("Engine / Battery", mid),
        row("Power", (b) => (b.power ? `${b.power} HP` : null)),
        row("Torque", (b) => (b.torque ? `${b.torque} Nm` : null)),
        row("Mileage / Range", eff),
        row("Top Speed", (b) =>
            b.topSpeed ? `${b.topSpeed} km/h` : null
        ),
        row("Weight", (b) => (b.weight ? `${b.weight} kg` : null)),
        row("Transmission", (b) => b.transmission),
        row("Rating", (b) =>
            b.rating != null ? `⭐ ${b.rating}` : null
        ),
    ];

    // Short per-bike notes + documented differences
    const notes = bikes.map(
        (b) => `### ${b.brand} ${b.name}\n${whyLine(b, []) || "Matches your requirements."}.`
    );

    const byPrice = [...bikes].sort((a, b) => a.price - b.price);
    const byRating = [...bikes].sort(
        (a, b) => (b.rating || 0) - (a.rating || 0)
    );
    const diffs = [];
    if (
        bikes.length > 1 &&
        byPrice[0].price !== byPrice[byPrice.length - 1].price
    ) {
        diffs.push(
            `**${byPrice[0].brand} ${byPrice[0].name}** is the most affordable at ${inr(byPrice[0].price)}`
        );
    }
    diffs.push(
        `**${byRating[0].brand} ${byRating[0].name}** is the highest rated at ${byRating[0].rating}/5`
    );

    return [
        ...lines,
        "",
        ...notes.join("\n\n").split("\n"),
        "",
        "### 💡 MOTOAI Insight",
        "",
        diffs.join(". ") + ".",
    ].join("\n");
};

const localRecommend = (message, catalog, conversation = []) => {
    const history = Array.isArray(conversation)
        ? conversation
              .filter(
                  (m) =>
                      m &&
                      typeof m.content === "string" &&
                      (m.role === "user" || m.role === "assistant")
              )
              .slice(-MAX_HISTORY)
        : [];
    const merged = mergeConstraints(
        [...history, { role: "user", content: message }],
        catalog
    );
    const currentText = message.toLowerCase();
    const current = extractFromMessage(currentText, catalog);

    // Prior discussed bikes (from saved assistant recommendations)
    const sets = discussedSets(history, catalog);
    const lastSet = sets.length > 0 ? sets[sets.length - 1] : [];
    const allDiscussed = [];
    sets.forEach((s) =>
        s.forEach((b) => {
            if (
                !allDiscussed.some(
                    (x) => String(x._id) === String(b._id)
                )
            )
                allDiscussed.push(b);
        })
    );

    // Pronouns / ordinals ("it", "which one", "the first two")
    // resolve against previously discussed motorcycles.
    const ref = resolveReference(
        currentText,
        current,
        lastSet,
        allDiscussed
    );

    if (ref) {
        if (ref.kind === "compare") {
            return {
                reply: compareReply(ref.bikes),
                recommendations: ref.bikes,
            };
        }
        if (ref.kind === "which") {
            if (ref.attribute) {
                return aspectAnswer(ref.bikes, ref.attribute);
            }
            return {
                reply: compareReply(ref.bikes),
                recommendations: ref.bikes,
            };
        }
        if (ref.kind === "single") {
            const done = singleVerdict(
                ref.bikes[0],
                ref.attribute,
                merged.aspects
            );
            return done;
        }
        if (ref.kind === "aspect") {
            return aspectAnswer(ref.bikes, ref.attribute);
        }
    }

    // Off-topic guard: no bike signals anywhere, nothing to work with
    if (
        !merged.hasMotoSignal &&
        !merged.budget &&
        merged.names.length === 0 &&
        merged.brands.length === 0 &&
        !merged.category &&
        !merged.fuel
    ) {
        return {
            reply: "I'm MOTOAI AI Advisor and I specialize in motorcycle buying advice — budgets, models, comparisons, EVs, mileage and running costs. Ask me something like 'best bike under Rs.2 lakh' or 'compare Hunter 350 and Classic 350'.",
            recommendations: [],
        };
    }

    // Named-but-missing models must be reported, never invented.
    // A "X 350"-style mention only counts when it shares a word
    // with a real catalog brand/model (so "travel 50 km" is not
    // mistaken for a model name). Display starts at that word.
    const vocab = new Set();
    catalog.forEach((b) => {
        `${b.brand} ${b.name}`
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .forEach((w) => {
                if (w.length > 2) vocab.add(w);
            });
    });
    const missingNames = [];
    const modelMentions = currentText.match(
        /\b([a-z]+(?:\s+[a-z0-9]+){0,2}\s+\d{2,4})\b/g
    );
    if (!ref && modelMentions && current.names.length === 0) {
        modelMentions.forEach((raw) => {
            const words = raw.trim().split(/\s+/);
            const anchor = words.findIndex((w) => vocab.has(w));
            if (anchor === -1) return; // not a model mention
            const mention = words.slice(anchor).join(" ");
            const inCatalog = catalog.some((b) =>
                `${b.brand} ${b.name}`.toLowerCase().includes(mention)
            );
            if (!inCatalog && !missingNames.includes(mention)) {
                missingNames.push(mention);
            }
        });
    }

    // COMPARISON intent
    const compareSet =
        merged.compareWords || current.names.length >= 2
            ? merged.names.slice(0, 3)
            : [];
    if (
        (merged.compareWords && merged.names.length >= 1) ||
        current.names.length >= 2
    ) {
        let set = [...compareSet];
        if (set.length === 1) {
            // Single named bike + "compare" → pair with top-rated alternative
            const other = catalog
                .filter((b) => String(b._id) !== String(set[0]._id))
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
            if (other) set.push(other);
        }
        if (set.length >= 2) {
            return {
                reply: compareReply(set),
                recommendations: set.slice(0, 3),
            };
        }
    }

    // SINGLE named bike (no comparison): detailed expert profile
    // in the §6 format — only real database values, never generic.
    if (current.names.length === 1 && !merged.compareWords) {
        const bike = current.names[0];
        const ev = isEV(bike);
        const L = [];
        L.push(`### 🏍️ ${bike.brand} ${bike.name}`);
        L.push("");
        L.push("**🏍️ Bike Overview**");
        L.push("");
        L.push(`- Name: ${bike.brand} ${bike.name}`);
        L.push(`- Brand: ${bike.brand}`);
        L.push(`- Category: ${bike.category || "Not available"}`);
        L.push(`- Price: ${inr(bike.price)}`);
        L.push(`- Fuel: ${bike.fuel || "Not available"}`);
        L.push("");
        L.push("**⚙️ Performance**");
        L.push("");
        if (ev) {
            L.push(
                `- Battery: ${bike.batteryCapacity ? `${bike.batteryCapacity} kWh` : "Not available"}`
            );
        } else {
            L.push(
                `- Engine: ${bike.engine ? `${bike.engine} CC` : "Not available"}`
            );
        }
        L.push(
            `- Power: ${bike.power ? `${bike.power} HP` : "Not available"}`
        );
        L.push(
            `- Torque: ${bike.torque ? `${bike.torque} Nm` : "Not available"}`
        );
        L.push(
            `- Top Speed: ${bike.topSpeed ? `${bike.topSpeed} km/h` : "Not available"}`
        );
        L.push(
            `- Transmission: ${bike.transmission || "Not available"}`
        );
        L.push("");
        L.push("**⛽ Efficiency / Range**");
        L.push("");
        if (ev) {
            L.push(
                `- Range: ${bike.range ? `${bike.range} km` : "Not available"}`
            );
        } else {
            L.push(
                `- Mileage: ${bike.mileage ? `${bike.mileage} km/l` : "Not available"}`
            );
        }
        L.push("");
        L.push("**📏 Practical Details**");
        L.push("");
        L.push(
            `- Weight: ${bike.weight ? `${bike.weight} kg` : "Not available"}`
        );
        if (ev) {
            L.push(
                `- Charging Time: ${bike.chargingTime ? `${bike.chargingTime} hours` : "Not available"}`
            );
        }
        const desc = String(bike.description || "").trim().slice(0, 200);
        if (desc) L.push(`- About: ${desc}`);
        L.push("");
        L.push("**⭐ Rating**");
        L.push("");
        L.push(
            `- ${bike.rating != null ? `⭐ ${bike.rating}/5` : "Not available"}`
        );
        L.push("");
        L.push("**🤖 MOTOAI Insight**");
        L.push("");
        const aspectWord =
            current.aspects.length > 0 ? current.aspects[0] : null;
        L.push(
            aspectWord
                ? `For ${aspectWord}, note: ${whyLine(bike, current.aspects) || "it matches your requirements"}.`
                : `A ${bike.category || "motorcycle"} at ${inr(bike.price)} suited to riders who value ${ev ? "electric running and city practicality" : "proven petrol performance"}.`
        );
        return {
            reply: L.join("\n"),
            recommendations: [bike],
        };
    }

    // Missing model report
    if (missingNames.length > 0 && current.names.length === 0) {
        const alts = [...catalog]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 2);
        return {
            reply: `I couldn't find "${missingNames[0]}" in our showroom, so I won't guess its specs. Here are our highest-rated alternatives instead: ${alts.map((b) => `${b.brand} ${b.name}`).join(", ")}.`,
            recommendations: alts,
        };
    }

    // General-knowledge question with no bike references at all
    // (e.g. "How does ABS work?"): answer the topic directly
    // instead of forcing old budget context into it.
    const looksGeneral = /^(how does|how do|what is|what are|what's|whats|explain|why |why\?|what does|meaning of)/.test(
        currentText.trim()
    );
    if (
        !ref &&
        looksGeneral &&
        current.names.length === 0 &&
        current.brands.length === 0 &&
        !current.budget &&
        !current.fuel &&
        !current.category &&
        !detectAttribute(currentText)
    ) {
        return {
            reply: "That's a general motorcycling question outside my verified showroom data. I can explain concepts in brief, but for anything model-specific (price, mileage, range, specs) ask me about a bike and I'll use real database values. What would you like to know about our motorcycles?",
            recommendations: [],
        };
    }

    // FILTERED search (budget/fuel/category/brand from message + history)
    let pool = [...catalog];
    if (merged.budget)
        pool = pool.filter((b) => Number(b.price) <= merged.budget);
    if (merged.fuel === "electric") pool = pool.filter((b) => isEV(b));
    if (merged.fuel === "petrol") pool = pool.filter((b) => !isEV(b));
    if (merged.category) {
        pool = pool.filter((b) => {
            const c = String(b.category || "").toLowerCase();
            if (merged.category === "sports")
                return c === "sports" || c === "sport";
            return c === merged.category;
        });
    }
    if (merged.brands.length > 0 && merged.names.length === 0) {
        pool = pool.filter((b) =>
            merged.brands.some(
                (brand) =>
                    String(b.brand).toLowerCase() ===
                    String(brand).toLowerCase()
            )
        );
    }
    if (merged.names.length > 0 && !merged.compareWords) {
        const ids = new Set(merged.names.map((b) => String(b._id)));
        const named = pool.filter((b) => ids.has(String(b._id)));
        if (named.length > 0) pool = named;
    }

    // Aspect-aware ranking
    const a = merged.aspects;
    const scoreOf = (b) => {
        let s = (Number(b.rating) || 0) * 10;
        if (a.includes("mileage") || a.includes("commute"))
            s += Math.min(6, (Number(b.mileage) || 0) / 8);
        if (a.includes("sport") || a.includes("touring") || a.includes("adventure"))
            s += Math.min(6, (Number(b.power) || 0) / 8);
        if (a.includes("sport") && b.topSpeed)
            s += Math.min(4, Number(b.topSpeed) / 40);
        if (isEV(b) && (merged.fuel === "electric" || a.includes("commute")))
            s += Math.min(6, (Number(b.range) || 0) / 30);
        if (a.includes("beginner")) {
            // Friendly price, manageable power, forgiving weight
            s += Math.max(0, (300000 - Number(b.price)) / 30000);
            if ((Number(b.power) || 99) <= 25) s += 4;
            if (Number(b.weight) > 0 && Number(b.weight) <= 160) s += 2;
        }
        return s;
    };
    pool.sort((x, y) => scoreOf(y) - scoreOf(x));
    const results = pool.slice(0, 3);

    if (results.length === 0) {
        return {
            reply: "### 🔎 No Exact Match Found\n\nI couldn't find a motorcycle in the current MOTOAI database that exactly matches your requirements.\n\n- Increase budget\n- Change category\n- Consider another fuel type\n- Reduce engine requirement",
            recommendations: [],
        };
    }

    // Structured markdown reply (same shape as the AI format)
    const reqBits = [];
    if (merged.budget) reqBits.push(`budget ${inr(merged.budget)}`);
    if (
        merged.category &&
        merged.category !== merged.fuel
    )
        reqBits.push(merged.category);
    if (merged.fuel) reqBits.push(merged.fuel);
    if (merged.brands.length > 0) reqBits.push(merged.brands.join(", "));
    if (merged.dailyKm) reqBits.push(`${merged.dailyKm} km daily ride`);
    if (merged.aspects.length > 0) reqBits.push(merged.aspects.join(", "));

    const bikeBlock = (b, i) => {
        const specLines = isEV(b)
            ? [
                  `**Battery:** ${b.batteryCapacity ? `${b.batteryCapacity} kWh` : "Not available"}`,
                  `**Range:** ${b.range ? `${b.range} km` : "Not available"}`,
                  `**Charging:** ${b.chargingTime ? `${b.chargingTime} hours` : "Not available"}`,
              ]
            : [
                  `**Engine:** ${b.engine ? `${b.engine} CC` : "Not available"}`,
                  `**Mileage:** ${b.mileage ? `${b.mileage} km/l` : "Not available"}`,
              ];
        return [
            `**${i + 1}. ${b.brand} ${b.name}**`,
            `**Brand:** ${b.brand}`,
            `**Price:** ${inr(b.price)}`,
            `**Category:** ${b.category || "Not available"}`,
            `**Fuel:** ${b.fuel || "Not available"}`,
            ...specLines,
            `**Power:** ${b.power ? `${b.power} HP` : "Not available"}`,
            `**Rating:** ⭐ ${b.rating != null ? b.rating : "Not available"}/5`,
            "",
            `**Why it suits you:** ${whyLine(b, merged.aspects) || "Matches your requirements."}`,
        ].join("\n");
    };

    const parts = [
        "### 🏍️ MOTOAI Recommendation",
        "",
        "**Based on your requirements:**",
        reqBits.length > 0 ? reqBits.join(" • ") : "best overall matches",
        "",
        "### ⭐ Recommended Motorcycles",
        "",
        results.map((b, i) => bikeBlock(b, i)).join("\n\n"),
    ];

    const byPrice = [...results].sort((a, b) => a.price - b.price);
    const byRating = [...results].sort(
        (a, b) => (b.rating || 0) - (a.rating || 0)
    );
    let insight = `${byRating[0].brand} ${byRating[0].name} is the highest rated at ${byRating[0].rating}/5.`;
    if (merged.dailyKm) {
        const top = results[0];
        const cost = monthlyCostOf(top, merged.dailyKm);
        const basis = isEV(top)
            ? top.range
                ? `${top.range} km range`
                : "its electric range"
            : top.mileage
              ? `${top.mileage} km/l mileage`
              : "its mileage";
        insight += ` For your ${merged.dailyKm} km daily ride, the ${top.brand} ${top.name} (${basis}) would cost about ${cost != null ? inr(Math.round(cost)) : "an estimated amount"} per month in fuel (assumes standard fuel prices).`;
    } else if (byPrice.length > 1) {
        insight = `${byPrice[0].brand} ${byPrice[0].name} is the most affordable at ${inr(byPrice[0].price)}. ` + insight;
    }
    parts.push("", "### 💡 MOTOAI Insight", "", insight);

    parts.push(
        "",
        "### 👉 Next Step",
        "",
        "**Would you like me to compare these motorcycles in detail?**"
    );

    return { reply: parts.join("\n"), recommendations: results };
};

// Keep only the latest turns for the AI context window.
// Recommendation ids ride along (stripped before the AI call)
// so follow-ups like "the first two" can resolve server-side.
const MAX_RECENT_TURNS = 6;

const sanitizeHistory = (conversation) =>
    Array.isArray(conversation)
        ? conversation
              .filter(
                  (m) =>
                      m &&
                      typeof m.content === "string" &&
                      (m.role === "user" || m.role === "assistant")
              )
              .slice(-MAX_HISTORY)
              .map((m) => ({
                  role: m.role,
                  content: m.content.slice(0, 500),
                  ...(Array.isArray(m.recommendations)
                      ? { recommendations: m.recommendations }
                      : {}),
              }))
        : [];

// Persistent rider context + discussed bikes, injected ahead of
// the recent turns so long chats stay cheap yet continuous.
const buildContextSummary = (history, catalog) => {
    const usersOnly = history.filter((m) => m.role === "user");
    if (usersOnly.length === 0) return "";
    const merged = mergeConstraints(usersOnly, catalog);
    const bits = [];
    if (merged.budget) bits.push(`Budget: ${inr(merged.budget)}`);
    if (merged.fuel) bits.push(`Fuel: ${merged.fuel}`);
    if (merged.category) bits.push(`Category: ${merged.category}`);
    if (merged.brands.length > 0)
        bits.push(`Brands: ${merged.brands.join(", ")}`);
    if (merged.dailyKm)
        bits.push(`Daily distance: ${merged.dailyKm} km`);
    if (merged.aspects.length > 0)
        bits.push(`Interests: ${merged.aspects.join(", ")}`);
    const sets = discussedSets(history, catalog);
    if (sets.length > 0) {
        const last = sets[sets.length - 1];
        bits.push(
            `Discussed: ${last.map((b) => `${b.brand} ${b.name}`).join(", ")}`
        );
    }
    if (bits.length === 0) return "";
    return `Ongoing rider context (persists unless the latest message contradicts it): ${bits.join(" | ")}.`;
};

/*
========================================
Reusable answer generator.
Loads the live catalog, tries the AI API,
falls back to the local intent engine.
Returns { reply, recommendations }.
Throws { statusCode, message } on fatal errors.
========================================
*/
const generateAdvisorReply = async (message, history = []) => {
    const text = String(message || "").trim();

    if (!text) {
        const err = new Error("Please type a message.");
        err.statusCode = 400;
        throw err;
    }

    if (text.length > 1000) {
        const err = new Error(
            "Message is too long. Keep it under 1000 characters."
        );
        err.statusCode = 400;
        throw err;
    }

    // Live catalog from MongoDB (never hardcoded)
    let catalog;
    try {
        catalog = await Motorcycle.find({})
            .select(
                "name brand brandLogo category price engine power torque mileage fuel transmission weight batteryCapacity range chargingTime topSpeed rating image description"
            )
            .lean()
            .limit(40);
    } catch (dbError) {
        console.error("AI Advisor DB error:", dbError.message);
        const err = new Error("AI Advisor is temporarily unavailable.");
        err.statusCode = 503;
        throw err;
    }

    if (!catalog || catalog.length === 0) {
        return withUsage(text, cleanHistory, {
            reply: "Our showroom is currently empty. Please check back after motorcycles are added.",
            recommendations: [],
        });
    }

    const cleanHistory = sanitizeHistory(history);

    // Aspects for card reasons (latest preferences win)
    let reasonAspects = [];
    try {
        reasonAspects = mergeConstraints(
            [...cleanHistory, { role: "user", content: text }],
            catalog
        ).aspects;
    } catch (e) {
        reasonAspects = [];
    }

    // Smart context: persistent summary + recent turns only.
    // Strips recommendation payloads before the AI call.
    const contextSummary = buildContextSummary(cleanHistory, catalog);
    const recentTurns = cleanHistory.slice(-MAX_RECENT_TURNS).map(
        ({ role, content }) => ({ role, content })
    );

    const apiKey = process.env.AI_API_KEY;
    const apiUrl =
        process.env.AI_API_URL ||
        "https://integrate.api.nvidia.com/v1/chat/completions";
    const model = process.env.AI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";

    // No key configured → local engine (still helpful, still DB-driven)
    if (!apiKey) {
        console.warn("AI_API_KEY missing — using local intent engine.");
        return withUsage(
            text,
            cleanHistory,
            attachReasons(
                localRecommend(text, catalog, cleanHistory),
                reasonAspects
            )
        );
    }

    const catalogText = catalog.map(describeBike).join("\n");

    const callAI = async () => {
        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            AI_TIMEOUT_MS
        );
        try {
            const aiRes = await fetch(apiUrl, {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.4,
                    max_tokens: 600,
                    messages: [
                        {
                            role: "system",
                            content: `${SYSTEM_PROMPT}\n\nMotorcycle catalog:\n${catalogText}`,
                        },
                        ...(contextSummary
                            ? [
                                  {
                                      role: "system",
                                      content: contextSummary,
                                  },
                              ]
                            : []),
                        ...recentTurns,
                        { role: "user", content: text },
                    ],
                }),
            });
            if (!aiRes.ok) {
                throw new Error(
                    `AI provider responded ${aiRes.status}`
                );
            }
            return await aiRes.json();
        } finally {
            clearTimeout(timeout);
        }
    };

    try {
        let aiData;
        try {
            aiData = await callAI();
        } catch (firstError) {
            // One retry on transient timeouts before falling back,
            // so slow responses don't silently become templates.
            if (firstError.name !== "AbortError") throw firstError;
            console.warn("AI request timed out — retrying once.");
            aiData = await callAI();
        }
        const rawText =
            aiData?.choices?.[0]?.message?.content || "";
        const parsed = extractJson(rawText);

            if (parsed && parsed.reply) {
                const docs = mapToDocs(parsed.recommendations, catalog);
                // Safety net: if the model named nothing mappable,
                // fill from the local engine so cards still show.
                const extra =
                    docs.length === 0
                        ? localRecommend(text, catalog, cleanHistory)
                              .recommendations
                        : [];
                return withUsage(
                    text,
                    cleanHistory,
                    attachReasons(
                        {
                            reply: String(parsed.reply).slice(0, 1000),
                            recommendations: [...docs, ...extra].slice(0, 3),
                        },
                        reasonAspects
                    )
                );
            }

            throw new Error("Invalid AI response format");
        } catch (aiError) {
            // Never leak provider details or keys to the frontend
            console.error(
                "AI provider error:",
                aiError.name === "AbortError"
                    ? "timeout"
                    : aiError.message
            );
            return withUsage(
                text,
                cleanHistory,
                attachReasons(
                    localRecommend(text, catalog, cleanHistory),
                    reasonAspects
                )
            );
        }
};

// =====================================================
// POST /api/ai-advisor/chat (login + tokens required)
// =====================================================
const chat = async (req, res) => {
    try {
        const { message, conversation } = req.body;

        // Subscription + token gate (route is behind `protect`,
        // so req.user is the JWT-verified user)
        await effectivePlan(req.user);
        const blocked = tokenGate(req.user);
        if (blocked) {
            return res.status(blocked.status).json(blocked.body);
        }

        const result = await generateAdvisorReply(
            message,
            conversation
        );

        // Deduct context-based credits — only after success
        const charge = result.tokensCharged || 1;
        const { user: walletUser } = await deductToken(
            req.user._id,
            charge
        );

        return res.status(200).json({
            success: true,
            ...result,
            tokensCharged: charge,
            wallet: walletUser
                ? walletOf(walletUser)
                : walletOf(req.user),
        });
    } catch (error) {
        console.error("AI Advisor error:", error.message);
        const status = error.statusCode || 500;
        return res.status(status).json({
            success: false,
            message:
                error.statusCode === 400
                    ? error.message
                    : "AI Advisor is temporarily unavailable.",
        });
    }
};

module.exports = {
    chat,
    generateAdvisorReply,
    _localRecommend: localRecommend,
    _parseBudget: parseBudget,
};
