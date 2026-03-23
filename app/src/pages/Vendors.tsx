import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Order } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';;

// ─── Types ────────────────────────────────────────────────────────────────────
interface VendorStats {
  totalProducts: number;
  totalOrders: number;
  totalSales: number;
  pendingOrders: number;
}
interface VendorProduct {
  id: string;
  _id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  brand: string;
  inStock: boolean;
  stockQuantity: number;
  rating?: number;
  reviews?: number;
  specs?: Record<string, string>;
}
interface VendorOrder {
  _id: string;
  id?: string;
  orderNumber?: string;
  user?: { name: string; email: string } | null;
  totalPrice: number;
  status: string;
  isPaid?: boolean;
  paymentMethod?: string;
  orderItems?: { name?: string; quantity: number; price?: number }[];
  createdAt?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'laptops',     label: 'Laptops'     },
  { value: 'phones',      label: 'Phones'      },
  { value: 'audio',       label: 'Audio'       },
  { value: 'gaming',      label: 'Gaming'      },
  { value: 'tablets',     label: 'Tablets'     },
  { value: 'accessories', label: 'Accessories' },
  { value: 'cameras',     label: 'Cameras'     },
  { value: 'wearables',   label: 'Wearables'   },
];
const STATUS_FILTERS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed'];

