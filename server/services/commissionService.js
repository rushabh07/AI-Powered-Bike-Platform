const mongoose = require("mongoose");
const CommissionRule = require("../models/CommissionRule");
const Commission = require("../models/Commission");
const CommissionPayout = require("../models/CommissionPayout");
const Referral = require("../models/Referral");
const Sale = require("../models/Sale");

/*
  COMMISSION SERVICE
  =================
  Owns every financial decision in the referral/commission flow:

    - policy resolution (which agreement applies to a sale)
    - commission arithmetic (integer paise, never floating point rupees)
    - idempotent commission creation (one commission per sale)
    - dashboard summaries (always computed from the database)

  The frontend never supplies a commission amount — everything is
  derived here from stored policies.
*/

/** Rupees (number) -> integer paise. */
const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);

/** Integer paise -> rupees (number). */
const fromPaise = (paise) => Number(paise || 0) / 100;

/** Build the unique scope key for a policy. */
const buildPolicyKey = ({ scope, dealership, brand, category }) => {
    switch (scope) {
        case "dealership":
            return dealership ? `d:${dealership}` : null;
        case "brand":
            return brand ? `b:${String(brand).trim().toLowerCase()}` : null;
        case "category":
            return category ? `c:${String(category).trim().toLowerCase()}` : null;
        case "global":
            return "g:global";
        default:
            return null;
    }
};

/**
 * Score how well a policy matches a sale context.
 * Returns -1 when the policy does not apply at all.
 * Higher score wins; the most specific agreement always beats a
 * broader one.
 */
const scorePolicy = (policy, { dealershipId, brand, category }) => {
    if (!policy) return -1;

    if (policy.scope === "dealership") {
        if (!dealershipId || String(policy.dealership) !== String(dealershipId)) {
            return -1;
        }
        let score = 100;
        if (policy.brand) {
            if (!brand || policy.brand.toLowerCase() !== String(brand).toLowerCase()) {
                return -1;
            }
            score += 10;
        }
        if (policy.category) {
            if (!category || policy.category.toLowerCase() !== String(category).toLowerCase()) {
                return -1;
            }
            score += 5;
        }
        return score;
    }

    if (policy.scope === "brand") {
        if (!brand || !policy.brand) return -1;
        if (policy.brand.toLowerCase() !== String(brand).toLowerCase()) return -1;
        return 60;
    }

    if (policy.scope === "category") {
        if (!category || !policy.category) return -1;
        if (policy.category.toLowerCase() !== String(category).toLowerCase()) return -1;
        return 40;
    }

    if (policy.scope === "global") return 10;

    return -1;
};

/**
 * Find the policy that applies to a sale.
 * @returns {object|null} the policy document (lean) or null
 */
const resolvePolicy = async ({ dealershipId, brand, category, at = new Date() }) => {
    const policies = await CommissionRule.find({
        isActive: true,
        $and: [
            { $or: [{ effectiveFrom: null }, { effectiveFrom: { $lte: at } }] },
            { $or: [{ effectiveTo: null }, { effectiveTo: { $gt: at } }] },
        ],
    }).lean();

    let best = null;
    let bestScore = -1;

    for (const policy of policies) {
        const score = scorePolicy(policy, { dealershipId, brand, category });
        if (score < 0) continue;
        if (score > bestScore) {
            best = policy;
            bestScore = score;
        } else if (score === bestScore && best && policy.createdAt > best.createdAt) {
            // Deterministic tie-break: newest agreement wins.
            best = policy;
        }
    }

    return best;
};

/**
 * Calculate the commission for an eligible sale amount.
 * All arithmetic happens in integer paise.
 *
 * @returns {{ amountPaise:number, eligiblePaise:number, ruleType:string,
 *             ruleValue:number, capped:boolean, reason?:string }|null}
 */
