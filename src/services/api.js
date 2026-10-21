const API_BASE = "http://localhost:5000/api";

export const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

// Central authenticated request helper.
// 401 → clears session and redirects to login.
// Throws ApiError { status, message } otherwise.
export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export const apiFetch = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...(options.headers || {}),
        },
    });

    if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        throw new ApiError(401, "Session expired. Please login again.");
    }

    let data = {};
    try {
        data = await response.json();
    } catch {
        /* non-JSON body */
    }

    if (!response.ok || data.success === false) {
        throw new ApiError(
            response.status,
            data.message || `Request failed (${response.status})`
        );
    }

    return data;
};

// ==========================================
// Subscription & Plans API
// ==========================================

export const getSubscriptionPlans = async () => {
    const response = await fetch(`${API_BASE}/subscription/plans`);
    if (!response.ok) {
        throw new Error("Failed to fetch subscription plans");
    }
    return response.json();
};

export const getSubscriptionStatus = async () => {
    const response = await fetch(`${API_BASE}/subscription/status`, {
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        throw new Error("Failed to fetch subscription status");
    }
    return response.json();
};

export const createSubscriptionOrder = async (plan) => {
    const response = await fetch(`${API_BASE}/subscription/create-order`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create subscription order");
    }
    return data;
};

export const verifySubscriptionPayment = async (payload) => {
    const response = await fetch(`${API_BASE}/subscription/verify-payment`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || "Payment verification failed");
    }
    return data;
};

// ==========================================
// AI Token API
// ==========================================