// ─── Spec Templates ───────────────────────────────────────────────────────────
const SPEC_TEMPLATES: Record<string, { key: string; value: string }[]> = {
  laptops: [
    { key: 'Processor', value: '' }, { key: 'RAM', value: '' }, { key: 'Storage', value: '' },
    { key: 'Display', value: '' }, { key: 'Graphics', value: '' }, { key: 'Battery', value: '' },
    { key: 'OS', value: '' }, { key: 'Weight', value: '' },
  ],
  phones: [
    { key: 'Processor', value: '' }, { key: 'RAM', value: '' }, { key: 'Storage', value: '' },
    { key: 'Display', value: '' }, { key: 'Camera', value: '' }, { key: 'Battery', value: '' },
    { key: 'OS', value: '' }, { key: 'Network', value: '' },
  ],
  audio: [
    { key: 'Driver Size', value: '' }, { key: 'Frequency Response', value: '' },
    { key: 'Impedance', value: '' }, { key: 'Connectivity', value: '' },
    { key: 'Battery Life', value: '' }, { key: 'Weight', value: '' },
  ],
  gaming: [
    { key: 'Platform', value: '' }, { key: 'Genre', value: '' }, { key: 'Processor', value: '' },
    { key: 'Graphics', value: '' }, { key: 'RAM', value: '' }, { key: 'Storage', value: '' },
  ],
  tablets: [
    { key: 'Processor', value: '' }, { key: 'RAM', value: '' }, { key: 'Storage', value: '' },
    { key: 'Display', value: '' }, { key: 'Battery', value: '' }, { key: 'OS', value: '' },
    { key: 'Connectivity', value: '' }, { key: 'Weight', value: '' },
  ],
  cameras: [
    { key: 'Sensor', value: '' }, { key: 'Resolution', value: '' }, { key: 'Lens', value: '' },
    { key: 'ISO Range', value: '' }, { key: 'Video', value: '' }, { key: 'Battery', value: '' },
    { key: 'Weight', value: '' },
  ],
  wearables: [
    { key: 'Display', value: '' }, { key: 'Battery Life', value: '' }, { key: 'Connectivity', value: '' },
    { key: 'Water Resistance', value: '' }, { key: 'Sensors', value: '' }, { key: 'Weight', value: '' },
  ],
  accessories: [
    { key: 'Material', value: '' }, { key: 'Compatibility', value: '' },
    { key: 'Dimensions', value: '' }, { key: 'Weight', value: '' }, { key: 'Color', value: '' },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `KES ${Number(n).toLocaleString()}`;
const ago = (d?: string) => {
  if (!d) return '—';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
const imgUrl = (img?: string) => {
  if (!img) return '';
  if (img.startsWith('http') || img.startsWith('data:')) return img;
  if (img.startsWith('/uploads')) return `${API_URL}${img}`;
  return img;
};
const initials = (name: string) =>
  name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

// ─── UI Components ────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 0' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid #e2e8f0', borderTop: '3px solid #2563eb', animation: 'spin .7s linear infinite' }} />
    </div>
  );
}

function Empty({ icon, title, sub, cta }: { icon: string; title: string; sub?: string; cta?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px', color: '#94a3b8' }}>
      <div style={{ fontSize: 48, marginBottom: 14 }}>{icon}</div>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{title}</p>
      {sub && <p style={{ fontSize: 13, marginBottom: cta ? 18 : 0 }}>{sub}</p>}
      {cta}
    </div>
  );
}

function SBadge({ status }: { status: string }) {
  const map: Record<string, [string, string, string]> = {
    pending:          ['#fef9c3', '#92400e', 'Pending'],
    processing:       ['#dbeafe', '#1e40af', 'Processing'],
    shipped:          ['#ede9fe', '#5b21b6', 'Shipped'],
    delivered:        ['#dcfce7', '#14532d', 'Delivered'],
    cancelled:        ['#fee2e2', '#7f1d1d', 'Cancelled'],
    failed:           ['#fee2e2', '#7f1d1d', 'Failed'],
    instock:          ['#dcfce7', '#14532d', 'In Stock'],
    outofstock:       ['#fee2e2', '#7f1d1d', 'Out of Stock'],
    lowstock:         ['#fef9c3', '#92400e', 'Low Stock'],
    approved:         ['#dcfce7', '#14532d', 'Approved'],
    pending_approval: ['#fef9c3', '#92400e', 'Pending Approval'],
  };
  const [bg, color, label] = map[status.toLowerCase().replace(/\s/g, '')] ?? map.pending;
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, fontFamily: "'DM Mono',monospace", letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function Modal({ title, onClose, children, width = 580 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, width: '100%', maxWidth: width, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 30px 70px rgba(0,0,0,0.18)', animation: 'modalIn .22s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ color: '#0f172a', fontSize: 17, fontWeight: 700, fontFamily: "'Sora',sans-serif" }}>{title}</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#64748b', cursor: 'pointer', padding: '6px 10px', fontSize: 14, fontFamily: "'Sora',sans-serif" }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder, options, required, rows, hint }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; options?: { value: string; label: string }[];
  required?: boolean; rows?: number; hint?: string;
}) {
  const s: React.CSSProperties = { width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', color: '#0f172a', fontSize: 13, fontFamily: "'Sora',sans-serif", outline: 'none', boxSizing: 'border-box' };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontFamily: "'Sora',sans-serif", fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
      </label>
      {options
        ? <select value={value} onChange={e => onChange(e.target.value)} style={s}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        : rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...s, resize: 'vertical' }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s} />}
      {hint && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Vendors() {
  const { user, token, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]           = useState('dashboard');
  const [sidebar, setSidebar]   = useState(true);
  const [loading, setLoading]   = useState(true);
  const [stats, setStats]       = useState<VendorStats | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [orders, setOrders]     = useState<VendorOrder[]>([]);
  const [toast, setToast]       = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Product form
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<VendorProduct | null>(null);
  const [delModal, setDelModal]     = useState<VendorProduct | null>(null);
  const [saving, setSaving]         = useState(false);
  const [formErr, setFormErr]       = useState('');
  const [imgPreview, setImgPreview] = useState('');
  const [imgLoading, setImgLoading] = useState(false);
  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Specs state
  const [specs, setSpecs]                   = useState<{ key: string; value: string }[]>([]);
  const [specsGenerating, setSpecsGenerating] = useState(false);
  const [specsError, setSpecsError]           = useState('');

  const EMPTY_FORM = { name: '', description: '', price: '', originalPrice: '', image: '', category: 'laptops', brand: '', stockQuantity: '0' };
  const [form, setForm] = useState(EMPTY_FORM);

  // Settings
  const [biz, setBiz]           = useState({ businessName: '', businessDescription: '', businessPhone: '' });
  const [bizSaving, setBizSaving] = useState(false);

  // Orders
  const [orderFilter, setOrderFilter]     = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Search
  const [search, setSearch] = useState('');

  const H = useCallback((): Record<string, string> => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token]);

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!token) { navigate('/login'); return; }
    if (user && user.role !== 'vendor') { navigate('/'); return; }
    setBiz({ businessName: (user as any)?.businessName || '', businessDescription: (user as any)?.businessDescription || '', businessPhone: (user as any)?.businessPhone || '' });
    load();
  }, [user, authLoading, token]);

  const load = async () => {
    if (!token) return;
    try {
      const [dRes, pRes, oRes] = await Promise.all([
        fetch(`${API_URL}/api/vendor/dashboard`, { headers: H() }),
        fetch(`${API_URL}/api/vendor/products`,  { headers: H() }),
        fetch(`${API_URL}/api/vendor/orders`,    { headers: H() }),
      ]);
      if (dRes.ok) { const d = await dRes.json(); setStats(d.stats); }
      if (pRes.ok) { const d = await pRes.json(); setProducts((d.products || []).map((p: any) => ({ ...p, id: p._id || p.id }))); }
      if (oRes.ok) { const d = await oRes.json(); setOrders(d.orders || []); }
    } catch { notify('Failed to load data', 'err'); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setImgPreview('');
    setFormErr('');
    setEditing(null);
    setSpecs([]);
    setSpecsError('');
  };

  const loadSpecTemplate = (category: string) => {
    const template = SPEC_TEMPLATES[category] || [];
    setSpecs(template.map(s => ({ ...s })));
    setSpecsError('');
  };

  const handleGenerateSpecs = async () => {
    if (!form.name && !form.description) {
      setSpecsError('Please enter a product name or description first.');
      return;
    }
    setSpecsGenerating(true);
    setSpecsError('');
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Generate realistic product specifications for a ${form.category} product.
Product name: ${form.name || 'Unknown'}
Brand: ${form.brand || 'Unknown'}
Description: ${form.description || 'No description'}

Return ONLY a JSON array of objects with "key" and "value" fields. No markdown, no explanation. Example:
[{"key":"Processor","value":"Intel Core i7-13700H"},{"key":"RAM","value":"16GB DDR5"}]`
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.map((c: any) => c.text || '').join('') || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) {
        setSpecs(parsed.map((s: any) => ({ key: String(s.key || ''), value: String(s.value || '') })));
      } else {
        setSpecsError('Unexpected response format. Try again.');
      }
    } catch (err: any) {
      setSpecsError('Failed to generate specs. Check your connection and try again.');
    } finally {
      setSpecsGenerating(false);
    }
  };

  const openEdit = (p: VendorProduct) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description, price: String(p.price), originalPrice: String(p.originalPrice ?? ''), image: p.image, category: p.category, brand: p.brand, stockQuantity: String(p.stockQuantity) });
    setImgPreview(p.image ? imgUrl(p.image) : '');
    setFormErr('');
    setSpecsError('');
    // Load existing specs if present
    if (p.specs && Object.keys(p.specs).length > 0) {
      setSpecs(Object.entries(p.specs).map(([key, value]) => ({ key, value })));
    } else {
      setSpecs([]);
    }
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.brand || !form.description) { setFormErr('Fill in all required fields.'); return; }
    setSaving(true); setFormErr('');
    try {
      const url    = editing ? `${API_URL}/api/vendor/products/${editing.id}` : `${API_URL}/api/vendor/products`;
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: H(),
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
          stockQuantity: parseInt(form.stockQuantity) || 0,
          specs: specs.length > 0
            ? Object.fromEntries(specs.filter(s => s.key.trim()).map(s => [s.key.trim(), s.value.trim()]))
            : undefined,
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Save failed');
      notify(editing ? 'Product updated!' : 'Product added!');
      setShowForm(false); resetForm(); load();
    } catch (e: any) { setFormErr(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delModal) return;
    try {
      const res = await fetch(`${API_URL}/api/vendor/products/${delModal.id}`, { method: 'DELETE', headers: H() });
      if (!res.ok) throw new Error();
      notify('Product deleted.'); setDelModal(null); load();
    } catch { notify('Delete failed', 'err'); }
  };

  const handleImgUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setFormErr('Image must be under 5MB'); return; }
    setImgLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => setImgPreview(reader.result as string);
    reader.readAsDataURL(file);
    try {
      const fd = new FormData(); fd.append('image', file);
      const res = await fetch(`${API_URL}/api/products/upload-image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const d = await res.json();
      if (d.success) { setForm(f => ({ ...f, image: d.imageUrl })); if (d.fullUrl) setImgPreview(d.fullUrl); }
      else { setFormErr(d.message || 'Upload failed'); setImgPreview(''); }
    } catch { setFormErr('Upload failed.'); setImgPreview(''); }
    finally { setImgLoading(false); }
  };

  const handleBizSave = async (e: React.FormEvent) => {
    e.preventDefault(); setBizSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/vendor/profile`, { method: 'PUT', headers: H(), body: JSON.stringify(biz) });
      if (!res.ok) throw new Error();
      notify('Profile saved!');
    } catch { notify('Save failed', 'err'); }
    finally { setBizSaving(false); }
  };

  // Derived
  const invValue   = products.reduce((s, p) => s + p.price * (p.stockQuantity || 0), 0);
  const lowStock   = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 5);
  const outOfStock = products.filter(p => !p.inStock || p.stockQuantity === 0);
  const filtered   = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()));
  const filtOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);

  const navItems = [
    { id: 'dashboard', label: 'Overview',  icon: '⊞' },
    { id: 'products',  label: 'Products',  icon: '📦', badge: products.length || null },
    { id: 'orders',    label: 'Orders',    icon: '🛒', badge: orders.filter(o => o.status === 'pending').length || null },
    { id: 'inventory', label: 'Inventory', icon: '🗃️', badge: (lowStock.length + outOfStock.length) || null },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'settings',  label: 'Settings',  icon: '⚙️' },
  ];

  if (authLoading || loading) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora',sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid #e2e8f0', borderTop: '3px solid #2563eb', animation: 'spin .7s linear infinite', margin: '0 auto 14px' }} />
        <p style={{ color: '#64748b', fontSize: 14 }}>Loading vendor portal…</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f8fafc;font-family:'Sora',sans-serif}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
        input,select,textarea{font-family:'Sora',sans-serif}
        input:focus,select:focus,textarea:focus{border-color:#2563eb!important;outline:none;box-shadow:0 0 0 3px rgba(37,99,235,0.1)!important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        @keyframes toastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04)}
        .card-h{transition:all .22s ease}
        .card-h:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,0.09)!important}
        .nav-btn{transition:all .18s ease;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:11px;cursor:pointer;font-size:13.5px;font-weight:500;color:#64748b;border:none;background:transparent;width:100%;text-align:left;font-family:'Sora',sans-serif;white-space:nowrap}
        .nav-btn:hover{background:#f1f5f9;color:#1e293b}
        .nav-btn.on{background:linear-gradient(135deg,rgba(37,99,235,.13),rgba(37,99,235,.06));color:#2563eb;border:1px solid rgba(37,99,235,.22)}
        .btn{border:none;cursor:pointer;border-radius:9px;padding:8px 16px;font-size:13px;font-weight:600;font-family:'Sora',sans-serif;transition:all .18s ease;display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
        .btn:hover:not(:disabled){transform:translateY(-1px)}
        .btn:disabled{opacity:.5;cursor:not-allowed}
        .btn.p{background:linear-gradient(135deg,#2563eb,#4f46e5);color:white;box-shadow:0 4px 14px rgba(37,99,235,.28)}
        .btn.p:hover:not(:disabled){box-shadow:0 6px 22px rgba(37,99,235,.38)}
        .btn.d{background:#fee2e2;color:#dc2626;border:1px solid #fecaca}
        .btn.d:hover:not(:disabled){background:#fecaca}
        .btn.g{background:#f8fafc;color:#64748b;border:1px solid #e2e8f0}
        .btn.g:hover:not(:disabled){background:#f1f5f9;color:#1e293b}
        .btn.sm{padding:6px 12px;font-size:12px}
        .ibtn{border:none;cursor:pointer;border-radius:8px;padding:7px;background:#f8fafc;color:#64748b;transition:all .15s ease;display:flex;align-items:center;justify-content:center;font-size:14px;border:1px solid #e2e8f0}
        .ibtn:hover{background:#f1f5f9;color:#1e293b}
        .ibtn.rd:hover{background:#fee2e2;color:#dc2626;border-color:#fecaca}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;padding:12px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;border-bottom:1px solid #f1f5f9;background:#fafafa;white-space:nowrap}
        td{padding:13px 16px;border-bottom:1px solid #f8fafc;font-size:13.5px;color:#374151;vertical-align:middle}
        tr:hover td{background:#fafafa}
        tr:last-child td{border-bottom:none}
        .uzone{border:2px dashed #cbd5e1;border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;transition:all .2s ease;background:#fafafa}
        .uzone:hover,.uzone.ov{border-color:#2563eb;background:#eff6ff}
        .pill{display:inline-flex;align-items:center;padding:5px 13px;border-radius:20px;border:1.5px solid #e2e8f0;background:white;cursor:pointer;font-size:12px;font-weight:600;font-family:'Sora',sans-serif;color:#64748b;transition:all .15px ease}
        .pill:hover{border-color:#2563eb;color:#2563eb}
        .pill.on{border-color:#2563eb;background:#eff6ff;color:#2563eb}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: toast.type === 'ok' ? '#0f172a' : '#dc2626', color: 'white', borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 600, fontFamily: "'Sora',sans-serif", boxShadow: '0 8px 30px rgba(0,0,0,0.2)', animation: 'toastIn .3s ease', display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'ok' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: sidebar ? 234 : 64, flexShrink: 0, transition: 'width .3s cubic-bezier(.4,0,.2,1)', background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', boxShadow: '2px 0 8px rgba(0,0,0,0.04)', zIndex: 200 }}>
          <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg,#2563eb,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏪</div>
            {sidebar && <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>VendorHub</span>}
          </div>

          <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {navItems.map(item => (
              <button key={item.id} className={`nav-btn${tab === item.id ? ' on' : ''}`} onClick={() => setTab(item.id)} style={{ marginBottom: 2, justifyContent: sidebar ? 'flex-start' : 'center' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {sidebar && (
                  <>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge ? <span style={{ background: item.id === 'orders' ? '#ef4444' : '#2563eb', color: 'white', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '1px 7px' }}>{item.badge}</span> : null}
                  </>
                )}
              </button>
            ))}
          </nav>

          {sidebar && (
            <div style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 12px', marginBottom: 8, border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {user?.name ? initials(user.name) : 'V'}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ color: '#0f172a', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name ?? 'Vendor'}</div>
                    <div style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(user as any)?.businessName || user?.email}</div>
                  </div>
                </div>
                {(user as any)?.isApproved !== undefined && (
                  <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: (user as any).isApproved ? '#059669' : '#d97706', background: (user as any).isApproved ? '#dcfce7' : '#fef9c3', padding: '2px 9px', borderRadius: 10 }}>
                    {(user as any).isApproved ? '✓ Approved' : '⏳ Pending Approval'}
                  </span>
                )}
              </div>
              <button className="nav-btn" style={{ color: '#dc2626' }} onClick={() => { logout(); navigate('/'); }}>
                <span style={{ fontSize: 16 }}>↪</span><span>Logout</span>
              </button>
            </div>
          )}
        </aside>

        {/* ── Main ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Header */}
          <header style={{ height: 62, borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button className="ibtn" onClick={() => setSidebar(s => !s)}>☰</button>
              <div>
                <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 16 }}>{navItems.find(n => n.id === tab)?.label}</span>
                {tab === 'products' && products.length > 0 && <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8, fontFamily: "'DM Mono',monospace" }}>{products.length} items</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {(lowStock.length > 0 || outOfStock.length > 0) && (
                <button className="ibtn" onClick={() => setTab('inventory')} style={{ position: 'relative' }} title="Stock alerts">
                  🔔
                  <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', borderRadius: 20, fontSize: 9, fontWeight: 800, padding: '1px 5px', lineHeight: 1.4 }}>{lowStock.length + outOfStock.length}</span>
                </button>
              )}
              <button className="btn g sm" onClick={() => { resetForm(); setShowForm(true); }}>＋ Add Product</button>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {user?.name ? initials(user.name) : 'V'}
              </div>
              <button className="btn d sm" onClick={() => { logout(); navigate('/'); }}>↪ Logout</button>
            </div>
          </header>

          <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>

            {/* ══ DASHBOARD ══ */}
            {tab === 'dashboard' && (
              <div style={{ animation: 'fadeUp .4s ease' }}>

                {/* Welcome banner */}
                <div style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#4338ca 100%)', borderRadius: 20, padding: '26px 30px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', right: -20, top: -20, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ position: 'absolute', right: 80, bottom: -50, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                  <div style={{ position: 'relative' }}>
                    <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 7 }}>Welcome back</p>
                    <h2 style={{ color: 'white', fontSize: 24, fontWeight: 800, marginBottom: 7 }}>{(user as any)?.businessName || user?.name || 'Vendor'}</h2>
                    <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>{products.length} products · {fmt(invValue)} inventory value</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
                    <button className="btn g sm" onClick={() => setTab('products')} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,.25)' }}>Manage Products →</button>
                  </div>
                </div>

                {/* Alerts */}
                {(outOfStock.length > 0 || lowStock.length > 0) && (
                  <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {outOfStock.length > 0 && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 20 }}>🚨</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: '#dc2626', fontWeight: 700, fontSize: 13 }}>{outOfStock.length} product{outOfStock.length > 1 ? 's' : ''} out of stock</p>
                          <p style={{ color: '#f87171', fontSize: 12, marginTop: 2 }}>{outOfStock.slice(0, 3).map(p => p.name).join(', ')}{outOfStock.length > 3 ? ` +${outOfStock.length - 3} more` : ''}</p>
                        </div>
                        <button className="btn g sm" onClick={() => setTab('inventory')}>Manage →</button>
                      </div>
                    )}
                    {lowStock.length > 0 && (
                      <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 20 }}>⚠️</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: '#d97706', fontWeight: 700, fontSize: 13 }}>{lowStock.length} product{lowStock.length > 1 ? 's' : ''} running low (≤5 units)</p>
                          <p style={{ color: '#f59e0b', fontSize: 12, marginTop: 2 }}>{lowStock.slice(0, 3).map(p => `${p.name} (${p.stockQuantity})`).join(', ')}</p>
                        </div>
                        <button className="btn g sm" onClick={() => setTab('inventory')}>Restock →</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
                  {[
                    { label: 'Total Revenue',   value: fmt(stats?.totalSales || 0),     icon: '💰', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
                    { label: 'Total Orders',    value: String(stats?.totalOrders || 0), icon: '🛒', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                    { label: 'Products Listed', value: String(stats?.totalProducts || 0), icon: '📦', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                    { label: 'Pending Orders',  value: String(stats?.pendingOrders || 0), icon: '⏳', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                  ].map((s, i) => (
                    <div key={s.label} className="card-h" style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 18, padding: '22px 22px', animation: `fadeUp .4s ease ${i * 60}ms both` }}>
                      <div style={{ fontSize: 30, marginBottom: 10 }}>{s.icon}</div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>{s.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Recent orders + top products */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
                  <div className="card">
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 15 }}>Recent Orders</span>
                      <button className="btn g sm" onClick={() => setTab('orders')}>View all →</button>
                    </div>
                    {orders.length === 0
                      ? <Empty icon="🛒" title="No orders yet" sub="Orders appear here once customers buy." />
                      : <table>
                          <thead><tr><th>Order</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                          <tbody>
                            {orders.slice(0, 6).map(o => (
                              <tr key={o._id}>
                                <td>
                                  <div style={{ fontFamily: "'DM Mono',monospace", color: '#2563eb', fontWeight: 700, fontSize: 12 }}>#{(o.orderNumber ?? o._id).slice(-8)}</div>
                                  <div style={{ color: '#94a3b8', fontSize: 11 }}>{o.user?.name || 'Guest'}</div>
                                </td>
                                <td style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: '#0f172a' }}>{fmt(o.totalPrice || 0)}</td>
                                <td><SBadge status={o.status} /></td>
                                <td style={{ color: '#94a3b8', fontSize: 12, fontFamily: "'DM Mono',monospace" }}>{ago(o.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    }
                  </div>

                  <div className="card">
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 15 }}>Your Products</span>
                      <button className="btn g sm" onClick={() => setTab('products')}>Manage →</button>
                    </div>
                    {products.length === 0
                      ? <Empty icon="📦" title="No products yet" cta={<button className="btn p sm" onClick={() => { resetForm(); setShowForm(true); }}>＋ Add First Product</button>} />
                      : products.slice(0, 5).map(p => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid #f8fafc' }}>
                          <div style={{ width: 38, height: 38, borderRadius: 9, background: '#f8fafc', overflow: 'hidden', flexShrink: 0, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {p.image ? <img src={imgUrl(p.image)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : <span>📦</span>}
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <p style={{ color: '#1e293b', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                            <p style={{ color: '#94a3b8', fontSize: 11 }}>Stock: {p.stockQuantity}</p>
                          </div>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: '#0f172a', fontSize: 13, flexShrink: 0 }}>{fmt(p.price)}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}

            {/* ══ PRODUCTS ══ */}
            {tab === 'products' && (
              <div style={{ animation: 'fadeUp .4s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ color: '#0f172a', fontWeight: 700, fontSize: 17 }}>Products</h2>
                    <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>{products.length} product{products.length !== 1 ? 's' : ''} in your store</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }}>🔍</span>
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 14px 9px 34px', fontSize: 13, color: '#1e293b', width: 210, outline: 'none', fontFamily: "'Sora',sans-serif" }} />
                    </div>
                    <button className="btn p" onClick={() => { resetForm(); setShowForm(true); }}>＋ Add Product</button>
                  </div>
                </div>

                <div className="card">
                  {products.length === 0
                    ? <Empty icon="📦" title="No products yet" sub="Start selling by adding your first product." cta={<button className="btn p" onClick={() => { resetForm(); setShowForm(true); }}>＋ Add First Product</button>} />
                    : filtered.length === 0
                    ? <Empty icon="🔍" title="No results" sub={`No products match "${search}"`} />
                    : <table>
                        <thead><tr><th>Product</th><th>Category</th><th>Brand</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                          {filtered.map(p => (
                            <tr key={p.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f8fafc', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                                    {p.image ? <img src={imgUrl(p.image)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : <span style={{ fontSize: 20 }}>📦</span>}
                                  </div>
                                  <div>
                                    <p style={{ color: '#1e293b', fontWeight: 600, fontSize: 13 }}>{p.name}</p>
                                    {p.originalPrice && <p style={{ color: '#94a3b8', fontSize: 11, textDecoration: 'line-through', fontFamily: "'DM Mono',monospace" }}>{fmt(p.originalPrice)}</p>}
                                  </div>
                                </div>
                              </td>
                              <td style={{ textTransform: 'capitalize', color: '#64748b' }}>{p.category}</td>
                              <td>{p.brand}</td>
                              <td style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: '#0f172a' }}>{fmt(p.price)}</td>
                              <td>
                                <span style={{ fontFamily: "'DM Mono',monospace", color: p.stockQuantity === 0 ? '#dc2626' : p.stockQuantity <= 5 ? '#d97706' : '#374151', fontWeight: p.stockQuantity <= 5 ? 700 : 400 }}>
                                  {p.stockQuantity}{p.stockQuantity > 0 && p.stockQuantity <= 5 ? ' ⚠' : ''}
                                </span>
                              </td>
                              <td><SBadge status={p.inStock ? 'instock' : 'outofstock'} /></td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="ibtn" title="Edit" onClick={() => openEdit(p)}>✎</button>
                                  <button className="ibtn rd" title="Delete" onClick={() => setDelModal(p)}>🗑</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  }
                </div>
              </div>
            )}

            {/* ══ ORDERS ══ */}
            {tab === 'orders' && (
              <div style={{ animation: 'fadeUp .4s ease' }}>
                <div style={{ marginBottom: 18 }}>
                  <h2 style={{ color: '#0f172a', fontWeight: 700, fontSize: 17 }}>Orders</h2>
                  <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>{orders.length} total · {orders.filter(o => o.status === 'pending').length} pending</p>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {STATUS_FILTERS.map(f => (
                    <button key={f} className={`pill${orderFilter === f ? ' on' : ''}`} onClick={() => setOrderFilter(f)} style={{ textTransform: 'capitalize' }}>
                      {f === 'all' ? `All (${orders.length})` : `${f} (${orders.filter(o => o.status === f).length})`}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {orders.length === 0
                    ? <div className="card"><Empty icon="🛒" title="No orders yet" sub="Orders will appear here once customers purchase your products." /></div>
                    : filtOrders.length === 0
                    ? <div className="card"><Empty icon="📭" title={`No ${orderFilter} orders`} /></div>
                    : filtOrders.map(o => {
                        const isExp = expandedOrder === o._id;
                        return (
                          <div key={o._id} className="card">
                            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 11, background: o.status === 'delivered' ? '#dcfce7' : (o.status === 'cancelled' || o.status === 'failed') ? '#fee2e2' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                                  {o.status === 'delivered' ? '✅' : o.status === 'failed' ? '⚠️' : o.status === 'cancelled' ? '❌' : o.status === 'shipped' ? '🚚' : o.status === 'processing' ? '⚙️' : '🕐'}
                                </div>
                                <div>
                                  <div style={{ fontFamily: "'DM Mono',monospace", color: '#2563eb', fontSize: 13, fontWeight: 700 }}>#{(o.orderNumber ?? o._id).slice(-8)}</div>
                                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{o.user?.name || 'Guest'} · {ago(o.createdAt)}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', fontFamily: "'DM Mono',monospace" }}>{fmt(o.totalPrice || 0)}</div>
                                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{o.orderItems?.length ?? 0} item{(o.orderItems?.length ?? 0) !== 1 ? 's' : ''}</div>
                                </div>
                                <SBadge status={o.status} />
                                {o.isPaid
                                  ? <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: '#dcfce7', padding: '3px 9px', borderRadius: 10 }}>✓ Paid</span>
                                  : <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706', background: '#fef9c3', padding: '3px 9px', borderRadius: 10 }}>Unpaid</span>
                                }
                                <button className="btn g sm" onClick={() => setExpandedOrder(isExp ? null : o._id)}>
                                  {isExp ? '▲ Hide' : '▼ Details'}
                                </button>
                              </div>
                            </div>

                            {isExp && (
                              <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa', animation: 'fadeUp .2s ease' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                  <div>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Order Info</p>
                                    <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.9 }}>
                                      <div>Customer: <strong>{o.user?.name || 'Guest'}</strong></div>
                                      <div>Email: <strong style={{ fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{o.user?.email || '—'}</strong></div>
                                      <div>Payment: <strong style={{ textTransform: 'capitalize' }}>{o.paymentMethod || '—'}</strong></div>
                                      <div>Paid: <strong style={{ color: o.isPaid ? '#059669' : '#dc2626' }}>{o.isPaid ? 'Yes ✓' : 'No'}</strong></div>
                                    </div>
                                  </div>
                                  <div>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Items Ordered</p>
                                    {(o.orderItems ?? []).map((item, i) => (
                                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                                        <span>{item.name ?? 'Product'} × {item.quantity}</span>
                                        <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>{item.price ? fmt(item.price * item.quantity) : ''}</span>
                                      </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontWeight: 700, fontSize: 14 }}>
                                      <span>Total</span>
                                      <span style={{ fontFamily: "'DM Mono',monospace", color: '#2563eb' }}>{fmt(o.totalPrice || 0)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            )}

            {/* ══ INVENTORY ══ */}
            {tab === 'inventory' && (
              <div style={{ animation: 'fadeUp .4s ease' }}>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ color: '#0f172a', fontWeight: 700, fontSize: 17 }}>Inventory Management</h2>
                  <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>Monitor and manage stock levels across all your products</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
                  {[
                    { label: 'Total SKUs',   value: products.length,                         icon: '📦', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                    { label: 'In Stock',     value: products.filter(p => p.inStock).length,  icon: '✅', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
                    { label: 'Low Stock',    value: lowStock.length,                         icon: '⚠️', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                    { label: 'Out of Stock', value: outOfStock.length,                       icon: '🚫', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 16, padding: '18px 20px' }}>
                      <div style={{ fontSize: 26, marginBottom: 8 }}>{s.icon}</div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {outOfStock.length > 0 && (
                  <div className="card" style={{ marginBottom: 18 }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🚨</span><span style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>Out of Stock ({outOfStock.length})</span>
                    </div>
                    <table>
                      <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Action</th></tr></thead>
                      <tbody>
                        {outOfStock.map(p => (
                          <tr key={p.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 9, background: '#f8fafc', overflow: 'hidden', flexShrink: 0, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {p.image ? <img src={imgUrl(p.image)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span>📦</span>}
                                </div>
                                <div><p style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{p.name}</p><p style={{ color: '#94a3b8', fontSize: 11 }}>{p.brand}</p></div>
                              </div>
                            </td>
                            <td style={{ textTransform: 'capitalize', color: '#64748b' }}>{p.category}</td>
                            <td style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(p.price)}</td>
                            <td><button className="btn p sm" onClick={() => openEdit(p)}>✎ Update Stock</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {lowStock.length > 0 && (
                  <div className="card" style={{ marginBottom: 18 }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>⚠️</span><span style={{ color: '#d97706', fontWeight: 700, fontSize: 14 }}>Low Stock — ≤5 Units ({lowStock.length})</span>
                    </div>
                    <table>
                      <thead><tr><th>Product</th><th>Category</th><th>Units Left</th><th>Price</th><th>Action</th></tr></thead>
                      <tbody>
                        {lowStock.map(p => (
                          <tr key={p.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 9, background: '#f8fafc', overflow: 'hidden', flexShrink: 0, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {p.image ? <img src={imgUrl(p.image)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span>📦</span>}
                                </div>
                                <div><p style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{p.name}</p><p style={{ color: '#94a3b8', fontSize: 11 }}>{p.brand}</p></div>
                              </div>
                            </td>
                            <td style={{ textTransform: 'capitalize', color: '#64748b' }}>{p.category}</td>
                            <td>
                              <div>
                                <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, color: '#d97706', fontSize: 14 }}>{p.stockQuantity}</span>
                                <div style={{ marginTop: 5, height: 4, width: 72, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${Math.min(100, (p.stockQuantity / 10) * 100)}%`, background: '#f59e0b', borderRadius: 4 }} />
                                </div>
                              </div>
                            </td>
                            <td style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(p.price)}</td>
                            <td><button className="btn g sm" onClick={() => openEdit(p)}>✎ Restock</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="card">
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>Full Inventory ({products.length})</span>
                    <span style={{ color: '#64748b', fontSize: 12, fontFamily: "'DM Mono',monospace" }}>Total value: {fmt(invValue)}</span>
                  </div>
                  {products.length === 0
                    ? <Empty icon="🗃️" title="No products" sub="Add products to track inventory." />
                    : <table>
                        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Value</th><th>Status</th></tr></thead>
                        <tbody>
                          {products.map(p => (
                            <tr key={p.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f8fafc', overflow: 'hidden', flexShrink: 0, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {p.image ? <img src={imgUrl(p.image)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span>📦</span>}
                                  </div>
                                  <div><p style={{ color: '#1e293b', fontWeight: 600, fontSize: 13 }}>{p.name}</p><p style={{ color: '#94a3b8', fontSize: 11 }}>{p.brand}</p></div>
                                </div>
                              </td>
                              <td style={{ textTransform: 'capitalize', color: '#64748b' }}>{p.category}</td>
                              <td style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(p.price)}</td>
                              <td style={{ fontFamily: "'DM Mono',monospace", fontWeight: p.stockQuantity <= 5 ? 700 : 400, color: p.stockQuantity === 0 ? '#dc2626' : p.stockQuantity <= 5 ? '#d97706' : '#374151' }}>{p.stockQuantity}</td>
                              <td style={{ fontFamily: "'DM Mono',monospace", color: '#64748b' }}>{fmt(p.price * (p.stockQuantity || 0))}</td>
                              <td><SBadge status={p.stockQuantity === 0 ? 'outofstock' : p.stockQuantity <= 5 ? 'lowstock' : 'instock'} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  }
                </div>
              </div>
            )}

            {/* ══ ANALYTICS ══ */}
            {tab === 'analytics' && (
              <div style={{ animation: 'fadeUp .4s ease' }}>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ color: '#0f172a', fontWeight: 700, fontSize: 17 }}>Analytics</h2>
                  <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>Overview of your store performance</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 22 }}>
                  {[
                    { label: 'Avg. Order Value',      value: orders.length ? fmt(Math.round(orders.reduce((s, o) => s + (o.totalPrice || 0), 0) / orders.length)) : 'KES 0', icon: '💵', color: '#2563eb' },
                    { label: 'Total Inventory Value', value: fmt(invValue),   icon: '🏦', color: '#7c3aed' },
                    { label: 'Fulfilment Rate',       value: orders.length ? `${Math.round((orders.filter(o => o.status === 'delivered').length / orders.length) * 100)}%` : '—', icon: '📈', color: '#059669' },
                  ].map(k => (
                    <div key={k.label} className="card" style={{ padding: '22px 24px' }}>
                      <div style={{ fontSize: 30, marginBottom: 10 }}>{k.icon}</div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>{k.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: k.color, fontFamily: "'DM Mono',monospace" }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  <div className="card">
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>Products by Category</span>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      {CATEGORIES.map(cat => {
                        const count = products.filter(p => p.category === cat.value).length;
                        if (count === 0) return null;
                        const pct = Math.round((count / Math.max(products.length, 1)) * 100);
                        return (
                          <div key={cat.value} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontSize: 13, color: '#374151' }}>{cat.label}</span>
                              <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: "'DM Mono',monospace" }}>{count} · {pct}%</span>
                            </div>
                            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 6 }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#2563eb,#4f46e5)', borderRadius: 6, transition: 'width .6s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                      {products.length === 0 && <Empty icon="📊" title="No data yet" sub="Add products to see breakdown." />}
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>Orders by Status</span>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      {STATUS_FILTERS.filter(f => f !== 'all').map(status => {
                        const count = orders.filter(o => o.status === status).length;
                        const pct   = Math.round((count / Math.max(orders.length, 1)) * 100);
                        const clr: Record<string, string> = { pending: '#f59e0b', processing: '#3b82f6', shipped: '#8b5cf6', delivered: '#22c55e', cancelled: '#ef4444' };
                        return (
                          <div key={status} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontSize: 13, color: '#374151', textTransform: 'capitalize' }}>{status}</span>
                              <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: "'DM Mono',monospace" }}>{count}</span>
                            </div>
                            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 6 }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: clr[status] || '#94a3b8', borderRadius: 6, transition: 'width .6s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                      {orders.length === 0 && <Empty icon="📊" title="No orders yet" sub="Order breakdown will appear here." />}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ SETTINGS ══ */}
            {tab === 'settings' && (
              <div style={{ animation: 'fadeUp .4s ease', maxWidth: 600 }}>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ color: '#0f172a', fontWeight: 700, fontSize: 17 }}>Settings</h2>
                  <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>Manage your store profile and account details</p>
                </div>

                <div className="card" style={{ marginBottom: 18 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🏪</span><span style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>Business Profile</span>
                  </div>
                  <form onSubmit={handleBizSave} style={{ padding: 24 }}>
                    <Field label="Business Name"        value={biz.businessName}        onChange={v => setBiz(b => ({ ...b, businessName: v }))}        placeholder="Your store name" />
                    <Field label="Business Description" value={biz.businessDescription} onChange={v => setBiz(b => ({ ...b, businessDescription: v }))} placeholder="Tell customers about your business" rows={4} />
                    <Field label="Business Phone"       value={biz.businessPhone}       onChange={v => setBiz(b => ({ ...b, businessPhone: v }))}       placeholder="+254 700 000 000" hint="Visible to customers on your store page" />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" className="btn p" disabled={bizSaving}>{bizSaving ? 'Saving…' : '✓ Save Profile'}</button>
                    </div>
                  </form>
                </div>

                <div className="card">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>👤</span><span style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>Account Info</span>
                  </div>
                  <div style={{ padding: 24 }}>
                    {[
                      { label: 'Full Name', value: user?.name || '—'   },
                      { label: 'Email',     value: user?.email || '—'  },
                      { label: 'Role',      value: 'Vendor'             },
                      { label: 'Status',    value: (user as any)?.isApproved ? 'Approved ✓' : 'Pending Approval ⏳' },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                        <span style={{ fontSize: 13, color: '#64748b' }}>{row.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{row.value}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 18 }}>
                      <button className="btn d" onClick={() => { logout(); navigate('/'); }}>↪ Sign Out</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      {/* ══ Add/Edit Product Modal ══ */}
      {showForm && (
        <Modal title={editing ? 'Edit Product' : 'Add New Product'} onClose={() => { setShowForm(false); resetForm(); }} width={640}>
          {formErr && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>{formErr}</div>}
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Product Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Samsung Galaxy S24" required />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Describe your product…" rows={3} required />
              </div>
              <Field label="Price (KES)"          type="number" value={form.price}         onChange={v => setForm(f => ({ ...f, price: v }))}         placeholder="99000"  required />
              <Field label="Original Price (KES)" type="number" value={form.originalPrice} onChange={v => setForm(f => ({ ...f, originalPrice: v }))} placeholder="120000" />
              <Field label="Category" value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} options={CATEGORIES} required />
              <Field label="Brand"    value={form.brand}    onChange={v => setForm(f => ({ ...f, brand: v }))}    placeholder="e.g. Samsung"     required />
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Stock Quantity" type="number" value={form.stockQuantity} onChange={v => setForm(f => ({ ...f, stockQuantity: v }))} placeholder="10" hint="Set to 0 to mark as out of stock" />
              </div>

              {/* ── Specs Section ── */}
              <div style={{ gridColumn: '1/-1', marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Product Specs</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn g sm" onClick={() => loadSpecTemplate(form.category)}>Reset Template</button>
                    <button type="button" className="btn p sm" style={{ background: specsGenerating ? '#94a3b8' : undefined }} onClick={handleGenerateSpecs} disabled={specsGenerating}>
                      {specsGenerating ? 'Generating…' : '✨ AI Generate'}
                    </button>
                    <button type="button" className="btn g sm" onClick={() => setSpecs(s => [...s, { key: '', value: '' }])}>+ Row</button>
                  </div>
                </div>
                {specsError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', color: '#dc2626', fontSize: 12, marginBottom: 10 }}>{specsError}</div>}
                {specs.length === 0
                  ? <div style={{ border: '2px dashed #e2e8f0', borderRadius: 10, padding: 18, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No specs — click AI Generate or Reset Template</div>
                  : <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', background: '#f8fafc', padding: '7px 12px', borderBottom: '1px solid #e2e8f0', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Spec</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Value</span>
                      </div>
                      {specs.map((spec, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: 8, padding: '7px 12px', borderBottom: i < specs.length - 1 ? '1px solid #f1f5f9' : 'none', alignItems: 'center', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                          <input value={spec.key} onChange={e => setSpecs(s => s.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} placeholder="e.g. Processor" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 10px', fontSize: 12, color: '#0f172a', fontFamily: "'Sora',sans-serif", outline: 'none', width: '100%' }} />
                          <input value={spec.value} onChange={e => setSpecs(s => s.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="e.g. Intel Core i7" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 10px', fontSize: 12, color: '#0f172a', fontFamily: "'Sora',sans-serif", outline: 'none', width: '100%' }} />
                          <button type="button" onClick={() => setSpecs(s => s.filter((_, j) => j !== i))} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, width: 28, height: 28, color: '#dc2626', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      ))}
                    </div>
                }
              </div>

              {/* Image */}
              <div style={{ gridColumn: '1/-1', marginTop: 4 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>Product Image <span style={{ color: '#dc2626' }}>*</span></label>
                <input ref={fileRef}   type="file" accept="image/*"                    style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImgUpload(f); }} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImgUpload(f); }} />

                {imgPreview ? (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={imgPreview} alt="preview" style={{ width: 120, height: 120, borderRadius: 12, objectFit: 'cover', border: '2px solid #e2e8f0', display: 'block' }} />
                      <button type="button" onClick={() => { setImgPreview(''); setForm(f => ({ ...f, image: '' })); if (fileRef.current) fileRef.current.value = ''; }}
                        style={{ position: 'absolute', top: -8, right: -8, background: '#dc2626', border: 'none', borderRadius: '50%', width: 22, height: 22, color: 'white', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                    <button type="button" className="btn g sm" style={{ marginTop: 8, display: 'block' }} onClick={() => fileRef.current?.click()}>🔄 Change Image</button>
                  </div>
                ) : (
                  <div className="uzone"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('ov'); }}
                    onDragLeave={e => e.currentTarget.classList.remove('ov')}
                    onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('ov'); const f = e.dataTransfer.files?.[0]; if (f) handleImgUpload(f); }}>
                    {imgLoading
                      ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}><div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #bfdbfe', borderTop: '3px solid #2563eb', animation: 'spin .7s linear infinite' }} /><span style={{ color: '#64748b', fontSize: 13 }}>Uploading…</span></div>
                      : <><div style={{ fontSize: 34, marginBottom: 8 }}>📸</div><div style={{ color: '#1e293b', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Click to upload or drag & drop</div><div style={{ color: '#94a3b8', fontSize: 12 }}>PNG, JPG, WEBP · max 5MB</div></>
                    }
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" className="btn g sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => fileRef.current?.click()}>📁 Upload</button>
                  <button type="button" className="btn g sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => cameraRef.current?.click()}>📷 Camera</button>
                </div>
                <input value={form.image.startsWith('data:') ? '' : form.image} onChange={e => { setForm(f => ({ ...f, image: e.target.value })); if (e.target.value) setImgPreview(e.target.value); }} placeholder="Or paste an image URL…" style={{ width: '100%', marginTop: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', color: '#0f172a', fontSize: 13, fontFamily: "'Sora',sans-serif", outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" className="btn g" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
              <button type="submit" className="btn p" disabled={saving || imgLoading}>
                {saving ? 'Saving…' : editing ? '✓ Save Changes' : '＋ Add Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ Delete Confirm ══ */}
      {delModal && (
        <Modal title="Delete Product" onClose={() => setDelModal(null)} width={420}>
          <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🗑️</div>
            <p style={{ color: '#0f172a', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Delete "{delModal.name}"?</p>
            <p style={{ color: '#64748b', fontSize: 13 }}>This will permanently remove the product from your store.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn g" onClick={() => setDelModal(null)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button className="btn d" onClick={handleDelete} style={{ flex: 1, justifyContent: 'center' }}>🗑️ Delete Product</button>
          </div>
        </Modal>
      )}
    </>
  );
}
