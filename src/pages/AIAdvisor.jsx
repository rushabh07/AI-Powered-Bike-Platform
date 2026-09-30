import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Bot,
    User,
    Send,
    Trash2,
    Sparkles,
    Bike,
    Star,
    ArrowLeft,
    RotateCcw,
    Plus,
    Search,
    Pencil,
    Check,
    X,
    Copy,
    RefreshCw,
    ThumbsUp,
    ThumbsDown,
    Menu,
    MessageSquare,
    Coins,
    Crown,
} from "lucide-react";
import Logo from "../components/Logo";
import BrandLogo from "../components/BrandLogo";
import ThemeToggle from "../components/ThemeToggle";
import UpgradeModal from "../components/UpgradeModal";

const CHATS_API = "http://localhost:5000/api/chats";
const ACTIVE_CHAT_KEY = "motoai_active_chat";

const QUICK_SUGGESTIONS = [
    "Bike under ₹2 lakh",
    "Best daily commuter",
    "Best electric bike",
    "Best touring bike",
    "Best mileage bike",
    "Compare motorcycles",
];

const formatINR = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const BotAvatar = () => (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-black">
        <Bot size={20} />
    </div>
);

const UserAvatarBubble = () => (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
        <User size={18} />
    </div>
);

// Markdown-rendered assistant reply (headings, bold,
// bullets, GFM tables). Raw HTML is never rendered.
const MarkdownReply = ({ content }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            h1: ({ children }) => (
                <p className="mb-2 text-base font-black text-white">
                    {children}
                </p>
            ),
            h2: ({ children }) => (
                <p className="mb-2 mt-3 text-base font-black text-white first:mt-0">
                    {children}
                </p>
            ),
            h3: ({ children }) => (
                <p className="mb-1.5 mt-3 text-sm font-black text-orange-400 first:mt-0">
                    {children}
                </p>
            ),
            h4: ({ children }) => (
                <p className="mb-1 mt-2 text-sm font-bold text-white">
                    {children}
                </p>
            ),
            p: ({ children }) => (
                <p className="mb-2 text-sm leading-relaxed text-zinc-200 last:mb-0">
                    {children}
                </p>
            ),
            strong: ({ children }) => (
                <strong className="font-bold text-white">
                    {children}
                </strong>
            ),
            ul: ({ children }) => (
                <ul className="mb-2 list-disc space-y-1 pl-5 text-sm text-zinc-200">
                    {children}
                </ul>
            ),
            ol: ({ children }) => (
                <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm text-zinc-200">
                    {children}
                </ol>
            ),
            li: ({ children }) => <li>{children}</li>,
            table: ({ children }) => (
                <div className="mb-2 overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full min-w-[420px] text-xs">
                        {children}
                    </table>
                </div>
            ),
            thead: ({ children }) => (
                <thead className="bg-orange-500/10">{children}</thead>
            ),
            th: ({ children }) => (
                <th className="border-b border-white/10 px-3 py-2 text-left font-bold text-orange-400">
                    {children}
                </th>
            ),
            td: ({ children }) => (
                <td className="border-b border-white/5 px-3 py-2 text-zinc-200">
                    {children}
                </td>
            ),
            code: ({ children }) => (
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-orange-300">
                    {children}
                </code>
            ),
            hr: () => (
                <hr className="my-3 border-white/10" />
            ),
        }}
    >
        {content}
    </ReactMarkdown>
);

const TypingIndicator = ({ label }) => (
    <div className="flex items-start gap-3">
        <BotAvatar />
        <div className="rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-5 py-4">
            <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                    {[0, 1, 2].map((dot) => (
                        <span
                            key={dot}
                            className="h-2 w-2 animate-bounce rounded-full bg-orange-500"
                            style={{
                                animationDelay: `${dot * 0.15}s`,
                            }}
                        />
                    ))}
                </div>
                {label && (
                    <span className="text-xs text-zinc-500">
                        {label}
                    </span>
                )}
            </div>
        </div>
    </div>
);

