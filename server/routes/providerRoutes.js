const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Booking = require("../models/Booking");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

// Allow both providers and admins (frontend ProtectedRoute uses ["provider", "admin"])
const providerOnly = authorize("provider", "admin");

// =====================================================
// TEST ROUTE
// GET /api/provider/test
// =====================================================

router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Provider routes are working 🚀",
    });
});

// =====================================================
// PROVIDER DASHBOARD
// GET /api/provider/dashboard
// =====================================================

router.get(
    "/dashboard",
    protect,
    providerOnly,
    async (req, res) => {
        try {
            const providerId = req.user._id;

            const bookings = await Booking.find({
                provider: providerId,
            });

            const totalBookings = bookings.length;

            const pendingBookings =
                bookings.filter(
                    (booking) =>
                        String(
                            booking.status
                        ).toLowerCase() === "pending"
                ).length;

            const completedBookings =
                bookings.filter(
                    (booking) =>
                        String(
                            booking.status
                        ).toLowerCase() === "completed"
                ).length;

            const totalEarnings =
                bookings
                    .filter(
                        (booking) =>
                            String(
                                booking.status
                            ).toLowerCase() ===
                            "completed"
                    )
                    .reduce(
                        (total, booking) =>
                            total +
                            Number(
                                booking.amount ||
                                booking.price ||
                                booking.totalAmount ||
                                0
                            ),
                        0
                    );

            res.json({
                success: true,

                data: {
                    totalBookings,
                    pendingBookings,
                    completedBookings,
                    totalEarnings,
                },
            });
        } catch (error) {
            console.error(
                "Provider dashboard error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load provider dashboard",
                error: error.message,
            });
        }
    }
);

// =====================================================
// GET PROVIDER PROFILE
// GET /api/provider/profile
// =====================================================

router.get(
    "/profile",
    protect,
    providerOnly,
    async (req, res) => {
        try {
            const provider =
                await User.findById(
                    req.user._id
                ).select("-password");

            if (!provider) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Provider not found",
                });
            }

            res.json({
                success: true,
                data: provider,
            });
        } catch (error) {
            console.error(
                "Get provider profile error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load provider profile",
                error: error.message,
            });
        }
    }
);

// =====================================================
// UPDATE PROVIDER PROFILE
// PUT /api/provider/profile
// =====================================================

router.put(
    "/profile",
    protect,
    providerOnly,
    async (req, res) => {
        try {
            const provider =
                await User.findById(
                    req.user._id
                );

            if (!provider) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Provider not found",
                });
            }

            // Update name
            if (
                req.body.name !== undefined
            ) {
                provider.name =
                    req.body.name.trim();
            }

            // Update phone
            if (
                req.body.phone !== undefined
            ) {
                provider.phone =
                    req.body.phone.trim();
            }

            // Update address
            if (
                req.body.address !== undefined
            ) {
                provider.address =
                    req.body.address.trim();
            }

            await provider.save();

            // Never send password hash
            const safeProvider =
                provider.toObject();

            delete safeProvider.password;

            res.json({
                success: true,
                message:
                    "Profile updated successfully",
                data: safeProvider,
            });
        } catch (error) {
            console.error(
                "Profile update error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update profile",
                error: error.message,
            });
        }
    }
);

// =====================================================
// GET PROVIDER BOOKINGS
// GET /api/provider/bookings
// =====================================================

router.get(
    "/bookings",
    protect,
    providerOnly,
    async (req, res) => {
        try {
            const bookings =
                await Booking.find({
                    provider:
                        req.user._id,
                })
                    .populate(
                        "customer",
                        "name email phone"
                    )
                    .sort({
                        createdAt: -1,
                    });

            res.json({
                success: true,
                data: bookings,
            });
        } catch (error) {
            console.error(
                "Get provider bookings error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load bookings",
                error: error.message,
            });
        }
    }
);

// =====================================================
// GET SINGLE BOOKING
// GET /api/provider/bookings/:id
// =====================================================

router.get(
    "/bookings/:id",
    protect,
    providerOnly,
    async (req, res) => {
        try {
            const booking =
                await Booking.findOne({
                    _id: req.params.id,
                    provider:
                        req.user._id,
                }).populate(
                    "customer",
                    "name email phone"
                );

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found",
                });
            }

            res.json({
                success: true,
                data: booking,
            });
        } catch (error) {
            console.error(
                "Get booking error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load booking",
                error: error.message,
            });
        }
    }
);

