const {
    effectivePlan,
    walletOf,
    planConfig,
} = require("../utils/aiTokens");

// =====================================================
// GET WALLET — GET /api/ai-tokens
// =====================================================
const getWallet = async (req, res) => {
    try {
        await effectivePlan(req.user);

        res.status(200).json({
            success: true,
            ...walletOf(req.user),
            config: planConfig(),
        });
    } catch (error) {
        console.error("Get wallet error:", error.message);
        res.status(500).json({
            success: false,
            message: "Could not load token balance.",
        });
    }
};

module.exports = { getWallet };
