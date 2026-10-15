import { apiFetch } from "./api";

const qs = (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") q.set(k, v);
    });
    const s = q.toString();
    return s ? `?${s}` : "";
};

export const getPanelOverview = () => apiFetch("/provider/panel/overview");

export const getPanelDealerships = () => apiFetch("/provider/panel/dealerships");

export const createPanelDealership = (payload) =>
    apiFetch("/provider/panel/dealerships", { method: "POST", body: JSON.stringify(payload) });

export const updatePanelDealership = (id, payload) =>
    apiFetch(`/provider/panel/dealerships/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const addDealershipStaff = (id, payload) =>
    apiFetch(`/provider/panel/dealerships/${id}/staff`, { method: "POST", body: JSON.stringify(payload) });

export const removeDealershipStaff = (id, userId) =>
    apiFetch(`/provider/panel/dealerships/${id}/staff/${userId}`, { method: "DELETE" });

export const getDealershipStock = (id) => apiFetch(`/provider/panel/dealerships/${id}/stock`);

export const updateDealershipStock = (id, payload) =>
    apiFetch(`/provider/panel/dealerships/${id}/stock`, { method: "PUT", body: JSON.stringify(payload) });

export const getPanelBookings = (params) => apiFetch(`/provider/panel/bookings${qs(params)}`);

export const updatePanelBooking = (id, payload) =>
    apiFetch(`/provider/panel/bookings/${id}`, { method: "PUT", body: JSON.stringify(payload) });

export const getPanelSales = (params) => apiFetch(`/provider/panel/sales${qs(params)}`);

export const createPanelSale = (payload) =>
    apiFetch("/provider/panel/sales", { method: "POST", body: JSON.stringify(payload) });

export const verifyPanelSale = (id, payload = {}) =>
    apiFetch(`/provider/panel/sales/${id}/verify`, { method: "POST", body: JSON.stringify(payload) });

export const getPanelReviews = (params) => apiFetch(`/provider/panel/reviews${qs(params)}`);

export const respondPanelReview = (id, text) =>
    apiFetch(`/provider/panel/reviews/${id}/respond`, { method: "POST", body: JSON.stringify({ text }) });

export const getPanelNotifications = (params) => apiFetch(`/provider/panel/notifications${qs(params)}`);

export const markPanelNotificationRead = (id) =>
    apiFetch(`/provider/panel/notifications/${id}/read`, { method: "PUT" });

export const getPanelAudit = (params) => apiFetch(`/provider/panel/audit${qs(params)}`);

export const downloadPanelReport = async (type) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`http://localhost:5000/api/provider/panel/reports?type=${type}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!response.ok) throw new Error("Failed to download report");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-report.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};