const LoginGate = ({ onLogin, onRegister }) => (
    <div className="rounded-3xl border border-orange-500/20 bg-orange-500/5 p-8 text-center sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-black">
            <Bot size={30} />
        </div>
        <h2 className="mt-5 text-2xl font-black">Login Required</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
            MotoMind is a member-only service. Please login first
            — you'll come straight back here to start chatting.
        </p>
        <div className="mx-auto mt-7 flex max-w-sm flex-col gap-3 sm:flex-row">
            <button
                onClick={onLogin}
                className="flex-1 rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black transition hover:bg-orange-400"
            >
                Login to Chat
            </button>
            <button
                onClick={onRegister}
                className="flex-1 rounded-xl border border-white/10 py-3.5 text-sm font-semibold text-zinc-300 transition hover:border-orange-500/40 hover:text-white"
            >
                Create Account
            </button>
        </div>
    </div>
);

const RecommendationCards = ({ bikes, navigate }) => {
    if (!bikes || bikes.length === 0) return null;

    return (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {bikes.map((bike) => {
                const isEV =
                    String(bike.category || "").toLowerCase() ===
                        "electric" ||
                    String(bike.fuel || "").toLowerCase() ===
                        "electric";
                const imgSrc =
                    bike.image || bike.images?.[0]?.url || "";

                return (
                    <div
                        key={bike._id}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 transition hover:border-orange-500/40"
                    >
                        <div className="relative h-32 overflow-hidden bg-zinc-900">
                            {imgSrc ? (
                                <img
                                    src={imgSrc}
                                    alt={bike.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <Bike
                                        size={32}
                                        className="text-zinc-700"
                                    />
                                </div>
                            )}
                            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-yellow-400">
                                <Star
                                    size={12}
                                    className="fill-yellow-400"
                                />
                                {bike.rating ?? "N/A"}
                            </span>
                        </div>

                        <div className="p-3.5">
                            <div className="flex items-center gap-2">
                                <BrandLogo
                                    brand={bike.brand}
                                    brandLogo={bike.brandLogo}
                                    size={28}
                                />
                                <div className="min-w-0">
                                    <p className="truncate text-[11px] font-bold uppercase tracking-wider text-orange-500">
                                        {bike.brand}
                                    </p>
                                    <p className="truncate text-sm font-bold">
                                        {bike.name}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-2.5 space-y-1 text-xs text-zinc-400">
                                <p>
                                    <span className="font-bold text-white">
                                        {formatINR(bike.price)}
                                    </span>
                                    {"  •  "}
                                    {bike.category}
                                </p>
                                <p>
                                    {isEV
                                        ? [
                                              bike.batteryCapacity &&
                                                  `${bike.batteryCapacity} kWh`,
                                              bike.range &&
                                                  `${bike.range} km range`,
                                              bike.chargingTime &&
                                                  `${bike.chargingTime}h charge`,
                                          ]
                                              .filter(Boolean)
                                              .join("  •  ") || "Electric"
                                        : [
                                              bike.engine &&
                                                  `${bike.engine} CC`,
                                              bike.mileage &&
                                                  `${bike.mileage} KM/L`,
                                              bike.power &&
                                                  `${bike.power} HP`,
                                          ]
                                              .filter(Boolean)
                                              .join("  •  ")}
                                </p>
                            </div>

                            {bike.reason && (
                                <p className="mt-2.5 rounded-lg bg-orange-500/5 px-2.5 py-2 text-[11px] leading-relaxed text-zinc-400">
                                    <span className="font-semibold text-orange-400">
                                        Why this:{" "}
                                    </span>
                                    {bike.reason}
                                </p>
                            )}

                            <button
                                onClick={() =>
                                    navigate(
                                        `/motorcycles/${bike._id}`
                                    )
                                }
                                className="mt-3 w-full rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-black transition hover:bg-orange-400"
                            >
                                View Details
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default function AIAdvisor() {
    const navigate = useNavigate();
    const location = useLocation();
    // Bike context from "Ask MOTOAI About This Bike" (details page)
    const askAbout = location.state?.askAbout || null;
    const askCompare = location.state?.askCompare || null;
    const askText = location.state?.askText || null;
    const askConsumedRef = useRef(null);

    // Auth gate
    const [currentUser, setCurrentUser] = useState(null);

    // Sidebar / chats
    const [chats, setChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState(
        () => localStorage.getItem(ACTIVE_CHAT_KEY) || null
    );
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chatSearch, setChatSearch] = useState("");
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState("");

    // Conversation
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    // Message actions
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [regeneratingId, setRegeneratingId] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    // Token wallet + upgrade modal
    const [wallet, setWallet] = useState(null);
    const [showUpgrade, setShowUpgrade] = useState(false);

    const bottomRef = useRef(null);

    const syncUserPlan = (plan) => {
        try {
            const stored = JSON.parse(
                localStorage.getItem("user") || "{}"
            );
            localStorage.setItem(
                "user",
                JSON.stringify({ ...stored, aiPlan: plan })
            );
        } catch {
            /* ignore */
        }
    };

    const fetchWallet = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;
            const response = await fetch(
                "http://localhost:5000/api/ai-tokens",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            const data = await response.json();
            if (response.ok && data.success) {
                setWallet(data);
                if (data.plan) syncUserPlan(data.plan);
            }
        } catch (err) {
            console.error("Wallet error:", err);
        }
    };

    const applyWallet = (w) => {
        if (!w) return;
        setWallet((prev) => ({ ...prev, ...w }));
        if (w.plan) syncUserPlan(w.plan);
    };

    // Returns true when a TOKEN_LIMIT_REACHED body was handled
    const handleTokenLimit = (data) => {
        if (data && data.code === "TOKEN_LIMIT_REACHED") {
            if (data.wallet) applyWallet(data.wallet);
            setError(data.detail || data.message);
            setShowUpgrade(true);
            return true;
        }
        return false;
    };

    useEffect(() => {
        const loadUser = () => {
            try {
                const token = localStorage.getItem("token");
                const stored = localStorage.getItem("user");
                setCurrentUser(
                    token && stored ? JSON.parse(stored) : null
                );
            } catch {
                setCurrentUser(null);
            }
        };
        loadUser();
        window.addEventListener("storage", loadUser);
        return () =>
            window.removeEventListener("storage", loadUser);
    }, []);

    const askState = {
        ...(askAbout ? { askAbout } : {}),
        ...(askCompare ? { askCompare, ...(askText ? { askText } : {}) } : {}),
    };
    const goLogin = () =>
        navigate("/login", {
            state: {
                from: "/ai-advisor",
                ...askState,
            },
        });
    const goRegister = () =>
        navigate("/register", {
            state: {
                from: "/ai-advisor",
                ...askState,
            },
        });

    const handleUnauthorized = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem(ACTIVE_CHAT_KEY);
        setCurrentUser(null);
        goLogin();
    };

    // =========================
    // CHAT LIST
    // =========================

    const loadChats = async (selectId) => {
        try {
            const response = await fetch(CHATS_API, {
                headers: authHeaders(),
            });
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            const list = data.chats || [];
            setChats(list);

            const wanted =
                selectId !== undefined
                    ? selectId
                    : localStorage.getItem(ACTIVE_CHAT_KEY);
            const target =
                (wanted && list.find((c) => c._id === wanted)) ||
                list[0] ||
                null;
            if (target) {
                selectChat(target._id);
            } else {
                setActiveChatId(null);
                localStorage.removeItem(ACTIVE_CHAT_KEY);
                setMessages([]);
            }
        } catch (err) {
            console.error("Load chats error:", err);
        }
    };

    useEffect(() => {
        if (currentUser) {
            loadChats();
            fetchWallet();
        } else {
            setChats([]);
            setMessages([]);
            setActiveChatId(null);
            setWallet(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // "Ask MOTOAI About This Bike" context from the details page,
    // or "Ask MotoMind" from the compare page: open a fresh chat
    // and ask MotoMind about it (once only).
    useEffect(() => {
        if ((!askAbout && !askCompare) || !currentUser) return;
        const key = askCompare
            ? `compare|${askCompare.map((b) => `${b.brand} ${b.name}`).join("|")}`
            : `${askAbout.brand}|${askAbout.name}`;
        if (askConsumedRef.current === key) return;
        askConsumedRef.current = key;
        // Clear nav state so a refresh doesn't ask (and charge) again
        navigate(location.pathname, { replace: true, state: {} });
        sendMessage(
            askCompare
                ? askText ||
                      `Compare ${askCompare.map((b) => `${b.brand} ${b.name}`).join(", ")} — price, specs and which suits what riding?`
                : `Tell me about the ${askAbout.brand} ${askAbout.name} — price, key specs, and who is it best for?`,
            { fresh: true }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [askAbout, askCompare, currentUser]);

    // Re-sync balance when returning to a stale tab
    useEffect(() => {
        const onVisible = () => {
            if (
                document.visibilityState === "visible" &&
                localStorage.getItem("token")
            ) {
                fetchWallet();
            }
        };
        document.addEventListener("visibilitychange", onVisible);
        return () =>
            document.removeEventListener(
                "visibilitychange",
                onVisible
            );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectChat = async (id) => {
        setActiveChatId(id);
        localStorage.setItem(ACTIVE_CHAT_KEY, id);
        setSidebarOpen(false);
        setEditingId(null);
        setError("");
        try {
            const response = await fetch(`${CHATS_API}/${id}`, {
                headers: authHeaders(),
            });
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setMessages(data.chat.messages || []);
        } catch (err) {
            console.error("Select chat error:", err);
            setError("Could not load this chat.");
        }
    };

    const newChat = () => {
        setActiveChatId(null);
        localStorage.removeItem(ACTIVE_CHAT_KEY);
        setMessages([]);
        setInput("");
        setError("");
        setEditingId(null);
        setSidebarOpen(false);
    };

    // =========================
    // SEND
    // =========================

    const sendMessage = async (text, opts = {}) => {
        const message = (text ?? input).trim();
        if (!message || sending || !currentUser) return;

        setError("");
        setInput("");
        // Show the question immediately — don't wait for the AI reply
        const tempId = `temp-${Date.now()}`;
        setMessages((prev) => [
            ...prev,
            { _id: tempId, role: "user", content: message },
        ]);
        setSending(true);

        try {
            let chatId = opts.fresh ? null : activeChatId;
            if (opts.fresh) {
                setActiveChatId(null);
                localStorage.removeItem(ACTIVE_CHAT_KEY);
                setMessages([]);
            }
            if (!chatId) {
                const created = await fetch(CHATS_API, {
                    method: "POST",
                    headers: authHeaders(),
                });
                if (created.status === 401) {
                    handleUnauthorized();
                    return;
                }
                const createdData = await created.json();
                if (!created.ok) throw new Error(createdData.message);
                chatId = createdData.chat._id;
            }

            const controller = new AbortController();
            const timeout = setTimeout(
                () => controller.abort(),
                60000
            );

            const response = await fetch(
                `${CHATS_API}/${chatId}/messages`,
                {
                    method: "POST",
                    signal: controller.signal,
                    headers: authHeaders(),
                    body: JSON.stringify({ message }),
                }
            );

            clearTimeout(timeout);
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            const data = await response.json();
            if (!response.ok || !data.success) {
                if (handleTokenLimit(data)) return;
                throw new Error(data.message);
            }

            if (data.wallet) applyWallet(data.wallet);
            // Swap the optimistic message for the saved pair
            setMessages((prev) => [
                ...prev.filter((m) => m._id !== tempId),
                data.userMessage,
                data.assistantMessage,
            ]);
            // Refresh sidebar (auto-title on first exchange)
            loadChats(chatId);
        } catch (err) {
            console.error("Send error:", err);
            setError(
                err.name === "AbortError"
                    ? "The request timed out. Please try again."
                    : err.message ||
                          "Couldn't send your message. Try again."
            );
        } finally {
            setSending(false);
        }
    };

    // =========================
    // EDIT (ChatGPT-style branch)
    // =========================

    const startEdit = (msg) => {
        setEditingId(msg._id);
        setEditValue(msg.content);
    };

    const submitEdit = async () => {
        const content = editValue.trim();
        if (!content || !activeChatId) return;
        setError("");
        try {
            const response = await fetch(
                `${CHATS_API}/${activeChatId}/messages/${editingId}`,
                {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify({ content }),
                }
            );
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            const data = await response.json();
            if (!response.ok || !data.success) {
                if (handleTokenLimit(data)) return;
                throw new Error(data.message);
            }
            if (data.wallet) applyWallet(data.wallet);
            // Old branch is gone — server returns the new conversation
            setMessages(data.messages);
            setEditingId(null);
            setEditValue("");
        } catch (err) {
            console.error("Edit error:", err);
            setError(err.message || "Could not edit message.");
        }
    };

    // =========================
    // REGENERATE
    // =========================

    const regenerate = async (messageId) => {
        if (!activeChatId || regeneratingId) return;
        setError("");
        setRegeneratingId(messageId);
        try {
            const response = await fetch(
                `${CHATS_API}/${activeChatId}/messages/${messageId}/regenerate`,
                { method: "POST", headers: authHeaders() }
            );
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            const data = await response.json();
            if (!response.ok || !data.success) {
                if (handleTokenLimit(data)) return;
                throw new Error(data.message);
            }
            if (data.wallet) applyWallet(data.wallet);
            setMessages((prev) =>
                prev.map((m) =>
                    m._id === messageId
                        ? data.assistantMessage
                        : m
                )
            );
        } catch (err) {
            console.error("Regenerate error:", err);
            setError(
                err.message || "Could not regenerate response."
            );
        } finally {
            setRegeneratingId(null);
        }
    };

    // =========================
    // FEEDBACK + COPY
    // =========================

    const sendFeedback = async (msg, value) => {
        const next = msg.feedback === value ? null : value;
        setMessages((prev) =>
            prev.map((m) =>
                m._id === msg._id ? { ...m, feedback: next } : m
            )
        );
        try {
            await fetch(
                `${CHATS_API}/${activeChatId}/messages/${msg._id}/feedback`,
                {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({ feedback: next }),
                }
            );
        } catch (err) {
            console.error("Feedback error:", err);
        }
    };

    const copyReply = async (msg) => {
        try {
            await navigator.clipboard.writeText(msg.content);
        } catch {
            const area = document.createElement("textarea");
            area.value = msg.content;
            document.body.appendChild(area);
            area.select();
            document.execCommand("copy");
            document.body.removeChild(area);
        }
        setCopiedId(msg._id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    // =========================
    // RENAME + DELETE
    // =========================

    const submitRename = async (id) => {
        const title = renameValue.trim();
        if (!title) {
            setRenamingId(null);
            return;
        }
        try {
            const response = await fetch(`${CHATS_API}/${id}`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({ title }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setChats((prev) =>
                prev.map((c) =>
                    c._id === id
                        ? { ...c, title: data.chat.title }
                        : c
                )
            );
        } catch (err) {
            setError(err.message || "Could not rename chat.");
        } finally {
            setRenamingId(null);
            setRenameValue("");
        }
    };

    const deleteChat = async (id) => {
        if (!window.confirm("Delete this chat permanently?"))
            return;
        try {
            const response = await fetch(`${CHATS_API}/${id}`, {
                method: "DELETE",
                headers: authHeaders(),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setChats((prev) => prev.filter((c) => c._id !== id));
            if (id === activeChatId) newChat();
        } catch (err) {
            setError(err.message || "Could not delete chat.");
        }
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, sending, regeneratingId]);

    const filteredChats = useMemo(() => {
        const q = chatSearch.trim().toLowerCase();
        if (!q) return chats;
        return chats.filter(
            (c) =>
                c.title.toLowerCase().includes(q) ||
                (c.preview || "").toLowerCase().includes(q)
        );
    }, [chats, chatSearch]);

    const isFresh = messages.length === 0 && !sending;

    const sidebar = (
        <div className="flex h-full flex-col">
            <div className="p-4">
                <button
                    onClick={newChat}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
                >
                    <Plus size={18} />
                    New Chat
                </button>

                <div className="relative mt-3">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                        value={chatSearch}
                        onChange={(e) =>
                            setChatSearch(e.target.value)
                        }
                        placeholder="Search chats..."
                        aria-label="Search chats"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-zinc-600 focus:border-orange-500/50"
                    />
                </div>
            </div>

            <p className="px-5 pb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                Recent Chats
            </p>

            <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
                {filteredChats.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-zinc-600">
                        {chats.length === 0
                            ? "No conversations yet. Start a new chat."
                            : "No chats match your search."}
                    </p>
                )}

                {filteredChats.map((chat) => {
                    const isActive = chat._id === activeChatId;
                    return (
                        <div
                            key={chat._id}
                            className={`group rounded-xl border transition ${
                                isActive
                                    ? "border-orange-500/40 bg-orange-500/10"
                                    : "border-transparent hover:bg-white/5"
                            }`}
                        >
                            {renamingId === chat._id ? (
                                <div className="flex items-center gap-1 p-2">
                                    <input
                                        value={renameValue}
                                        autoFocus
                                        onChange={(e) =>
                                            setRenameValue(
                                                e.target.value
                                            )
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter"
                                            )
                                                submitRename(chat._id);
                                            if (e.key === "Escape")
                                                setRenamingId(null);
                                        }}
                                        aria-label="Chat title"
                                        className="min-w-0 flex-1 rounded-lg border border-orange-500/40 bg-black/40 px-2 py-1.5 text-sm outline-none"
                                    />
                                    <button
                                        onClick={() =>
                                            submitRename(chat._id)
                                        }
                                        aria-label="Save title"
                                        className="rounded-lg p-1.5 text-emerald-400 hover:bg-white/5"
                                    >
                                        <Check size={16} />
                                    </button>
                                    <button
                                        onClick={() =>
                                            setRenamingId(null)
                                        }
                                        aria-label="Cancel rename"
                                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 p-1">
                                    <button
                                        onClick={() =>
                                            selectChat(chat._id)
                                        }
                                        className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left"
                                    >
                                        <p
                                            className={`truncate text-sm font-semibold ${
                                                isActive
                                                    ? "text-orange-400"
                                                    : "text-zinc-200"
                                            }`}
                                        >
                                            {chat.title}
                                        </p>
                                        {chat.preview && (
                                            <p className="truncate text-xs text-zinc-600">
                                                {chat.preview}
                                            </p>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setRenamingId(chat._id);
                                            setRenameValue(chat.title);
                                        }}
                                        aria-label={`Rename ${chat.title}`}
                                        title="Rename"
                                        className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-white/5 hover:text-white"
                                    >
                                        <Pencil size={15} />
                                    </button>
                                    <button
                                        onClick={() =>
                                            deleteChat(chat._id)
                                        }
                                        aria-label={`Delete ${chat.title}`}
                                        title="Delete"
                                        className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-[#070708] text-white">
            {/* DESKTOP SIDEBAR */}
            <aside className="sticky top-0 hidden h-screen w-80 shrink-0 border-r border-white/10 bg-[#0b0b0b] lg:block">
                {sidebar}
            </aside>

            {/* MOBILE DRAWER */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/70"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <aside className="absolute inset-y-0 left-0 w-80 max-w-[85vw] border-r border-white/10 bg-[#0b0b0b]">
                        {sidebar}
                    </aside>
                </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                {/* NAVBAR */}
                <nav className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#070708]/85 backdrop-blur-2xl">
                    <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() =>
                                    setSidebarOpen(true)
                                }
                                aria-label="Open chats"
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-zinc-300 lg:hidden"
                            >
                                <Menu size={19} />
                            </button>
                            <Link to="/">
                                <Logo />
                            </Link>
                        </div>

                        <div className="hidden items-center gap-9 md:flex">
                            <Link
                                to="/"
                                className="text-sm text-zinc-500 transition hover:text-white"
                            >
                                Home
                            </Link>
                            <Link
                                to="/motorcycles"
                                className="text-sm text-zinc-500 transition hover:text-white"
                            >
                                Motorcycles
                            </Link>
                            <span className="relative flex items-center gap-1.5 text-sm font-semibold text-white">
                                <Sparkles size={14} />
                                AI Advisor
                                <span className="absolute -bottom-5 left-0 h-0.5 w-full rounded-full bg-orange-500" />
                            </span>
                            <Link
                                to="/ai-plan"
                                className="text-sm text-zinc-500 transition hover:text-white"
                            >
                                AI Plan
                            </Link>
                            <Link
                                to="/compare"
                                className="text-sm text-zinc-500 transition hover:text-white"
                            >
                                Compare
                            </Link>
                        </div>

                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                        </div>
                    </div>
                </nav>

                {/* CHAT */}
                <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 py-8 md:px-6">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-black">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black sm:text-2xl">
                                    MotoMind AI Advisor
                                </h1>
                                <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                    {currentUser
                                        ? `Chatting as ${currentUser.name}`
                                        : "Powered by live showroom data"}
                                </p>
                            </div>
                        </div>

                        {currentUser && wallet && (
                            <button
                                onClick={() =>
                                    wallet.tokens <= 0 &&
                                    setShowUpgrade(true)
                                }
                                title={
                                    wallet.tokens <= 0
                                        ? "Out of tokens — upgrade"
                                        : "AI token balance"
                                }
                                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                                    wallet.plan === "premium"
                                        ? "border-orange-500/40 bg-orange-500/10 text-orange-400"
                                        : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-orange-500/30"
                                }`}
                            >
                                {wallet.plan === "premium" ? (
                                    <Crown
                                        size={15}
                                        className="text-orange-500"
                                    />
                                ) : (
                                    <Coins
                                        size={15}
                                        className="text-orange-500"
                                    />
                                )}
                                <span>
                                    {wallet.tokens ?? "—"} AI Tokens
                                </span>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                                        wallet.plan === "premium"
                                            ? "bg-orange-500 text-black"
                                            : "bg-white/10 text-zinc-400"
                                    }`}
                                >
                                    {wallet.plan === "premium"
                                        ? "Premium"
                                        : "Free"}
                                </span>
                            </button>
                        )}
                    </div>
                    {currentUser &&
                        wallet?.plan === "premium" &&
                        wallet?.expiresAt && (
                            <p className="-mt-3 mb-6 text-right text-[11px] text-zinc-600">
                                Premium expires{" "}
                                {new Date(
                                    wallet.expiresAt
                                ).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                })}
                                {wallet.daysLeft != null &&
                                    ` (${wallet.daysLeft} day${wallet.daysLeft === 1 ? "" : "s"} left)`}
                            </p>
                        )}

                    {!currentUser ? (
                        <LoginGate
                            onLogin={() =>
                                navigate("/login", {
                                    state: { from: "/ai-advisor" },
                                })
                            }
                            onRegister={() =>
                                navigate("/register", {
                                    state: { from: "/ai-advisor" },
                                })
                            }
                        />
                    ) : (
                        <>
                            {isFresh ? (
                                <>
                                    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center sm:p-10">
                                        <MessageSquare
                                            size={36}
                                            className="mx-auto text-orange-500"
                                        />
                                        <h2 className="mt-4 text-lg font-bold">
                                            Start a new conversation
                                        </h2>
                                        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                                            Ask about budgets,
                                            mileage, EVs, touring or
                                            compare any showroom
                                            bikes.
                                        </p>
                                    </div>

                                    <div className="mb-5 mt-5 flex gap-2 overflow-x-auto pb-2">
                                        {QUICK_SUGGESTIONS.map(
                                            (suggestion) => (
                                                <button
                                                    key={suggestion}
                                                    onClick={() =>
                                                        sendMessage(
                                                            suggestion
                                                        )
                                                    }
                                                    disabled={sending}
                                                    className="shrink-0 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-400 transition hover:bg-orange-500 hover:text-black disabled:opacity-50"
                                                >
                                                    {suggestion}
                                                </button>
                                            )
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 space-y-5 rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
                                    {messages.map((msg) =>
                                        msg.role === "user" ? (
                                            <div
                                                key={msg._id}
                                                className="flex items-start justify-end gap-3"
                                            >
                                                <div className="max-w-[85%] sm:max-w-[75%]">
                                                    {editingId ===
                                                    msg._id ? (
                                                        <div className="rounded-2xl rounded-tr-md border border-orange-500/40 bg-black/40 p-3">
                                                            <textarea
                                                                value={
                                                                    editValue
                                                                }
                                                                onChange={(
                                                                    e
                                                                ) =>
                                                                    setEditValue(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                rows={3}
                                                                aria-label="Edit message"
                                                                className="w-full resize-none bg-transparent text-sm outline-none"
                                                            />
                                                            <div className="mt-2 flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingId(
                                                                            null
                                                                        );
                                                                        setEditValue(
                                                                            ""
                                                                        );
                                                                    }}
                                                                    className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={
                                                                        submitEdit
                                                                    }
                                                                    disabled={
                                                                        !editValue.trim()
                                                                    }
                                                                    className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-black transition hover:bg-orange-400 disabled:opacity-40"
                                                                >
                                                                    Send
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="group">
                                                            <div className="rounded-2xl rounded-tr-md bg-orange-500 px-4 py-3 text-sm font-medium text-black">
                                                                {
                                                                    msg.content
                                                                }
                                                            </div>
                                                            <div className="mt-1 flex justify-end">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingId(
                                                                            msg._id
                                                                        );
                                                                        setEditValue(
                                                                            msg.content
                                                                        );
                                                                    }}
                                                                    className="rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-600 transition hover:bg-white/5 hover:text-orange-400"
                                                                >
                                                                    Edit
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <UserAvatarBubble />
                                            </div>
                                        ) : (
                                            <div
                                                key={msg._id}
                                                className="flex items-start gap-3"
                                            >
                                                <BotAvatar />
                                                <div className="max-w-[90%] sm:max-w-[85%]">
                                                    <div className="rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-zinc-200">
                                                        {regeneratingId ===
                                                        msg._id ? (
                                                            <span className="flex items-center gap-2 text-zinc-400">
                                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                                                                Regenerating...
                                                            </span>
                                                        ) : (
                                                            <MarkdownReply
                                                                content={
                                                                    msg.content
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                    <RecommendationCards
                                                        bikes={
                                                            msg.recommendations
                                                        }
                                                        navigate={navigate}
                                                    />
                                                    <div className="mt-1.5 flex items-center gap-1">
                                                        {msg.tokensUsed >
                                                            0 && (
                                                            <span
                                                                title="AI credits used for this answer"
                                                                className="mr-1 rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-zinc-500"
                                                            >
                                                                ⚡
                                                                {
                                                                    msg.tokensUsed
                                                                }
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() =>
                                                                copyReply(
                                                                    msg
                                                                )
                                                            }
                                                            aria-label="Copy response"
                                                            title="Copy"
                                                            className="rounded-lg px-2 py-1.5 text-zinc-600 transition hover:bg-white/5 hover:text-white"
                                                        >
                                                            {copiedId ===
                                                            msg._id ? (
                                                                <span className="text-[11px] font-semibold text-emerald-400">
                                                                    Copied
                                                                </span>
                                                            ) : (
                                                                <Copy
                                                                    size={15}
                                                                />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                regenerate(
                                                                    msg._id
                                                                )
                                                            }
                                                            aria-label="Regenerate response"
                                                            title="Regenerate"
                                                            className="rounded-lg px-2 py-1.5 text-zinc-600 transition hover:bg-white/5 hover:text-white"
                                                        >
                                                            <RefreshCw
                                                                size={15}
                                                            />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                sendFeedback(
                                                                    msg,
                                                                    "like"
                                                                )
                                                            }
                                                            aria-label="Like response"
                                                            title="Like"
                                                            className={`rounded-lg px-2 py-1.5 transition ${
                                                                msg.feedback ===
                                                                "like"
                                                                    ? "text-emerald-400"
                                                                    : "text-zinc-600 hover:bg-white/5 hover:text-white"
                                                            }`}
                                                        >
                                                            <ThumbsUp
                                                                size={15}
                                                            />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                sendFeedback(
                                                                    msg,
                                                                    "dislike"
                                                                )
                                                            }
                                                            aria-label="Dislike response"
                                                            title="Dislike"
                                                            className={`rounded-lg px-2 py-1.5 transition ${
                                                                msg.feedback ===
                                                                "dislike"
                                                                    ? "text-red-400"
                                                                    : "text-zinc-600 hover:bg-white/5 hover:text-white"
                                                            }`}
                                                        >
                                                            <ThumbsDown
                                                                size={15}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    )}

                                    {sending && (
                                        <TypingIndicator />
                                    )}
                                    <div ref={bottomRef} />
                                </div>
                            )}

                            {error && (
                                <p className="mt-3 text-center text-xs text-red-400">
                                    {error}
                                </p>
                            )}

                            {/* INPUT */}
                            <div className="sticky bottom-0 mt-4 bg-gradient-to-t from-[#070708] via-[#070708] to-transparent pt-4">
                                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111113] p-2 focus-within:border-orange-500/50">
                                    <button
                                        onClick={() =>
                                            navigate("/motorcycles")
                                        }
                                        aria-label="Back to motorcycles"
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-white"
                                    >
                                        <ArrowLeft size={19} />
                                    </button>
                                    <input
                                        value={input}
                                        onChange={(e) =>
                                            setInput(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter" &&
                                                !e.shiftKey
                                            ) {
                                                e.preventDefault();
                                                sendMessage();
                                            }
                                        }}
                                        placeholder="Ask about budget, mileage, EVs, touring..."
                                        aria-label="Chat with MotoMind"
                                        className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none placeholder:text-zinc-600"
                                    />
                                    {input.trim() && (
                                        <button
                                            onClick={() =>
                                                setInput("")
                                            }
                                            aria-label="Clear input"
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-white"
                                        >
                                            <RotateCcw size={17} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => sendMessage()}
                                        disabled={sending || !input.trim()}
                                        aria-label="Send message"
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                    <p className="mt-2 text-center text-[11px] text-zinc-600">
                        Recommendations come from live
                        MOTOAI showroom data — specs are
                        never invented.
                    </p>
                </div>
                    </>
                )}
            </main>

            <UpgradeModal
                open={showUpgrade}
                onClose={() => setShowUpgrade(false)}
                config={wallet?.config}
                initialPlan="monthly"
                onActivated={(w) => {
                    applyWallet(w);
                    setShowUpgrade(false);
                    fetchWallet();
                }}
            />
            </div>
        </div>
    );
}
