import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ShieldCheck,
    ShieldAlert,
    Users,
    KeyRound,
    History,
    Save,
    X,
    AlertTriangle,
    Check,
    Loader2,
} from "lucide-react";
import {
    getAdminRoles,
    getRolePermissions,
    saveRolePermissions,
    setRoleActive,
    getRoleAuditLog,
} from "../../services/api";
import { useRole } from "../../context/RoleContext";

/* Accessible switch — native button with role="switch". */
const Toggle = ({ checked, onChange, disabled, label, tone = "orange" }) => {
    const on = !!checked;
    const activeRing =
        tone === "orange"
            ? "bg-orange-500"
            : tone === "red"
            ? "bg-red-500"
            : "bg-emerald-500";
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c0c] disabled:cursor-not-allowed disabled:opacity-50 ${
                on ? activeRing : "border-white/15 bg-white/10"
            }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    on ? "translate-x-6" : "translate-x-1"
                }`}
            />
        </button>
    );
};

const StatusPill = ({ enabled }) => (
    <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            enabled
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
        }`}
    >
        {enabled ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
        {enabled ? "Enabled" : "Disabled"}
    </span>
);

const formatDate = (iso) => {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "—";
    }
};

const actionLabel = (action) =>
    ({
        "role.enable": "Role enabled",
        "role.disable": "Role disabled",
        "role.enable.rejected": "Enable rejected",
        "role.disable.rejected": "Disable rejected",
        "role.permissions.update": "Permissions updated",
        "role.permissions.rejected": "Permission update rejected",
    })[action] || action;

/**
 * Role & Permissions — the admin control panel for roles.
 * Role enable/disable and per-module permission toggles are stored in
 * MongoDB and enforced by the backend.
 */
