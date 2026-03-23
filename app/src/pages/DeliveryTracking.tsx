import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface TrackingData {
  order: {
    orderNumber: string;
    status: string;
    shippingAddress?: { address?: string; city?: string; county?: string; };
    itemCount: number;
    totalPrice: number;
    createdAt: string;
  };
  delivery: {
    status: string;
    driver?: { name: string; phone: string; vehicleType: string; licensePlate?: string; } | null;
    estimatedDelivery?: string;
    dispatchedAt?: string;
    acceptedAt?: string;
    deliveredAt?: string;
  } | null;
}

function formatKES(n: number) { return `KES ${Number(n).toLocaleString()}`; }

const DELIVERY_STEPS = [
  { key: "order_placed", label: "Order Placed",   icon: "🛍️", desc: "We received your order" },
  { key: "processing",   label: "Processing",     icon: "⚙️", desc: "Preparing your items" },
  { key: "dispatched",   label: "Driver Assigned",icon: "🧑‍✈️", desc: "A driver is on the way to pick up" },
  { key: "in_transit",   label: "In Transit",     icon: "🚚", desc: "Your order is on its way" },
  { key: "delivered",    label: "Delivered",      icon: "✅", desc: "Delivered to your door!" },
];

function getStepIndex(orderStatus: string, deliveryStatus?: string): number {
  if (orderStatus === "delivered" || deliveryStatus === "delivered") return 4;
  if (deliveryStatus === "in_transit" || deliveryStatus === "accepted") return 3;
  if (deliveryStatus === "dispatched" || deliveryStatus === "pending_dispatch") return 2;
  if (orderStatus === "processing" || orderStatus === "shipped") return 2;
  return 1; // pending
}

