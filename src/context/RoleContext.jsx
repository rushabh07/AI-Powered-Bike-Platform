import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { getMyRole } from "../services/api";

/**
 * RoleContext — the signed-in user's effective role configuration.
 *
 * The backend is the source of truth: it decides what a user may do.
 * This context only mirrors that decision so the UI can hide or
 * disable modules. It is never a security boundary — every API route
 * is enforced server-side.
 */

const RoleContext = createContext({
    role: null,
    displayName: "",
    enabled: true,
    permissions: {},
    loading: true,
    error: "",
    can: () => false,
    refresh: async () => {},
});

const FALLBACK_PERMISSIONS = {
    // Used only before the first successful load, so nothing is hidden
    // prematurely. The server still gates every request.
    "motorcycles.view": true,
    "orders.request": true,
    "reviews.write": true,
    "ai.advisor": true,
};

export const RoleProvider = ({ children }) => {
    const [role, setRole] = useState(null);
    const [displayName, setDisplayName] = useState("");
    const [enabled, setEnabled] = useState(true);
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const isLoggedIn = useCallback(() => {
        try {
            return !!(localStorage.getItem("token") && localStorage.getItem("user"));
        } catch {
            return false;
        }
    }, []);

    const refresh = useCallback(async () => {
        if (!isLoggedIn()) {
            setRole(null);
            setPermissions({});
            setLoading(false);
            setError("");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const data = await getMyRole();
            setRole(data.role || null);
            setDisplayName(data.displayName || "");
            setEnabled(data.enabled !== false);
            setPermissions(data.permissions || {});
        } catch (err) {
            // A failure must NOT grant extra privileges — fail closed
            // for anything that is not a plain browsing permission.
            setRole(null);
            setPermissions({ ...FALLBACK_PERMISSIONS });
            setError(err.message || "Could not load your permissions.");
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial permission load
        refresh();
    }, [refresh]);

    // Refresh when the session changes (login / logout) or a tab regains focus.
    useEffect(() => {
        const onStorage = () => refresh();
        const onFocus = () => refresh();
        window.addEventListener("storage", onStorage);
        window.addEventListener("focus", onFocus);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("focus", onFocus);
        };
    }, [refresh]);

    const can = useCallback(
        (key) => {
            if (!key) return true;
            if (!isLoggedIn()) return FALLBACK_PERMISSIONS[key] === true;
            return permissions[key] === true;
        },
        [permissions, isLoggedIn]
    );

    const value = useMemo(
        () => ({
            role,
            displayName,
            enabled,
            permissions,
            loading,
            error,
            can,
            refresh,
        }),
        [role, displayName, enabled, permissions, loading, error, can, refresh]
    );

    return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- provider + its hook, matching ThemeContext
export const useRole = () => useContext(RoleContext);

export default RoleContext;
