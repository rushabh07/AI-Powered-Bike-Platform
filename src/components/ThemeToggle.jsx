import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const ThemeToggle = ({ className = "" }) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    return (
        <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 ${
                isDark
                    ? "border-white/10 bg-white/5 text-zinc-400 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-500"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-orange-500/40 hover:bg-orange-50 hover:text-orange-600"
            } ${className}`}
        >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
};

export default ThemeToggle;