export default function DeliveryTracking() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [query, setQuery] = useState(orderNumber || "");
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleTrack = async (q?: string) => {
    const target = q || query;
    if (!target.trim()) { setError("Enter your order number"); return; }
    setLoading(true); setError(""); setSearched(true);
    try {
      const res = await fetch(`${API_URL}/api/deliveries/track/${target.trim()}`);
      const d = await res.json();
      if (!d.success) { setError(d.message || "Order not found"); setData(null); return; }
      setData(d);
    } catch {
      setError("Could not connect. Try again.");
    } finally { setLoading(false); }
  };

  // Auto-search if URL has order number
  useEffect(() => { if (orderNumber) handleTrack(orderNumber); }, [orderNumber]);

  // Auto-refresh every 30s when tracking
  useEffect(() => {
    if (!data) return;
    const t = setInterval(() => handleTrack(query), 30000);
    return () => clearInterval(t);
  }, [data, query]);

  const stepIdx = data ? getStepIndex(data.order.status, data.delivery?.status ?? undefined) : -1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f1f5f9;font-family:'Sora',sans-serif}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
        {/* Header */}
        <header style={{ background: "linear-gradient(135deg,#1e293b,#0f172a)", padding: "28px 20px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
            <h1 style={{ color: "white", fontWeight: 800, fontSize: 26, marginBottom: 8 }}>Track Your Order</h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Enter your order number to see real-time delivery status</p>
          </div>
        </header>

        <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px" }}>
          {/* Search Box */}
          <div style={{ background: "white", borderRadius: 18, padding: 24, marginBottom: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.06)", animation: "fadeUp .4s ease" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g. ORD-12345 or your order ID"
                onKeyDown={e => e.key === "Enter" && handleTrack()}
                style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "13px 16px", fontSize: 14, fontFamily: "'Sora',sans-serif", color: "#0f172a", outline: "none" }}
              />
              <button
                onClick={() => handleTrack()}
                disabled={loading}
                style={{ background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "white", border: "none", borderRadius: 12, padding: "13px 24px", fontSize: 14, fontWeight: 700, fontFamily: "'Sora',sans-serif", cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(37,99,235,.3)" }}
              >
                {loading ? "…" : "Track →"}
              </button>
            </div>
            {error && searched && (
              <div style={{ marginTop: 14, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13 }}>
                {error}
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", animation: "spin .7s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ color: "#94a3b8", fontSize: 14 }}>Fetching your order…</p>
            </div>
          )}

          {/* Results */}
          {data && !loading && (
            <div style={{ animation: "fadeUp .4s ease" }}>
              {/* Order Summary */}
              <div style={{ background: "white", borderRadius: 18, padding: 24, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: "'DM Mono',monospace", color: "#2563eb", fontWeight: 700, fontSize: 16 }}>
                      #{data.order.orderNumber}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                      {data.order.itemCount} item(s) · {formatKES(data.order.totalPrice)}
                    </div>
                  </div>
                  <span style={{
                    background: data.order.status === "delivered" ? "#dcfce7" : data.order.status === "shipped" ? "#ede9fe" : "#dbeafe",
                    color: data.order.status === "delivered" ? "#059669" : data.order.status === "shipped" ? "#5b21b6" : "#1e40af",
                    fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 20,
                    textTransform: "capitalize", fontFamily: "'DM Mono',monospace",
                  }}>
                    {data.order.status === "shipped" ? "🚚 In Transit" : data.order.status === "delivered" ? "✅ Delivered" : `⚙️ ${data.order.status}`}
                  </span>
                </div>
                {data.order.shippingAddress && (
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#374151" }}>
                    📍 {[data.order.shippingAddress.address, data.order.shippingAddress.city, data.order.shippingAddress.county].filter(Boolean).join(", ")}
                  </div>
                )}
                {/* Auto-refresh indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669", display: "inline-block", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Auto-refreshes every 30 seconds</span>
                </div>
              </div>

              {/* Progress Tracker */}
              <div style={{ background: "white", borderRadius: 18, padding: 24, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 24 }}>Delivery Progress</h3>
                <div style={{ position: "relative" }}>
                  {/* Vertical line */}
                  <div style={{ position: "absolute", left: 19, top: 20, bottom: 20, width: 2, background: "#f1f5f9", zIndex: 0 }} />
                  <div style={{ position: "absolute", left: 19, top: 20, width: 2, background: "#22c55e", height: `${(stepIdx / (DELIVERY_STEPS.length - 1)) * 100}%`, zIndex: 1, transition: "height 1s ease" }} />

                  {DELIVERY_STEPS.map((step, i) => {
                    const done = i <= stepIdx;
                    const active = i === stepIdx;
                    return (
                      <div key={step.key} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24, position: "relative", zIndex: 2 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                          background: done ? (active ? "#2563eb" : "#22c55e") : "#f1f5f9",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18, border: active ? "3px solid #bfdbfe" : "none",
                          boxShadow: active ? "0 0 0 4px rgba(37,99,235,0.1)" : "none",
                          transition: "all .3s ease",
                        }}>
                          {done ? step.icon : <span style={{ fontSize: 14, color: "#cbd5e1" }}>○</span>}
                        </div>
                        <div style={{ paddingTop: 8 }}>
                          <div style={{ fontWeight: active ? 700 : done ? 600 : 400, color: done ? "#0f172a" : "#94a3b8", fontSize: 14 }}>
                            {step.label}
                            {active && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "2px 7px", borderRadius: 10 }}>CURRENT</span>}
                          </div>
                          <div style={{ fontSize: 12, color: done ? "#64748b" : "#cbd5e1", marginTop: 2 }}>{step.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Driver Info */}
              {data.delivery?.driver && (
                <div style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #bbf7d0", borderRadius: 18, padding: 24, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 16 }}>Your Delivery Driver</h3>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                      🧑‍✈️
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>{data.delivery.driver.name}</div>
                      <div style={{ fontSize: 13, color: "#064e3b", marginTop: 3 }}>
                        📞 {data.delivery.driver.phone}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                        {data.delivery.driver.vehicleType}
                        {data.delivery.driver.licensePlate ? ` · ${data.delivery.driver.licensePlate}` : ""}
                      </div>
                    </div>
                  </div>
                  {data.delivery.estimatedDelivery && (
                    <div style={{ marginTop: 16, background: "white", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
                      🕐 <strong>Estimated Delivery:</strong> {new Date(data.delivery.estimatedDelivery).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation Code reminder */}
              {data.delivery && !["delivered", "cancelled"].includes(data.delivery.status) && data.delivery.driver && (
                <div style={{ background: "linear-gradient(135deg,#2563eb,#4f46e5)", borderRadius: 18, padding: 24, color: "white", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🔐</div>
                  <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Ready for delivery?</h3>
                  <p style={{ opacity: .85, fontSize: 13, lineHeight: 1.6 }}>
                    Your <strong>6-digit delivery code</strong> was sent to your email.<br />
                    Have it ready to show the driver at your door.
                  </p>
                </div>
              )}

              {/* Delivered state */}
              {data.order.status === "delivered" && (
                <div style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #bbf7d0", borderRadius: 18, padding: 28, textAlign: "center" }}>
                  <div style={{ fontSize: 54, marginBottom: 12 }}>🎉</div>
                  <h2 style={{ color: "#059669", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>Successfully Delivered!</h2>
                  <p style={{ color: "#374151", fontSize: 14 }}>
                    {data.delivery?.deliveredAt
                      ? `Delivered on ${new Date(data.delivery.deliveredAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}`
                      : "Your order has been delivered."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!data && !loading && searched && !error && (
            <div style={{ background: "white", borderRadius: 18, padding: "48px 20px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <p>Order not found. Check the order number and try again.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
