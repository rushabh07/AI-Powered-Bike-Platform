import React from "react";
import { FaMotorcycle } from "react-icons/fa";

/**
 * Logo — MOTOAI brand lockup.
 * The motorcycle icon sits in a rounded orange square beside the
 * wordmark and the "SMART MOTORCYCLE BUYING" tagline. The text
 * block is centred as a unit against the icon so the three
 * elements stay optically aligned at every size.
 */
const Logo = ({
    onClick,
    className = "",
    showSubtitle = true,
    size = "md"
}) => {
    const iconBoxSizes = {
        sm: "w-8 h-8 rounded-lg text-base",
        md: "w-11 h-11 rounded-xl text-xl",
        lg: "w-14 h-14 rounded-2xl text-2xl"
    };

    const titleSizes = {
        sm: "text-lg",
        md: "text-xl",
        lg: "text-2xl"
    };

    const subtitleSizes = {
        sm: "text-[8px] tracking-[1.5px]",
        md: "text-[9px] tracking-[2px]",
        lg: "text-[10px] tracking-[2.5px]"
    };

    const gapSizes = {
        sm: "gap-2",
        md: "gap-2.5",
        lg: "gap-3"
    };

    return (
        <div
            onClick={onClick}
            className={`flex items-center ${gapSizes[size] || gapSizes.md} ${onClick ? "cursor-pointer" : ""} ${className}`}
        >
            <div
                className={`${iconBoxSizes[size] || iconBoxSizes.md} bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25 ring-1 ring-inset ring-black/10 text-black flex-shrink-0 transition-transform duration-200 hover:scale-[1.04]`}
            >
                <FaMotorcycle />
            </div>

            <div className="flex min-w-0 flex-col justify-center">
                <h1 className={`${titleSizes[size] || titleSizes.md} font-black leading-none tracking-wide text-white`}>
                    MOTO<span className="text-orange-500">AI</span>
                </h1>

                {showSubtitle && (
                    <p className={`${subtitleSizes[size] || subtitleSizes.md} mt-1 font-semibold leading-none text-gray-500`}>
                        SMART MOTORCYCLE BUYING
                    </p>
                )}
            </div>
        </div>
    );
};

export default Logo;