const calculateCommission = ({ policy, eligibleAmountPaise }) => {
    if (!policy) return { amountPaise: 0, eligiblePaise: 0, ruleType: "", ruleValue: 0, capped: false, reason: "No policy matched" };

    const eligible = Math.max(0, Math.round(Number(eligibleAmountPaise || 0)));
    if (eligible <= 0) {
        return { amountPaise: 0, eligiblePaise: 0, ruleType: policy.ruleType, ruleValue: policy.ruleValue, capped: false, reason: "No eligible sale amount" };
    }

    const minEligible = toPaise(policy.minEligibleAmount);
    if (minEligible > 0 && eligible < minEligible) {
        return { amountPaise: 0, eligiblePaise: eligible, ruleType: policy.ruleType, ruleValue: policy.ruleValue, capped: false, reason: "Sale amount below policy minimum" };
    }

    let basisPaise = eligible;
    let capped = false;

    if (policy.ruleType === "fixed") {
        // A fixed commission does not scale with the sale amount.
        const amountPaise = toPaise(policy.ruleValue);
        return { amountPaise, eligiblePaise: eligible, ruleType: "fixed", ruleValue: policy.ruleValue, capped: false };
    }

    // Percentage: the eligible amount may be capped by the policy.
    if (policy.maxEligibleAmount > 0) {
        const maxPaise = toPaise(policy.maxEligibleAmount);
        if (basisPaise > maxPaise) {
            basisPaise = maxPaise;
            capped = true;
        }
    }

    // rate -> basis points (2.5% -> 250 bps) so the multiplication is exact.
    const basisPoints = Math.round(Number(policy.ruleValue || 0) * 100);
    let amountPaise = Math.round((basisPaise * basisPoints) / 10000);

    if (policy.maxCommissionAmount > 0) {
        const maxPaise = toPaise(policy.maxCommissionAmount);
        if (amountPaise > maxPaise) {
            amountPaise = maxPaise;
            capped = true;
        }
    }

    return {
        amountPaise,
        eligiblePaise: basisPaise,
        ruleType: "percentage",
        ruleValue: policy.ruleValue,
        capped,
    };
};

/** Snapshot the policy onto the commission so later edits never rewrite history. */
const snapshotPolicy = (policy) => ({
    scope: policy.scope || "",
    ruleType: policy.ruleType || "",
    ruleValue: Number(policy.ruleValue || 0),
    brand: policy.brand || "",
    category: policy.category || "",
    eligibleAmountBasis: policy.eligibleAmountBasis || "",
    effectiveFrom: policy.effectiveFrom || null,
    effectiveTo: policy.effectiveTo || null,
    minEligibleAmount: Number(policy.minEligibleAmount || 0),
    maxEligibleAmount: Number(policy.maxEligibleAmount || 0),
    maxCommissionAmount: Number(policy.maxCommissionAmount || 0),
    payoutDelayDays: Number(policy.payoutDelayDays || 0),
    includesTaxes: policy.includesTaxes !== false,
    includesAccessories: policy.includesAccessories === true,
    includesRegistration: policy.includesRegistration === true,
});

/**
 * Create (or fetch) the commission for a verified sale.
 * Idempotent: calling it twice for the same sale never creates two
 * commissions — the unique index on `sale` is the final guard.
 */
const createCommissionForSale = async ({ sale, policy, actor, referralId = null }) => {
    const existing = await Commission.findOne({ sale: sale._id });
    if (existing && !["pending_verification", "rejected"].includes(existing.status)) {
        return { commission: existing, created: false };
    }

    const eligiblePaise = Math.max(0, Math.round(Number(sale.eligibleAmountPaise || 0)));
    const calc = calculateCommission({ policy, eligibleAmountPaise: eligiblePaise });

    const payableFrom = policy?.payoutDelayDays
        ? new Date(Date.now() + Number(policy.payoutDelayDays) * 24 * 60 * 60 * 1000)
        : new Date();
    const values = {
        dealership: sale.dealership,
        sale: sale._id,
        referral: referralId || sale.referral || null,
        policy: policy?._id || null,
        policySnapshot: policy ? snapshotPolicy(policy) : undefined,
        ruleType: calc.ruleType || policy?.ruleType || "fixed",
        ruleValue: calc.ruleValue || Number(policy?.ruleValue || 0),
        saleAmountPaise: eligiblePaise,
        commissionAmountPaise: calc.amountPaise,
        saleAmount: fromPaise(eligiblePaise),
        commissionAmount: fromPaise(calc.amountPaise),
        status: payableFrom <= new Date() ? "payable" : "approved",
        approvedBy: actor?._id || null,
        approvedAt: new Date(),
        payableFrom,
    };
    let commission;
    if (existing) {
        Object.assign(existing, values);
        commission = await existing.save();
    } else {
        commission = await Commission.create(values);
    }

    return { commission, created: !existing };
};

/** Total already paid out for a commission (paise), net of reversals. */
const paidAmountPaise = async (commissionId) => {
    const rows = await CommissionPayout.find({ commission: commissionId }).lean();
    return rows.reduce((sum, p) => sum + (p.isReversal ? -p.amountPaise : p.amountPaise), 0);
};

/**
 * Database-backed summary for the admin dashboard.
 * Every number comes from MongoDB — no mock statistics.
 */
