import React, { useEffect, useState } from "react";
import { Star, Send } from "lucide-react";
import { getPanelReviews, respondPanelReview } from "../../services/dealershipApi";

const DealershipReviews = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [replyTo, setReplyTo] = useState(null);
    const [replyText, setReplyText] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getPanelReviews({ page, limit: 15 });
            setItems(data.reviews || []);
            setPages(data.pages || 1);
        } catch (err) {
            if (err?.status !== 401) setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [page]);

    const sendReply = async () => {
        if (!replyText.trim()) return;
        try {
            await respondPanelReview(replyTo, replyText.trim());
            setReplyTo(null);
            setReplyText("");
            await load();
        } catch (err) {
            if (err?.status !== 401) alert(err.message || "Reply failed.");
        }
    };

    return (
        <div>
            {error && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-900" />)}</div>
            ) : items.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">No reviews on your stocked models yet.</p>
            ) : (
                <div className="space-y-3">
                    {items.map((r) => (
                        <div key={r._id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-white">{r.user?.name || "User"} <span className="font-normal text-zinc-500">on {r.motorcycle?.brand} {r.motorcycle?.name}</span></p>
                                <span className="flex items-center gap-1 text-sm font-bold text-orange-400"><Star size={13} className="fill-orange-400" />{r.rating}</span>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-white">{r.title}</p>
                            <p className="mt-1 text-sm text-zinc-400">{r.comment}</p>
                            {r.verifiedPurchase && <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Verified Purchase</span>}
                            {r.dealerResponse?.text ? (
                                <div className="mt-3 rounded-xl bg-white/[0.03] p-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-orange-400">Your response</p>
                                    <p className="mt-1 text-sm text-zinc-300">{r.dealerResponse.text}</p>
                                </div>
                            ) : replyTo === r._id ? (
                                <div className="mt-3 flex gap-2">
                                    <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a response..." maxLength={1000} className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" />
                                    <button onClick={sendReply} className="flex items-center gap-1 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-orange-400"><Send size={13} /> Post</button>
                                </div>
                            ) : (
                                <button onClick={() => { setReplyTo(r._id); setReplyText(""); }} className="mt-3 text-xs font-bold text-orange-400 hover:text-orange-300">Respond</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                <span>Page {page} of {pages}</span>
                <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-zinc-800 px-3 py-1.5 disabled:opacity-40">Prev</button>
                    <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-zinc-800 px-3 py-1.5 disabled:opacity-40">Next</button>
                </div>
            </div>
        </div>
    );
};

export default DealershipReviews;
