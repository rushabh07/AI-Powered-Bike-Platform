import React, { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { getPanelNotifications, markPanelNotificationRead } from "../../services/dealershipApi";

const DealershipNotifications = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getPanelNotifications({ page, limit: 20 });
            setItems(data.notifications || []);
            setPages(Math.ceil((data.total || 0) / 20) || 1);
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [page]);

    const markRead = async (id) => {
        try {
            await markPanelNotificationRead(id);
            setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
        } catch {
            /* ignore */
        }
    };

    return (
        <div>
            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-900" />)}</div>
            ) : items.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
                    <Bell size={26} className="mx-auto text-zinc-600" />
                    <p className="mt-3 text-sm text-zinc-500">No notifications.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map((n) => (
                        <div key={n._id} className={`flex items-start gap-3 rounded-2xl border p-4 ${n.read ? "border-zinc-800 bg-zinc-900" : "border-orange-500/20 bg-orange-500/[0.04]"}`}>
                            <Bell size={15} className="mt-0.5 shrink-0 text-orange-500" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-white">{n.title}</p>
                                <p className="mt-0.5 truncate text-xs text-zinc-500">{n.message}</p>
                            </div>
                            {!n.read && (
                                <button onClick={() => markRead(n._id)} aria-label="Mark read" className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"><Check size={15} /></button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DealershipNotifications;
