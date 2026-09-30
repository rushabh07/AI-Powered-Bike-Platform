// Central Razorpay client (Test Mode).
// Never imported by frontend code — secrets stay on the backend.
let cached = null;

const isConfigured = () =>
    !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;

const getClient = () => {
    if (!isConfigured()) {
        throw new Error(
            "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
        );
    }
    if (!cached) {
        // Optional dependency guard (kept for clarity even though
        // `razorpay` is a declared backend dependency).
        // eslint-disable-next-line global-require, import/no-unresolved
        const Razorpay = require("razorpay");
        cached = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return cached;
};

module.exports = { isConfigured, getClient };
