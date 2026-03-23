import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Loader2, User, Mail, Phone, MapPin, LogOut,
  Star, Gift, Copy, Check, TrendingUp, Award,
  ShoppingBag, Clock, ChevronRight, Zap, Shield,
  Package, Truck, CheckCircle, XCircle, Printer,
  Download, ChevronDown, ChevronUp, Wallet, Smartphone,
  CreditCard
} from 'lucide-react';

const API_URL = ' import.meta.env.VITE_API_URL || 'http://localhost:5000'';

// ── Types ──────────────────────────────────────────────────────────────────
interface PointsTransaction {
  _id: string;
  type: 'earned' | 'redeemed' | 'referral' | 'bonus';
  points: number;
  description: string;
  createdAt: string;
}

interface RewardsData {
  points: number;
  totalEarned: number;
  totalRedeemed: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  referralCode: string;
  referralCount: number;
  transactions: PointsTransaction[];
}

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
  pointsAwarded?: boolean;
  pointsEarned?: number;
  status: string;
  trackingNumber?: string;
  createdAt?: string;
}

// ── Order helpers ──────────────────────────────────────────────────────────
const formatKES = (n?: number) =>
  n !== undefined ? `KES ${Number(n).toLocaleString()}` : '—';

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return { date: '—', time: '—' };
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
};

const ORDER_STATUS: Record<string, { bg: string; color: string; border: string; dot: string; label: string }> = {
  delivered:  { bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0', dot:'#22c55e', label:'Delivered'  },
  shipped:    { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe', dot:'#3b82f6', label:'Shipped'    },
  processing: { bg:'#fffbeb', color:'#d97706', border:'#fde68a', dot:'#f59e0b', label:'Processing' },
  pending:    { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa', dot:'#f97316', label:'Pending'    },
  cancelled:  { bg:'#fef2f2', color:'#dc2626', border:'#fecaca', dot:'#ef4444', label:'Cancelled'  },
  failed:     { bg:'#fef2f2', color:'#dc2626', border:'#fecaca', dot:'#ef4444', label:'Failed'     },
  refunded:   { bg:'#fef2f2', color:'#dc2626', border:'#fecaca', dot:'#ef4444', label:'Refunded'   },
};

const getOrderStatus = (s: string) =>
  ORDER_STATUS[s] ?? { bg:'#f8faff', color:'#64748b', border:'#e2e8f0', dot:'#94a3b8', label: s };

const pmIcon = (pm?: string) => {
  if (pm === 'mpesa') return <Smartphone size={13} />;
  if (pm === 'cod')   return <Wallet size={13} />;
  return <Wallet size={13} />;
};

const pmLabel = (pm?: string) => {
  if (pm === 'mpesa')  return 'M-Pesa';
  if (pm === 'cod')    return 'Cash on Delivery';
  return pm ?? 'Other';
};

// ── Inline ProductImage ────────────────────────────────────────────────────
const resolveImageUrl = (img?: string): string | null => {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  if (img.startsWith('/uploads')) return `${API_URL}${img}`;
  return img;
};

function ProductImage({ src, alt }: { src?: string; alt: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imgSrc, setImgSrc] = useState<string | null>(resolveImageUrl(src));
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const resolved = resolveImageUrl(src);
    setImgSrc(resolved);
    setStatus(resolved ? 'loading' : 'error');
  }, [src]);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setStatus('loaded');
  }, [imgSrc]);

  if (!imgSrc || status === 'error') {
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Package size={18} color="#94a3b8" />
      </div>
    );
  }

  return (
    <>
      {status === 'loading' && (
        <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:14, height:14, border:'2px solid #e2e8f0', borderTopColor:'#94a3b8', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
        </div>
      )}
      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        style={{ width:'100%', height:'100%', objectFit:'contain', padding:3, display: status === 'loading' ? 'none' : 'block' }}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </>
  );
}

