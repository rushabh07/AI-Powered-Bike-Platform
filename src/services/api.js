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
// Reviews & Ratings API
// ==========================================

export const getMotorcycleReviews = async (motorcycleId) => {
    const response = await fetch(
        `${API_BASE}/reviews/motorcycle/${motorcycleId}`
    );
    if (!response.ok) {
        throw new Error("Failed to fetch reviews");
    }
    return response.json();
};

export const createReview = (payload) =>
    apiFetch("/reviews", {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const updateReview = (reviewId, payload) =>
    apiFetch(`/reviews/${reviewId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const deleteReview = (reviewId) =>
    apiFetch(`/reviews/${reviewId}`, { method: "DELETE" });

export const getMyReviews = () => apiFetch("/reviews/my");

// ==========================================
// Motorcycle Purchase / Orders API
// ==========================================

export const createOrder = (payload) =>
    apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const getOrder = (orderId) => apiFetch(`/orders/${orderId}`);

export const getMyOrders = () => apiFetch("/orders/my");

export const createOrderPayment = (orderId) =>
    apiFetch(`/orders/${orderId}/create-payment`, { method: "POST" });

export const verifyOrderPayment = (orderId, payload) =>
    apiFetch(`/orders/${orderId}/verify-payment`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const cancelOrder = (orderId) =>
    apiFetch(`/orders/${orderId}/cancel`, { method: "POST" });

// ==========================================
// Motorcycle Variants API
// ==========================================

export const getMotorcycleVariants = async (motorcycleId) => {
    const response = await fetch(
        `${API_BASE}/variants/motorcycles/${motorcycleId}`
    );
    if (!response.ok) {
        throw new Error("Failed to fetch variants");
    }
    return response.json();
};

export const getVariant = async (variantId, city) => {
    const params = city ? `?city=${encodeURIComponent(city)}` : "";
    const response = await fetch(`${API_BASE}/variants/${variantId}${params}`);
    if (!response.ok) {
        throw new Error("Failed to fetch variant");
    }
    return response.json();
};

export const createVariant = (payload) =>
    apiFetch("/variants", {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const updateVariant = (variantId, payload) =>
    apiFetch(`/variants/${variantId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const deleteVariant = (variantId) =>
    apiFetch(`/variants/${variantId}`, { method: "DELETE" });
