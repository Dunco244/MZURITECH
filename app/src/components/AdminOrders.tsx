import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Package, MapPin, Clock, CheckCircle, XCircle,
  Truck, ChevronDown, ChevronUp, Wallet, Smartphone,
  RefreshCw, ArrowRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';;

interface OrderItem {
  _id?: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  product?: string;
}

interface ShippingAddress {
  fullName?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  landmark?: string;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Order {
  _id: string;
  orderNumber?: string;
  user?: Customer;
  orderItems: OrderItem[];
  shippingAddress?: ShippingAddress;
  paymentMethod?: string;
  itemsPrice?: number;
  shippingPrice?: number;
  totalPrice: number;
  isPaid?: boolean;
  isDelivered?: boolean;
  paidAt?: string;
  deliveredAt?: string;
  status: string;
  createdAt?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatKES = (n?: number) =>
  n !== undefined ? `KES ${Number(n).toLocaleString()}` : '—';

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return { date: '—', time: '—' };
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
};

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; dot: string; label: string }> = {
  pending:    { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', dot: '#f97316', label: 'Pending'    },
  processing: { bg: '#fffbeb', color: '#d97706', border: '#fde68a', dot: '#f59e0b', label: 'Processing' },
  shipped:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6', label: 'Shipped'    },
  delivered:  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', dot: '#22c55e', label: 'Delivered'  },
  cancelled:  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', dot: '#ef4444', label: 'Cancelled'  },
};

const getStatus = (s: string) =>
  STATUS_STYLE[s] ?? { bg: '#f8faff', color: '#64748b', border: '#e2e8f0', dot: '#94a3b8', label: s };

// What the next valid status is for each current status
const NEXT_STATUS: Record<string, { value: string; label: string; color: string } | null> = {
  pending:    { value: 'processing', label: 'Mark Processing',  color: '#d97706' },
  processing: { value: 'shipped',    label: 'Mark Shipped',     color: '#1d4ed8' },
  shipped:    { value: 'delivered',  label: 'Mark Delivered',   color: '#16a34a' },
  delivered:  null,
  cancelled:  null,
};

const pmLabel = (pm?: string) => {
  if (pm === 'mpesa')  return 'M-Pesa';
  if (pm === 'cod')    return 'Cash on Delivery';
  return pm ?? 'Other';
};

const pmIcon = (pm?: string) => {
  if (pm === 'mpesa') return <Smartphone size={13} />;
  if (pm === 'cod')   return <Wallet size={13} />;
  return <Wallet size={13} />;
};

// ── Progress bar showing workflow stage ───────────────────────────────────────
const STAGES = ['pending', 'processing', 'shipped', 'delivered'];

function OrderProgress({ status }: { status: string }) {
  if (status === 'cancelled') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#fef2f2', borderRadius: 8, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
      <XCircle size={13} /> Order Cancelled
    </div>
  );

  const currentIdx = STAGES.indexOf(status);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {STAGES.map((stage, i) => {
        const done    = i <= currentIdx;
        const current = i === currentIdx;
        const st      = getStatus(stage);
        return (
          <div key={stage} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done ? st.dot : '#e2e8f0',
                border: current ? `2.5px solid ${st.color}` : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: current ? `0 0 0 3px ${st.bg}` : 'none',
                transition: 'all .3s'
              }}>
                {done && i < currentIdx && <CheckCircle size={14} color="white" />}
                {current && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                {!done && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1' }} />}
              </div>
              <span style={{ fontSize: 10, fontWeight: current ? 700 : 500, color: done ? st.color : '#94a3b8', textTransform: 'capitalize' }}>
                {stage}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div style={{ width: 40, height: 2, background: i < currentIdx ? '#22c55e' : '#e2e8f0', margin: '0 4px', marginBottom: 16, transition: 'background .3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminOrders() {
  const { token } = useAuth();
  const [orders, setOrders]         = useState<Order[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState('');
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({});
  const [updating, setUpdating]     = useState<Record<string, boolean>>({});
  const [filterStatus, setFilter]   = useState('all');

  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) setOrders(data.orders ?? []);
      else setError(data.message || 'Failed to fetch orders');
    } catch {
      setError('Could not connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [token]);

  // ── Update order status ───────────────────────────────────────────────────
  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(u => ({ ...u, [orderId]: true }));
    try {
      const res  = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(prev => prev.map(o => o._id === orderId ? data.order : o));
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch {
      alert('Could not connect to server.');
    } finally {
      setUpdating(u => ({ ...u, [orderId]: false }));
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    await updateStatus(orderId, 'cancelled');
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = filterStatus === 'all'
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ── Revenue (only Delivered = Paid orders) ────────────────────────────────
  const revenue = orders
    .filter(o => o.status === 'delivered' && o.isPaid)
    .reduce((sum, o) => sum + o.totalPrice, 0);

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#1d4ed8', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .ao-root * { box-sizing: border-box; font-family: 'Sora', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .order-card { background: white; border-radius: 16px; border: 1.5px solid #e8edf5; box-shadow: 0 2px 12px rgba(0,0,0,.04); overflow: hidden; animation: fadeUp .3s ease both; }
        .order-card:hover { box-shadow: 0 4px 24px rgba(0,0,0,.08); }
        .filter-btn { padding: 6px 14px; border-radius: 20px; border: 1.5px solid #e2e8f0; background: white; cursor: pointer; font-size: 12px; font-weight: 600; color: #64748b; transition: all .2s; font-family: 'Sora', sans-serif; }
        .filter-btn.active { border-color: #1d4ed8; background: #eff6ff; color: #1d4ed8; }
        .filter-btn:hover:not(.active) { border-color: #94a3b8; color: #334155; }
        .next-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; border: none; cursor: pointer; font-size: 12px; font-weight: 700; font-family: 'Sora', sans-serif; transition: opacity .2s; }
        .next-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cancel-btn { padding: 8px 14px; border-radius: 10px; border: 1.5px solid #fecaca; background: #fef2f2; cursor: pointer; font-size: 12px; font-weight: 600; color: #dc2626; font-family: 'Sora', sans-serif; transition: all .2s; }
        .cancel-btn:hover { background: #dc2626; color: white; }
        .item-row { display: flex; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
        .item-row:last-child { border-bottom: none; }
      `}</style>

      <div className="ao-root" style={{ padding: '0 0 40px' }}>

        {/* ── Revenue Summary ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
          {/* Revenue */}
          <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', borderRadius: 16, padding: '20px 22px', color: 'white' }}>
            <p style={{ fontSize: 11, fontWeight: 600, opacity: .7, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Revenue Earned</p>
            <p style={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono',monospace" }}>{formatKES(revenue)}</p>
            <p style={{ fontSize: 11, opacity: .6, marginTop: 4 }}>From delivered orders</p>
          </div>
          {/* Counts per status */}
          {['pending','processing','shipped','delivered','cancelled'].map(s => {
            const st = getStatus(s);
            return (
              <div key={s} style={{ background: st.bg, borderRadius: 16, padding: '20px 22px', border: `1.5px solid ${st.border}` }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: st.color, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>{st.label}</p>
                <p style={{ fontSize: 26, fontWeight: 800, color: st.color, fontFamily: "'DM Mono',monospace" }}>{counts[s] || 0}</p>
              </div>
            );
          })}
        </div>

        {/* ── Filter tabs ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {['all','pending','processing','shipped','delivered','cancelled'].map(s => (
            <button key={s} className={`filter-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              {s === 'all' ? `All (${orders.length})` : `${getStatus(s).label} (${counts[s] || 0})`}
            </button>
          ))}
          <button onClick={fetchOrders} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b', fontFamily: "'Sora',sans-serif" }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', borderRadius: 12, padding: '12px 18px', marginBottom: 20, fontSize: 13 }}>
            {error}
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <Package size={40} style={{ margin: '0 auto 12px', opacity: .4 }} />
            <p style={{ fontWeight: 600 }}>No orders found</p>
          </div>
        )}

        {/* ── Orders list ── */}
        <div style={{ display: 'grid', gap: 14 }}>
          {filtered.map((order, idx) => {
            const st       = getStatus(order.status);
            const ref      = order.orderNumber || order._id.slice(-8).toUpperCase();
            const { date, time } = formatDateTime(order.createdAt);
            const open     = expanded[order._id];
            const next     = NEXT_STATUS[order.status];
            const isBusy   = updating[order._id];
            const canCancel = ['pending','processing','shipped'].includes(order.status);

            return (
              <div key={order._id} className="order-card" style={{ animationDelay: `${idx * .04}s` }}>

                {/* ── Header row ── */}
                <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: open ? '1px solid #f1f5f9' : 'none' }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Status icon */}
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: st.bg, border: `1.5px solid ${st.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {order.status === 'delivered'  && <CheckCircle size={18} color={st.color} />}
                      {order.status === 'shipped'    && <Truck size={18} color={st.color} />}
                      {order.status === 'cancelled'  && <XCircle size={18} color={st.color} />}
                      {['pending','processing'].includes(order.status) && <Clock size={18} color={st.color} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>#{ref}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot }} />
                          {st.label}
                        </span>
                        {order.isPaid && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                            ✓ Paid
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span>{date} · {time}</span>
                        <span style={{ color: '#e2e8f0' }}>·</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{pmIcon(order.paymentMethod)} {pmLabel(order.paymentMethod)}</span>
                        {order.user && (
                          <>
                            <span style={{ color: '#e2e8f0' }}>·</span>
                            <span style={{ fontWeight: 600, color: '#475569' }}>{order.user.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Total */}
                    <div style={{ textAlign: 'right', marginRight: 6 }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#1d4ed8', fontFamily: "'DM Mono',monospace" }}>{formatKES(order.totalPrice)}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{order.orderItems.reduce((s, i) => s + i.quantity, 0)} items</div>
                    </div>

                    {/* ── Advance status button ── */}
                    {next && (
                      <button
                        className="next-btn"
                        disabled={isBusy}
                        onClick={() => updateStatus(order._id, next.value)}
                        style={{ background: next.color, color: 'white' }}
                      >
                        {isBusy
                          ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,.4)', borderTopColor: 'white', animation: 'spin .7s linear infinite' }} /> Updating…</>
                          : <>{next.label} <ArrowRight size={12} /></>
                        }
                      </button>
                    )}

                    {/* Cancel */}
                    {canCancel && (
                      <button className="cancel-btn" disabled={isBusy} onClick={() => cancelOrder(order._id)}>
                        Cancel
                      </button>
                    )}

                    {/* Expand */}
                    <button onClick={() => toggle(order._id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '7px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b', fontFamily: "'Sora',sans-serif" }}>
                      {open ? <><ChevronUp size={13} /> Hide</> : <><ChevronDown size={13} /> Details</>}
                    </button>
                  </div>
                </div>

                {/* ── Progress bar ── */}
                <div style={{ padding: '14px 22px', background: '#fafbff', borderBottom: open ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <OrderProgress status={order.status} />
                  {order.status === 'delivered' && (
                    <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, marginLeft: 'auto' }}>
                      ✓ Cash collected · Revenue recorded
                    </span>
                  )}
                </div>

                {/* ── Expanded details ── */}
                {open && (
                  <div style={{ padding: '20px 22px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                      {/* Items */}
                      <div style={{ gridColumn: '1/-1' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Items</p>
                        {order.orderItems.map((item, i) => (
                          <div key={item._id ?? i} className="item-row">
                            <div style={{ width: 48, height: 48, borderRadius: 10, background: '#f8faff', border: '1px solid #e8edf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                              {item.image
                                ? <img src={item.image.startsWith('/uploads') ? `${API_URL}${item.image}` : item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                : <Package size={18} color="#94a3b8" />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{item.quantity} × {formatKES(item.price)}</p>
                            </div>
                            <p style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{formatKES(item.price * item.quantity)}</p>
                          </div>
                        ))}
                      </div>

                      {/* Order summary */}
                      <div style={{ background: '#f8faff', borderRadius: 14, border: '1.5px solid #e8edf5', padding: '16px 18px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>Order Summary</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 6 }}>
                          <span>Subtotal</span><span style={{ fontFamily: "'DM Mono',monospace" }}>{formatKES(order.itemsPrice ?? order.totalPrice)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                          <span style={{ color: '#64748b' }}>Shipping</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", color: order.shippingPrice === 0 ? '#16a34a' : '#0f172a' }}>
                            {order.shippingPrice === 0 ? 'Free' : formatKES(order.shippingPrice)}
                          </span>
                        </div>
                        <div style={{ borderTop: '1.5px solid #e2e8f0', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}>
                          <span>Total</span>
                          <span style={{ color: '#1d4ed8', fontFamily: "'DM Mono',monospace" }}>{formatKES(order.totalPrice)}</span>
                        </div>
                        <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: order.isPaid ? '#f0fdf4' : '#fffbeb', border: `1px solid ${order.isPaid ? '#bbf7d0' : '#fde68a'}` }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: order.isPaid ? '#16a34a' : '#d97706' }}>
                            {order.isPaid ? '✓ Payment confirmed — Revenue recorded' : '⏳ Awaiting delivery to confirm payment'}
                          </span>
                        </div>
                      </div>

                      {/* Customer + delivery */}
                      <div style={{ background: '#f8faff', borderRadius: 14, border: '1.5px solid #e8edf5', padding: '16px 18px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>Customer & Delivery</p>
                        {order.user && (
                          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e8edf5' }}>
                            <p style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{order.user.name}</p>
                            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{order.user.email}</p>
                            {order.user.phone && <p style={{ fontSize: 12, color: '#64748b' }}>📞 {order.user.phone}</p>}
                          </div>
                        )}
                        {order.shippingAddress && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <MapPin size={13} color="#94a3b8" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.8 }}>
                              {order.shippingAddress.fullName && <strong style={{ color: '#0f172a', display: 'block' }}>{order.shippingAddress.fullName}</strong>}
                              {order.shippingAddress.street}<br />
                              {order.shippingAddress.city}, {order.shippingAddress.state}<br />
                              {order.shippingAddress.zipCode} · {order.shippingAddress.country}
                              {order.shippingAddress.phone && <><br />📞 {order.shippingAddress.phone}</>}
                              {order.shippingAddress.landmark && <><br /><span style={{ color: '#94a3b8' }}>Near: {order.shippingAddress.landmark}</span></>}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
