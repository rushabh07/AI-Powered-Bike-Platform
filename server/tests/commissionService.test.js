const test = require("node:test");
const assert = require("node:assert/strict");

const { calculateCommission, toPaise, fromPaise } = require("../services/commissionService");
const { generateReferralCode, canTransition } = require("../services/referralService");

test("percentage commissions use integer paise arithmetic", () => {
    const result = calculateCommission({
        policy: { ruleType: "percentage", ruleValue: 2, minEligibleAmount: 0, maxEligibleAmount: 0, maxCommissionAmount: 0 },
        eligibleAmountPaise: toPaise(150000),
    });
    assert.equal(result.amountPaise, toPaise(3000));
    assert.equal(fromPaise(result.amountPaise), 3000);
});

test("fixed commissions and policy caps are applied", () => {
    const fixed = calculateCommission({
        policy: { ruleType: "fixed", ruleValue: 1250, minEligibleAmount: 0 },
        eligibleAmountPaise: toPaise(200000),
    });
    assert.equal(fixed.amountPaise, toPaise(1250));

    const capped = calculateCommission({
        policy: { ruleType: "percentage", ruleValue: 5, minEligibleAmount: 0, maxEligibleAmount: 100000, maxCommissionAmount: 4000 },
        eligibleAmountPaise: toPaise(200000),
    });
    assert.equal(capped.amountPaise, toPaise(4000));
    assert.equal(capped.capped, true);
});

test("minimum eligible amount rejects undersized sales", () => {
    const result = calculateCommission({
        policy: { ruleType: "fixed", ruleValue: 500, minEligibleAmount: 100000 },
        eligibleAmountPaise: toPaise(99999),
    });
    assert.equal(result.amountPaise, 0);
    assert.match(result.reason, /below policy minimum/);
});

test("referral codes are hard to guess and statuses enforce forward transitions", () => {
    const one = generateReferralCode();
    const two = generateReferralCode();
    assert.match(one, /^REF-[A-Z0-9]{10}$/);
    assert.notEqual(one, two);
    assert.equal(canTransition("new", "contacted"), true);
    assert.equal(canTransition("converted", "contacted"), false);
});
