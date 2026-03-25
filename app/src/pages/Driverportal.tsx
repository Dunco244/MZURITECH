import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// ─── API URLs ─────────────────────────────────────────────────────────────────
const BASE         = import.meta.env.VITE_API_URL || "http://localhost:5000";
const DELIVERY_API = `${BASE}/api/deliveries`;
const DRIVERS_API  = `${BASE}/api/drivers`;   // ← status toggle goes HERE not /deliveries

// ─── Delivery fee rates — must match backend DELIVERY_FEES ───────────────────
const DELIVERY_FEES: Record<string, number> = {
  motorcycle: 200, bicycle: 200, car: 350, van: 500, truck: 800,
};
const getDeliveryFee = (vehicleType?: string) =>
  DELIVERY_FEES[vehicleType?.toLowerCase() ?? ""] ?? 200;

// ─── Constants ────────────────────────────────────────────────────────────────
const VEHICLE_ICONS: Record<string, string> = {
  motorcycle:"🏍️", bicycle:"🚲", car:"🚗", van:"🚐", truck:"🚛",
};
const ACTIVE_STATUSES = ["accepted", "picked_up", "in_transit"];

const ZONE_SUGGESTIONS = [
  "Nairobi","Nairobi CBD","Westlands","Parklands","Kilimani","Karen",
  "Eastleigh","Kasarani","Ruiru","Thika","Kiambu","Mombasa","Kisumu",
  "Nakuru","Eldoret","Nyeri","Meru","Embu","Machakos","Kitale",
];

