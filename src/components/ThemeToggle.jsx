import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/**
 * ThemeToggle — switches between dark and light mode.
 * A rounded-square icon button with a subtle border that follows
 * the active theme, with an accessible label and visible focus ring.
 */
const ThemeToggle = ({ className = "" }) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";
    const label = isDark ? "Switch to light mode" : "Switch to dark mode";

    return (
        <button
            type="button"
            onClick={toggleTheme}
            title={label}
            aria-label={label}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 transition-colors duration-200 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400 dark:hover:bg-orange-500/10 dark:hover:text-orange-400 dark:focus-visible:ring-offset-[#070708] ${className}`}
        >
            {isDark ? (
                <Sun size={18} aria-hidden="true" />
            ) : (
                <Moon size={18} aria-hidden="true" />
            )}
        </button>
    );
};

export default ThemeToggle;
