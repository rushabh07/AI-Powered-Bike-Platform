import React, { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { downloadPanelReport, getPanelAudit } from "../../services/dealershipApi";

const REPORTS = [
    { id: "sales", label: "Sales & Revenue", desc: "All offline sales with verification status." },
    { id: "bookings", label: "Bookings", desc: "Test rides and purchase enquiries." },
    { id: "leads", label: "Lead Conversion", desc: "Open leads with follow-up dates." },
];

const DealershipReports = () => {
    const [audit, setAudit] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState("");
    const [msg, setMsg] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const data = await getPanelAudit({ limit: 15 });
                setAudit(data.audit || []);
            } catch {
                /* ignore */
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const download = async (type) => {
        setDownloading(type);
        setMsg("");
        try {
            await downloadPanelReport(type);
            setMsg(`${type} report downloaded.`);
        } catch (err) {
            setMsg(err.message || "Download failed.");
        } finally {
            setDownloading("");
        }
    };

    return (
        <div>
            {msg && <div className="mb-4 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">{msg}</div>}
            <div className="grid gap-4 sm:grid-cols-3">
                {REPORTS.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                        <FileText size={22} className="text-orange-500" />
                        <p className="mt-3 font-bold text-white">{r.label}</p>
                        <p className="mt-1 text-xs text-zinc-500">{r.desc}</p>
                        <button onClick={() => download(r.id)} disabled={!!downloading} className="mt-4 flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-orange-400 disabled:opacity-50">
                            <Download size={14} /> {downloading === r.id ? "Preparing..." : "Download CSV"}
                        </button>
                    </div>
                ))}
            </div>
            <h3 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-zinc-500">Recent Activity</h3>
            {loading ? (
                <div className="h-24 animate-pulse rounded-2xl bg-zinc-900" />
            ) : audit.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500">No activity recorded yet.</p>
            ) : (
                <div className="space-y-2">
                    {audit.map((a) => (
                        <div key={a._id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                            <p className="text-xs font-bold text-white">{a.action} <span className="font-normal text-zinc-500">{a.entity} {a.details}</span></p>
                            <p className="mt-0.5 text-[11px] text-zinc-600">{a.actor?.name || "Someone"} • {new Date(a.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DealershipReports;