const FAIL_REASONS = [
  "Customer not home / not answering",
  "Customer cancelled at the door",
  "Wrong delivery address",
  "Customer refused to provide code",
  "Unsafe to deliver (security concern)",
  "Other (see notes)",
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface ShippingAddress { address?:string; city?:string; phone?:string; }
interface OrderItem       { name?:string; quantity:number; price?:number; }
interface DeliveryOrder {
  _id:string; orderNumber?:string; shippingAddress?:ShippingAddress;
  orderItems?:OrderItem[]; totalPrice:number; status:string; createdAt?:string;
}
interface DeliveryJob {
  _id:string; status:string; dispatchedAt?:string; acceptedAt?:string;
  deliveredAt?:string; failureReason?:string; order?:DeliveryOrder;
}
type DriverStatus = "available"|"busy"|"offline";
type TabView      = "jobs"|"history"|"earnings";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatKES = (n: number) => `KES ${Number(n).toLocaleString()}`;
const timeAgo   = (d?: string) => {
  if (!d) return "";
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
const todayStr = () =>
  new Date().toLocaleDateString("en-KE", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

function sMeta(s: DriverStatus) {
  if (s === "available") return { label:"Available",   color:"#059669", bg:"#ecfdf5", border:"#6ee7b7", pulse:true  };
  if (s === "busy")      return { label:"On Delivery", color:"#d97706", bg:"#fffbeb", border:"#fcd34d", pulse:true  };
  return                        { label:"Offline",     color:"#6b7280", bg:"#f3f4f6", border:"#d1d5db", pulse:false };
}
function jBadge(s: string) {
  if (s === "delivered")             return { label:"✓ Delivered", bg:"#d1fae5", color:"#065f46" };
  if (s === "failed")                return { label:"✗ Failed",    bg:"#fee2e2", color:"#991b1b" };
  if (ACTIVE_STATUSES.includes(s))   return { label:"● Active",   bg:"#dbeafe", color:"#1e40af" };
  return                                    { label:s,             bg:"#f1f5f9", color:"#475569" };
}

// ─── Global Styles ────────────────────────────────────────────────────────────
function GS() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#eef2f7;font-family:'Sora',sans-serif}
    @keyframes spin  {to{transform:rotate(360deg)}}
    @keyframes pulse {0%,100%{opacity:1}50%{opacity:.4}}
    @keyframes up    {from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes shake {0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}
    .card{background:#fff;border:.5px solid #e2e8f0;border-radius:16px;transition:box-shadow .2s}
    .card:hover{box-shadow:0 6px 24px rgba(0,0,0,.07)}
    .btn:hover:not(:disabled){opacity:.88}
    input[list]::-webkit-calendar-picker-indicator{opacity:.5;cursor:pointer}
  `}</style>;
}

// ─── Shared small components ──────────────────────────────────────────────────
const Loader = ({ msg = "Loading…" }: { msg?: string }) => (
  <div style={{ minHeight:"100vh", background:"#eef2f7", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
    <div style={{ width:42, height:42, borderRadius:"50%", border:"3px solid #e2e8f0", borderTop:"3px solid #0f6e56", animation:"spin .7s linear infinite" }}/>
    <p style={{ fontSize:13, color:"#94a3b8", fontFamily:"'Sora',sans-serif" }}>{msg}</p>
  </div>
);
const SL = ({ t }: { t: string }) => (
  <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", letterSpacing:".1em", textTransform:"uppercase", marginBottom:8, paddingLeft:2 }}>{t}</div>
);
const SC = ({ icon, val, label, accent, sub }: { icon:string; val:string|number; label:string; accent:string; sub?:string }) => (
  <div className="card" style={{ padding:"16px 12px", textAlign:"center", position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:accent, borderRadius:"16px 16px 0 0" }}/>
    <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
    <div style={{ fontSize:20, fontWeight:700, color:accent, fontFamily:"'JetBrains Mono',monospace", lineHeight:1 }}>{val}</div>
    <div style={{ fontSize:10, color:"#94a3b8", marginTop:4, fontWeight:600, letterSpacing:".05em", textTransform:"uppercase" }}>{label}</div>
    {sub && <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>{sub}</div>}
  </div>
);
const ES = ({ icon, msg, hint }: { icon:string; msg:string; hint?:string }) => (
  <div className="card" style={{ padding:"44px 20px", textAlign:"center" }}>
    <div style={{ fontSize:36, marginBottom:12 }}>{icon}</div>
    <p style={{ fontSize:13, color:"#64748b" }}>{msg}</p>
    {hint && <p style={{ fontSize:11, color:"#94a3b8", marginTop:6 }}>{hint}</p>}
  </div>
);

// ─── Cannot Deliver Modal ─────────────────────────────────────────────────────
function CannotDeliverModal({ activeJob, token, onClose, onFailed }: {
  activeJob: DeliveryJob; token: string; onClose: () => void; onFailed: () => void;
}) {
  const [selected, setSelected] = useState("");
  const [custom,   setCustom]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [confirm,  setConfirm]  = useState(false);

  const reason = selected === "Other (see notes)" ? custom.trim() : selected;

  async function submit() {
    if (!reason) { setError("Please select or enter a reason"); return; }
    if (!confirm) { setConfirm(true); return; }
    setLoading(true); setError("");
    try {
      const orderId = activeJob.order?._id;
      if (!orderId) { setError("No order found"); setLoading(false); return; }
      const res  = await fetch(`${DELIVERY_API}/fail/${orderId}`, {
        method:  "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body:    JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Failed to report"); setConfirm(false); return; }
      onFailed();
      onClose();
    } catch {
      setError("Could not connect to server.");
      setConfirm(false);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,.55)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:420, padding:28, boxShadow:"0 30px 70px rgba(0,0,0,.2)", animation:"up .2s ease" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:44, marginBottom:8 }}>🚫</div>
          <h2 style={{ fontSize:17, fontWeight:800, color:"#0f172a", fontFamily:"'Sora',sans-serif" }}>Cannot Complete Delivery</h2>
          <p style={{ fontSize:12, color:"#64748b", marginTop:6 }}>
            Select a reason. The order will be returned to admin for re-dispatch.
          </p>
        </div>

        <div style={{ marginBottom:14 }}>
          {FAIL_REASONS.map(r => (
            <div key={r} onClick={() => { setSelected(r); setConfirm(false); setError(""); }}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:10, marginBottom:6, border:`.5px solid ${selected===r?"#ef4444":"#e2e8f0"}`, background:selected===r?"#fef2f2":"#f8fafc", cursor:"pointer", transition:"all .15s" }}>
              <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${selected===r?"#ef4444":"#d1d5db"}`, background:selected===r?"#ef4444":"white", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {selected===r && <div style={{ width:6, height:6, borderRadius:"50%", background:"white" }}/>}
              </div>
              <span style={{ fontSize:13, color:selected===r?"#dc2626":"#374151", fontWeight:selected===r?600:400 }}>{r}</span>
            </div>
          ))}
        </div>

        {selected === "Other (see notes)" && (
          <textarea value={custom} onChange={e => setCustom(e.target.value)} placeholder="Describe what happened…"
            style={{ width:"100%", border:".5px solid #e2e8f0", borderRadius:10, padding:"10px 12px", fontSize:13, fontFamily:"'Sora',sans-serif", color:"#0f172a", background:"#f8fafc", outline:"none", resize:"vertical", minHeight:80, marginBottom:14 }}/>
        )}

        {error && (
          <div style={{ background:"#fee2e2", borderRadius:9, padding:"9px 12px", color:"#dc2626", fontSize:12, marginBottom:12, textAlign:"center", animation:"shake .3s ease" }}>
            {error}
          </div>
        )}

        {confirm && (
          <div style={{ background:"#fffbeb", border:".5px solid #fcd34d", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#92400e", marginBottom:14 }}>
            ⚠️ <strong>Are you sure?</strong> This will release you from the delivery and notify the admin. Tap again to confirm.
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, border:".5px solid #e2e8f0", background:"#f8fafc", color:"#64748b", borderRadius:11, padding:"11px", fontSize:13, fontWeight:600, fontFamily:"'Sora',sans-serif", cursor:"pointer" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={loading || !reason}
            style={{ flex:2, border:"none", borderRadius:11, padding:"11px", fontSize:13, fontWeight:700, fontFamily:"'Sora',sans-serif", cursor:loading||!reason?"not-allowed":"pointer", background:!reason?"#e2e8f0":confirm?"#dc2626":"#f97316", color:!reason?"#94a3b8":"white", transition:"background .2s" }}>
            {loading ? "Reporting…" : confirm ? "✓ Yes, Report Failure" : "Report Cannot Deliver"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Availability Panel ───────────────────────────────────────────────────────
function AvailPanel({ driverStatus, updating, currentZone, onToggle, onSavePrefs }: {
  driverStatus: DriverStatus; updating: boolean; currentZone?: string;
  onToggle: () => Promise<void>;
  onSavePrefs: (f: string, t: string, z: string) => Promise<void>;
}) {
  const [from,   setFrom]   = useState("08:00");
  const [to,     setTo]     = useState("17:00");
  const [zone,   setZone]   = useState(currentZone || "");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => { if (currentZone && !zone) setZone(currentZone); }, [currentZone]);

  const isOn = driverStatus === "available";
  const isBusy = driverStatus === "busy";
  const meta = sMeta(driverStatus);

  async function save() {
    setSaving(true);
    await onSavePrefs(from, to, zone);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const inp: React.CSSProperties = {
    width:"100%", padding:"9px 12px", border:".5px solid #e2e8f0",
    borderRadius:10, fontSize:13, fontFamily:"'JetBrains Mono',monospace",
    background:"#f8fafc", color:"#0f172a", outline:"none",
  };

  return (
    <div className="card" style={{ padding:20, marginBottom:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <div style={{ width:28, height:28, borderRadius:8, background:"#d1fae5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🕐</div>
        <span style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>Set Availability</span>
        <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, background:meta.bg, color:meta.color, border:`1px solid ${meta.border}` }}>
          {meta.label}
        </span>
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:14, borderBottom:".5px solid #f1f5f9", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>Available for jobs</div>
          <div style={{ fontSize:11, marginTop:2, color:isOn?"#059669":isBusy?"#d97706":"#94a3b8" }}>
            {isOn ? "✓ Online — visible to dispatchers" : isBusy ? "🚚 On delivery — controlled by system" : "Offline — toggle to go online"}
          </div>
        </div>
        <div
          onClick={!isBusy && !updating ? onToggle : undefined}
          style={{ width:46, height:26, borderRadius:13, background:isOn?"#059669":isBusy?"#d97706":"#e2e8f0", position:"relative", cursor:isBusy||updating?"not-allowed":"pointer", transition:"background .25s", border:`1px solid ${isOn?"#059669":isBusy?"#d97706":"#cbd5e1"}`, flexShrink:0, opacity:updating ? .5 : 1 }}
        >
          {updating ? (
            <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,.4)", borderTop:"2px solid white", animation:"spin .6s linear infinite" }}/>
          ) : (
            <div style={{ position:"absolute", top:3, left:isOn||isBusy?23:3, width:18, height:18, borderRadius:"50%", background:"white", transition:"left .25s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }}/>
          )}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
        {([["FROM",from,setFrom],["UNTIL",to,setTo]] as [string,string,React.Dispatch<React.SetStateAction<string>>][]).map(([l,v,s]) => (
          <div key={l}>
            <div style={{ fontSize:10, color:"#94a3b8", fontWeight:600, marginBottom:5, letterSpacing:".05em" }}>{l}</div>
            <input type="time" value={v} onChange={e => s(e.target.value)} style={inp}/>
          </div>
        ))}
      </div>

      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:10, color:"#94a3b8", fontWeight:600, marginBottom:5, letterSpacing:".05em" }}>ZONE / CITY</div>
        <div style={{ position:"relative" }}>
          <input list="zone-suggestions" value={zone} onChange={e => setZone(e.target.value)}
            placeholder="Type or pick your zone e.g. Nairobi"
            style={{ ...inp, paddingRight:36, border:`.5px solid ${zone?"#86efac":"#e2e8f0"}`, background:zone?"#f0fdf4":"#f8fafc", fontFamily:"'Sora',sans-serif" }}/>
          <span style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#94a3b8", pointerEvents:"none" }}>✏️</span>
        </div>
        <datalist id="zone-suggestions">
          {ZONE_SUGGESTIONS.map(z => <option key={z} value={z}/>)}
        </datalist>
        <div style={{ fontSize:10, color:"#94a3b8", marginTop:4 }}>
          Type freely or choose from suggestions. Must match your delivery area.
        </div>
      </div>

      <button className="btn" onClick={save} disabled={saving}
        style={{ width:"100%", padding:"11px", background:saving?"#e2e8f0":"#059669", color:saving?"#94a3b8":"white", border:"none", borderRadius:11, fontWeight:700, fontSize:13, fontFamily:"'Sora',sans-serif", cursor:saving?"not-allowed":"pointer", transition:"opacity .2s" }}>
        {saving ? "Saving…" : "Save Availability Preferences"}
      </button>
      {saved && <div style={{ marginTop:10, textAlign:"center", fontSize:12, color:"#059669", fontWeight:600, animation:"up .3s ease" }}>✓ Preferences saved!</div>}
    </div>
  );
}

// ─── Confirm Delivery Panel ───────────────────────────────────────────────────
function ConfirmPanel({ activeJob, token, vehicleType, onSuccess, onFailed }: {
  activeJob?: DeliveryJob; token: string; vehicleType?: string;
  onSuccess: () => void; onFailed: () => void;
}) {
  const [boxes,    setBoxes]    = useState(["","","","","",""]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);
  const [showFail, setShowFail] = useState(false);
  const refs = Array.from({ length:6 }, () => React.createRef<HTMLInputElement>());
  const code = boxes.join("");
  const ok   = code.length === 6;
  const hasOrder = !!activeJob?.order?._id;
  const fee  = getDeliveryFee(vehicleType);

  function onInput(i: number, v: string) {
    const d = v.replace(/\D/g,"").slice(-1);
    const n = [...boxes]; n[i] = d; setBoxes(n); setError("");
    if (d && i < 5) refs[i+1].current?.focus();
  }
  function onKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !boxes[i] && i > 0) refs[i-1].current?.focus();
  }

  async function confirm() {
    if (!ok)       { setError("Enter the full 6-digit code"); return; }
    if (!hasOrder) { setError("No active delivery — accept a job first"); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${DELIVERY_API}/confirm-code`, {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ orderId: activeJob!.order!._id, code }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Verification failed"); return; }
      setDone(true);
      onSuccess();
      setTimeout(() => { setDone(false); setBoxes(["","","","","",""]); }, 2500);
    } catch { setError("Could not connect to server."); }
    finally  { setLoading(false); }
  }

  const addr = activeJob?.order?.shippingAddress;

  return (
    <>
      <div className="card" style={{ padding:20, marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>📦</div>
          <span style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>Confirm Delivery</span>
          {hasOrder && (
            <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, color:"#059669", background:"#f0fdf4", border:".5px solid #86efac", padding:"2px 10px", borderRadius:20 }}>
              +{formatKES(fee)}
            </span>
          )}
        </div>

        {done ? (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ fontSize:48, marginBottom:10 }}>✅</div>
            <div style={{ fontWeight:700, color:"#059669", fontSize:16 }}>Delivered!</div>
            <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>You earned {formatKES(fee)} for this job.</div>
          </div>
        ) : (
          <>
            {hasOrder ? (
              <div style={{ background:"#f8fafc", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#374151" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ color:"#94a3b8" }}>Order</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:600 }}>#{activeJob?.order?.orderNumber ?? activeJob?.order?._id.slice(-8)}</span>
                </div>
                {addr?.city  && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ color:"#94a3b8" }}>Deliver to</span><span style={{ fontWeight:500 }}>{addr.city}</span></div>}
                {addr?.phone && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:"#94a3b8" }}>Phone</span><span style={{ fontWeight:500 }}>{addr.phone}</span></div>}
              </div>
            ) : (
              <div style={{ background:"#f8fafc", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#94a3b8", textAlign:"center" }}>
                No active delivery — accept a job first
              </div>
            )}

            <div style={{ background:"#eff6ff", border:".5px solid #bfdbfe", borderRadius:9, padding:"9px 12px", fontSize:12, color:"#1e40af", marginBottom:14, display:"flex", alignItems:"flex-start", gap:8 }}>
              <span>ℹ️</span><span>Ask the recipient for their 6-digit delivery code to confirm.</span>
            </div>

            <div style={{ display:"flex", gap:7, justifyContent:"center", marginBottom:14 }}>
              {boxes.map((v, i) => (
                <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1} value={v}
                  onChange={e => onInput(i, e.target.value)} onKeyDown={e => onKey(i, e)}
                  style={{ width:42, height:50, textAlign:"center", fontSize:22, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", border:`1.5px solid ${v?"#059669":"#e2e8f0"}`, borderRadius:10, background:v?"#ecfdf5":"#f8fafc", color:"#0f172a", outline:"none", transition:"border-color .15s,background .15s" }}/>
              ))}
            </div>

            {error && <div style={{ background:"#fee2e2", border:".5px solid #fecaca", borderRadius:9, padding:"9px 12px", color:"#dc2626", fontSize:12, marginBottom:12, textAlign:"center" }}>{error}</div>}

            <button className="btn" onClick={confirm} disabled={loading || !ok || !hasOrder}
              style={{ width:"100%", padding:"11px", background:ok&&hasOrder?"#0f6e56":"#e2e8f0", color:ok&&hasOrder?"white":"#94a3b8", border:"none", borderRadius:11, fontWeight:700, fontSize:13, fontFamily:"'Sora',sans-serif", cursor:ok&&hasOrder?"pointer":"not-allowed", transition:"all .2s", marginBottom:10 }}>
              {loading ? "Verifying…" : "✓ Confirm Delivery"}
            </button>

            {hasOrder && (
              <button className="btn" onClick={() => setShowFail(true)}
                style={{ width:"100%", padding:"10px", background:"#fff7ed", border:".5px solid #fed7aa", color:"#c2410c", borderRadius:11, fontWeight:600, fontSize:12, fontFamily:"'Sora',sans-serif", cursor:"pointer", transition:"all .2s" }}>
                🚫 Cannot Deliver — Report Issue
              </button>
            )}
          </>
        )}
      </div>

      {showFail && activeJob && (
        <CannotDeliverModal
          activeJob={activeJob}
          token={token}
          onClose={() => setShowFail(false)}
          onFailed={() => { setShowFail(false); onFailed(); }}
        />
      )}
    </>
  );
}

// ─── Open Job Card ────────────────────────────────────────────────────────────
// Shows the driver's fixed fee — NOT the order total
function OpenJobCard({ job, isAccepting, driverBusy, onAccept, vehicleType }: {
  job: DeliveryJob; isAccepting: boolean; driverBusy: boolean;
  onAccept: () => void; vehicleType?: string;
}) {
  if (!job.order) return null;
  const addr = job.order.shippingAddress;
  const dis  = isAccepting || driverBusy;
  const fee  = getDeliveryFee(vehicleType);

  return (
    <div className="card" style={{ marginBottom:12, overflow:"hidden", animation:"up .3s ease" }}>
      <div style={{ background:"#fffbeb", borderBottom:".5px solid #fde68a", padding:"8px 16px", display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ width:7, height:7, borderRadius:"50%", background:"#d97706", display:"inline-block", animation:"pulse 1.5s infinite" }}/>
        <span style={{ fontSize:11, fontWeight:700, color:"#d97706", letterSpacing:".04em", textTransform:"uppercase" }}>New Job Available</span>
        <span style={{ marginLeft:"auto", fontSize:11, color:"#94a3b8", fontFamily:"'JetBrains Mono',monospace" }}>{timeAgo(job.dispatchedAt)}</span>
      </div>
      <div style={{ padding:"16px 16px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>Order #{job.order.orderNumber ?? job.order._id.slice(-8)}</div>
            <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{job.order.orderItems?.length ?? 0} item(s)</div>
          </div>
          {/* Fixed driver fee — not the order total */}
          <div style={{ textAlign:"right" }}>
            <div style={{ fontWeight:800, fontSize:17, color:"#059669", fontFamily:"'JetBrains Mono',monospace" }}>{formatKES(fee)}</div>
            <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>your earnings</div>
          </div>
        </div>
        <div style={{ background:"#f8fafc", borderRadius:10, padding:"10px 12px", marginBottom:12, fontSize:12, color:"#374151", lineHeight:1.6 }}>
          <div>📍 <strong>Deliver to:</strong> {addr?.city ?? "—"}</div>
          {addr?.address && <div style={{ color:"#64748b" }}>{addr.address}</div>}
          {addr?.phone   && <div>📞 {addr.phone}</div>}
        </div>
        <button className="btn" onClick={onAccept} disabled={dis}
          style={{ width:"100%", border:"none", borderRadius:11, padding:13, fontSize:13, fontWeight:700, fontFamily:"'Sora',sans-serif", cursor:dis?"not-allowed":"pointer", background:dis?"#e2e8f0":"linear-gradient(135deg,#059669,#0d9488)", color:dis?"#94a3b8":"white", boxShadow:dis?"none":"0 4px 14px rgba(5,150,105,.22)", transition:"opacity .2s" }}>
          {isAccepting ? "Accepting…" : driverBusy ? "Currently on a delivery" : "✓ Accept This Job"}
        </button>
      </div>
    </div>
  );
}

// ─── History Card ─────────────────────────────────────────────────────────────
// Shows driver's fixed delivery fee — NOT the order value
function HistoryCard({ job, vehicleType }: { job: DeliveryJob; vehicleType?: string }) {
  if (!job.order) return null;
  const b   = jBadge(job.status);
  const fee = getDeliveryFee(vehicleType);

  return (
    <div className="card" style={{ padding:"13px 16px", marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontWeight:600, color:"#0f172a", fontSize:13 }}>
            #{job.order.orderNumber ?? job.order._id.slice(-8)}
          </div>
          <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>
            {job.order.shippingAddress?.city ?? "—"} · {timeAgo(job.deliveredAt ?? job.acceptedAt ?? job.dispatchedAt)}
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          {/* Show fixed fee for delivered, "—" for others */}
          <div style={{ fontWeight:700, fontFamily:"'JetBrains Mono',monospace", fontSize:13, marginBottom:4,
            color: job.status==="delivered" ? "#059669" : job.status==="failed" ? "#dc2626" : "#94a3b8" }}>
            {job.status === "delivered" ? `+${formatKES(fee)}` : job.status === "failed" ? "Not paid" : "Pending"}
          </div>
          <span style={{ fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:20, background:b.bg, color:b.color }}>
            {b.label}
          </span>
        </div>
      </div>
      {/* Failure reason if applicable */}
      {job.status === "failed" && job.failureReason && (
        <div style={{ marginTop:8, background:"#fef2f2", borderRadius:8, padding:"6px 10px", fontSize:11, color:"#991b1b" }}>
          Reason: {job.failureReason}
        </div>
      )}
    </div>
  );
}

// ─── Earnings Tab ─────────────────────────────────────────────────────────────
// All values come from DB fields on user — fixed fee per job
function EarningsTab({ user, onRequestPayout }: { user: any; onRequestPayout: () => void }) {
  const fee           = getDeliveryFee(user.vehicleType);
  const thisMonth     = user.thisMonthEarnings ?? 0;
  const pending       = user.pendingEarnings   ?? 0;
  const allTime       = user.totalEarnings     ?? 0;
  const lastPayoutAmt = user.lastPayoutAmount  ?? 0;
  const lastPayoutDate = user.lastPayoutAt
    ? new Date(user.lastPayoutAt).toLocaleDateString("en-KE", { day:"numeric", month:"short" })
    : "—";

  const rows = [
    { l:"Your delivery fee",  v:`${formatKES(fee)} per job`,                                                             c:"#2563eb" },
    { l:"This month",         v:formatKES(thisMonth),                                                                    c:"#059669" },
    { l:"All-time earnings",  v:formatKES(allTime),                                                                      c:"#0f172a" },
    { l:"Pending payout",     v:formatKES(pending),                                                                      c:pending>0?"#d97706":"#94a3b8" },
    { l:"Last payout",        v:lastPayoutAmt>0?`${formatKES(lastPayoutAmt)} · ${lastPayoutDate}`:"No payouts yet",      c:"#0f172a" },
    { l:"Total deliveries",   v:`${user.totalDeliveries ?? 0} jobs`,                                                     c:"#0f172a" },
  ];

  return (
    <div className="card" style={{ padding:"6px 0", marginBottom:14 }}>
      {rows.map(r => (
        <div key={r.l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 18px", borderBottom:".5px solid #f1f5f9" }}>
          <span style={{ fontSize:13, color:"#64748b" }}>{r.l}</span>
          <span style={{ fontWeight:700, fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:r.c }}>{r.v}</span>
        </div>
      ))}
      <div style={{ padding:"14px 18px" }}>
        <button className="btn" onClick={onRequestPayout} disabled={pending === 0}
          style={{ width:"100%", padding:"11px", background:pending>0?"#0f6e56":"#e2e8f0", color:pending>0?"white":"#94a3b8", border:"none", borderRadius:11, fontWeight:700, fontSize:13, fontFamily:"'Sora',sans-serif", cursor:pending>0?"pointer":"not-allowed", transition:"opacity .2s" }}>
          {pending > 0 ? `Request Payout · ${formatKES(pending)}` : "No pending earnings"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DriverPortal() {
  const { user, token, logout, isLoading:authLoading } = useAuth();
  const navigate = useNavigate();

  const [driverStatus,   setDriverStatus]   = useState<DriverStatus>("offline");
  const [myJobs,         setMyJobs]         = useState<DeliveryJob[]>([]);
  const [openJobs,       setOpenJobs]       = useState<DeliveryJob[]>([]);
  const [tab,            setTab]            = useState<TabView>("jobs");
  const [loading,        setLoading]        = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [acceptingId,    setAcceptingId]    = useState<string | null>(null);
  const [statusError,    setStatusError]    = useState("");

  useEffect(() => { if (user?.driverStatus) setDriverStatus(user.driverStatus as DriverStatus); }, [user?.driverStatus]);

  useEffect(() => {
    if (authLoading || !user) return;
    const r = user.role?.toLowerCase();
    if      (r === "admin")  navigate("/admin",   { replace:true });
    else if (r === "vendor") navigate("/vendors", { replace:true });
    else if (r !== "driver") navigate("/",        { replace:true });
  }, [authLoading, user, navigate]);

  const headers = useCallback(() => ({
    "Content-Type": "application/json", Authorization: `Bearer ${token}`,
  }), [token]);

  const fetchJobs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res  = await fetch(`${DELIVERY_API}/driver/my-jobs`, { headers: headers() });
      const data = await res.json();
      if (data.success) {
        setMyJobs(data.myDeliveries ?? []);
        setOpenJobs(data.openJobs ?? []);
        if (data.driverStatus) setDriverStatus(data.driverStatus as DriverStatus);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token, headers]);

  useEffect(() => {
    if (!token || user?.role?.toLowerCase() !== "driver") return;
    fetchJobs();
    const t = setInterval(fetchJobs, 30_000);
    return () => clearInterval(t);
  }, [token, user?.role, fetchJobs]);

  // ✅ Status toggle calls PUT /api/drivers/status (NOT /api/deliveries/driver/status)
  const toggleStatus = useCallback(async () => {
    if (!token || statusUpdating || driverStatus === "busy") return;
    const next: DriverStatus = driverStatus === "available" ? "offline" : "available";
    setStatusUpdating(true); setStatusError("");
    try {
      const res  = await fetch(`${DRIVERS_API}/status`, {
        method: "PUT", headers: headers(), body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (data.success) setDriverStatus(data.status as DriverStatus);
      else setStatusError(data.message || "Could not update status");
    } catch { setStatusError("Network error — try again"); }
    finally   { setStatusUpdating(false); }
  }, [token, statusUpdating, driverStatus, headers]);

  const savePrefs = useCallback(async (f: string, t: string, z: string) => {
    if (!token) return;
    try {
      await fetch(`${DRIVERS_API}/preferences`, {
        method: "PUT", headers: headers(),
        body: JSON.stringify({ availableFrom:f, availableUntil:t, zone:z }),
      });
    } catch { /* ignore */ }
  }, [token, headers]);

  const acceptJob = async (orderId: string) => {
    setAcceptingId(orderId);
    try {
      const res  = await fetch(`${DELIVERY_API}/accept/${orderId}`, { method:"POST", headers:headers() });
      const data = await res.json();
      if (data.success) await fetchJobs();
      else alert(data.message || "Could not accept job");
    } catch { /* ignore */ }
    finally { setAcceptingId(null); }
  };

  // Guards
  if (authLoading) return <Loader msg="Checking credentials…"/>;
  if (!user)       return <Loader msg="Redirecting…"/>;
  if (user.role?.toLowerCase() !== "driver") return <Loader msg="Redirecting…"/>;

  // Derived state
  const safeMyJobs   = myJobs.filter(j => j && j.order);
  const safeOpenJobs = openJobs.filter(j => j && j.order);
  const assigned     = safeMyJobs.filter(j => j.status === "dispatched");
  const allOpenJobs  = Array.from(
    new Map([...safeOpenJobs, ...assigned].map(j => [String(j._id), j])).values()
  );
  const activeJob  = safeMyJobs.find(j => ACTIVE_STATUSES.includes(j.status));
  const meta       = sMeta(driverStatus);
  const vIcon      = VEHICLE_ICONS[user.vehicleType ?? "motorcycle"] ?? "🏍️";

  const TABS: { id:TabView; label:string }[] = [
    { id:"jobs",     label:`🔔 Open Jobs (${allOpenJobs.length})` },
    { id:"history",  label:"📋 My History" },
    { id:"earnings", label:"💰 Earnings" },
  ];

  return (
    <><GS/>
    <div style={{ minHeight:"100vh", background:"#eef2f7" }}>

      {/* ── Header ── */}
      <header style={{ background:"#0f6e56", padding:"0 20px", height:62, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, background:"rgba(255,255,255,.15)", borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🚚</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:"white" }}>Driver Portal</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.6)" }}>{vIcon} {user.zone ?? "—"} Zone · {user.name}</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={toggleStatus} disabled={statusUpdating || driverStatus==="busy"}
            style={{ background:meta.bg, border:`1px solid ${meta.border}`, borderRadius:20, padding:"7px 15px", fontSize:12, fontWeight:700, color:meta.color, cursor:driverStatus==="busy"?"not-allowed":"pointer", fontFamily:"'Sora',sans-serif", display:"flex", alignItems:"center", gap:6, opacity:statusUpdating?.6:1 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:meta.color, display:"inline-block", animation:meta.pulse?"pulse 2s infinite":"none" }}/>
            {statusUpdating ? "Updating…" : meta.label}
          </button>
          <button onClick={() => { logout(); navigate("/login", { replace:true }); }}
            style={{ background:"rgba(255,255,255,.12)", border:".5px solid rgba(255,255,255,.2)", borderRadius:10, color:"white", cursor:"pointer", padding:"7px 14px", fontSize:12, fontWeight:600, fontFamily:"'Sora',sans-serif" }}>
            Logout
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ maxWidth:760, margin:"0 auto", padding:"20px 16px" }}>

        {statusError && (
          <div style={{ background:"#fee2e2", border:".5px solid #fecaca", borderRadius:10, padding:"10px 16px", color:"#dc2626", fontSize:13, marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", animation:"up .3s ease" }}>
            <span>⚠️ {statusError}</span>
            <span style={{ cursor:"pointer", fontWeight:700, marginLeft:12 }} onClick={() => setStatusError("")}>✕</span>
          </div>
        )}

        {/* Greeting */}
        <div style={{ marginBottom:18 }}>
          <h1 style={{ fontSize:20, fontWeight:700, color:"#0f172a", letterSpacing:"-.3px" }}>{greeting()}, {user.name?.split(" ")[0]} 👋</h1>
          <p style={{ fontSize:12, color:"#94a3b8", marginTop:3 }}>{todayStr()}</p>
        </div>

        {/* Stat cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }}>
          <SC icon="📦" val={user.totalDeliveries ?? 0}        label="Total Jobs" accent="#2563eb" sub="All time"/>
          <SC icon="✅" val={user.successfulDeliveries ?? 0}   label="Completed"  accent="#059669" sub={`${Math.round(((user.successfulDeliveries??0)/(user.totalDeliveries||1))*100)}% rate`}/>
          <SC icon="⭐" val={`${user.driverRating ?? "5.0"}★`} label="Rating"     accent="#d97706"/>
          {/* Real thisMonthEarnings from DB — fixed fee based, not order value */}
          <SC icon="💰" val={formatKES((user as any).thisMonthEarnings ?? 0)} label="Earnings" accent="#0d9488" sub="This month"/>
        </div>

        {/* Two-column panels */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
          <div>
            <SL t="Availability"/>
            <AvailPanel
              driverStatus={driverStatus} updating={statusUpdating}
              currentZone={user.zone} onToggle={toggleStatus} onSavePrefs={savePrefs}
            />
          </div>
          <div>
            <SL t="Confirm Delivery"/>
            <ConfirmPanel
              activeJob={activeJob}
              token={token!}
              vehicleType={user.vehicleType}
              onSuccess={fetchJobs}
              onFailed={() => { fetchJobs(); }}
            />
          </div>
        </div>

        {/* Active job banner */}
        {activeJob?.order && (
          <>
            <SL t="Active Delivery"/>
            <div style={{ background:"linear-gradient(135deg,#0f6e56,#1d4ed8)", borderRadius:16, padding:"18px 20px", marginBottom:14, color:"white", animation:"up .4s ease" }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", opacity:.7, marginBottom:8 }}>🚚 Active Delivery</div>
              <div style={{ fontWeight:800, fontSize:16, marginBottom:4 }}>Order #{activeJob.order.orderNumber ?? activeJob.order._id.slice(-8)}</div>
              {activeJob.order.shippingAddress?.city  && <div style={{ fontSize:12, opacity:.85, marginBottom:2 }}>📍 {activeJob.order.shippingAddress.city}</div>}
              {activeJob.order.shippingAddress?.phone && <div style={{ fontSize:12, opacity:.8  }}>📞 {activeJob.order.shippingAddress.phone}</div>}
            </div>
          </>
        )}

        {/* Tabs */}
        <div style={{ display:"flex", gap:6, marginBottom:14, background:"#e2e8f0", borderRadius:12, padding:4 }}>
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, background:tab===id?"#fff":"transparent", color:tab===id?"#0f172a":"#64748b", border:tab===id?".5px solid #e2e8f0":"none", borderRadius:9, padding:"9px 6px", fontSize:12, fontWeight:tab===id?700:500, fontFamily:"'Sora',sans-serif", cursor:"pointer", transition:"all .2s", whiteSpace:"nowrap" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div style={{ textAlign:"center", padding:40, color:"#94a3b8", fontSize:13 }}>Loading…</div>
        ) : tab === "jobs" ? (
          allOpenJobs.length === 0
            ? <ES icon="📭" msg="No open jobs in your zone right now" hint={driverStatus!=="available"?"Toggle yourself to Available above to receive jobs":"Check back soon!"}/>
            : allOpenJobs.map(j => {
                const oid = j.order?._id;
                if (!oid) return null;
                return (
                  <OpenJobCard key={j._id} job={j}
                    isAccepting={acceptingId === oid}
                    driverBusy={driverStatus === "busy"}
                    onAccept={() => acceptJob(oid)}
                    vehicleType={user.vehicleType}
                  />
                );
              })
        ) : tab === "history" ? (
          safeMyJobs.length === 0
            ? <ES icon="📋" msg="No delivery history yet"/>
            : safeMyJobs.map(j => <HistoryCard key={j._id} job={j} vehicleType={user.vehicleType}/>)
        ) : (
          <EarningsTab
            user={user}
            onRequestPayout={() => alert("Payout request sent! Admin will process within 24 hours.")}
          />
        )}

      </main>
    </div></>
  );
}
