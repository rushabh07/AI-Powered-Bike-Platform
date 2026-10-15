/**
 * Central MOTOAI email templates.
 * Table-based, inline-CSS only (Gmail/Outlook/mobile safe), 600px container.
 * Every user string must pass through esc() before interpolation.
 */

const esc = (v) =>
    String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const siteUrl = () => (process.env.FRONTEND_URL || "").replace(/\/$/, "");
const supportEmail = () => process.env.SUPPORT_EMAIL || "";

const layout = ({ heading, greeting, intro, rows, cta, note, footerNote }) => {
    const rowHtml = (rows || [])
        .filter((r) => r.value !== undefined && r.value !== null && r.value !== "")
        .map(
            (r) => `<tr>
                <td style="padding:8px 0;color:#71717a;font-size:13px;width:40%;vertical-align:top">${esc(r.label)}</td>
                <td style="padding:8px 0;color:#18181b;font-size:13px;font-weight:bold;vertical-align:top">${r.html || esc(r.value)}</td>
            </tr>`
        )
        .join("");
    return `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f4f4f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden">
<tr><td style="background-color:#f97316;padding:22px 28px;">
<span style="color:#000000;font-weight:bold;font-size:22px;letter-spacing:1px;">MOTOAI</span>
<span style="color:#000000;font-size:12px;margin-left:8px;">Find Your Perfect Ride</span>
</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 12px;font-size:20px;color:#18181b;">${esc(heading)}</h1>
<p style="margin:0 0 12px;font-size:14px;color:#3f3f46;">Hi ${esc(greeting || "rider")},</p>
${intro ? `<p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">${intro}</p>` : ""}
${rowHtml ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:6px 14px;margin:0 0 16px;">${rowHtml}</table>` : ""}
${cta && cta.url && cta.label ? `<p style="margin:20px 0;text-align:center;"><a href="${cta.url}" style="display:inline-block;background-color:#f97316;color:#000000;font-weight:bold;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:8px;">${esc(cta.label)}</a></p>` : ""}
${note ? `<p style="margin:0 0 8px;font-size:12px;color:#71717a;">${note}</p>` : ""}
<p style="margin:12px 0 0;font-size:12px;color:#71717a;">Need help? Reply to this email${supportEmail() ? ` or write to ${esc(supportEmail())}` : ""}.</p>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e4e4e7;text-align:center;">
<p style="margin:0;font-size:11px;color:#a1a1aa;">© ${new Date().getFullYear()} MOTOAI${siteUrl() ? ` • <a href="${siteUrl()}" style="color:#a1a1aa;">Website</a>` : ""} • Privacy • Terms</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
};

const textLayout = ({ heading, greeting, intro, rows, cta, note }) => {
    const lines = [
        `MOTOAI — ${heading}`,
        ``,
        `Hi ${greeting || "rider"},`,
        ``,
    ];
    lines[2] = `Hi ${cleanText(greeting || "rider")},`;
    if (intro) lines.push(cleanText(intro), ``);
    (rows || [])
        .filter((r) => r.value !== undefined && r.value !== null && r.value !== "")
        .forEach((r) => lines.push(`${r.label}: ${cleanText(r.text || r.value)}`));
    lines.push(``);
    if (note) lines.push(cleanText(note), ``);
    if (cta && cta.url) lines.push(`${cta.label}: ${cta.url}`, ``);
    lines.push(`— MOTOAI`);
    return lines.join("\n");
};

const stripTags = (s) => String(s || "").replace(/<[^>]*>/g, "");

const cleanText = (s) =>
    stripTags(s)
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"');

const inr = (n) => `Rs.${Number(n || 0).toLocaleString("en-IN")}`;

const fmtDate = (d) => {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
        return "—";
    }
};

module.exports = { esc, layout, textLayout, siteUrl, supportEmail, inr, fmtDate };