// ── Receipt builder ────────────────────────────────────────────────────────
function buildReceiptHTML(order: Order): string {
  const { date, time } = formatDateTime(order.createdAt);
  const ref  = order.orderNumber || order._id.slice(-8).toUpperCase();
  const addr = order.shippingAddress;
  const st   = getOrderStatus(order.status);

  const rows = order.orderItems.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8faff'}">
      <td style="padding:12px 16px;font-size:13.5px;color:#1e293b;border-bottom:1px solid #f1f5f9">${item.name}</td>
      <td style="padding:12px 16px;text-align:center;font-size:13.5px;color:#475569;border-bottom:1px solid #f1f5f9">${item.quantity}</td>
      <td style="padding:12px 16px;text-align:right;font-size:13.5px;color:#475569;border-bottom:1px solid #f1f5f9">${formatKES(item.price)}</td>
      <td style="padding:12px 16px;text-align:right;font-size:13.5px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9">${formatKES(item.price * item.quantity)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Receipt — ${ref}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:sans-serif;background:#f0f4f8;padding:40px 20px}
  .page{max-width:680px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.1)}
  .hdr{background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 36px;color:white;display:flex;justify-content:space-between;align-items:center}
  .hdr h1{font-size:22px;font-weight:800}.hdr .ref{font-size:13px;opacity:.7;margin-top:4px}
  .meta{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #e8edf5}
  .mc{padding:18px 20px;border-right:1px solid #e8edf5}.mc:last-child{border-right:none}
  .ml{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:5px}
  .mv{font-size:14px;font-weight:700;color:#0f172a}
  .body{padding:28px 36px}table{width:100%;border-collapse:collapse;border:1px solid #e8edf5;border-radius:10px;overflow:hidden;margin-bottom:20px}
  thead tr{background:linear-gradient(135deg,#1e3a8a,#1d4ed8)}thead th{padding:11px 15px;text-align:left;font-size:11px;color:rgba(255,255,255,.9);text-transform:uppercase}
  thead th:nth-child(2){text-align:center}thead th:nth-child(3),thead th:nth-child(4){text-align:right}
  .totals{display:flex;justify-content:flex-end;margin-bottom:28px}.tot{width:240px}
  .tr{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9}
  .tg{display:flex;justify-content:space-between;padding:12px 14px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;margin-top:8px}
  .tg .l{font-size:14px;font-weight:800;color:#0f172a}.tg .v{font-size:16px;font-weight:800;color:#1d4ed8}
  .bot{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  .ib{background:#f8faff;border:1.5px solid #e8edf5;border-radius:12px;padding:16px 18px}
  .ib .lb{font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:700;margin-bottom:8px}
  .ib .tx{font-size:13px;color:#475569;line-height:1.75}
  .ft{padding:20px 36px;background:#f8faff;border-top:1.5px solid #e8edf5;text-align:center;font-size:12px;color:#94a3b8;line-height:1.8}
  @media print{body{background:white;padding:0}.page{box-shadow:none;border-radius:0}}</style></head>
  <body><div class="page">
    <div class="hdr"><div><h1>MzuriTech</h1><div class="ref">Electronics Store · Nairobi, Kenya</div></div>
    <div style="text-align:right"><div style="font-size:16px;font-weight:700">Order Receipt</div><div class="ref">#${ref}</div></div></div>
    <div class="meta">
      <div class="mc"><div class="ml">Date</div><div class="mv">${date}</div><div style="font-size:11px;color:#64748b">${time}</div></div>
      <div class="mc"><div class="ml">Status</div><div class="mv" style="color:${st.color}">${st.label}</div></div>
      <div class="mc"><div class="ml">Payment</div><div class="mv">${pmLabel(order.paymentMethod)}</div><div style="font-size:11px;color:${order.isPaid?'#16a34a':'#d97706'}">${order.isPaid?'✓ Paid':'Pending'}</div></div>
      <div class="mc"><div class="ml">Reference</div><div class="mv" style="font-size:13px">${ref}</div></div>
    </div>
    <div class="body">
      <table><thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="totals"><div class="tot">
        <div class="tr"><span>Subtotal</span><span>${formatKES(order.itemsPrice ?? order.totalPrice)}</span></div>
        <div class="tr"><span>Shipping</span><span style="color:${order.shippingPrice===0?'#16a34a':'inherit'}">${order.shippingPrice===0?'Free':formatKES(order.shippingPrice)}</span></div>
        <div class="tg"><span class="l">Total</span><span class="v">${formatKES(order.totalPrice)}</span></div>
      </div></div>
      <div class="bot">
        ${addr?`<div class="ib"><div class="lb">Delivery Address</div><div class="tx">${addr.fullName?`<strong>${addr.fullName}</strong><br/>`:''}${addr.street}<br/>${addr.city}, ${addr.state}<br/>${addr.zipCode} · ${addr.country}${addr.phone?`<br/>📞 ${addr.phone}`:''}</div></div>`:'<div></div>'}
        <div class="ib"><div class="lb">Payment Details</div><div class="tx"><strong>${pmLabel(order.paymentMethod)}</strong><br/>
        Status: <span style="color:${order.isPaid?'#16a34a':'#d97706'};font-weight:700">${order.isPaid?'✓ Paid':'⏳ Pending'}</span><br/>
        Delivery: <span style="color:${order.isDelivered?'#16a34a':'#d97706'};font-weight:600">${order.isDelivered?'✓ Delivered':'Pending'}</span></div></div>
      </div>
    </div>
    <div class="ft"><strong>MzuriTech Electronics</strong> · support@mzuritech.co.ke · +254 700 000 000<br/>Computer-generated receipt — no signature required. Thank you for shopping with us!</div>
  </div></body></html>`;
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
  const blob = new Blob([buildReceiptHTML(order)], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `MzuriTech-Receipt-${order.orderNumber || order._id.slice(-8).toUpperCase()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Rewards constants ──────────────────────────────────────────────────────
const POINTS_PER_KES = 1;
const KES_PER_POINT  = 1;
const MIN_REDEEM     = 100;
const REFERRAL_BONUS = 200;

const TIERS = {
  Bronze:   { min: 0,    color: '#cd7f32', bg: 'rgba(205,127,50,0.12)',  next: 500  },
  Silver:   { min: 500,  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', next: 1500 },
  Gold:     { min: 1500, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  next: 3000 },
  Platinum: { min: 3000, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', next: null },
};

const tierIcon: Record<string, string> = {
  Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎',
};

function getTier(totalEarned: number): RewardsData['tier'] {
  if (totalEarned >= 3000) return 'Platinum';
  if (totalEarned >= 1500) return 'Gold';
  if (totalEarned >= 500)  return 'Silver';
  return 'Bronze';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function txIcon(type: string) {
  if (type === 'earned')   return { icon: <ShoppingBag className="w-4 h-4" />, color: '#34d399' };
  if (type === 'redeemed') return { icon: <Gift className="w-4 h-4" />,        color: '#f87171' };
  if (type === 'referral') return { icon: <Star className="w-4 h-4" />,        color: '#fbbf24' };
  return { icon: <Zap className="w-4 h-4" />, color: '#a78bfa' };
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Profile() {
  const { user, token, logout, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]   = useState<'profile' | 'orders' | 'rewards' | 'referral'>('profile');
  const [isLoading, setIsLoading]   = useState(false);
  const [message, setMessage]       = useState({ type: '', text: '' });
  const [phoneError, setPhoneError] = useState('');
  const [copied, setCopied]         = useState(false);
  const [redeemInput, setRedeemInput] = useState('');
  const [redeemMsg, setRedeemMsg]   = useState({ type: '', text: '' });
  const [redeemLoading, setRedeemLoading] = useState(false);

  const [rewards, setRewards]           = useState<RewardsData | null>(null);
  const [rewardsLoading, setRewardsLoading] = useState(false);

  // Orders state
  const [orders, setOrders]             = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError]   = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    name:    user?.name              || '',
    phone:   user?.phone             || '+254',
    street:  user?.address?.street   || '',
    apartment: user?.address?.apartment || '',
    city:    user?.address?.city     || '',
    state:   user?.address?.state    || '',
    zipCode: user?.address?.zipCode  || '',
    country: user?.address?.country  || 'Kenya',
    landmark: user?.address?.landmark || '',
    deliveryInstructions: user?.address?.deliveryInstructions || '',
  });

  // ── Fetch rewards ──────────────────────────────────────────────────────
  const fetchRewards = useCallback(async () => {
    if (!token) return;
    setRewardsLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/rewards/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setRewards(data.rewards);
    } catch (e) {
      console.error('Rewards fetch error:', e);
    } finally {
      setRewardsLoading(false);
    }
  }, [token]);

  // ── Fetch orders ───────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const res  = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setOrders(data.orders ?? []);
      else setOrdersError(data.message || 'Failed to fetch orders');
    } catch {
      setOrdersError('Could not connect to server.');
    } finally {
      setOrdersLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRewards(); }, [fetchRewards]);
  useEffect(() => { if (activeTab === 'orders') fetchOrders(); }, [activeTab, fetchOrders]);

  const toggleOrder = (id: string) =>
    setExpandedOrders(e => ({ ...e, [id]: !e[id] }));

  // ── Profile handlers ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setFormData({
      name:    user.name              || '',
      phone:   user.phone             || '+254',
      street:  user.address?.street   || '',
      apartment: user.address?.apartment || '',
      city:    user.address?.city     || '',
      state:   user.address?.state    || '',
      zipCode: user.address?.zipCode  || '',
      country: user.address?.country  || 'Kenya',
      landmark: user.address?.landmark || '',
      deliveryInstructions: user.address?.deliveryInstructions || '',
    });
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'phone') setPhoneError('');
  };

  const validatePhone = (phone: string) => {
    if (!phone || phone === '+254') return null;
    return /^\+254\d{9}$/.test(phone)
      ? null : 'Phone must be +254 followed by 9 digits';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneVal = validatePhone(formData.phone);
    if (phoneVal) { setPhoneError(phoneVal); return; }
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await updateProfile({
        name: formData.name, phone: formData.phone,
        address: {
          street: formData.street,
          apartment: formData.apartment,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
          landmark: formData.landmark,
          deliveryInstructions: formData.deliveryInstructions,
        },
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Redeem points ──────────────────────────────────────────────────────
  const handleRedeem = async () => {
    const pts = parseInt(redeemInput);
    if (!pts || pts < MIN_REDEEM) {
      setRedeemMsg({ type: 'error', text: `Minimum redemption is ${MIN_REDEEM} points` }); return;
    }
    if (rewards && pts > rewards.points) {
      setRedeemMsg({ type: 'error', text: 'Not enough points' }); return;
    }
    setRedeemLoading(true);
    setRedeemMsg({ type: '', text: '' });
    try {
      const res  = await fetch(`${API_URL}/api/rewards/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ points: pts }),
      });
      const data = await res.json();
      if (data.success) {
        setRedeemMsg({ type: 'success', text: `Redeemed! You got a KES ${pts} discount coupon: ${data.couponCode}` });
        setRedeemInput('');
        fetchRewards();
      } else {
        setRedeemMsg({ type: 'error', text: data.message || 'Redemption failed' });
      }
    } catch {
      setRedeemMsg({ type: 'error', text: 'Something went wrong' });
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleCopy = () => {
    const link = `${window.location.origin}/register?ref=${rewards?.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Please log in to view your profile.</p>
    </div>
  );

  const tier     = rewards ? getTier(rewards.totalEarned) : 'Bronze';
  const tierInfo = TIERS[tier];
  const nextTier = tierInfo.next;
  const progress = nextTier
    ? Math.min(100, ((rewards?.totalEarned ?? 0) - tierInfo.min) / (nextTier - tierInfo.min) * 100)
    : 100;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .profile-root { font-family: 'Sora', sans-serif; }
        .profile-root * { box-sizing: border-box; }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes shimmer  { 0%,100% { opacity:.6 } 50% { opacity:1 } }
        @keyframes pulse-pt { 0%,100% { transform:scale(1) } 50% { transform:scale(1.06) } }
        @keyframes spin     { to { transform:rotate(360deg) } }
        .fade-up   { animation: fadeUp .4s ease both }
        .tab-btn   { transition: all .2s ease; border: none; cursor: pointer; font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600; border-radius: 10px; padding: 9px 18px; }
        .tab-btn.active { background: linear-gradient(135deg,#1d4ed8,#3b82f6); color: white; box-shadow: 0 4px 14px rgba(59,130,246,.35); }
        .tab-btn:not(.active) { background: transparent; color: #64748b; }
        .tab-btn:not(.active):hover { background: rgba(59,130,246,.07); color: #3b82f6; }
        .field-input { width:100%; background: #f8faff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 11px 14px; font-size: 13.5px; font-family: 'Sora',sans-serif; color: #1e293b; outline: none; transition: border-color .2s; }
        .field-input:focus { border-color: #3b82f6; background: white; }
        .field-input:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
        .save-btn { background: linear-gradient(135deg,#1d4ed8,#3b82f6); color: white; border: none; border-radius: 10px; padding: 11px 28px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Sora',sans-serif; transition: all .2s; box-shadow: 0 4px 14px rgba(59,130,246,.3); display:flex; align-items:center; gap:8px; }
        .save-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59,130,246,.4); }
        .save-btn:disabled { opacity:.6; cursor:not-allowed; }
        .card { background: white; border-radius: 18px; border: 1.5px solid #e8edf5; box-shadow: 0 2px 16px rgba(0,0,0,.05); overflow: hidden; }
        .points-badge { animation: pulse-pt 2.5s ease infinite; }
        .tx-row:hover { background: #f8faff; }
        .redeem-input { background: #f8faff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 11px 14px; font-size: 14px; font-family: 'DM Mono',monospace; color: #1e293b; outline: none; width: 140px; transition: border-color .2s; }
        .redeem-input:focus { border-color: #3b82f6; }
        .copy-btn { display:flex; align-items:center; gap:6px; background: #f0f7ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 10px 16px; cursor:pointer; font-size:13px; font-weight:600; color:#1d4ed8; transition:all .2s; font-family:'Sora',sans-serif; }
        .copy-btn:hover { background: #dbeafe; }
        .order-card { background:white; border-radius:14px; border:1.5px solid #e8edf5; box-shadow:0 2px 12px rgba(0,0,0,.04); overflow:hidden; transition:box-shadow .2s; }
        .order-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.08); }
        .action-btn { display:flex; align-items:center; gap:5px; padding:6px 12px; border-radius:8px; border:1.5px solid #e2e8f0; background:white; cursor:pointer; font-size:12px; font-weight:600; color:#475569; transition:all .2s; font-family:'Sora',sans-serif; }
        .action-btn:hover { border-color:#3b82f6; color:#1d4ed8; background:#eff6ff; }
        .expand-btn { display:flex; align-items:center; gap:5px; background:none; border:none; cursor:pointer; font-size:12px; font-weight:600; color:#64748b; font-family:'Sora',sans-serif; padding:4px 8px; border-radius:8px; transition:all .2s; }
        .expand-btn:hover { background:#f8faff; color:#1d4ed8; }
        .item-row { display:flex; gap:10px; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9; }
        .item-row:last-child { border-bottom:none; }
      `}</style>

      <div className="profile-root min-h-screen py-12" style={{ background: 'linear-gradient(135deg,#f0f7ff 0%,#fafbff 50%,#f5f0ff 100%)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>

          {/* ── Hero Header ─────────────────────────────────────────────── */}
          <div className="fade-up" style={{ marginBottom: 28 }}>
            <div className="card" style={{ padding: '28px 32px', background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#2563eb 100%)', border: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.06)' }} />
              <div style={{ position:'absolute', bottom:-60, right:80, width:150, height:150, borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative' }}>
                <div style={{ display:'flex', alignItems:'center', gap:18 }}>
                  <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(255,255,255,.15)', border:'3px solid rgba(255,255,255,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:800, color:'white', flexShrink:0 }}>
                    {user.name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ color:'rgba(255,255,255,.7)', fontSize:12, fontWeight:500, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>Welcome back</div>
                    <div style={{ color:'white', fontSize:22, fontWeight:800, lineHeight:1.2 }}>{user.name}</div>
                    <div style={{ color:'rgba(255,255,255,.65)', fontSize:13, marginTop:3 }}>{user.email}</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:10 }}>
                  {rewards && (
                    <div className="points-badge" style={{ background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.25)', borderRadius:14, padding:'8px 16px', display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:20 }}>{tierIcon[tier]}</span>
                      <div>
                        <div style={{ color:'rgba(255,255,255,.7)', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em' }}>{tier} Member</div>
                        <div style={{ color:'white', fontSize:18, fontWeight:800, fontFamily:"'DM Mono',monospace" }}>{rewards.points.toLocaleString()} pts</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {rewards && nextTier && (
                <div style={{ marginTop:20, position:'relative' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ color:'rgba(255,255,255,.7)', fontSize:11 }}>{tier} → {Object.keys(TIERS).find(k => TIERS[k as keyof typeof TIERS].min === nextTier)}</span>
                    <span style={{ color:'rgba(255,255,255,.7)', fontSize:11, fontFamily:"'DM Mono',monospace" }}>{rewards.totalEarned}/{nextTier} pts</span>
                  </div>
                  <div style={{ height:6, background:'rgba(255,255,255,.15)', borderRadius:6, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,rgba(255,255,255,.6),white)', borderRadius:6, transition:'width 1s ease' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div className="fade-up" style={{ display:'flex', gap:6, marginBottom:20, background:'white', padding:6, borderRadius:14, border:'1.5px solid #e8edf5', width:'fit-content', animationDelay:'.05s' }}>
            {(['profile', 'orders', 'rewards', 'referral'] as const).map(tab => (
              <button key={tab} className={`tab-btn${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'profile'  && <><User        size={14} style={{ display:'inline', marginRight:6 }} />Profile</>}
                {tab === 'orders'   && <><ShoppingBag size={14} style={{ display:'inline', marginRight:6 }} />My Orders</>}
                {tab === 'rewards'  && <><Star        size={14} style={{ display:'inline', marginRight:6 }} />Rewards</>}
                {tab === 'referral' && <><Gift        size={14} style={{ display:'inline', marginRight:6 }} />Referral</>}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              TAB: PROFILE
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'profile' && (
            <div style={{ display:'grid', gap:18, animation:'fadeUp .4s ease' }}>
              <div className="card" style={{ padding:'28px 32px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <User size={18} color="#1d4ed8" />
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:16, color:'#0f172a' }}>Profile Information</div>
                    <div style={{ fontSize:12, color:'#94a3b8' }}>Update your personal details</div>
                  </div>
                </div>

                {message.text && (
                  <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: message.type === 'success' ? '#16a34a' : '#dc2626', borderRadius:10, padding:'11px 16px', fontSize:13, marginBottom:18 }}>
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                    <div>
                      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Full Name</label>
                      <input className="field-input" name="name" value={formData.name} onChange={handleChange} placeholder="Your full name" />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Email</label>
                      <input className="field-input" value={user.email} disabled />
                      <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Email cannot be changed</p>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Phone Number</label>
                      <input className="field-input" name="phone" value={formData.phone} onChange={handleChange} placeholder="+254 700 000 000" />
                      {phoneError && <p style={{ fontSize:11, color:'#ef4444', marginTop:4 }}>{phoneError}</p>}
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Account Type</label>
                      <input className="field-input" value={user.role === 'admin' ? 'Administrator' : 'Customer'} disabled />
                    </div>
                  </div>

                  <hr style={{ border:'none', borderTop:'1.5px solid #f1f5f9', margin:'0 0 20px' }} />

                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                    <MapPin size={15} color="#1d4ed8" />
                    <span style={{ fontWeight:700, fontSize:14, color:'#0f172a' }}>Shipping Address</span>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Street Address</label>
                      <input className="field-input" name="street" value={formData.street} onChange={handleChange} placeholder="123 Main St" />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>
                        Apartment / Building / Floor <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional)</span>
                      </label>
                      <input className="field-input" name="apartment" value={formData.apartment} onChange={handleChange} placeholder="Westlands Square, Apt 12" />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>City</label>
                      <input className="field-input" name="city" value={formData.city} onChange={handleChange} placeholder="Nairobi" />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>County/State</label>
                      <input className="field-input" name="state" value={formData.state} onChange={handleChange} placeholder="Nairobi County" />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Postal Code</label>
                      <input className="field-input" name="zipCode" value={formData.zipCode} onChange={handleChange} placeholder="00100" />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Country</label>
                      <input className="field-input" name="country" value={formData.country} onChange={handleChange} placeholder="Kenya" />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>
                        Nearest Landmark <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional)</span>
                      </label>
                      <input className="field-input" name="landmark" value={formData.landmark} onChange={handleChange} placeholder="Near KCB Bank, opposite Nakumatt" />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                      <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>
                        Delivery Instructions <span style={{ color:'#94a3b8', fontWeight:400 }}>(optional)</span>
                      </label>
                      <textarea
                        className="field-input"
                        name="deliveryInstructions"
                        rows={2}
                        value={formData.deliveryInstructions}
                        onChange={handleChange}
                        placeholder="Call on arrival, leave with security, etc."
                        style={{ resize:'vertical', minHeight: 60 }}
                      />
                    </div>
                  </div>

                  <button type="submit" className="save-btn" disabled={isLoading}>
                    {isLoading ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : '✓ Save Changes'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: MY ORDERS
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'orders' && (
            <div style={{ display:'grid', gap:14, animation:'fadeUp .4s ease' }}>

              {/* Header summary */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <div>
                  <p style={{ fontSize:14, color:'#64748b' }}>
                    {ordersLoading ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''} total`}
                  </p>
                </div>
                <button onClick={fetchOrders} style={{ display:'flex', alignItems:'center', gap:6, background:'white', border:'1.5px solid #e2e8f0', borderRadius:9, padding:'7px 14px', fontSize:12, fontWeight:600, color:'#475569', cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
                  ↻ Refresh
                </button>
              </div>

              {/* Loading */}
              {ordersLoading && (
                <div className="card" style={{ padding:'48px 32px', textAlign:'center' }}>
                  <div style={{ width:40, height:40, border:'3px solid #e2e8f0', borderTopColor:'#1d4ed8', borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 14px' }} />
                  <p style={{ color:'#94a3b8', fontSize:13 }}>Loading your orders…</p>
                </div>
              )}

              {/* Error */}
              {ordersError && (
                <div style={{ background:'#fef2f2', border:'1.5px solid #fecaca', color:'#dc2626', borderRadius:12, padding:'12px 18px', fontSize:13 }}>
                  {ordersError}
                </div>
              )}

              {/* Empty */}
              {!ordersLoading && !ordersError && orders.length === 0 && (
                <div className="card" style={{ padding:'56px 32px', textAlign:'center' }}>
                  <div style={{ width:72, height:72, borderRadius:20, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                    <Package size={32} color="#94a3b8" />
                  </div>
                  <p style={{ fontSize:17, fontWeight:700, color:'#0f172a', marginBottom:8 }}>No orders yet</p>
                  <p style={{ color:'#64748b', fontSize:13, marginBottom:22 }}>Start shopping to see your orders here!</p>
                  <button onClick={() => navigate('/shop')}
                    style={{ background:'linear-gradient(135deg,#1d4ed8,#3b82f6)', color:'white', border:'none', borderRadius:10, padding:'10px 26px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
                    Browse Products
                  </button>
                </div>
              )}

              {/* Orders list */}
              {!ordersLoading && orders.map((order, idx) => {
                const { date, time } = formatDateTime(order.createdAt);
                const st   = getOrderStatus(order.status);
                const ref  = order.orderNumber || order._id.slice(-8).toUpperCase();
                const open = expandedOrders[order._id];
                const points = typeof order.pointsEarned === 'number'
                  ? order.pointsEarned
                  : Math.floor((order.totalPrice || 0) / 100);
                const pointsEarned = !!order.pointsAwarded;

                return (
                  <div key={order._id} className="order-card" style={{ animationDelay:`${idx * .05}s` }}>

                    {/* Card header */}
                    <div style={{ padding:'16px 20px', borderBottom: open ? '1px solid #f1f5f9' : 'none', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                        {/* Status icon */}
                        <div style={{ width:40, height:40, borderRadius:11, background:st.bg, border:`1.5px solid ${st.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {order.status === 'delivered'  && <CheckCircle size={18} color={st.color} />}
                          {order.status === 'shipped'    && <Truck        size={18} color={st.color} />}
                          {(order.status === 'cancelled' || order.status === 'failed') && <XCircle      size={18} color={st.color} />}
                          {order.status === 'refunded'   && <XCircle      size={18} color={st.color} />}
                          {(order.status === 'pending' || order.status === 'processing') && <Clock size={18} color={st.color} />}
                        </div>
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                            <span style={{ fontWeight:800, fontSize:14, color:'#0f172a' }}>#{ref}</span>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>
                              <span style={{ width:5, height:5, borderRadius:'50%', background:st.dot, flexShrink:0 }} />
                              {st.label}
                            </span>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:3, color:'#94a3b8', fontSize:11.5 }}>
                            <Clock size={11} />
                            <span>{date} at {time}</span>
                            <span style={{ color:'#e2e8f0' }}>·</span>
                            <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                              {pmIcon(order.paymentMethod)} {pmLabel(order.paymentMethod)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:16, fontWeight:800, color:'#1d4ed8', fontFamily:"'DM Mono',monospace" }}>
                            {formatKES(order.totalPrice)}
                          </div>
                          <div style={{ fontSize:11, color:'#94a3b8' }}>
                            {order.orderItems.reduce((s, i) => s + i.quantity, 0)} item{order.orderItems.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}
                          </div>
                          <div style={{ marginTop:6, display:'inline-flex', alignItems:'center', gap:6, padding:'3px 8px', borderRadius:999, background: pointsEarned ? '#f0fdf4' : '#fff7ed', border: `1px solid ${pointsEarned ? '#bbf7d0' : '#fed7aa'}`, fontSize:10.5, fontWeight:700, color: pointsEarned ? '#16a34a' : '#c2410c' }}>
                            <span style={{ fontFamily:"'DM Mono',monospace" }}>{points.toLocaleString()} pts</span>
                            <span>{pointsEarned ? 'earned' : 'pending'}</span>
                          </div>
                        </div>
                        <button className="action-btn" onClick={() => handlePrint(order)}>
                          <Printer size={12} /> Print
                        </button>
                        <button className="action-btn" onClick={() => handleDownload(order)}>
                          <Download size={12} /> Receipt
                        </button>
                        <button className="expand-btn" onClick={() => toggleOrder(order._id)}>
                          {open ? <><ChevronUp size={14} /> Hide</> : <><ChevronDown size={14} /> Details</>}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {open && (
                      <div style={{ padding:'16px 20px' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

                          {/* Items */}
                          <div style={{ gridColumn:'1/-1' }}>
                            <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Items Ordered</p>
                            {order.orderItems.map((item, i) => (
                              <div key={item._id ?? i} className="item-row">
                                {/* ✅ ProductImage with URL resolution */}
                                <div style={{ width:48, height:48, borderRadius:9, border:'1px solid #e8edf5', background:'#f8faff', flexShrink:0, overflow:'hidden' }}>
                                  <ProductImage src={item.image} alt={item.name} />
                                </div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <p style={{ fontWeight:600, fontSize:13, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</p>
                                  <p style={{ fontSize:11.5, color:'#94a3b8', marginTop:2 }}>{item.quantity} × {formatKES(item.price)}</p>
                                </div>
                                <p style={{ fontWeight:700, fontSize:13, color:'#0f172a', fontFamily:"'DM Mono',monospace", flexShrink:0 }}>
                                  {formatKES(item.price * item.quantity)}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Order summary */}
                          <div style={{ background:'#f8faff', borderRadius:12, border:'1.5px solid #e8edf5', padding:'16px 18px' }}>
                            <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>Order Summary</p>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, color:'#64748b', marginBottom:5 }}>
                              <span>Subtotal</span><span style={{ fontFamily:"'DM Mono',monospace" }}>{formatKES(order.itemsPrice ?? order.totalPrice)}</span>
                            </div>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:8 }}>
                              <span style={{ color:'#64748b' }}>Shipping</span>
                              <span style={{ fontFamily:"'DM Mono',monospace", color: order.shippingPrice === 0 ? '#16a34a' : '#0f172a', fontWeight: order.shippingPrice === 0 ? 700 : 400 }}>
                                {order.shippingPrice === 0 ? 'Free' : formatKES(order.shippingPrice)}
                              </span>
                            </div>
                            <div style={{ borderTop:'1.5px solid #e2e8f0', paddingTop:8, display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:14 }}>
                              <span style={{ color:'#0f172a' }}>Total</span>
                              <span style={{ color:'#1d4ed8', fontFamily:"'DM Mono',monospace" }}>{formatKES(order.totalPrice)}</span>
                            </div>
                            <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:5, fontSize:11.5 }}>
                              {pmIcon(order.paymentMethod)}
                              <span style={{ color:'#64748b' }}>{pmLabel(order.paymentMethod)}</span>
                              <span style={{ marginLeft:'auto', fontWeight:700, color: order.isPaid ? '#16a34a' : '#d97706', fontSize:11 }}>
                                {order.isPaid ? '✓ Paid' : '⏳ Pending'}
                              </span>
                            </div>
                          </div>

                          {/* Delivery address */}
                          {order.shippingAddress && (
                            <div style={{ background:'#f8faff', borderRadius:12, border:'1.5px solid #e8edf5', padding:'16px 18px' }}>
                              <p style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>Delivery Address</p>
                              <div style={{ display:'flex', gap:7 }}>
                                <MapPin size={13} color="#94a3b8" style={{ flexShrink:0, marginTop:2 }} />
                                <div style={{ fontSize:12.5, color:'#475569', lineHeight:1.75 }}>
                                  {order.shippingAddress.fullName && <strong style={{ color:'#0f172a', display:'block' }}>{order.shippingAddress.fullName}</strong>}
                                  {order.shippingAddress.street}<br/>
                                  {order.shippingAddress.city}, {order.shippingAddress.state}<br/>
                                  {order.shippingAddress.zipCode} · {order.shippingAddress.country}
                                  {order.shippingAddress.phone && <><br/><span style={{ color:'#64748b' }}>📞 {order.shippingAddress.phone}</span></>}
                                </div>
                              </div>
                              {order.trackingNumber && (
                                <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:5, fontSize:11.5 }}>
                                  <Truck size={12} color="#94a3b8" />
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
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: REWARDS
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'rewards' && (
            <div style={{ display:'grid', gap:18, animation:'fadeUp .4s ease' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
                {[
                  { label:'Available Points', value: rewards?.points ?? 0,        icon:'⭐', color:'#1d4ed8', bg:'#eff6ff' },
                  { label:'Total Earned',     value: rewards?.totalEarned ?? 0,   icon:'📈', color:'#16a34a', bg:'#f0fdf4' },
                  { label:'Total Redeemed',   value: rewards?.totalRedeemed ?? 0, icon:'🎁', color:'#d97706', bg:'#fffbeb' },
                ].map(s => (
                  <div key={s.label} className="card" style={{ padding:'22px 24px' }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:12 }}>{s.icon}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontSize:26, fontWeight:800, color:s.color, fontFamily:"'DM Mono',monospace" }}>{(s.value).toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding:'24px 28px' }}>
                <div style={{ fontWeight:700, fontSize:15, color:'#0f172a', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                  <TrendingUp size={16} color="#1d4ed8" /> How to Earn Points
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[
                    { icon:'🛍️', title:'Every Purchase',   desc:`Earn ${POINTS_PER_KES} pt per KES 100 spent`,        pts:'+1 pt/KES 100' },
                    { icon:'👥', title:'Refer a Friend',   desc:`${REFERRAL_BONUS} points when they sign up & order`, pts:`+${REFERRAL_BONUS} pts` },
                    { icon:'🎂', title:'Birthday Bonus',   desc:'Extra 500 points on your birthday',                  pts:'+500 pts' },
                    { icon:'⭐', title:'Tier Upgrade',     desc:'Bonus points on reaching a new tier',                pts:'+250 pts' },
                  ].map(r => (
                    <div key={r.title} style={{ background:'#f8faff', borderRadius:12, padding:'14px 16px', display:'flex', gap:12, alignItems:'flex-start', border:'1.5px solid #e8edf5' }}>
                      <span style={{ fontSize:22 }}>{r.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:'#0f172a' }}>{r.title}</div>
                        <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{r.desc}</div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', background:'#eff6ff', borderRadius:8, padding:'3px 8px', whiteSpace:'nowrap', fontFamily:"'DM Mono',monospace" }}>{r.pts}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding:'24px 28px' }}>
                <div style={{ fontWeight:700, fontSize:15, color:'#0f172a', marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
                  <Gift size={16} color="#1d4ed8" /> Redeem Points
                </div>
                <div style={{ fontSize:12, color:'#94a3b8', marginBottom:18 }}>
                  100 points = KES 100 discount · Minimum {MIN_REDEEM} points to redeem
                </div>
                {redeemMsg.text && (
                  <div style={{ background: redeemMsg.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${redeemMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: redeemMsg.type === 'success' ? '#16a34a' : '#dc2626', borderRadius:10, padding:'11px 16px', fontSize:13, marginBottom:16 }}>
                    {redeemMsg.text}
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <input type="number" className="redeem-input" placeholder="Points" value={redeemInput} min={MIN_REDEEM} max={rewards?.points} onChange={e => setRedeemInput(e.target.value)} />
                  {redeemInput && parseInt(redeemInput) >= MIN_REDEEM && (
                    <div style={{ fontSize:13, color:'#16a34a', fontWeight:600 }}>= KES {parseInt(redeemInput) * KES_PER_POINT} discount</div>
                  )}
                  <button onClick={handleRedeem} disabled={redeemLoading || !redeemInput} className="save-btn" style={{ padding:'11px 22px' }}>
                    {redeemLoading ? <><Loader2 size={14} className="animate-spin" />Processing…</> : '🎁 Redeem'}
                  </button>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
                  {[100, 250, 500, 1000].map(pts => (
                    <button key={pts} onClick={() => setRedeemInput(String(pts))} disabled={!rewards || rewards.points < pts}
                      style={{ background: redeemInput === String(pts) ? '#eff6ff' : '#f8faff', border: redeemInput === String(pts) ? '1.5px solid #3b82f6' : '1.5px solid #e2e8f0', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:600, color: (!rewards || rewards.points < pts) ? '#cbd5e1' : '#1d4ed8', cursor: (!rewards || rewards.points < pts) ? 'not-allowed' : 'pointer', fontFamily:"'DM Mono',monospace" }}>
                      {pts} pts
                    </button>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding:'24px 28px' }}>
                <div style={{ fontWeight:700, fontSize:15, color:'#0f172a', marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>
                  <Clock size={16} color="#1d4ed8" /> Points History
                </div>
                {rewardsLoading ? (
                  <div style={{ padding:'32px 0', textAlign:'center', color:'#94a3b8' }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin:'0 auto' }} />
                  </div>
                ) : !rewards?.transactions?.length ? (
                  <div style={{ padding:'32px 0', textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
                    <p style={{ color:'#94a3b8', fontSize:14 }}>No transactions yet. Start shopping to earn points!</p>
                  </div>
                ) : (
                  <div style={{ display:'grid', gap:2 }}>
                    {rewards.transactions.map(tx => {
                      const { icon, color } = txIcon(tx.type);
                      return (
                        <div key={tx._id} className="tx-row" style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 10px', borderRadius:10, transition:'background .15s' }}>
                          <div style={{ width:36, height:36, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', color, flexShrink:0 }}>{icon}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>{tx.description}</div>
                            <div style={{ fontSize:11, color:'#94a3b8', fontFamily:"'DM Mono',monospace", marginTop:2 }}>{timeAgo(tx.createdAt)}</div>
                          </div>
                          <div style={{ fontSize:14, fontWeight:800, color: tx.type === 'redeemed' ? '#ef4444' : '#16a34a', fontFamily:"'DM Mono',monospace" }}>
                            {tx.type === 'redeemed' ? '-' : '+'}{tx.points} pts
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: REFERRAL
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'referral' && (
            <div style={{ display:'grid', gap:18, animation:'fadeUp .4s ease' }}>
              <div className="card" style={{ padding:'32px', background:'linear-gradient(135deg,#0f172a,#1e3a8a)', border:'none', textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🎁</div>
                <div style={{ color:'white', fontSize:22, fontWeight:800, marginBottom:8 }}>Refer & Earn</div>
                <div style={{ color:'rgba(255,255,255,.65)', fontSize:14, maxWidth:400, margin:'0 auto 24px' }}>
                  Share your unique link. When a friend signs up and places their first order, you both earn <strong style={{ color:'#fbbf24' }}>{REFERRAL_BONUS} bonus points</strong>!
                </div>
                <div style={{ background:'rgba(255,255,255,.08)', border:'1.5px solid rgba(255,255,255,.15)', borderRadius:14, padding:'14px 18px', display:'flex', alignItems:'center', gap:12, maxWidth:520, margin:'0 auto', flexWrap:'wrap', justifyContent:'center' }}>
                  <code style={{ flex:1, color:'#93c5fd', fontSize:13, fontFamily:"'DM Mono',monospace", wordBreak:'break-all', textAlign:'left' }}>
                    {`${window.location.origin}/register?ref=${rewards?.referralCode ?? '...'}`}
                  </code>
                  <button className="copy-btn" onClick={handleCopy} style={{ background:'rgba(255,255,255,.15)', border:'1.5px solid rgba(255,255,255,.2)', color:'white' }}>
                    {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>
                <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:10, justifyContent:'center' }}>
                  <span style={{ color:'rgba(255,255,255,.5)', fontSize:12 }}>Your code:</span>
                  <span style={{ background:'rgba(255,255,255,.1)', border:'1.5px solid rgba(255,255,255,.2)', borderRadius:8, padding:'4px 12px', color:'white', fontWeight:700, fontSize:15, fontFamily:"'DM Mono',monospace", letterSpacing:'.1em' }}>
                    {rewards?.referralCode ?? '—'}
                  </span>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="card" style={{ padding:'24px', textAlign:'center' }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>👥</div>
                  <div style={{ fontSize:32, fontWeight:800, color:'#1d4ed8', fontFamily:"'DM Mono',monospace" }}>{rewards?.referralCount ?? 0}</div>
                  <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>Friends Referred</div>
                </div>
                <div className="card" style={{ padding:'24px', textAlign:'center' }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>⭐</div>
                  <div style={{ fontSize:32, fontWeight:800, color:'#16a34a', fontFamily:"'DM Mono',monospace" }}>
                    {((rewards?.referralCount ?? 0) * REFERRAL_BONUS).toLocaleString()}
                  </div>
                  <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>Points from Referrals</div>
                </div>
              </div>

              <div className="card" style={{ padding:'24px 28px' }}>
                <div style={{ fontWeight:700, fontSize:15, color:'#0f172a', marginBottom:18 }}>How It Works</div>
                <div style={{ display:'grid', gap:0 }}>
                  {[
                    { step:'1', title:'Share your link',       desc:'Copy your unique referral link and share it with friends via WhatsApp, email or social media.', icon:'🔗' },
                    { step:'2', title:'Friend signs up',        desc:'Your friend clicks the link and creates a MzuriTech account.', icon:'👤' },
                    { step:'3', title:'Friend places an order', desc:'When your friend completes their first purchase, the referral is confirmed.', icon:'🛍️' },
                    { step:'4', title:'Both of you earn!',      desc:`You earn ${REFERRAL_BONUS} points. Your friend gets a 100-point welcome bonus.`, icon:'🎉' },
                  ].map((s, i) => (
                    <div key={s.step} style={{ display:'flex', gap:16, paddingBottom: i < 3 ? 20 : 0, position:'relative' }}>
                      {i < 3 && <div style={{ position:'absolute', left:19, top:44, bottom:0, width:2, background:'#e8edf5' }} />}
                      <div style={{ width:40, height:40, borderRadius:'50%', background:'#eff6ff', border:'2px solid #bfdbfe', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:18, zIndex:1 }}>{s.icon}</div>
                      <div style={{ paddingTop:6 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:'#0f172a', marginBottom:3 }}>{s.title}</div>
                        <div style={{ fontSize:13, color:'#64748b', lineHeight:1.5 }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding:'24px 28px' }}>
                <div style={{ fontWeight:700, fontSize:15, color:'#0f172a', marginBottom:16 }}>Share Via</div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {[
                    { label:'WhatsApp', emoji:'💬', href: `https://wa.me/?text=Hey! Check out MzuriTech - great electronics deals. Use my referral link: ${window.location.origin}/register?ref=${rewards?.referralCode}` },
                    { label:'Email',    emoji:'📧', href: `mailto:?subject=Check out MzuriTech Electronics&body=Hey! I've been shopping at MzuriTech and thought you'd love it. Use my referral link to get a welcome bonus: ${window.location.origin}/register?ref=${rewards?.referralCode}` },
                    { label:'Twitter',  emoji:'🐦', href: `https://twitter.com/intent/tweet?text=Check out MzuriTech Electronics! Use my referral link for a welcome bonus: ${window.location.origin}/register?ref=${rewards?.referralCode}` },
                  ].map(s => (
                    <a key={s.label} href={s.href} target="_blank" rel="noreferrer"
                      style={{ display:'flex', alignItems:'center', gap:8, background:'#f8faff', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'10px 18px', fontSize:13, fontWeight:600, color:'#0f172a', textDecoration:'none' }}>
                      <span>{s.emoji}</span> {s.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
