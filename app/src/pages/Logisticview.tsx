import React, { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Order {
  _id: string; orderNumber?: string; user?: { name: string; email: string } | null;
  totalPrice: number; status: string; isPaid?: boolean; paymentMethod?: string;
  shippingAddress?: { address?: string; city?: string; county?: string; postalCode?: string; phone?: string; };
  orderItems?: { name?: string; quantity: number; price?: number; }[];
  createdAt?: string; trackingNumber?: string; courier?: string; notes?: string;
}
interface Driver {
  _id: string; name: string; email: string; phone: string;
  vehicleType: string; licensePlate?: string; zone: string;
  status: string; isActive: boolean; isApproved: boolean;
  totalDeliveries: number; successfulDeliveries: number; rating: number; createdAt?: string;
}
interface Pagination { page: number; pages: number; total: number; limit: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatKES(n: number) { return `KES ${Number(n).toLocaleString()}`; }
function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function getUserName(user?: { name: string; email: string } | null) {
  return user?.name || user?.email || "Guest";
}

const VEHICLE_ICONS: Record<string, string> = {
  motorcycle: "🏍️", bicycle: "🚲", car: "🚗", van: "🚐", truck: "🚛",
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    pending:    { bg: "#fef9c3", color: "#854d0e", label: "Pending"     },
    processing: { bg: "#dbeafe", color: "#1e40af", label: "Processing"  },
    shipped:    { bg: "#ede9fe", color: "#5b21b6", label: "In Transit"  },
    delivered:  { bg: "#dcfce7", color: "#14532d", label: "Delivered"   },
    cancelled:  { bg: "#fee2e2", color: "#7f1d1d", label: "Cancelled"   },
    failed:     { bg: "#fee2e2", color: "#7f1d1d", label: "Failed"      },
    available:  { bg: "#dcfce7", color: "#14532d", label: "Available"   },
    busy:       { bg: "#fef9c3", color: "#854d0e", label: "On Delivery" },
    offline:    { bg: "#f1f5f9", color: "#475569", label: "Offline"     },
    inactive:   { bg: "#fee2e2", color: "#7f1d1d", label: "Inactive"    },
    dispatched: { bg: "#ede9fe", color: "#5b21b6", label: "Dispatched"  },
    accepted:   { bg: "#dbeafe", color: "#1e40af", label: "Accepted"    },
    in_transit: { bg: "#ede9fe", color: "#5b21b6", label: "In Transit"  },
  };
  const c = cfg[status] ?? cfg["pending"];
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, fontFamily: "'DM Mono',monospace", letterSpacing: "0.04em" }}>
      {c.label}
    </span>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", animation: "spin 0.7s linear infinite" }} />
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ padding: "48px 20px", textAlign: "center", color: "#94a3b8" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontSize: 14 }}>{text}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", options }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; options?: string[];
}) {
  const s: React.CSSProperties = {
    width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0",
    borderRadius: 10, padding: "10px 14px", color: "#0f172a", fontSize: 13,
    fontFamily: "'Sora',sans-serif", outline: "none", boxSizing: "border-box",
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6, fontFamily: "'Sora',sans-serif", fontWeight: 500 }}>{label}</label>
      {options
        ? <select value={value} onChange={e => onChange(e.target.value)} style={s}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s} />
      }
    </div>
  );
}

function Paginator({ pg, onPage }: { pg: Pagination; onPage: (p: number) => void }) {
  if (pg.pages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid #f1f5f9" }}>
      <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
        {((pg.page - 1) * pg.limit) + 1}–{Math.min(pg.page * pg.limit, pg.total)} of {pg.total}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={pg.page === 1} onClick={() => onPage(pg.page - 1)}
          style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", borderRadius: 9, padding: "5px 12px", cursor: pg.page === 1 ? "not-allowed" : "pointer", opacity: pg.page === 1 ? 0.5 : 1 }}>←</button>
        <span style={{ color: "#64748b", fontSize: 12, fontFamily: "'DM Mono',monospace", alignSelf: "center" }}>{pg.page}/{pg.pages}</span>
        <button disabled={pg.page === pg.pages} onClick={() => onPage(pg.page + 1)}
          style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", borderRadius: 9, padding: "5px 12px", cursor: pg.page === pg.pages ? "not-allowed" : "pointer", opacity: pg.page === pg.pages ? 0.5 : 1 }}>→</button>
      </div>
    </div>
  );
}

