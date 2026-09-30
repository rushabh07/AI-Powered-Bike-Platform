import React from "react";
import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute component for Role-Based Access Control (RBAC)
 * 
 * - If unauthenticated user tries protected route -> redirects to /login
 * - If user does not have required role -> redirects to /
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem("token");
    const userString = localStorage.getItem("user");

    // Redirect unauthenticated user to /login
    if (!token || !userString) {
        return <Navigate to="/login" replace />;
    }

    try {
        const user = JSON.parse(userString);

        // Normalise: "customer" is treated the same as "user"
        // (Login.jsx uses the same normalisation)
        const normalise = (r) => (r === "customer" ? "user" : r);
        const normRole = normalise(user?.role);
        const normAllowed = (allowedRoles || []).map(normalise);

        // Redirect user without required role to /
        if (normAllowed.length > 0) {
            if (!normAllowed.includes(normRole)) {
                return <Navigate to="/" replace />;
            }
        }

        return children;
    } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return <Navigate to="/login" replace />;
    }
};

export default ProtectedRoute;