const buildCommissionSummary = async (filter = {}) => {
    const referralFilter = filter.dealership ? { dealership: filter.dealership } : {};
    const saleFilter = filter.dealership ? { dealership: filter.dealership } : {};
    const commissionFilter = filter.dealership ? { dealership: filter.dealership } : {};

    const [totalReferrals, activeReferrals, pendingSales, verifiedSales, referralAgg, commissionAgg] =
        await Promise.all([
            Referral.countDocuments(referralFilter),
            Referral.countDocuments({
                ...referralFilter,
                status: { $nin: ["converted", "rejected", "expired"] },
            }),
            Sale.countDocuments({ ...saleFilter, commissionStatus: "pending_verification" }),
            Sale.countDocuments({ ...saleFilter, verified: true }),
            Referral.aggregate([
                { $match: referralFilter },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            Commission.aggregate([
                { $match: commissionFilter },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                        commissionPaise: { $sum: "$commissionAmountPaise" },
                        salePaise: { $sum: "$saleAmountPaise" },
                    },
                },
            ]),
        ]);

    const referralsByStatus = {};
    for (const row of referralAgg) referralsByStatus[row._id] = row.count;

    const byStatus = {};
    for (const row of commissionAgg) {
        byStatus[row._id] = {
            count: row.count,
            commissionPaise: row.commissionPaise,
            salePaise: row.salePaise,
        };
    }

    const sumPaise = (statuses) =>
        statuses.reduce((total, status) => total + (byStatus[status]?.commissionPaise || 0), 0);

    const salePaise = (statuses) =>
        statuses.reduce((total, status) => total + (byStatus[status]?.salePaise || 0), 0);

    const earnedStatuses = ["approved", "payable", "paid"];

    const [payoutAgg] = await CommissionPayout.aggregate([
        ...(filter.dealership ? [{ $match: { dealership: filter.dealership } }] : []),
        {
            $group: {
                _id: null,
                paidPaise: {
                    $sum: { $cond: [{ $ifNull: ["$isReversal", false] }, -"$amountPaise", "$amountPaise"] },
                },
            },
        },
    ]);

    return {
        referrals: {
            total: totalReferrals,
            active: activeReferrals,
            converted: referralsByStatus.converted || 0,
            rejected: referralsByStatus.rejected || 0,
            expired: referralsByStatus.expired || 0,
            byStatus: referralsByStatus,
            conversionRate:
                totalReferrals > 0
                    ? Math.round(((referralsByStatus.converted || 0) / totalReferrals) * 1000) / 10
                    : 0,
        },
        sales: {
            pendingVerification: pendingSales,
            verified: verifiedSales,
        },
        // Gross eligible sale value (NOT MOTOAI revenue).
        grossEligibleSaleValue: fromPaise(salePaise(earnedStatuses)),
        grossEligibleSaleValuePaise: salePaise(earnedStatuses),
        commission: {
            awaitingApproval: fromPaise(sumPaise(["pending_verification"])),
            earned: fromPaise(sumPaise(earnedStatuses)),
            earnedPaise: sumPaise(earnedStatuses),
            approved: fromPaise(sumPaise(["approved"])),
            payable: fromPaise(sumPaise(["payable"])),
            paid: fromPaise(sumPaise(["paid"])),
            disputed: fromPaise(sumPaise(["disputed"])),
            reversed: fromPaise(sumPaise(["reversed"])),
            rejected: fromPaise(sumPaise(["rejected"])),
            paidOutPaise: payoutAgg?.paidPaise || 0,
            paidOut: fromPaise(payoutAgg?.paidPaise || 0),
            counts: Object.fromEntries(
                Object.entries(byStatus).map(([status, data]) => [status, data.count])
            ),
        },
        averageEligibleSaleValue:
            (byStatus.approved?.count || 0) + (byStatus.payable?.count || 0) + (byStatus.paid?.count || 0) > 0
                ? fromPaise(
                      Math.round(
                          salePaise(earnedStatuses) /
                              ((byStatus.approved?.count || 0) +
                                  (byStatus.payable?.count || 0) +
                                  (byStatus.paid?.count || 0))
                      )
                  )
                : 0,
    };
};

/** Escape a CSV cell. */
const csvCell = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
};

/** Build a CSV document from rows + column definitions. */
const buildCsv = (columns, rows) => {
    const header = columns.map((c) => csvCell(c.label)).join(",");
    const body = rows.map((row) =>
        columns.map((c) => csvCell(typeof c.value === "function" ? c.value(row) : row[c.key])).join(",")
    );
    return [header, ...body].join("\n");
};

module.exports = {
    toPaise,
    fromPaise,
    buildPolicyKey,
    scorePolicy,
    resolvePolicy,
    calculateCommission,
    snapshotPolicy,
    createCommissionForSale,
    paidAmountPaise,
    buildCommissionSummary,
    buildCsv,
};
