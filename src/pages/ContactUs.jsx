import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Send, CheckCircle, AlertTriangle, Loader2, Copy } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";

const API_BASE = "http://localhost:5000/api";

const CATEGORIES = [
    { id: "general", label: "General Inquiry" },
    { id: "sales", label: "Sales" },
    { id: "support", label: "Support" },
    { id: "test_ride", label: "Test Ride" },
    { id: "feedback", label: "Feedback" },
    { id: "other", label: "Other" },
];

const inputCls =
    "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 placeholder:text-zinc-600 transition disabled:opacity-50";

const ContactUs = () => {
    const { theme } = useTheme();
    const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", category: "general", message: "", consent: false });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const validate = () => {
        if (!form.name.trim()) return "Full name is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "A valid email address is required.";
        if (form.phone.trim() && !/^[+\d][\d\s-]{6,18}$/.test(form.phone.trim())) return "Enter a valid phone number.";
        if (!form.subject.trim()) return "Subject is required.";
        if (!form.message.trim() || form.message.trim().length < 10) return "Message must be at least 10 characters.";
        if (!form.consent) return "Please accept the privacy policy.";
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        const err = validate();
        if (err) {
            setError(err);
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/contact`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), subject: form.subject.trim(), message: form.message.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) throw new Error(data.message || "Could not submit your enquiry.");
            setResult({ referenceNumber: data.referenceNumber, emailSent: !!data.emailSent, duplicate: !!data.duplicate });
        } catch (err) {
            setError(err.message || "Could not submit your enquiry. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const copyRef = async () => {
        if (!result?.referenceNumber) return;
        try {
            await navigator.clipboard.writeText(result.referenceNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    };

    return (
        <div className={`min-h-screen ${theme === "light" ? "bg-[#eef0f3] text-zinc-900" : "bg-[#070707] text-white"}`}>
            <Navbar activeTab="contact" />
            <main className="mx-auto max-w-2xl px-5 sm:px-8 py-12">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500">Contact Us</p>
                <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">Let&apos;s Talk Motorcycles.</h1>
                <p className="mt-2 text-sm text-zinc-500">Questions about bikes, test rides, or support — we&apos;ll get back to you.</p>

                {error && (
                    <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        {error}
                    </div>
                )}

                {result ? (
                    <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
                        <CheckCircle size={44} className="mx-auto text-emerald-400" />
                        <h2 className="mt-4 text-xl font-black">Enquiry received!</h2>
                        <p className="mt-2 text-sm text-zinc-500">
                            {result.emailSent
                                ? "A confirmation email is on its way to your inbox."
                                : "Your enquiry was saved. Our team will contact you shortly."}
                        </p>
                        <button onClick={copyRef} title="Copy reference number" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 font-mono text-sm text-orange-400 hover:border-orange-500/40 transition">
                            {result.referenceNumber}
                            {copied ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        <div className="mt-6">
                            <Link to="/" className="text-sm font-bold text-orange-500 hover:text-orange-400">Back to Home</Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-zinc-400">Full Name *<input value={form.name} onChange={(e) => set("name", e.target.value)} disabled={submitting} placeholder="Your name" className={inputCls} /></label>
                            <label className="block text-xs font-semibold text-zinc-400">Email *<input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} disabled={submitting} placeholder="you@example.com" className={inputCls} /></label>
                            <label className="block text-xs font-semibold text-zinc-400">Phone (optional)<input value={form.phone} onChange={(e) => set("phone", e.target.value)} disabled={submitting} placeholder="+91 ..." className={inputCls} /></label>
                            <label className="block text-xs font-semibold text-zinc-400">Category<select value={form.category} onChange={(e) => set("category", e.target.value)} disabled={submitting} className={`${inputCls} bg-[#111]`}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">Subject *<input value={form.subject} onChange={(e) => set("subject", e.target.value)} disabled={submitting} placeholder="How can we help?" className={inputCls} /></label>
                            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">Message *<textarea value={form.message} onChange={(e) => set("message", e.target.value)} disabled={submitting} rows={5} placeholder="Tell us about your enquiry (min 10 characters)..." className={`${inputCls} resize-none`} /></label>
                        </div>
                        <label className="mt-4 flex items-start gap-2.5 text-xs text-zinc-400 cursor-pointer">
                            <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} disabled={submitting} className="mt-0.5 rounded" />
                            I agree to the privacy policy and consent to MOTOAI contacting me about my enquiry. *
                        </label>
                        <button type="submit" disabled={submitting} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50">
                            {submitting ? (<><Loader2 size={16} className="animate-spin" /> Sending...</>) : (<><Send size={16} /> Send Enquiry</>)}
                        </button>
                    </form>
                )}
            </main>
        </div>
    );
};

export default ContactUs;