export const getAiTokens = async () => {
    const response = await fetch(`${API_BASE}/ai-tokens`, {
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        throw new Error("Failed to fetch AI tokens");
    }
    return response.json();
};

// ==========================================
// User Panel API (all MongoDB-driven)
// ==========================================

export const getUserDashboard = () => apiFetch("/user/dashboard");

export const getUserProfile = () => apiFetch("/user/profile");

export const updateUserProfile = (payload) =>
    apiFetch("/user/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const getUserFavorites = () => apiFetch("/user/favorites");

export const addUserFavorite = (motorcycleId) =>
    apiFetch(`/user/favorites/${motorcycleId}`, { method: "POST" });

export const removeUserFavorite = (motorcycleId) =>
    apiFetch(`/user/favorites/${motorcycleId}`, { method: "DELETE" });

export const changeUserPassword = (payload) =>
    apiFetch("/user/change-password", {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const deleteUserAccount = () =>
    apiFetch("/user/account", {
        method: "DELETE",
        body: JSON.stringify({ confirm: true }),
    });

// ==========================================
// Comparisons API
// ==========================================

export const getComparisons = () => apiFetch("/comparisons");

export const getComparison = (id) => apiFetch(`/comparisons/${id}`);

export const createComparison = (motorcycleIds) =>
    apiFetch("/comparisons", {
        method: "POST",
        body: JSON.stringify({ motorcycleIds }),
    });

export const deleteComparison = (id) =>
    apiFetch(`/comparisons/${id}`, { method: "DELETE" });

// ==========================================
// Motorcycles API (existing backend)
// ==========================================

export const searchMotorcycles = async (query) => {
    const params = new URLSearchParams();
    if (query && query.trim()) params.set("search", query.trim());
    const response = await fetch(
        `${API_BASE}/motorcycles?${params.toString()}`
    );
    if (!response.ok) {
        throw new Error("Failed to search motorcycles");
    }
    const data = await response.json();
    return data.motorcycles || [];
};

export const getAllMotorcycles = async () => searchMotorcycles("");

export const getMotorcycle = async (id) => {
    const response = await fetch(`${API_BASE}/motorcycles/${id}`);
    if (!response.ok) {
        throw new Error("Motorcycle not found");
    }
    const data = await response.json();
    return data.motorcycle;
};

// ==========================================
// Notifications API (in-app only)
// ==========================================

export const getNotifications = () => apiFetch("/notifications");

export const markNotificationRead = (id) =>
    apiFetch(`/notifications/${id}/read`, { method: "PUT" });

export const markAllNotificationsRead = () =>
    apiFetch("/notifications/read-all", { method: "PUT" });

export const deleteNotification = (id) =>
    apiFetch(`/notifications/${id}`, { method: "DELETE" });

// ==========================================
// Subscriptions API
// ==========================================

export const getSubscriptionHistory = () =>
    apiFetch("/subscription/history");

// ==========================================
// Chats API (existing chat system)
// ==========================================

export const getChats = () => apiFetch("/chats");

export const renameChat = (id, title) =>
    apiFetch(`/chats/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title }),
    });

export const deleteChat = (id) =>
    apiFetch(`/chats/${id}`, { method: "DELETE" });

// ==========================================
// Admin AI Subscription & Analytics API
// ==========================================

export const getAdminSubscriptionStats = () =>
    apiFetch("/admin/subscription-stats");

export const getAdminSubscriptionAnalytics = (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const query = qs.toString();
    return apiFetch(`/admin/subscription-analytics${query ? `?${query}` : ""}`);
};

export const getAdminSubscriptions = (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const query = qs.toString();
    return apiFetch(`/admin/subscriptions${query ? `?${query}` : ""}`);
};

export const getAdminSubscriptionDetails = (id) =>
    apiFetch(`/admin/subscriptions/${id}`);

export const getAdminExpiringSubscriptions = (days = 7) =>
    apiFetch(`/admin/subscriptions/expiring?days=${days}`);

export const getAdminLowTokenUsers = (threshold = 5) =>
    apiFetch(`/admin/subscriptions/low-tokens?threshold=${threshold}`);

// ==========================================
// Admin Advertisements API
// ==========================================

const adQuery = (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const query = qs.toString();
    return query ? `?${query}` : "";
};

export const getAdminAdvertisements = (params = {}) =>
    apiFetch(`/admin/advertisements${adQuery(params)}`);

export const getAdminAdvertisement = (id) =>
    apiFetch(`/admin/advertisements/${id}`);

export const createAdminAdvertisement = (payload) =>
    apiFetch("/admin/advertisements", {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const updateAdminAdvertisement = (id, payload) =>
    apiFetch(`/admin/advertisements/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const setAdminAdvertisementStatus = (id, status) =>
    apiFetch(`/admin/advertisements/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });

export const reorderAdminAdvertisements = (order) =>
    apiFetch("/admin/advertisements/reorder", {
        method: "PATCH",
        body: JSON.stringify({ order }),
    });

export const deleteAdminAdvertisement = (id) =>
    apiFetch(`/admin/advertisements/${id}`, { method: "DELETE" });

// ==========================================
// Public Advertisements API
// ==========================================

export const getPublicAdvertisements = async (placement = "homepage") => {
    const response = await fetch(
        `${API_BASE}/advertisements?placement=${encodeURIComponent(placement)}`
    );
    if (!response.ok) throw new Error("Failed to fetch advertisements");
    return response.json();
};

export const trackAdImpression = (id) =>
    fetch(`${API_BASE}/advertisements/${id}/impression`, { method: "POST" }).catch(() => {});

export const trackAdClick = (id) =>
    fetch(`${API_BASE}/advertisements/${id}/click`, { method: "POST" }).catch(() => {});

export const exportAdminSubscriptionsCsv = async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const query = qs.toString();
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/admin/subscriptions/export${query ? `?${query}` : ""}`, {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    if (!response.ok) throw new Error("Failed to download CSV");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `motoai_subscriptions_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const getMotorcycleVariants = async (motorcycleId) => {
    const response = await fetch(`${API_BASE}/variants/motorcycles/${motorcycleId}`);
    if (!response.ok) {
        throw new Error("Failed to fetch variants");
    }
    return response.json();
};

// Bike Enquiries
export const createBikeEnquiry = (payload) =>
    apiFetch("/bike-enquiries", { method: "POST", body: JSON.stringify(payload) });

export const getMyBikeEnquiries = () => apiFetch("/bike-enquiries/my");

export const cancelBikeEnquiry = (enquiryId) =>
    apiFetch(`/bike-enquiries/${enquiryId}/cancel`, { method: "POST" });

// Dealerships
export const getDealershipsByCity = (city) =>
    apiFetch(`/dealerships/city/${encodeURIComponent(city)}`);

export const getAdminEnquiryStats = () => apiFetch("/bike-enquiries/admin/stats");

export const getAdminAllEnquiries = (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    const query = qs.toString();
    return apiFetch(`/bike-enquiries/admin/all${query ? `?${query}` : ""}`);
};

export const updateAdminEnquiryStatus = (enquiryId, payload) =>
    apiFetch(`/bike-enquiries/admin/${enquiryId}/status`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

// Admin Dealerships
export const getAdminAllDealerships = () => apiFetch("/dealerships/admin/all");

export const createDealership = (payload) =>
    apiFetch("/dealerships", { method: "POST", body: JSON.stringify(payload) });

export const updateDealership = (dealershipId, payload) =>
    apiFetch(`/dealerships/${dealershipId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const deleteDealership = (dealershipId) =>
    apiFetch(`/dealerships/${dealershipId}`, { method: "DELETE" });

export const updateMotorcycleColors = (motorcycleId, colors) =>
    apiFetch(`/motorcycles/${motorcycleId}/colors`, {
        method: "PUT",
        body: JSON.stringify({ colors }),
    });

export const getMotorcycleReviews = async (motorcycleId) => {
    const response = await fetch(`${API_BASE}/reviews/motorcycle/${motorcycleId}`);
    if (!response.ok) throw new Error("Failed to fetch reviews");
    return response.json();
};

export const getGroupedReviews = async (motorcycleId) => {
    const response = await fetch(`${API_BASE}/reviews/motorcycle/${motorcycleId}/grouped`);
    if (!response.ok) throw new Error("Failed to fetch grouped reviews");
    return response.json();
};

export const createReview = (payload) =>
    apiFetch("/reviews", { method: "POST", body: JSON.stringify(payload) });

export const updateReview = (reviewId, payload) =>
    apiFetch(`/reviews/${reviewId}`, { method: "PUT", body: JSON.stringify(payload) });

export const deleteReview = (reviewId) =>
    apiFetch(`/reviews/${reviewId}`, { method: "DELETE" });

export const getMyReviews = () => apiFetch("/reviews/my");

export const getReviewEligibility = (motorcycleId) =>
    apiFetch(`/reviews/motorcycle/${motorcycleId}/eligibility`);

// Paginated public reviews for ONE motorcycle (spec-shaped endpoint)
export const getMotorcycleReviewsPaged = async (motorcycleId, params = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", params.page);
    if (params.limit) qs.set("limit", params.limit);
    if (params.sort) qs.set("sort", params.sort);
    if (params.rating) qs.set("rating", params.rating);
    const query = qs.toString();
    const response = await fetch(
        `${API_BASE}/motorcycles/${motorcycleId}/reviews${query ? `?${query}` : ""}`
    );
    if (!response.ok) throw new Error("Failed to fetch reviews");
    return response.json();
};

export const getReviewSummary = async (motorcycleId) => {
    const response = await fetch(`${API_BASE}/motorcycles/${motorcycleId}/reviews/summary`);
    if (!response.ok) throw new Error("Failed to fetch rating summary");
    return response.json();
};

// Bulk summaries for listing cards / search / related bikes (1 request)
export const getBulkReviewSummaries = async (motorcycleIds) => {
    if (!motorcycleIds || motorcycleIds.length === 0) return {};
    const response = await fetch(
        `${API_BASE}/reviews/summaries?ids=${encodeURIComponent(motorcycleIds.join(","))}`
    );
    if (!response.ok) throw new Error("Failed to fetch rating summaries");
    const data = await response.json();
    return data.summaries || {};
};

export const submitMotorcycleReview = (motorcycleId, payload) =>
    apiFetch(`/motorcycles/${motorcycleId}/reviews`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const toggleReviewHelpful = (reviewId) =>
    apiFetch(`/reviews/${reviewId}/helpful`, { method: "POST" });

// Admin moderation
export const getAdminReviews = (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const query = qs.toString();
    return apiFetch(`/reviews/admin/all${query ? `?${query}` : ""}`);
};

export const moderateReview = (reviewId, status) =>
    apiFetch(`/reviews/admin/${reviewId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });

export const recalculateAllRatings = () =>
    apiFetch("/reviews/admin/recalculate", { method: "POST" });

// ==========================================
// Motorcycle Updates API
// ==========================================

export const getPublicUpdates = (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const query = qs.toString();
    return apiFetch(`/updates${query ? `?${query}` : ""}`);
};

export const getPublicUpdateBySlug = (slug) => apiFetch(`/updates/${encodeURIComponent(slug)}`);

export const getAdminUpdates = (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const query = qs.toString();
    return apiFetch(`/admin/updates${query ? `?${query}` : ""}`);
};

export const getAdminUpdate = (id) => apiFetch(`/admin/updates/${id}`);

export const createUpdate = (payload) =>
    apiFetch("/admin/updates", { method: "POST", body: JSON.stringify(payload) });

export const updateUpdate = (id, payload) =>
    apiFetch(`/admin/updates/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const setUpdateStatus = (id, status) =>
    apiFetch(`/admin/updates/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });

export const deleteUpdate = (id) =>
    apiFetch(`/admin/updates/${id}`, { method: "DELETE" });

// ==========================================
// Homepage CMS API
// ==========================================

export const getPublicHomepage = () => apiFetch("/homepage");

export const getAdminHomepage = () => apiFetch("/admin/homepage");

export const saveHomepageDraft = (sections) =>
    apiFetch("/admin/homepage", {
        method: "PUT",
        body: JSON.stringify({ sections }),
    });

export const publishHomepage = () =>
    apiFetch("/admin/homepage/publish", { method: "POST", body: JSON.stringify({}) });

export const previewHomepage = () =>
    apiFetch("/admin/homepage/preview", { method: "POST", body: JSON.stringify({}) });

export const restoreHomepage = () =>
    apiFetch("/admin/homepage/restore", { method: "POST", body: JSON.stringify({}) });

// ==========================================
// Motorcycle Orders (online + offline)
// ==========================================

// Offline dealership purchase requests only
export const createOfflineOrder = (payload) =>
    apiFetch("/orders/offline", { method: "POST", body: JSON.stringify(payload) });

export const createOnlineOrder = (payload) => createOfflineOrder(payload);

export const getMyOrders = () => apiFetch("/orders/my");

export const getOrder = (orderId) => apiFetch(`/orders/${orderId}`);

export const cancelOrder = (orderId, reason) =>
    apiFetch(`/orders/${orderId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
    });

export const getStaffOrders = (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const query = qs.toString();
    return apiFetch(`/orders${query ? `?${query}` : ""}`);
};

export const dealerConfirmOrder = (orderId) =>
    apiFetch(`/orders/${orderId}/confirm`, { method: "POST" });

export const dealerRejectOrder = (orderId, reason) =>
    apiFetch(`/orders/${orderId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
    });

export const verifyOfflineOrderPayment = (orderId, payload) =>
    apiFetch(`/orders/${orderId}/verify-offline-payment`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const updateOrderFulfilment = (orderId, payload) =>
    apiFetch(`/orders/${orderId}/fulfilment`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