export const RoleManagementSection = () => {
    // Re-reads the caller's own effective permissions after a change,
    // so the UI reflects the new state immediately.
    const { refresh } = useRole();
    const [roles, setRoles] = useState([]);    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    // permission editor
    const [editing, setEditing] = useState(null); // role key
    const [draft, setDraft] = useState({});
    const [savingPerms, setSavingPerms] = useState(false);
    const [permError, setPermError] = useState("");

    // disable confirmation
    const [confirmRole, setConfirmRole] = useState(null);
    const [busyRole, setBusyRole] = useState("");

    // audit
    const [audit, setAudit] = useState([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [showAudit, setShowAudit] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getAdminRoles();
            setRoles(data.roles || []);
            setCatalog(data.permissionCatalog || []);
        } catch (err) {
            setError(err.message || "Unable to load role configuration.");
        } finally {
            setLoading(false);
        }
    }, []);

    const loadAudit = useCallback(async () => {
        setAuditLoading(true);
        try {
            const data = await getRoleAuditLog("", 50);
            setAudit(data.logs || []);
        } catch (err) {
            setError(err.message || "Unable to load the audit log.");
        } finally {
            setAuditLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
        load();
    }, [load]);

    const loadPermissions = useCallback(async (role) => {
        setPermError("");
        try {
            const data = await getRolePermissions(role);
            setEditing(role);
            setDraft({ ...(data.permissions || {}) });
        } catch (err) {
            setPermError(err.message || "Unable to load permissions.");
        }
    }, []);

    const toggleRole = async (role, enabled) => {
        if (!enabled) {
            // Disabling needs a confirmation with the impact shown.
            setConfirmRole(role);
            return;
        }
        setBusyRole(role);
        setError("");
        setNotice("");
        try {
            const data = await setRoleActive(role, true);
            setNotice(data.message || "Role updated.");
            await load();
            await refresh();
        } catch (err) {
            setError(err.message || "Could not update the role.");
        } finally {
            setBusyRole("");
        }
    };

    const confirmDisable = async () => {
        const role = confirmRole;
        if (!role) return;
        setBusyRole(role);
        setError("");
        setNotice("");
        try {
            const data = await setRoleActive(role, false);
            setNotice(data.message || "Role disabled.");
            setConfirmRole(null);
            await load();
            await loadAudit();
        } catch (err) {
            setError(err.message || "Could not disable the role.");
        } finally {
            setBusyRole("");
        }
    };

    const savePermissions = async () => {
        if (!editing) return;
        setSavingPerms(true);
        setPermError("");
        setNotice("");
        try {
            const data = await saveRolePermissions(editing, draft);
            setNotice(data.message || "Permissions saved.");
            setEditing(null);
            await load();
            await loadAudit();
            // The caller's own permissions may have changed — re-read them.
            await refresh();
        } catch (err) {
            setPermError(err.message || "Could not save permissions.");
        } finally {
            setSavingPerms(false);
        }
    };

    // Group the catalogue by module for the editor.
    const grouped = useMemo(() => {
        const map = new Map();
        catalog.forEach((p) => {
            if (!map.has(p.module)) map.set(p.module, []);
            map.get(p.module).push(p);
        });
        return [...map.entries()];
    }, [catalog]);

    const editingRole = roles.find((r) => r.role === editing);
    const confirmInfo = roles.find((r) => r.role === confirmRole);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <Loader2 size={30} className="animate-spin text-orange-500" />
                <p className="mt-4 text-sm text-zinc-500">Loading role configuration...</p>
            </div>
        );
    }

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-white">Roles &amp; Permissions</h2>
                    <p className="mt-1 max-w-2xl text-sm text-zinc-500">
                        Control which account types can sign in and which features each role may use.
                        Changes are enforced by the API immediately — no redeployment needed.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setShowAudit((v) => !v);
                        if (!showAudit) loadAudit();
                    }}
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-300 transition hover:border-orange-500/40 hover:text-orange-400"
                >
                    <History size={14} />
                    {showAudit ? "Hide audit log" : "Audit log"}
                </button>
            </div>

            {notice && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    <Check size={15} /> {notice}
                </div>
            )}
            {error && (
                <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <AlertTriangle size={15} /> {error}
                </div>
            )}

            {/* ---------------- Role cards ---------------- */}
            <div className="grid gap-4 lg:grid-cols-3">
                {roles.map((role) => {
                    const isAdmin = role.role === "admin";
                    const on = role.enabled;
                    return (
                        <div
                            key={role.role}
                            className={`flex flex-col rounded-2xl border bg-[#0c0c0c] p-5 transition ${
                                on ? "border-white/10" : "border-red-500/25"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                            on ? "bg-orange-500/10 text-orange-500" : "bg-red-500/10 text-red-400"
                                        }`}
                                    >
                                        {isAdmin ? (
                                            <ShieldCheck size={19} />
                                        ) : role.role === "provider" ? (
                                            <Users size={19} />
                                        ) : (
                                            <KeyRound size={19} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="truncate text-sm font-black text-white">
                                            {role.displayName}
                                        </h3>
                                        <p className="mt-0.5 text-[11px] text-zinc-500">
                                            {role.userCount} user{role.userCount === 1 ? "" : "s"}
                                        </p>
                                    </div>
                                </div>
                                <StatusPill enabled={on} />
                            </div>

                            <p className="mt-3 flex-1 text-xs leading-relaxed text-zinc-400">
                                {role.description}
                            </p>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => loadPermissions(role.role)}
                                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-300 transition hover:border-orange-500/40 hover:text-orange-400"
                                >
                                    <KeyRound size={12} /> Manage Permissions
                                </button>
                                <div className="ml-auto flex items-center gap-2">
                                    <span className="text-[11px] text-zinc-500">
                                        {on ? "Enabled" : "Disabled"}
                                    </span>
                                    <Toggle
                                        checked={on}
                                        disabled={busyRole === role.role || isAdmin}
                                        tone={on ? "orange" : "red"}
                                        label={
                                            isAdmin
                                                ? "The Admin role cannot be disabled"
                                                : `${on ? "Disable" : "Enable"} the ${role.displayName} role`
                                        }
                                        onChange={() => toggleRole(role.role, !on)}
                                    />
                                </div>
                            </div>

                            {isAdmin && (
                                <p className="mt-2 text-[11px] leading-relaxed text-amber-400/80">
                                    The Admin role cannot be disabled — it controls role and
                                    permission management. Disabling it would lock every
                                    administrator out.
                                </p>
                            )}

                            <p className="mt-3 border-t border-white/[0.06] pt-2.5 text-[10px] text-zinc-600">
                                Last modified: {formatDate(role.updatedAt)}
                                {role.updatedByName ? ` by ${role.updatedByName}` : ""}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* ---------------- Audit log ---------------- */}
            {showAudit && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-[#0c0c0c] p-5">
                    <h3 className="mb-3 text-sm font-black text-white">Audit history</h3>
                    {auditLoading ? (
                        <p className="py-6 text-center text-sm text-zinc-500">Loading audit log...</p>
                    ) : audit.length === 0 ? (
                        <p className="py-6 text-center text-sm text-zinc-500">
                            No role or permission changes recorded yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[620px] text-left text-xs">
                                <thead>
                                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
                                        <th className="py-2 pr-3 font-bold">When</th>
                                        <th className="py-2 pr-3 font-bold">Action</th>
                                        <th className="py-2 pr-3 font-bold">Role</th>
                                        <th className="py-2 pr-3 font-bold">By</th>
                                        <th className="py-2 font-bold">Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {audit.map((log) => (
                                        <tr key={log._id} className="border-b border-white/[0.05]">
                                            <td className="py-2.5 pr-3 text-zinc-400">
                                                {formatDate(log.createdAt)}
                                            </td>
                                            <td className="py-2.5 pr-3 font-semibold text-zinc-200">
                                                {actionLabel(log.action)}
                                            </td>
                                            <td className="py-2.5 pr-3 text-zinc-400">
                                                {log.role || "—"}
                                            </td>
                                            <td className="py-2.5 pr-3 text-zinc-400">
                                                {log.actor?.name || "system"}
                                            </td>
                                            <td
                                                className={`py-2.5 font-semibold ${
                                                    String(log.result || "").startsWith("rejected")
                                                        ? "text-amber-400"
                                                        : "text-emerald-400"
                                                }`}
                                            >
                                                {log.result || "success"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ---------------- Permission editor ---------------- */}
            {editing && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Permissions for ${editingRole?.displayName || editing}`}
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !savingPerms) setEditing(null);
                    }}
                >
                    <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 sm:p-8">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-black text-white">
                                    {editingRole?.displayName || editing} — Permissions
                                </h3>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Toggle the features this role may use. Changes apply immediately.
                                </p>
                            </div>
                            <button
                                onClick={() => setEditing(null)}
                                disabled={savingPerms}
                                aria-label="Close"
                                className="rounded-xl border border-white/10 p-2 text-zinc-400 transition hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {permError && (
                            <div role="alert" className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                {permError}
                            </div>
                        )}

                        <div className="space-y-5">
                            {grouped.map(([module, perms]) => (
                                <div key={module}>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                                        {module}
                                    </p>
                                    <div className="space-y-1.5">
                                        {perms.map((p) => (
                                            <div
                                                key={p.key}
                                                className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-zinc-100">
                                                        {p.label}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                                                        {p.desc}
                                                    </p>
                                                </div>
                                                <Toggle
                                                    checked={draft[p.key] === true}
                                                    onChange={() =>
                                                        setDraft((d) => ({ ...d, [p.key]: !d[p.key] }))
                                                    }
                                                    label={`${draft[p.key] ? "Revoke" : "Grant"} ${p.label}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <button
                                onClick={savePermissions}
                                disabled={savingPerms}
                                className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                            >
                                {savingPerms ? (
                                    <Loader2 size={15} className="animate-spin" />
                                ) : (
                                    <Save size={15} />
                                )}
                                {savingPerms ? "Saving..." : "Save Permissions"}
                            </button>
                            <button
                                onClick={() => setEditing(null)}
                                disabled={savingPerms}
                                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---------------- Disable confirmation ---------------- */}
            {confirmRole && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Confirm role change"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !busyRole) setConfirmRole(null);
                    }}
                >
                    <div className="w-full max-w-md rounded-3xl border border-red-500/25 bg-[#0c0c0c] p-6">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">
                                    Disable {confirmInfo?.displayName}?
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                                    <span className="font-bold text-zinc-200">
                                        {confirmInfo?.userCount || 0} user
                                        {confirmInfo?.userCount === 1 ? "" : "s"}
                                    </span>{" "}
                                    currently hold this role.
                                </p>
                                <ul className="mt-3 space-y-1.5 text-xs text-zinc-500">
                                    <li>• They will not be able to sign in.</li>
                                    <li>• Their existing sessions stop working immediately.</li>
                                    <li>• Protected API requests are rejected.</li>
                                    <li>• New registrations for this role are blocked.</li>
                                </ul>
                                <p className="mt-3 text-xs text-zinc-600">
                                    You can re-enable the role at any time.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                onClick={confirmDisable}
                                disabled={busyRole === confirmRole}
                                className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
                            >
                                {busyRole === confirmRole ? (
                                    <Loader2 size={15} className="animate-spin" />
                                ) : (
                                    <ShieldAlert size={15} />
                                )}
                                Disable Role
                            </button>
                            <button
                                onClick={() => setConfirmRole(null)}
                                disabled={busyRole === confirmRole}
                                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default RoleManagementSection;
