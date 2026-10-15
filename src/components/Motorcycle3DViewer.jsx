import React, { useEffect, useRef, useState } from "react";
import { Box, RotateCw, AlertTriangle, Loader2, Maximize2, Video } from "lucide-react";

const MODEL_VIEWER_SRC =
    "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";

const DEFAULT_ORBIT = "30deg 72deg 110%";

const PRESET_VIEWS = [
    { label: "Front", orbit: "0deg 72deg 110%" },
    { label: "Side", orbit: "90deg 72deg 110%" },
    { label: "Rear", orbit: "180deg 72deg 110%" },
    { label: "¾ View", orbit: "45deg 68deg 110%" },
];

let scriptPromise = null;

function loadModelViewerScript() {
    if (typeof window === "undefined") return Promise.reject(new Error("No window"));
    if (window.customElements && window.customElements.get("model-viewer")) {
        return Promise.resolve(true);
    }
    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.type = "module";
            script.src = MODEL_VIEWER_SRC;
            script.onload = () => resolve(true);
            script.onerror = () => {
                scriptPromise = null;
                reject(new Error("Could not load 3D viewer library."));
            };
            document.head.appendChild(script);
        });
    }
    return scriptPromise;
}

const Motorcycle3DViewer = ({ modelUrl, poster, name }) => {
    const viewerRef = useRef(null);
    const [scriptReady, setScriptReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [autoRotate, setAutoRotate] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setScriptReady(false);
        setLoading(true);
        setError("");
        setAutoRotate(false);
        loadModelViewerScript()
            .then(() => {
                if (!cancelled) setScriptReady(true);
            })
            .catch(() => {
                if (!cancelled) {
                    setError("3D viewer could not be loaded. Showing photos instead.");
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [modelUrl]);

    useEffect(() => {
        if (!scriptReady || !viewerRef.current) return;
        const el = viewerRef.current;
        setLoading(true);
        setError("");
        el.setAttribute("src", modelUrl);
        if (poster) el.setAttribute("poster", poster);
        // Studio-quality PBR rendering
        el.setAttribute("environment-image", "neutral");
        el.setAttribute("exposure", "1.1");
        el.setAttribute("tone-mapping", "aces");
        el.setAttribute("shadow-intensity", "1.4");
        el.setAttribute("shadow-softness", "0.6");
        // Showroom framing: mild telephoto, model fills frame
        el.setAttribute("field-of-view", "28deg");
        el.setAttribute("camera-orbit", DEFAULT_ORBIT);
        el.setAttribute("min-camera-orbit", "auto auto 60%");
        el.setAttribute("max-camera-orbit", "auto auto 220%");
        el.setAttribute("min-field-of-view", "15deg");
        el.setAttribute("max-field-of-view", "45deg");
        el.setAttribute("camera-controls", "");
        el.setAttribute("touch-action", "pan-y");
        el.setAttribute("interaction-prompt", "auto");
        el.setAttribute("alt", `${name || "Motorcycle"} 3D model`);

        const onLoad = () => setLoading(false);
        const onError = () => {
            setLoading(false);
            setError("This 3D model could not be loaded. Showing photos instead.");
        };
        el.addEventListener("load", onLoad);
        el.addEventListener("error", onError);
        return () => {
            el.removeEventListener("load", onLoad);
            el.removeEventListener("error", onError);
        };
    }, [scriptReady, modelUrl, poster, name]);

    useEffect(() => {
        const el = viewerRef.current;
        if (!el) return;
        if (autoRotate) {
            el.setAttribute("auto-rotate", "");
            el.setAttribute("rotation-per-second", "30deg");
        } else {
            el.removeAttribute("auto-rotate");
        }
    }, [autoRotate, scriptReady, modelUrl]);

    const applyOrbit = (orbit) => {
        const el = viewerRef.current;
        if (!el) return;
        setAutoRotate(false);
        el.cameraOrbit = orbit;
    };

    const resetView = () => {
        const el = viewerRef.current;
        if (!el) return;
        setAutoRotate(false);
        el.cameraOrbit = DEFAULT_ORBIT;
        el.fieldOfView = "28deg";
    };

    const ready = scriptReady && !error && !loading;

    return (
        <div className="relative aspect-[16/10] overflow-hidden bg-[#f4f4f5] dark:bg-[#0b0b0b]">
            {/* Studio backdrop: soft radial glow + floor shadow */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(249,115,22,0.10), transparent 70%)",
                }}
            />
            <div
                className="pointer-events-none absolute left-1/2 top-[78%] h-[10%] w-[46%] -translate-x-1/2 rounded-[100%] bg-black/45 blur-2xl dark:bg-black/70"
            />

            {scriptReady && !error && (
                <model-viewer
                    ref={viewerRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
                    ar
                    ar-modes="webxr scene-viewer quick-look"
                />
            )}

            {loading && !error && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/30 backdrop-blur-[2px]">
                    <Loader2 size={28} className="animate-spin text-orange-500" />
                    <p className="text-sm text-gray-300">Loading photoreal 3D model…</p>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <AlertTriangle size={28} className="text-amber-400" />
                    <p className="text-sm text-gray-300 max-w-sm">{error}</p>
                </div>
            )}

            {ready && (
                <div className="absolute inset-x-0 bottom-4 z-10 flex flex-wrap items-center justify-center gap-2 px-4">
                    <button
                        onClick={() => setAutoRotate((v) => !v)}
                        title={autoRotate ? "Stop 360° spin" : "Start 360° spin"}
                        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold backdrop-blur-md transition ${
                            autoRotate
                                ? "border-orange-500 bg-orange-500/20 text-orange-400"
                                : "border-white/10 bg-black/60 text-white hover:border-orange-500/40 hover:text-orange-400"
                        }`}
                    >
                        <RotateCw size={13} className={autoRotate ? "animate-spin" : ""} />
                        360°
                    </button>
                    {PRESET_VIEWS.map((v) => (
                        <button
                            key={v.label}
                            onClick={() => applyOrbit(v.orbit)}
                            className="rounded-full border border-white/10 bg-black/60 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:border-orange-500/40 hover:text-orange-400"
                        >
                            {v.label}
                        </button>
                    ))}
                    <button
                        onClick={resetView}
                        title="Reset view"
                        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:border-orange-500/40 hover:text-orange-400"
                    >
                        <Maximize2 size={13} />
                        Reset
                    </button>
                </div>
            )}

            <div className="absolute right-5 top-5 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] font-bold text-gray-300 backdrop-blur-md">
                <Video size={12} className="text-orange-500" />
                Drag to rotate • Scroll to zoom
            </div>
        </div>
    );
};

export default Motorcycle3DViewer;
