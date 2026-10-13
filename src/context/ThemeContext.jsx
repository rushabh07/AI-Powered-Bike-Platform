import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
    theme: "dark",
    toggleTheme: () => {},
});

const STORAGE_KEY = "motoai_theme";

function getInitialTheme() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark") return stored;
    } catch {
        /* ignore */
    }
    if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: light)").matches
            ? "light"
            : "dark";
    }
    return "dark";
}

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("dark", "light");
        root.classList.add(theme);
        root.style.colorScheme = theme;
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            /* ignore */
        }
    }, [theme]);

    useEffect(() => {
        if (!window.matchMedia) return;
        const mq = window.matchMedia("(prefers-color-scheme: light)");
        const handler = (e) => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (!stored) {
                    setTheme(e.matches ? "light" : "dark");
                }
            } catch {
                /* ignore */
            }
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