// ─── Add Driver Modal ─────────────────────────────────────────────────────────
function AddDriverModal({ token, onClose, onSaved }: { token: string; onClose: () => void; onSaved: () => void; }) {
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    phone: "", zone: "", vehicleType: "motorcycle", licensePlate: "",
  });
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState("");
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  // Derived validation states
  const pwdStrength = (() => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6) return { label: "Too short", color: "#dc2626", width: "25%" };
    if (p.length < 8 || !/[0-9]/.test(p)) return { label: "Fair", color: "#d97706", width: "50%" };
    if (!/[^a-zA-Z0-9]/.test(p)) return { label: "Good", color: "#2563eb", width: "75%" };
    return { label: "Strong", color: "#059669", width: "100%" };
  })();

  const pwdMatch    = form.confirmPassword ? form.password === form.confirmPassword : null;
  const emailValid  = !form.email || /^\S+@\S+\.\S+$/.test(form.email);
  const canSubmit   = form.name && form.email && emailValid && form.password.length >= 6
                      && pwdMatch === true && form.phone && form.zone;

  const handleSave = async () => {
    if (!canSubmit) { setError("Please fix the errors above before submitting"); return; }
    setSaving(true); setError("");
    try {
      const { confirmPassword, ...payload } = form;
      const res  = await fetch(`${API_URL}/api/drivers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!d.success) { setError(d.message); return; }
      setSuccess(true);
      setTimeout(() => { onSaved(); onClose(); }, 1800);
    } catch { setError("Failed to create driver — check your connection"); }
    finally { setSaving(false); }
  };

  // Input component inline so it can use local state (showPwd etc.)
  const inp = (
    label: string,
    key: keyof typeof form,
    opts: { placeholder?: string; type?: string; hint?: string; valid?: boolean | null; toggle?: { show: boolean; onToggle: () => void } }
  ) => {
    const hasError  = opts.valid === false;
    const hasSuccess = opts.valid === true;
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: ".05em", textTransform: "uppercase" }}>{label}</label>
        <div style={{ position: "relative" }}>
          <input
            type={opts.toggle ? (opts.toggle.show ? "text" : "password") : (opts.type ?? "text")}
            value={form[key]}
            onChange={e => set(key)(e.target.value)}
            placeholder={opts.placeholder}
            style={{
              width: "100%", padding: opts.toggle ? "11px 44px 11px 14px" : "11px 14px",
              border: `1.5px solid ${hasError ? "#fca5a5" : hasSuccess ? "#86efac" : "#e2e8f0"}`,
              borderRadius: 10, background: hasError ? "#fff5f5" : hasSuccess ? "#f0fdf4" : "#f8fafc",
              color: "#0f172a", fontSize: 13, fontFamily: "'Sora',sans-serif",
              outline: "none", boxSizing: "border-box" as const, transition: "border-color .2s, background .2s",
            }}
          />
          {opts.toggle && (
            <button type="button" onClick={opts.toggle.onToggle}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15, color: "#94a3b8", padding: 0, lineHeight: 1 }}>
              {opts.toggle.show ? "🙈" : "👁️"}
            </button>
          )}
          {hasSuccess && !opts.toggle && (
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#059669", fontSize: 14 }}>✓</span>
          )}
          {hasError && !opts.toggle && (
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#dc2626", fontSize: 14 }}>✕</span>
          )}
        </div>
        {opts.hint && <p style={{ fontSize: 11, color: hasError ? "#dc2626" : "#94a3b8", marginTop: 4 }}>{opts.hint}</p>}
      </div>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, maxHeight: "92vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,.2)", animation: "modalIn 0.2s ease" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#1e40af,#4f46e5)", borderRadius: "24px 24px 0 0", padding: "24px 28px", position: "relative" }}>
          <button onClick={onClose}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", border: "none", borderRadius: 8, color: "white", cursor: "pointer", padding: "5px 9px", fontSize: 14, lineHeight: 1 }}>✕</button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🧑‍✈️</div>
            <div>
              <h3 style={{ color: "white", fontSize: 18, fontWeight: 800, fontFamily: "'Sora',sans-serif", margin: 0 }}>Add New Driver</h3>
              <p style={{ color: "rgba(255,255,255,.65)", fontSize: 12, margin: 0, marginTop: 2 }}>Fill in all required fields to register a driver</p>
            </div>
          </div>

          {/* Step pills */}
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            {[
              { n: "1", label: "Account",  done: !!(form.name && form.email && emailValid) },
              { n: "2", label: "Security", done: !!(form.password.length >= 6 && pwdMatch === true) },
              { n: "3", label: "Vehicle",  done: !!(form.phone && form.zone) },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.12)", borderRadius: 20, padding: "4px 12px" }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: s.done ? "#4ade80" : "rgba(255,255,255,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: s.done ? "#14532d" : "white", flexShrink: 0 }}>
                  {s.done ? "✓" : s.n}
                </span>
                <span style={{ fontSize: 11, color: s.done ? "#4ade80" : "rgba(255,255,255,.7)", fontWeight: 600 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px" }}>
          {error && (
            <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", color: "#dc2626", fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>⚠️</span> {error}
            </div>
          )}

          {success && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "16px", color: "#059669", fontSize: 14, marginBottom: 20, textAlign: "center", fontWeight: 700 }}>
              ✅ Driver created successfully!
            </div>
          )}

          {/* Section: Account Info */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, height: 1, background: "#f1f5f9", display: "inline-block" }} />
              Account Information
              <span style={{ flex: 1, height: 1, background: "#f1f5f9", display: "inline-block" }} />
            </div>
            {inp("Full Name", "name", { placeholder: "e.g. John Kamau", valid: form.name ? form.name.length >= 2 : null })}
            {inp("Email Address", "email", {
              type: "email", placeholder: "john@example.com",
              valid: form.email ? emailValid : null,
              hint: form.email && !emailValid ? "Enter a valid email address" : undefined,
            })}
          </div>

          {/* Section: Security */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, height: 1, background: "#f1f5f9", display: "inline-block" }} />
              Security
              <span style={{ flex: 1, height: 1, background: "#f1f5f9", display: "inline-block" }} />
            </div>

            {inp("Password", "password", {
              placeholder: "At least 6 characters",
              toggle: { show: showPwd, onToggle: () => setShowPwd(v => !v) },
            })}

            {/* Password strength bar */}
            {pwdStrength && (
              <div style={{ marginTop: -10, marginBottom: 16 }}>
                <div style={{ height: 4, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: pwdStrength.width, background: pwdStrength.color, borderRadius: 4, transition: "width .3s, background .3s" }} />
                </div>
                <span style={{ fontSize: 11, color: pwdStrength.color, fontWeight: 600, marginTop: 4, display: "inline-block" }}>{pwdStrength.label}</span>
              </div>
            )}

            {inp("Confirm Password", "confirmPassword", {
              placeholder: "Re-enter password",
              toggle: { show: showConfirm, onToggle: () => setShowConfirm(v => !v) },
              valid: pwdMatch,
              hint: pwdMatch === false ? "Passwords do not match" : pwdMatch === true ? undefined : undefined,
            })}
          </div>

          {/* Section: Vehicle & Zone */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, height: 1, background: "#f1f5f9", display: "inline-block" }} />
              Vehicle & Zone
              <span style={{ flex: 1, height: 1, background: "#f1f5f9", display: "inline-block" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: ".05em", textTransform: "uppercase" }}>Phone *</label>
                <input value={form.phone} onChange={e => set("phone")(e.target.value)} placeholder="0712 345 678"
                  style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${form.phone ? "#86efac" : "#e2e8f0"}`, borderRadius: 10, background: form.phone ? "#f0fdf4" : "#f8fafc", color: "#0f172a", fontSize: 13, fontFamily: "'Sora',sans-serif", outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: ".05em", textTransform: "uppercase" }}>Zone / City *</label>
                <input value={form.zone} onChange={e => set("zone")(e.target.value)} placeholder="e.g. Nairobi"
                  style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${form.zone ? "#86efac" : "#e2e8f0"}`, borderRadius: 10, background: form.zone ? "#f0fdf4" : "#f8fafc", color: "#0f172a", fontSize: 13, fontFamily: "'Sora',sans-serif", outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: ".05em", textTransform: "uppercase" }}>Vehicle Type</label>
                <select value={form.vehicleType} onChange={e => set("vehicleType")(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", color: "#0f172a", fontSize: 13, fontFamily: "'Sora',sans-serif", outline: "none", boxSizing: "border-box" as const }}>
                  {["motorcycle","bicycle","car","van","truck"].map(v => <option key={v} value={v}>{VEHICLE_ICONS[v]} {v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: ".05em", textTransform: "uppercase" }}>License Plate</label>
                <input value={form.licensePlate} onChange={e => set("licensePlate")(e.target.value)} placeholder="KCA 123X"
                  style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", color: "#0f172a", fontSize: 13, fontFamily: "'Sora',sans-serif", outline: "none", boxSizing: "border-box" as const }} />
              </div>
            </div>
          </div>

          {/* Zone tip */}
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#92400e", marginBottom: 24, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0 }}>💡</span>
            <span>Zone must <strong>exactly match the customer's city</strong> (e.g. "Nairobi") for auto-dispatch to work correctly.</span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose}
              style={{ flex: 1, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#64748b", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 600, fontFamily: "'Sora',sans-serif", cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !canSubmit || success}
              style={{ flex: 2, border: "none", background: canSubmit && !saving ? "linear-gradient(135deg,#1e40af,#4f46e5)" : "#e2e8f0", color: canSubmit && !saving ? "white" : "#94a3b8", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, fontFamily: "'Sora',sans-serif", cursor: canSubmit && !saving ? "pointer" : "not-allowed", boxShadow: canSubmit ? "0 4px 14px rgba(37,99,235,.3)" : "none", transition: "all .2s" }}>
              {saving ? "Creating driver…" : success ? "✓ Driver Created!" : "Create Driver →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dispatch Modal ───────────────────────────────────────────────────────────
// Flow: 1) shows order summary + all active drivers  2) admin picks a driver
//       (can call them first)  3) confirms dispatch → emails that driver
function DispatchModal({ order, token, onClose, onDispatched }: {
  order: Order; token: string; onClose: () => void; onDispatched: () => void;
}) {
  const [allDrivers,    setAllDrivers]    = useState<Driver[]>([]);
  const [driversLoading,setDriversLoading]= useState(true);
  const [selectedId,    setSelectedId]    = useState<string>("");
  const [loading,       setLoading]       = useState(false);
  const [result,        setResult]        = useState<{ success: boolean; message: string } | null>(null);

  const city = order.shippingAddress?.city || "Unknown";

  // Load ALL active drivers on mount (not just zone-matched — admin decides)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/drivers/admin/all?limit=100`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        if (d.success) {
          const active = (d.drivers ?? []).filter((dr: Driver) => dr.isActive);
          setAllDrivers(active);
          // Pre-select first available driver in the city if any
          const zoneMatch = active.find((dr: Driver) =>
            dr.status === "available" && dr.zone?.toLowerCase() === city.toLowerCase()
          );
          if (zoneMatch) setSelectedId(zoneMatch._id);
        }
      } catch { /* ignore */ }
      finally { setDriversLoading(false); }
    })();
  }, []);

  const selectedDriver = allDrivers.find(d => d._id === selectedId);

  const handleDispatch = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/deliveries/dispatch/${order._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ driverId: selectedId }), // ← send chosen driver
      });
      const d = await res.json();
      setResult(d);
      if (d.success) { onDispatched(); setTimeout(onClose, 3000); }
    } catch { setResult({ success: false, message: "Network error. Try again." }); }
    finally { setLoading(false); }
  };

  const statusDot = (s: string) => {
    if (s === "available") return { bg: "#059669", label: "Available" };
    if (s === "busy")      return { bg: "#d97706", label: "On Delivery" };
    return                        { bg: "#94a3b8", label: "Offline" };
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(15,23,42,0.55)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:540, maxHeight:"90vh", overflow:"auto", boxShadow:"0 32px 80px rgba(0,0,0,.22)", animation:"modalIn 0.2s ease" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#1e40af,#4f46e5)", borderRadius:"24px 24px 0 0", padding:"22px 26px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:"rgba(255,255,255,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🚚</div>
              <div>
                <h3 style={{ color:"white", fontSize:17, fontWeight:800, fontFamily:"'Sora',sans-serif", margin:0 }}>Dispatch Order</h3>
                <p style={{ color:"rgba(255,255,255,.65)", fontSize:12, margin:0, marginTop:2 }}>Select a driver and confirm dispatch</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:8, color:"white", cursor:"pointer", padding:"5px 10px", fontSize:14 }}>✕</button>
          </div>
        </div>

        <div style={{ padding:"22px 26px" }}>

          {/* Result states */}
          {result?.success ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:56, marginBottom:16 }}>🎉</div>
              <h2 style={{ color:"#059669", fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:20, marginBottom:8 }}>Dispatched!</h2>
              <p style={{ color:"#374151", fontSize:14, marginBottom:6 }}>
                <strong>{selectedDriver?.name}</strong> has been notified by email.
              </p>
              <p style={{ color:"#64748b", fontSize:13 }}>They will accept the job from their driver portal.</p>
            </div>
          ) : result && !result.success ? (
            <div style={{ textAlign:"center", padding:"12px 0" }}>
              <div style={{ fontSize:44, marginBottom:14 }}>⚠️</div>
              <h2 style={{ color:"#dc2626", fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:17, marginBottom:8 }}>Dispatch Failed</h2>
              <p style={{ color:"#374151", fontSize:13, marginBottom:20 }}>{result.message}</p>
              <button onClick={() => setResult(null)} style={{ border:"1px solid #e2e8f0", background:"#f8fafc", color:"#64748b", borderRadius:10, padding:"10px 24px", fontWeight:600, fontFamily:"'Sora',sans-serif", cursor:"pointer", fontSize:13 }}>Try Again</button>
            </div>
          ) : (
            <>
              {/* Order summary */}
              <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:"14px 16px", marginBottom:20, fontSize:13, color:"#374151", lineHeight:1.9 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontWeight:700, color:"#0f172a", fontSize:14 }}>
                    #{order.orderNumber ?? order._id.slice(-8)}
                  </span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, color:"#2563eb", fontSize:14 }}>{formatKES(order.totalPrice)}</span>
                </div>
                <div>👤 {getUserName(order.user)}</div>
                <div>📍 {city}{order.shippingAddress?.address ? ` — ${order.shippingAddress.address}` : ""}</div>
                {order.shippingAddress?.phone && <div>📞 {order.shippingAddress.phone}</div>}
              </div>

              {/* Driver picker */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#64748b", letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>
                  Select Driver
                </div>

                {driversLoading ? (
                  <div style={{ textAlign:"center", padding:"24px 0", color:"#94a3b8", fontSize:13 }}>Loading drivers…</div>
                ) : allDrivers.length === 0 ? (
                  <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:12, padding:"14px 16px", fontSize:13, color:"#9a3412", textAlign:"center" }}>
                    No active drivers found. Add drivers in the Drivers tab first.
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:260, overflowY:"auto" }}>
                    {allDrivers.map(dr => {
                      const dot      = statusDot(dr.status);
                      const isZone   = dr.zone?.toLowerCase() === city.toLowerCase();
                      const selected = selectedId === dr._id;
                      return (
                        <div
                          key={dr._id}
                          onClick={() => setSelectedId(dr._id)}
                          style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, border:`2px solid ${selected ? "#2563eb" : "#e2e8f0"}`, background: selected ? "#eff6ff" : "#fafafa", cursor:"pointer", transition:"all .15s", position:"relative" }}
                        >
                          {/* Avatar */}
                          <div style={{ width:38, height:38, borderRadius:"50%", background: selected ? "linear-gradient(135deg,#2563eb,#4f46e5)" : "#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", color: selected ? "white" : "#64748b", fontWeight:700, fontSize:13, flexShrink:0 }}>
                            {dr.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                          </div>

                          {/* Info */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, color:"#0f172a", fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
                              {dr.name}
                              {isZone && <span style={{ fontSize:10, background:"#dbeafe", color:"#1e40af", borderRadius:20, padding:"1px 7px", fontWeight:600 }}>same zone</span>}
                            </div>
                            <div style={{ fontSize:11, color:"#64748b", marginTop:1 }}>
                              {VEHICLE_ICONS[dr.vehicleType] ?? "🚗"} {dr.vehicleType} · 📍 {dr.zone || "—"}
                            </div>
                          </div>

                          {/* Status + call */}
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:dot.bg }}>
                              <span style={{ width:7, height:7, borderRadius:"50%", background:dot.bg, display:"inline-block" }} />
                              {dot.label}
                            </div>
                            {dr.phone && (
                              <a
                                href={`tel:${dr.phone}`}
                                onClick={e => e.stopPropagation()}
                                style={{ fontSize:11, background:"#f0fdf4", color:"#059669", border:"1px solid #bbf7d0", borderRadius:8, padding:"3px 9px", fontWeight:600, textDecoration:"none", display:"flex", alignItems:"center", gap:4 }}
                              >
                                📞 Call
                              </a>
                            )}
                          </div>

                          {/* Selected tick */}
                          {selected && (
                            <div style={{ position:"absolute", top:8, right:8, width:18, height:18, borderRadius:"50%", background:"#2563eb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"white", fontWeight:700 }}>✓</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected driver summary + warning if offline/busy */}
              {selectedDriver && (
                <div style={{ background: selectedDriver.status === "available" ? "#f0fdf4" : "#fffbeb", border:`1px solid ${selectedDriver.status === "available" ? "#bbf7d0" : "#fde68a"}`, borderRadius:12, padding:"10px 14px", fontSize:12, color: selectedDriver.status === "available" ? "#14532d" : "#92400e", marginBottom:18, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:16 }}>{selectedDriver.status === "available" ? "✅" : "⚠️"}</span>
                  <span>
                    {selectedDriver.status === "available"
                      ? `${selectedDriver.name} is available and will be notified by email.`
                      : `${selectedDriver.name} is currently ${selectedDriver.status === "busy" ? "on another delivery" : "offline"}. You can still dispatch — call them first to confirm.`
                    }
                  </span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={onClose} style={{ flex:1, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#64748b", borderRadius:12, padding:"13px", fontWeight:600, fontFamily:"'Sora',sans-serif", cursor:"pointer", fontSize:13 }}>
                  Cancel
                </button>
                <button
                  onClick={handleDispatch}
                  disabled={loading || !selectedId}
                  style={{ flex:2, border:"none", background: selectedId ? "linear-gradient(135deg,#1e40af,#4f46e5)" : "#e2e8f0", color: selectedId ? "white" : "#94a3b8", borderRadius:12, padding:"13px", fontWeight:700, fontFamily:"'Sora',sans-serif", cursor: selectedId ? "pointer" : "not-allowed", fontSize:14, boxShadow: selectedId ? "0 4px 14px rgba(37,99,235,.3)" : "none", transition:"all .2s" }}
                >
                  {loading ? "Dispatching…" : selectedDriver ? `🚀 Dispatch to ${selectedDriver.name.split(" ")[0]}` : "🚀 Dispatch"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
interface LogisticViewProps { token: string; }

export default function LogisticView({ token }: LogisticViewProps) {
  const [mainTab, setMainTab] = useState<"shipments" | "drivers">("shipments");

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPg, setOrdersPg] = useState<Pagination>({ page: 1, pages: 1, total: 0, limit: 10 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);

  // Drivers state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversPg, setDriversPg] = useState<Pagination>({ page: 1, pages: 1, total: 0, limit: 20 });
  const [showAddDriver, setShowAddDriver] = useState(false);

  const authH = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const fetchOrders = useCallback(async (page = 1, status = "all") => {
    setOrdersLoading(true);
    try {
      const q = status !== "all" ? `&status=${status}` : "";
      const res = await fetch(`${API_URL}/api/admin/orders?page=${page}&limit=10${q}`, { headers: authH() });
      const d = await res.json();
      if (d.success) { setOrders(d.orders ?? []); if (d.pagination) setOrdersPg(d.pagination); }
    } catch { /* ignore */ }
    finally { setOrdersLoading(false); }
  }, [authH]);

  // FIX: fetchDrivers now fetches ALL drivers across all pages for the counter.
  // It uses limit=100 to get all at once — adjust if you have more than 100 drivers.
  const fetchDrivers = useCallback(async (page = 1) => {
    setDriversLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/drivers/admin/all?page=${page}&limit=100`, { headers: authH() });
      const d = await res.json();
      if (d.success) {
        setDrivers(d.drivers ?? []);
        if (d.pagination) setDriversPg(d.pagination);
      }
    } catch { /* ignore */ }
    finally { setDriversLoading(false); }
  }, [authH]);

  // FIX: Fetch drivers on mount — not just when the drivers tab is clicked.
  // This ensures availableDrivers counter is correct from the start.
  useEffect(() => {
    fetchOrders(1, statusFilter);
    fetchDrivers(1); // ← was missing — drivers were never loaded on the shipments tab
  }, []);

  useEffect(() => { fetchOrders(1, statusFilter); }, [statusFilter]);

  const handleDeleteDriver = async (id: string) => {
    if (!confirm("Remove this driver?")) return;
    try {
      await fetch(`${API_URL}/api/drivers/admin/${id}`, { method: "DELETE", headers: authH() });
      fetchDrivers(driversPg.page);
    } catch { /* ignore */ }
  };

  const handleToggleDriverStatus = async (driver: Driver) => {
    try {
      await fetch(`${API_URL}/api/drivers/admin/${driver._id}`, {
        method: "PUT", headers: authH(),
        body: JSON.stringify({ isActive: !driver.isActive }),
      });
      fetchDrivers(driversPg.page);
    } catch { /* ignore */ }
  };

  const STATUS_TABS = [
    { key: "all",        label: "All",        color: "#2563eb" },
    { key: "pending",    label: "Pending",    color: "#d97706" },
    { key: "processing", label: "Processing", color: "#2563eb" },
    { key: "shipped",    label: "In Transit", color: "#7c3aed" },
    { key: "delivered",  label: "Delivered",  color: "#059669" },
    { key: "cancelled",  label: "Cancelled",  color: "#dc2626" },
    { key: "failed",     label: "Failed",     color: "#dc2626" },
  ];

  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase();
    return !q ||
      (o.orderNumber ?? "").toLowerCase().includes(q) ||
      getUserName(o.user).toLowerCase().includes(q) ||
      (o.shippingAddress?.city ?? "").toLowerCase().includes(q);
  });

  // FIX: drivers is now always populated from mount, so this count is always correct.
  // Checks d.status === "available" (backend maps driverStatus → status in admin/all).
  const availableDrivers = drivers.filter(d => d.status === "available" && d.isActive).length;

  return (
    <>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes modalIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        .lg-row:hover td { background:#fafafa }
        table { width:100%; border-collapse:collapse }
        th { text-align:left; padding:12px 16px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:#94a3b8; border-bottom:1px solid #f1f5f9; background:#fafafa }
        td { padding:13px 16px; border-bottom:1px solid #f8fafc; font-size:13.5px; color:#374151; vertical-align:middle }
      `}</style>

      <div style={{ animation: "fadeUp .4s ease" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ color: "#0f172a", fontWeight: 800, fontSize: 20, fontFamily: "'Sora',sans-serif" }}>🚚 Logistics & Delivery</h2>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Dispatch orders, manage drivers, track deliveries</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Available drivers counter — now always accurate because drivers load on mount */}
            <div style={{ background: availableDrivers > 0 ? "#f0fdf4" : "#f8fafc", border: `1px solid ${availableDrivers > 0 ? "#bbf7d0" : "#e2e8f0"}`, borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 600, color: availableDrivers > 0 ? "#059669" : "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: availableDrivers > 0 ? "#059669" : "#94a3b8", display: "inline-block", animation: availableDrivers > 0 ? "pulse 2s infinite" : "none" }} />
              {availableDrivers} driver{availableDrivers !== 1 ? "s" : ""} available
            </div>

            <button
              onClick={() => { fetchOrders(ordersPg.page, statusFilter); fetchDrivers(1); }}
              style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 600, fontFamily: "'Sora',sans-serif", cursor: "pointer" }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* ── Main Tabs ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {([
            { key: "shipments", label: "📦 Shipments", count: ordersPg.total },
            { key: "drivers",   label: "🧑‍✈️ Drivers",   count: drivers.length },
          ] as { key: "shipments"|"drivers"; label: string; count: number }[]).map(t => (
            <button key={t.key} onClick={() => setMainTab(t.key)}
              style={{ padding: "10px 20px", borderRadius: 12, border: mainTab === t.key ? "2px solid #2563eb" : "1px solid #e2e8f0", background: mainTab === t.key ? "#eff6ff" : "white", color: mainTab === t.key ? "#2563eb" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Sora',sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
              {t.label}
              <span style={{ background: mainTab === t.key ? "#2563eb" : "#f1f5f9", color: mainTab === t.key ? "white" : "#94a3b8", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── SHIPMENTS TAB ────────────────────────────────────────────────── */}
        {mainTab === "shipments" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STATUS_TABS.map(tab => (
                  <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                    style={{ padding: "6px 14px", borderRadius: 20, border: statusFilter === tab.key ? `2px solid ${tab.color}` : "1px solid #e2e8f0", background: statusFilter === tab.key ? tab.color : "white", color: statusFilter === tab.key ? "white" : "#64748b", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'Sora',sans-serif" }}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 13 }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders…"
                  style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 14px 8px 32px", color: "#1e293b", fontSize: 13, width: 200, outline: "none", fontFamily: "'Sora',sans-serif" }} />
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {ordersLoading ? <Spinner /> : filteredOrders.length === 0 ? <EmptyState icon="📦" text="No orders found" /> : (
                <table>
                  <thead>
                    <tr><th>Order</th><th>Customer</th><th>Destination</th><th>Status</th><th>Value</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o._id} className="lg-row">
                        <td>
                          <div style={{ fontFamily: "'DM Mono',monospace", color: "#2563eb", fontSize: 12, fontWeight: 700 }}>#{o.orderNumber ?? o._id.slice(-8)}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{timeAgo(o.createdAt)}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{getUserName(o.user)}</div>
                          {o.shippingAddress?.phone && <div style={{ fontSize: 11, color: "#94a3b8" }}>📞 {o.shippingAddress.phone}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>📍 {o.shippingAddress?.city ?? "—"}</div>
                          {o.shippingAddress?.address && <div style={{ fontSize: 11, color: "#64748b", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.shippingAddress.address}</div>}
                        </td>
                        <td><StatusBadge status={o.status} /></td>
                        <td style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{formatKES(o.totalPrice)}</td>
                        <td>
                          {o.status === "processing" && (
                            <button onClick={() => setDispatchOrder(o)}
                              style={{ border: "none", background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "white", borderRadius: 9, padding: "7px 14px", fontSize: 12, fontWeight: 700, fontFamily: "'Sora',sans-serif", cursor: "pointer", boxShadow: "0 2px 8px rgba(37,99,235,.25)", display: "flex", alignItems: "center", gap: 6 }}>
                              🚀 Dispatch
                            </button>
                          )}
                          {o.status === "shipped" && (
                            <span style={{ fontSize: 12, color: "#7c3aed", background: "#f5f3ff", padding: "5px 10px", borderRadius: 8, fontWeight: 600 }}>🚚 In Transit</span>
                          )}
                          {o.status === "delivered" && (
                            <span style={{ fontSize: 12, color: "#059669", background: "#f0fdf4", padding: "5px 10px", borderRadius: 8, fontWeight: 600 }}>✅ Delivered</span>
                          )}
                          {o.status === "cancelled" && (
                            <span style={{ fontSize: 12, color: "#94a3b8", background: "#f8fafc", padding: "5px 10px", borderRadius: 8 }}>Cancelled</span>
                          )}
                          {o.status === "failed" && (
                            <span style={{ fontSize: 12, color: "#dc2626", background: "#fee2e2", padding: "5px 10px", borderRadius: 8, fontWeight: 600 }}>Failed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <Paginator pg={ordersPg} onPage={p => fetchOrders(p, statusFilter)} />
            </div>
          </>
        )}

        {/* ── DRIVERS TAB ─────────────────────────────────────────────────── */}
        {mainTab === "drivers" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 13, color: "#64748b" }}>{drivers.length} total · </span>
                <span style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>{availableDrivers} available</span>
                <span style={{ fontSize: 13, color: "#94a3b8" }}> · {drivers.filter(d => d.status === "busy").length} on delivery</span>
                <span style={{ fontSize: 13, color: "#94a3b8" }}> · {drivers.filter(d => !d.isActive).length} inactive</span>
              </div>
              <button onClick={() => setShowAddDriver(true)}
                style={{ border: "none", background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "white", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, fontFamily: "'Sora',sans-serif", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,.25)" }}>
                ＋ Add Driver
              </button>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {driversLoading ? <Spinner /> : drivers.length === 0 ? <EmptyState icon="🧑‍✈️" text="No drivers yet — add your first driver" /> : (
                <table>
                  <thead>
                    <tr><th>Driver</th><th>Zone</th><th>Vehicle</th><th>Status</th><th>Deliveries</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {drivers.map(d => (
                      <tr key={d._id} className="lg-row">
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                              {d.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>{d.name}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Mono',monospace" }}>{d.email}</div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>📞 {d.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ background: "#eff6ff", color: "#2563eb", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>📍 {d.zone}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: 16 }}>{VEHICLE_ICONS[d.vehicleType] ?? "🚗"}</span>
                          <span style={{ fontSize: 12, color: "#64748b", marginLeft: 6, textTransform: "capitalize" }}>{d.vehicleType}</span>
                          {d.licensePlate && <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Mono',monospace" }}>{d.licensePlate}</div>}
                        </td>
                        <td>
                          <StatusBadge status={d.isActive ? d.status : "inactive"} />
                          {!d.isActive && <div style={{ fontSize: 10, color: "#dc2626", marginTop: 3 }}>Account deactivated</div>}
                        </td>
                        <td>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#0f172a" }}>{d.successfulDeliveries}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>of {d.totalDeliveries} total</div>
                          <div style={{ fontSize: 11, color: "#d97706" }}>⭐ {d.rating?.toFixed(1) ?? "5.0"}</div>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => handleToggleDriverStatus(d)}
                              style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, fontFamily: "'Sora',sans-serif", cursor: "pointer" }}>
                              {d.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button onClick={() => handleDeleteDriver(d._id)}
                              style={{ border: "1px solid #fecaca", background: "#fee2e2", color: "#dc2626", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, fontFamily: "'Sora',sans-serif", cursor: "pointer" }}>
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <Paginator pg={driversPg} onPage={fetchDrivers} />
            </div>
          </>
        )}
      </div>

      {dispatchOrder && (
        <DispatchModal
          order={dispatchOrder} token={token}
          onClose={() => setDispatchOrder(null)}
          onDispatched={() => { fetchOrders(ordersPg.page, statusFilter); fetchDrivers(1); }}
        />
      )}
      {showAddDriver && (
        <AddDriverModal token={token} onClose={() => setShowAddDriver(false)} onSaved={() => fetchDrivers(1)} />
      )}
    </>
  );
}

