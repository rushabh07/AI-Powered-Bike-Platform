import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import {
    getUserFavorites,
    addUserFavorite,
    removeUserFavorite,
} from "../services/api";

// =================================================================
// WISHLIST CONTEXT
// Single source of truth for favorites across:
//   Motorcycles.jsx, MotorcycleDetails.jsx,
//   UserDashboard.jsx, UserFavorites.jsx
//
// • Fetches from MongoDB on mount (if user is logged in)
// • Clears on logout (listens for "wishlistClear" custom event)
// • Re-fetches on "wishlistRefresh" custom event
// • Provides optimistic UI — toggling is instant, server confirms
// =================================================================

const WishlistContext = createContext({
    favoriteIds: new Set(),
    favorites: [],
    loading: false,
    isFavorite: () => false,
    toggle: async () => {},
    refetch: async () => {},
    clear: () => {},
});

export const useWishlist = () => useContext(WishlistContext);

const isLoggedIn = () => {
    try {
        return !!(
            localStorage.getItem("token") &&
            localStorage.getItem("user")
        );
    } catch {
        return false;
    }
};

export function WishlistProvider({ children }) {
    const [favorites, setFavorites] = useState([]);   // full populated objects
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Derived set of IDs for O(1) lookup
    const favoriteIds = new Set(favorites.map((b) => String(b._id)));

    // ---------------------------------------------------------------
    // FETCH from MongoDB
    // ---------------------------------------------------------------
    const refetch = useCallback(async () => {
        if (!isLoggedIn()) {
            setFavorites([]);
            return;
        }
        setLoading(true);
        setError("");
        try {
            const data = await getUserFavorites();
            setFavorites(data.favorites || []);
        } catch (err) {
            // 401 => apiFetch already redirects; just clear locally
            if (err?.status === 401) {
                setFavorites([]);
            } else {
                setError(err.message || "Could not load favorites.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Clear (on logout)
    const clear = useCallback(() => {
        setFavorites([]);
        setError("");
    }, []);

    // ---------------------------------------------------------------
    // INITIAL LOAD + event listeners
    // ---------------------------------------------------------------
    useEffect(() => {
        refetch();

        const handleStorage = (e) => {
            // token removed => logout
            if (e.key === "token" && !e.newValue) {
                clear();
            }
            // token added => login
            if (e.key === "token" && e.newValue) {
                refetch();
            }
        };

        const handleClear = () => clear();
        const handleRefresh = () => refetch();

        window.addEventListener("storage", handleStorage);
        window.addEventListener("wishlistClear", handleClear);
        window.addEventListener("wishlistRefresh", handleRefresh);

        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("wishlistClear", handleClear);
            window.removeEventListener("wishlistRefresh", handleRefresh);
        };
    }, [refetch, clear]);

    // ---------------------------------------------------------------
    // TOGGLE (add / remove) — optimistic update
    // ---------------------------------------------------------------
    const toggle = useCallback(
        async (bikeId, navigate) => {
            // Redirect to login if not authenticated
            if (!isLoggedIn()) {
                if (navigate) navigate("/login");
                else window.location.href = "/login";
                return;
            }

            const id = String(bikeId);
            const alreadySaved = favoriteIds.has(id);

            // Optimistic: update UI immediately
            if (alreadySaved) {
                setFavorites((prev) =>
                    prev.filter((b) => String(b._id) !== id)
                );
            } else {
                // Placeholder until server returns full object
                setFavorites((prev) => [
                    ...prev,
                    { _id: id },
                ]);
            }

            try {
                let data;
                if (alreadySaved) {
                    data = await removeUserFavorite(id);
                } else {
                    data = await addUserFavorite(id);
                }
                // Server response has fully-populated favorites array
                setFavorites(data.favorites || []);
            } catch (err) {
                // Rollback optimistic update on error
                refetch();
                console.error("Wishlist toggle error:", err.message);
                throw err; // bubble up so caller can show toast
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [favorites, refetch]
    );

    const isFavorite = useCallback(
        (bikeId) => favoriteIds.has(String(bikeId)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [favorites]
    );

    return (
        <WishlistContext.Provider
            value={{
                favorites,
                favoriteIds,
                loading,
                error,
                isFavorite,
                toggle,
                refetch,
                clear,
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
}
