import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Package, MapPin, CreditCard, Clock, CheckCircle,
  XCircle, Truck, ShoppingBag, Printer, Download,
  ChevronDown, ChevronUp, Wallet, Smartphone, ImageIcon
} from 'lucide-react';

const API_URL = ' import.meta.env.VITE_API_URL || 'http://localhost:5000'';

// ── Types ────────────────────────────────────────────────────────────────────
interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  fullName?: string;
}

interface OrderItem {
  _id?: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  product?: string;
}

interface Order {
  _id: string;
  orderNumber?: string;
  orderItems: OrderItem[];
  shippingAddress?: ShippingAddress;
  paymentMethod?: string;
  itemsPrice?: number;
  shippingPrice?: number;
  totalPrice: number;
  isPaid?: boolean;
  isDelivered?: boolean;
  status: string;
  trackingNumber?: string;
  createdAt?: string;
}

// ── Inline ProductImage (no external import needed) ──────────────────────────
const resolveImageUrl = (img: string | null | undefined): string | null => {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  if (img.startsWith('/uploads')) return `${API_URL}${img}`;
  return img;
};

interface ProductImageProps {
  src?: string;
  alt: string;
  style?: React.CSSProperties;
}

function ProductImage({ src, alt, style }: ProductImageProps) {
  const [status, setStatus]   = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imgSrc, setImgSrc]   = useState<string | null>(resolveImageUrl(src));
  const imgRef                = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const resolved = resolveImageUrl(src);
    setImgSrc(resolved);
    setStatus(resolved ? 'loading' : 'error');
  }, [src]);

  // Handle already-cached images
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setStatus('loaded');
    }
  }, [imgSrc]);

  if (!imgSrc || status === 'error') {
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8faff' }}>
        <Package size={20} color="#94a3b8" />
      </div>
    );
  }

  return (
    <>
      {status === 'loading' && (
        <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#f1f5f9' }}>
          <div style={{ width:16, height:16, border:'2px solid #e2e8f0', borderTopColor:'#94a3b8', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
        </div>
      )}
      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        style={{ ...style, display: status === 'loading' ? 'none' : 'block' }}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatKES = (n?: number) =>
  n !== undefined ? `KES ${Number(n).toLocaleString()}` : '—';

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return { date: '—', time: '—', short: '—' };
  const d = new Date(dateStr);
  return {
    date:  d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }),
    short: d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
    time:  d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
};

const STATUS: Record<string, { bg: string; color: string; border: string; dot: string; label: string }> = {
  delivered:  { bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0', dot:'#22c55e', label:'Delivered'  },
  shipped:    { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe', dot:'#3b82f6', label:'Shipped'    },
  processing: { bg:'#fffbeb', color:'#d97706', border:'#fde68a', dot:'#f59e0b', label:'Processing' },
  pending:    { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa', dot:'#f97316', label:'Pending'    },
  cancelled:  { bg:'#fef2f2', color:'#dc2626', border:'#fecaca', dot:'#ef4444', label:'Cancelled'  },
  failed:     { bg:'#fef2f2', color:'#dc2626', border:'#fecaca', dot:'#ef4444', label:'Failed'     },
  refunded:   { bg:'#fef2f2', color:'#dc2626', border:'#fecaca', dot:'#ef4444', label:'Refunded'   },
};

const getStatus = (s: string) =>
  STATUS[s] ?? { bg:'#f8faff', color:'#64748b', border:'#e2e8f0', dot:'#94a3b8', label: s };

const pmIcon = (pm?: string) => {
  if (pm === 'mpesa') return <Smartphone size={14} />;
  if (pm === 'cod')   return <Wallet size={14} />;
  return <Wallet size={14} />;
};

const pmLabel = (pm?: string) => {
  if (pm === 'mpesa')  return 'M-Pesa';
  if (pm === 'cod')    return 'Cash on Delivery';
  return pm ?? 'Other';
};

// ── Receipt HTML ─────────────────────────────────────────────────────────────
function buildReceiptHTML(order: Order): string {
  const { date, time } = formatDateTime(order.createdAt);
  const ref  = order.orderNumber || order._id.slice(-8).toUpperCase();
  const addr = order.shippingAddress;
  const st   = getStatus(order.status);

  const rows = order.orderItems.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8faff'}">
      <td style="padding:12px 16px;font-size:13.5px;color:#1e293b;border-bottom:1px solid #f1f5f9">${item.name}</td>
      <td style="padding:12px 16px;text-align:center;font-size:13.5px;color:#475569;border-bottom:1px solid #f1f5f9;font-family:'DM Mono',monospace">${item.quantity}</td>
      <td style="padding:12px 16px;text-align:right;font-size:13.5px;color:#475569;border-bottom:1px solid #f1f5f9;font-family:'DM Mono',monospace">${formatKES(item.price)}</td>
      <td style="padding:12px 16px;text-align:right;font-size:13.5px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9;font-family:'DM Mono',monospace">${formatKES(item.price * item.quantity)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Receipt — ${ref} | MzuriTech</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Sora',sans-serif;color:#1e293b;background:#f0f4f8;min-height:100vh;padding:40px 20px}
    .page{max-width:680px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.1)}
    .header{background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#2563eb 100%);padding:32px 40px;position:relative;overflow:hidden}
    .header::before{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.06)}
    .header::after{content:'';position:absolute;bottom:-40px;left:20%;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.04)}
    .header-inner{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-start}
    .brand{color:white;font-size:26px;font-weight:800;letter-spacing:-.5px}
    .brand-sub{color:rgba(255,255,255,.55);font-size:12px;font-weight:500;margin-top:3px;letter-spacing:.04em;text-transform:uppercase}
    .receipt-badge{text-align:right}
    .receipt-badge h2{color:white;font-size:18px;font-weight:700}
    .receipt-badge .ref{display:inline-block;margin-top:6px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:4px 12px;color:rgba(255,255,255,.85);font-size:12px;font-family:'DM Mono',monospace;letter-spacing:.08em}
    .meta{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0;border-bottom:1px solid #e8edf5}
    .meta-cell{padding:20px 24px;border-right:1px solid #e8edf5}
    .meta-cell:last-child{border-right:none}
    .meta-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:600;margin-bottom:6px}
    .meta-value{font-size:14px;font-weight:700;color:#0f172a}
    .meta-sub{font-size:11.5px;color:#64748b;margin-top:2px;font-family:'DM Mono',monospace}
    .status-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11.5px;font-weight:700;text-transform:capitalize;background:${st.bg};color:${st.color};border:1px solid ${st.border}}
    .status-dot{width:7px;height:7px;border-radius:50%;background:${st.dot};flex-shrink:0}
    .body{padding:32px 40px}
    .section-title{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px}
    .section-title::after{content:'';flex:1;height:1px;background:#e8edf5}
    table{width:100%;border-collapse:collapse;margin-bottom:8px;border:1px solid #e8edf5;border-radius:12px;overflow:hidden}
    thead tr{background:linear-gradient(135deg,#1e3a8a,#1d4ed8)}
    thead th{padding:12px 16px;text-align:left;font-size:11px;font-weight:700;letter-spacing:.06em;color:rgba(255,255,255,.9);text-transform:uppercase}
    thead th:nth-child(2){text-align:center}
    thead th:nth-child(3),thead th:nth-child(4){text-align:right}
    .totals-wrap{display:flex;justify-content:flex-end;margin-top:16px;margin-bottom:32px}
    .totals{width:260px}
    .t-row{display:flex;justify-content:space-between;padding:7px 0;font-size:13.5px;color:#475569;border-bottom:1px solid #f1f5f9}
    .t-row .val{font-family:'DM Mono',monospace;font-weight:500}
    .t-row.free .val{color:#16a34a;font-weight:600}
    .t-grand{display:flex;justify-content:space-between;padding:14px 16px;background:linear-gradient(135deg,#eff6ff,#f0f7ff);border:1.5px solid #bfdbfe;border-radius:12px;margin-top:10px}
    .t-grand .label{font-size:15px;font-weight:800;color:#0f172a}
    .t-grand .val{font-size:17px;font-weight:800;color:#1d4ed8;font-family:'DM Mono',monospace}
    .bottom{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:4px}
    .info-box{background:#f8faff;border:1.5px solid #e8edf5;border-radius:14px;padding:18px 20px}
    .info-box .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:700;margin-bottom:10px}
    .info-box .txt{font-size:13px;color:#475569;line-height:1.75}
    .info-box .txt strong{color:#0f172a;display:block;margin-bottom:3px}
    .paid-yes{color:#16a34a;font-weight:700;font-size:12px}
    .paid-no{color:#d97706;font-weight:700;font-size:12px}
    .footer{margin:32px 0 0;padding:24px 40px;background:#f8faff;border-top:1.5px solid #e8edf5;text-align:center}
    .footer p{font-size:12px;color:#94a3b8;line-height:1.8}
    .footer strong{color:#475569}
    @media print{body{background:white;padding:0}.page{box-shadow:none;border-radius:0}}
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-inner">
        <div>
          <div class="brand">MzuriTech</div>
          <div class="brand-sub">Electronics Store · Nairobi, Kenya</div>
        </div>
        <div class="receipt-badge">
          <h2>Order Receipt</h2>
          <div class="ref">#${ref}</div>
        </div>
      </div>
    </div>

    <div class="meta">
      <div class="meta-cell">
        <div class="meta-label">Date</div>
        <div class="meta-value">${date}</div>
        <div class="meta-sub">${time}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Status</div>
        <div style="margin-top:4px" class="meta-value">
          <span class="status-pill"><span class="status-dot"></span>${st.label}</span>
        </div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Payment</div>
        <div class="meta-value" style="text-transform:capitalize">${pmLabel(order.paymentMethod)}</div>
        <div class="meta-sub" style="color:${order.isPaid ? '#16a34a' : '#d97706'}">${order.isPaid ? '✓ Paid' : 'Pending'}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Reference</div>
        <div class="meta-value" style="font-family:'DM Mono',monospace;font-size:13px">${ref}</div>
        ${order.trackingNumber ? `<div class="meta-sub">${order.trackingNumber}</div>` : ''}
      </div>
    </div>

    <div class="body">
      <div class="section-title">Order Items</div>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="totals-wrap">
        <div class="totals">
          <div class="t-row"><span>Subtotal</span><span class="val">${formatKES(order.itemsPrice ?? order.totalPrice)}</span></div>
          <div class="t-row ${order.shippingPrice === 0 ? 'free' : ''}">
            <span>Shipping</span>
            <span class="val">${order.shippingPrice === 0 ? 'Free' : formatKES(order.shippingPrice)}</span>
          </div>
          <div class="t-grand">
            <span class="label">Total</span>
            <span class="val">${formatKES(order.totalPrice)}</span>
          </div>
        </div>
      </div>

      <div class="section-title">Delivery & Payment</div>
      <div class="bottom">
        ${addr ? `
        <div class="info-box">
          <div class="lbl">Delivery Address</div>
          <div class="txt">
            ${addr.fullName ? `<strong>${addr.fullName}</strong>` : ''}
            ${addr.street}<br/>
            ${addr.city}, ${addr.state}<br/>
            ${addr.zipCode} · ${addr.country}
            ${addr.phone ? `<br/>📞 ${addr.phone}` : ''}
          </div>
        </div>` : '<div></div>'}
        <div class="info-box">
          <div class="lbl">Payment Details</div>
          <div class="txt">
            <strong>${pmLabel(order.paymentMethod)}</strong>
            Payment status: <span class="${order.isPaid ? 'paid-yes' : 'paid-no'}">${order.isPaid ? '✓ Confirmed Paid' : '⏳ Pending'}</span><br/>
            Delivery: ${order.isDelivered ? '<span class="paid-yes">✓ Delivered</span>' : '<span style="color:#d97706;font-weight:600">Pending delivery</span>'}
            ${order.trackingNumber ? `<br/>Tracking: <span style="font-family:\'DM Mono\',monospace;color:#1d4ed8">${order.trackingNumber}</span>` : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p><strong>MzuriTech Electronics</strong> · Nairobi, Kenya</p>
      <p>support@mzuritech.co.ke · +254 700 000 000</p>
      <p style="margin-top:8px;font-size:11px">This is a computer-generated receipt — no signature required.<br/>Thank you for shopping with MzuriTech!</p>
    </div>
  </div>
</body>
</html>`;
}

function handlePrint(order: Order) {
  const win = window.open('', '_blank', 'width=820,height=920');
  if (!win) return;
  win.document.write(buildReceiptHTML(order));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

function handleDownload(order: Order) {
  const html = buildReceiptHTML(order);
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `MzuriTech-Receipt-${order.orderNumber || order._id.slice(-8).toUpperCase()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function OrderHistory() {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders]       = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState('');
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  useEffect(() => {
    const fetchOrders = async () => {
      if (!token) { setIsLoading(false); return; }
      try {
        const res  = await fetch(`${API_URL}/api/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) setOrders(data.orders ?? []);
        else setError(data.message || 'Failed to fetch orders');
      } catch {
        setError('Could not connect to server. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [token]);

  if (!isAuthenticated) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');.oh-root{font-family:'Sora',sans-serif}`}</style>
      <div className="oh-root min-h-screen flex flex-col items-center justify-center gap-5"
        style={{ background:'linear-gradient(135deg,#f0f7ff,#faf5ff)', fontFamily:"'Sora',sans-serif" }}>
        <div style={{ width:80, height:80, borderRadius:24, background:'#eff6ff', border:'2px solid #bfdbfe', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Package size={36} color="#1d4ed8" />
        </div>
        <p style={{ fontSize:18, fontWeight:700, color:'#0f172a' }}>Sign in to view your orders</p>
        <button onClick={() => navigate('/login')}
          style={{ background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', color:'white', border:'none', borderRadius:12, padding:'12px 32px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
          Sign In
        </button>
      </div>
    </>
  );

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'linear-gradient(135deg,#f0f7ff,#faf5ff)' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ width:48, height:48, borderRadius:'50%', border:'3px solid #e2e8f0', borderTopColor:'#1d4ed8', animation:'spin 0.8s linear infinite' }} />
        <p style={{ color:'#64748b', fontFamily:"'Sora',sans-serif", fontSize:14 }}>Loading your orders…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .oh-root * { box-sizing:border-box; font-family:'Sora',sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .fade-up { animation:fadeUp .4s ease both }
        .order-card { background:white; border-radius:18px; border:1.5px solid #e8edf5; box-shadow:0 2px 16px rgba(0,0,0,.04); overflow:hidden; transition:box-shadow .2s; }
        .order-card:hover { box-shadow:0 6px 28px rgba(0,0,0,.08); }
        .action-btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:9px; border:1.5px solid #e2e8f0; background:white; cursor:pointer; font-size:12px; font-weight:600; color:#475569; transition:all .2s; font-family:'Sora',sans-serif; }
        .action-btn:hover { border-color:#3b82f6; color:#1d4ed8; background:#eff6ff; }
        .item-row { display:flex; gap:12px; align-items:center; padding:12px 0; border-bottom:1px solid #f1f5f9; }
        .item-row:last-child { border-bottom:none; }
        .expand-btn { display:flex; align-items:center; gap:6px; background:none; border:none; cursor:pointer; font-size:12px; font-weight:600; color:#64748b; font-family:'Sora',sans-serif; padding:4px 8px; border-radius:8px; transition:all .2s; }
        .expand-btn:hover { background:#f8faff; color:#1d4ed8; }
      `}</style>

      <div className="oh-root min-h-screen py-12" style={{ background:'linear-gradient(135deg,#f0f7ff 0%,#fafbff 50%,#faf5ff 100%)' }}>
        <div style={{ maxWidth:860, margin:'0 auto', padding:'0 20px' }}>

          {/* Page header */}
          <div className="fade-up" style={{ marginBottom:32 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div>
                <h1 style={{ fontSize:28, fontWeight:800, color:'#0f172a', marginBottom:4 }}>My Orders</h1>
                <p style={{ fontSize:14, color:'#64748b' }}>
                  {orders.length > 0 ? `${orders.length} order${orders.length !== 1 ? 's' : ''} total` : 'No orders yet'}
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:'#fef2f2', border:'1.5px solid #fecaca', color:'#dc2626', borderRadius:12, padding:'12px 18px', marginBottom:20, fontSize:13 }}>
              {error}
            </div>
          )}

          {/* Empty */}
          {orders.length === 0 && !error && (
            <div className="fade-up order-card" style={{ padding:'64px 32px', textAlign:'center' }}>
              <div style={{ width:80, height:80, borderRadius:24, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                <Package size={36} color="#94a3b8" />
              </div>
              <p style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginBottom:8 }}>No orders yet</p>
              <p style={{ color:'#64748b', fontSize:14, marginBottom:24 }}>Start shopping to see your orders here!</p>
              <button onClick={() => navigate('/shop')}
                style={{ background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', color:'white', border:'none', borderRadius:11, padding:'11px 28px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
                Browse Products
              </button>
            </div>
          )}

          {/* Orders list */}
          <div style={{ display:'grid', gap:16 }}>
            {orders.map((order, idx) => {

              const { date, time } = formatDateTime(order.createdAt);
              const st   = getStatus(order.status);
              const ref  = order.orderNumber || order._id.slice(-8).toUpperCase();
              const open = expanded[order._id];

              return (
                <div key={order._id} className="fade-up order-card" style={{ animationDelay:`${idx * .06}s` }}>

                  {/* ── Card Header ── */}
                  <div style={{ padding:'20px 24px', borderBottom: open ? '1px solid #f1f5f9' : 'none', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14 }}>

                    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background:st.bg, border:`1.5px solid ${st.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {order.status === 'delivered'  && <CheckCircle size={20} color={st.color} />}
                        {order.status === 'shipped'    && <Truck size={20} color={st.color} />}
                        {(order.status === 'cancelled' || order.status === 'failed') && <XCircle size={20} color={st.color} />}
                        {order.status === 'refunded'   && <XCircle size={20} color={st.color} />}
                        {(order.status === 'pending' || order.status === 'processing') && <Clock size={20} color={st.color} />}
                      </div>

                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                          <span style={{ fontWeight:800, fontSize:15, color:'#0f172a' }}>#{ref}</span>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:11.5, fontWeight:700, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>
                            <span style={{ width:6, height:6, borderRadius:'50%', background:st.dot, flexShrink:0 }} />
                            {st.label}
                          </span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4, color:'#94a3b8', fontSize:12 }}>
                          <Clock size={12} />
                          <span>{date} at {time}</span>
                          <span style={{ color:'#e2e8f0' }}>·</span>
                          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                            {pmIcon(order.paymentMethod)} {pmLabel(order.paymentMethod)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:18, fontWeight:800, color:'#1d4ed8', fontFamily:"'DM Mono',monospace" }}>
                          {formatKES(order.totalPrice)}
                        </div>
                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>
                          {order.orderItems.reduce((s, i) => s + i.quantity, 0)} items
                        </div>
                      </div>
                      <button className="action-btn" onClick={() => handlePrint(order)}>
                        <Printer size={13} /> Print
                      </button>
                      <button className="action-btn" onClick={() => handleDownload(order)}>
                        <Download size={13} /> Receipt
                      </button>
                      <button className="expand-btn" onClick={() => toggle(order._id)}>
                        {open ? <><ChevronUp size={15} /> Hide</> : <><ChevronDown size={15} /> Details</>}
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded Details ── */}
                  {open && (
                    <div style={{ padding:'20px 24px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

                        {/* Items — ✅ FIXED: uses ProductImage component */}
                        <div style={{ gridColumn:'1/-1' }}>
                          <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>Items Ordered</p>
                          <div>
                            {order.orderItems.map((item, i) => (
                              <div key={item._id ?? i} className="item-row">
                                {/* ✅ ProductImage handles URL resolution + fallback */}
                                <div style={{ width:52, height:52, borderRadius:10, border:'1px solid #e8edf5', flexShrink:0, overflow:'hidden' }}>
                                  <ProductImage
                                    src={item.image}
                                    alt={item.name}
                                    style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }}
                                  />
                                </div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <p style={{ fontWeight:600, fontSize:13.5, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</p>
                                  <p style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>
                                    {item.quantity} × {formatKES(item.price)}
                                  </p>
                                </div>
                                <p style={{ fontWeight:700, fontSize:13.5, color:'#0f172a', fontFamily:"'DM Mono',monospace", flexShrink:0 }}>
                                  {formatKES(item.price * item.quantity)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Totals */}
                        <div style={{ background:'#f8faff', borderRadius:14, border:'1.5px solid #e8edf5', padding:'18px 20px' }}>
                          <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>Order Summary</p>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#64748b', marginBottom:6 }}>
                            <span>Subtotal</span><span style={{ fontFamily:"'DM Mono',monospace" }}>{formatKES(order.itemsPrice ?? order.totalPrice)}</span>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:10 }}>
                            <span style={{ color:'#64748b' }}>Shipping</span>
                            <span style={{ fontFamily:"'DM Mono',monospace", color: order.shippingPrice === 0 ? '#16a34a' : '#0f172a', fontWeight: order.shippingPrice === 0 ? 700 : 400 }}>
                              {order.shippingPrice === 0 ? 'Free' : formatKES(order.shippingPrice)}
                            </span>
                          </div>
                          <div style={{ borderTop:'1.5px solid #e2e8f0', paddingTop:10, display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:15 }}>
                            <span style={{ color:'#0f172a' }}>Total</span>
                            <span style={{ color:'#1d4ed8', fontFamily:"'DM Mono',monospace" }}>{formatKES(order.totalPrice)}</span>
                          </div>
                          <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                            {pmIcon(order.paymentMethod)}
                            <span style={{ color:'#64748b' }}>{pmLabel(order.paymentMethod)}</span>
                            <span style={{ marginLeft:'auto', fontWeight:700, color: order.isPaid ? '#16a34a' : '#d97706', fontSize:11.5 }}>
                              {order.isPaid ? '✓ Paid' : '⏳ Pending'}
                            </span>
                          </div>
                        </div>

                        {/* Shipping address */}
                        {order.shippingAddress && (
                          <div style={{ background:'#f8faff', borderRadius:14, border:'1.5px solid #e8edf5', padding:'18px 20px' }}>
                            <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>Delivery Address</p>
                            <div style={{ display:'flex', gap:8 }}>
                              <MapPin size={14} color="#94a3b8" style={{ flexShrink:0, marginTop:2 }} />
                              <div style={{ fontSize:13, color:'#475569', lineHeight:1.8 }}>
                                {order.shippingAddress.fullName && <strong style={{ color:'#0f172a', display:'block' }}>{order.shippingAddress.fullName}</strong>}
                                {order.shippingAddress.street}<br/>
                                {order.shippingAddress.city}, {order.shippingAddress.state}<br/>
                                {order.shippingAddress.zipCode} · {order.shippingAddress.country}
                                {order.shippingAddress.phone && <><br/><span style={{ color:'#64748b' }}>📞 {order.shippingAddress.phone}</span></>}
                              </div>
                            </div>
                            {order.trackingNumber && (
                              <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                                <Truck size={13} color="#94a3b8" />
                                <span style={{ color:'#64748b' }}>Tracking:</span>
                                <span style={{ fontFamily:"'DM Mono',monospace", color:'#1d4ed8', fontWeight:600 }}>{order.trackingNumber}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Continue Shopping */}
          {orders.length > 0 && (
            <div style={{ marginTop:32, display:'flex', justifyContent:'center' }}>
              <button onClick={() => navigate('/shop')}
                style={{ display:'flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', color:'white', border:'none', borderRadius:12, padding:'13px 32px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif", boxShadow:'0 4px 18px rgba(59,130,246,.3)' }}>
                <ShoppingBag size={16} /> Continue Shopping
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