// =====================================================
// ACCEPT BOOKING
// PUT /api/provider/bookings/:id/accept
// =====================================================

router.put(
    "/bookings/:id/accept",
    protect,
    providerOnly,
    async (req, res) => {
        try {
            const booking =
                await Booking.findOne({
                    _id: req.params.id,
                    provider:
                        req.user._id,
                });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found",
                });
            }

            booking.status = "accepted";

            await booking.save();

            res.json({
                success: true,
                message:
                    "Booking accepted successfully",
                data: booking,
            });
        } catch (error) {
            console.error(
                "Accept booking error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to accept booking",
                error: error.message,
            });
        }
    }
);

// =====================================================
// REJECT BOOKING
// PUT /api/provider/bookings/:id/reject
// =====================================================

router.put(
    "/bookings/:id/reject",
    protect,
    providerOnly,
    async (req, res) => {
        try {
            const booking =
                await Booking.findOne({
                    _id: req.params.id,
                    provider:
                        req.user._id,
                });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found",
                });
            }

            booking.status = "rejected";

            await booking.save();

            res.json({
                success: true,
                message:
                    "Booking rejected successfully",
                data: booking,
            });
        } catch (error) {
            console.error(
                "Reject booking error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to reject booking",
                error: error.message,
            });
        }
    }
);

// =====================================================
// START BOOKING
// PUT /api/provider/bookings/:id/start
// =====================================================

router.put(
    "/bookings/:id/start",
    protect,
    providerOnly,
    async (req, res) => {
        try {
            const booking =
                await Booking.findOne({
                    _id: req.params.id,
                    provider:
                        req.user._id,
                });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found",
                });
            }

            booking.status = "ongoing";

            await booking.save();

            res.json({
                success: true,
                message:
                    "Job started successfully",
                data: booking,
            });
        } catch (error) {
            console.error(
                "Start booking error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to start job",
                error: error.message,
            });
        }
    }
);

// =====================================================
// COMPLETE BOOKING
// PUT /api/provider/bookings/:id/complete
// =====================================================

router.put(
    "/bookings/:id/complete",
    protect,
    providerOnly,
    async (req, res) => {
        try {
            const booking =
                await Booking.findOne({
                    _id: req.params.id,
                    provider:
                        req.user._id,
                });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found",
                });
            }

            booking.status = "completed";

            await booking.save();

            res.json({
                success: true,
                message:
                    "Job completed successfully",
                data: booking,
            });
        } catch (error) {
            console.error(
                "Complete booking error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to complete job",
                error: error.message,
            });
        }
    }
);

// =====================================================
// UPDATE BOOKING STATUS
// PUT /api/provider/bookings/:id/status
// =====================================================

router.put(
    "/bookings/:id/status",
    protect,
    providerOnly,
    async (req, res) => {
        try {
            const { status } = req.body;

            const allowedStatuses = [
                "pending",
                "accepted",
                "confirmed",
                "ongoing",
                "started",
                "completed",
                "rejected",
                "cancelled",
            ];

            if (
                !allowedStatuses.includes(
                    String(status).toLowerCase()
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid booking status",
                });
            }

            const booking =
                await Booking.findOne({
                    _id: req.params.id,
                    provider:
                        req.user._id,
                });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found",
                });
            }

            booking.status =
                String(status).toLowerCase();

            await booking.save();

            res.json({
                success: true,
                message:
                    "Booking status updated successfully",
                data: booking,
            });
        } catch (error) {
            console.error(
                "Update booking status error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update booking status",
                error: error.message,
            });
        }
    }
);

// =====================================================
// PROVIDER EARNINGS
// GET /api/provider/earnings
// =====================================================

router.get(
    "/earnings",
    protect,
    providerOnly,
    async (req, res) => {
        try {
            const bookings =
                await Booking.find({
                    provider:
                        req.user._id,
                    status: "completed",
                });

            const totalEarnings =
                bookings.reduce(
                    (total, booking) =>
                        total +
                        Number(
                            booking.amount ||
                            booking.price ||
                            booking.totalAmount ||
                            0
                        ),
                    0
                );

            res.json({
                success: true,
                data: {
                    totalEarnings,
                    completedJobs:
                        bookings.length,
                },
            });
        } catch (error) {
            console.error(
                "Provider earnings error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load earnings",
                error: error.message,
            });
        }
    }
);

module.exports = router;