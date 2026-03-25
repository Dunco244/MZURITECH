import React, { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import type { CSSProperties } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from '@/components/ui/StatusBadge';
import LogisticsView from '@/pages/Logisticview';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const VITE_URL = "http://localhost:5173";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category {
  _id: string; name: string; slug?: string; displayOrder?: number; count?: number;
}
interface Product {
  _id: string; name: string; price: number; originalPrice?: number; brand: string;
  inStock: boolean; image?: string | { url?: string }; images?: Array<string | { url?: string }>; category?: string;
  description?: string; stockQuantity?: number; badge?: string; isActive?: boolean;
  specs?: Record<string, string>;
}
interface Order {
  _id: string; orderNumber?: string; user?: { name: string; email: string } | null;
  totalPrice: number; status: string; isPaid?: boolean;
  orderItems?: { name?: string; quantity: number; price?: number; product?: string }[]; createdAt?: string; paymentMethod?: string;
}
interface AppUser {
  _id: string; name: string; email: string; phone?: string; role: string;
  isActive?: boolean; isApproved?: boolean; businessName?: string; createdAt?: string;
}
interface Notification {
  _id: string; type?: string; title?: string; message?: string; isRead: boolean; createdAt?: string;
}
interface DashboardStats {
  totalProducts: number; totalOrders: number; totalUsers: number; totalRevenue: number;
  recentOrders: Order[]; ordersByStatus: { _id: string; count: number }[]; topProducts: Product[];
}
interface Pagination { page: number; pages: number; total: number; limit: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
import { formatKES, timeAgo } from '@/lib/utils';
function getUserName(user?: { name: string; email: string } | null): string {
  if (!user) return "Guest";
  return user.name || user.email || "Guest";
}
function getCatColor(name: string): string {
  const map: Record<string, string> = {
    laptops: "#2563eb", phones: "#7c3aed", accessories: "#059669",
    deals: "#dc2626", shop: "#ea580c", gaming: "#9333ea",
    tablets: "#0284c7", cameras: "#d97706", wearables: "#db2777", audio: "#059669",
  };
  return map[name?.toLowerCase()] ?? "#2563eb";
}
function getCatIcon(name: string): string {
  const map: Record<string, string> = {
    laptops: "💻", phones: "📱", accessories: "🎧", deals: "🏷️",
    shop: "🛍️", gaming: "🎮", tablets: "📱", cameras: "📷", wearables: "⌚", audio: "🎵",
  };
  return map[name?.toLowerCase()] ?? "📦";
}

function getImageUrl(img?: string): string {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  if (img.startsWith("/uploads")) return `${API_URL}${img}`;
  return img;
}
function getImageUrlFrom(img?: string | { url?: string } | null): string {
  if (!img) return "";
  if (typeof img === "string") return getImageUrl(img);
  return img.url ? getImageUrl(img.url) : "";
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PulseDot({ color = "#16a34a" }: { color?: string }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, animation: "ping 1.4s cubic-bezier(0,0,0.2,1) infinite", opacity: 0.5 }} />
      <span style={{ borderRadius: "50%", background: color, width: 10, height: 10, display: "block" }} />
    </span>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 80, h = 32;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  const gid = `sg${color.replace("#", "")}`;
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${gid})`} stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Modal({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 20, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.15)", animation: "modalIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
          <h3 style={{ color: "#0f172a", fontSize: 17, fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, color: "#64748b", cursor: "pointer", padding: "6px 10px", fontSize: 14 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", animation: "spin 0.7s linear infinite" }} />
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, options }: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; options?: string[];
}) {
  const s: CSSProperties = { width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#0f172a", fontSize: 13, fontFamily: "'Sora', sans-serif", outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6, fontFamily: "'Sora', sans-serif", fontWeight: 500 }}>{label}</label>
      {options
        ? <select value={value} onChange={e => onChange(e.target.value)} style={s}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s} />}
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

function Paginator({ pg, onPage }: { pg: Pagination; onPage: (p: number) => void }) {
  if (pg.pages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid #f1f5f9" }}>
      <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
        {((pg.page - 1) * pg.limit) + 1}–{Math.min(pg.page * pg.limit, pg.total)} of {pg.total}
      </span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className="action-btn ghost" disabled={pg.page === 1} onClick={() => onPage(pg.page - 1)} style={{ padding: "5px 12px" }}>←</button>
        <span style={{ color: "#64748b", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{pg.page}/{pg.pages}</span>
        <button className="action-btn ghost" disabled={pg.page === pg.pages} onClick={() => onPage(pg.page + 1)} style={{ padding: "5px 12px" }}>→</button>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]     = useState("dashboard");
  const [isMobile, setIsMobile]       = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 900 : false));
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== "undefined" ? window.innerWidth > 900 : true));
  const [notifOpen, setNotifOpen]     = useState(false);

  // ✅ ADDED: Toast state for feedback on all order actions
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const [stats, setStats]               = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [revenueHistory, setRevenueHistory] = useState<number[]>([40,55,42,70,65,80,74,88,92,85,97,100]);

  const [products, setProducts]           = useState<Product[]>([]);
  const [productsPg, setProductsPg]       = useState<Pagination>({ page: 1, pages: 1, total: 0, limit: 10 });
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productModal, setProductModal]   = useState<{ open: boolean; mode: "add" | "edit"; product?: Product }>({ open: false, mode: "add" });
  const [deleteProductModal, setDeleteProductModal] = useState<Product | null>(null);
  const [productForm, setProductForm]     = useState({ name: "", description: "", price: "", originalPrice: "", category: "laptops", brand: "", image: "", stockQuantity: "0", badge: "" });
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError]   = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview]     = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);
  const [specsGenerating, setSpecsGenerating] = useState(false);
  const [specsError, setSpecsError] = useState("");

  const SPEC_TEMPLATES: Record<string, string[]> = {
    laptops:     ["Processor","RAM","Storage","Display","Graphics","Battery","OS","Weight"],
    phones:      ["Processor","RAM","Storage","Display","Camera","Battery","OS","Connectivity"],
    tablets:     ["Processor","RAM","Storage","Display","Camera","Battery","OS","Connectivity"],
    audio:       ["Type","Driver Size","Frequency Response","Connectivity","Battery","Noise Canceling","Weight"],
    gaming:      ["Processor","RAM","Storage","Graphics","Display","Connectivity","Platform"],
    cameras:     ["Sensor","Resolution","Lens","Video","ISO Range","Battery","Connectivity","Weight"],
    wearables:   ["Display","Health Sensors","Battery","Connectivity","Water Resistance","Compatibility"],
    accessories: ["Type","Connectivity","Compatibility","Material","Dimensions","Weight"],
  };

  const loadSpecTemplate = (category: string) => {
    const keys = SPEC_TEMPLATES[category] ?? ["Feature 1","Feature 2","Feature 3"];
    setSpecs(keys.map(key => ({ key, value: "" })));
  };

  const handleGenerateSpecs = async () => {
    if (!productForm.name && !productForm.description) {
      setSpecsError("Enter a product name or description first."); return;
    }
    setSpecsGenerating(true); setSpecsError("");
    try {
      const cat = productForm.category;
      const keys = SPEC_TEMPLATES[cat] ?? ["Processor","RAM","Storage","Display","Battery"];
      const prompt = "You are a product data assistant for an electronics store in Kenya.\nProduct:\nName: " + (productForm.name||"Unknown") + "\nCategory: " + cat + "\nDescription: " + (productForm.description||"No description") + "\n\nGenerate realistic technical specifications for EXACTLY these fields: " + keys.join(", ") + ".\nRespond ONLY with a valid JSON object, no markdown, no explanation.\nExample: {\"Processor\": \"Intel Core i7-13th Gen\", \"RAM\": \"16GB DDR5\"}";
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) { throw new Error("Missing VITE_GEMINI_API_KEY in .env"); }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
      );
      const data = await res.json();
      console.log("Gemini response:", JSON.stringify(data));
      if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!text) throw new Error("Empty response from Gemini");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed: Record<string, string> = JSON.parse(clean);
      setSpecs(Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) })));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Gemini error:", err);
      setSpecsError("AI generation failed: " + msg);
      loadSpecTemplate(productForm.category);
    } finally { setSpecsGenerating(false); }
  };

  const [categories, setCategories]     = useState<Category[]>([]);
  const [catLoading, setCatLoading]     = useState(false);
  const [selectedCat, setSelectedCat]   = useState<Category | null>(null);
  const [catProducts, setCatProducts]   = useState<Product[]>([]);
  const [catProductsLoading, setCatProductsLoading] = useState(false);
  const [catModal, setCatModal]         = useState<"add" | "edit" | null>(null);
  const [catForm, setCatForm]           = useState({ name: "", icon: "📦", color: "#2563eb" });
  const [deleteCatModal, setDeleteCatModal] = useState<Category | null>(null);
  const [catSaving, setCatSaving]       = useState(false);

  const [orders, setOrders]           = useState<Order[]>([]);
  const [ordersPg, setOrdersPg]       = useState<Pagination>({ page: 1, pages: 1, total: 0, limit: 10 });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");

  const [customers, setCustomers]         = useState<AppUser[]>([]);
  const [customersPg, setCustomersPg]     = useState<Pagination>({ page: 1, pages: 1, total: 0, limit: 10 });
  const [customersLoading, setCustomersLoading] = useState(false);

  const [vendors, setVendors]           = useState<AppUser[]>([]);
  const [vendorsPg, setVendorsPg]       = useState<Pagination>({ page: 1, pages: 1, total: 0, limit: 10 });
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [approvingVendor, setApprovingVendor] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);

  useEffect(() => {
    if (!authLoading && !token) { navigate("/login"); return; }
    if (!authLoading && user && user.role !== "admin") { navigate("/"); }
  }, [authLoading, token, user, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 900px)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = "matches" in e ? e.matches : (e as MediaQueryList).matches;
      setIsMobile(matches);
      if (matches) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    onChange(mq);
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange as any);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange as any);
    };
  }, []);

  // Prevent horizontal overflow on small screens (mobile menu + tables/cards)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflowX;
    document.body.style.overflowX = "hidden";
    return () => { document.body.style.overflowX = prev; };
  }, []);

  const authHeaders = useCallback((): Record<string, string> => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, { headers: authHeaders() });
      const d = await res.json();
      if (d.success) {
        setStats(d.stats);
        const base = d.stats.totalRevenue / 12;
        setRevenueHistory(
          d.stats.totalRevenue > 0
            ? Array.from({ length: 12 }, () => Math.max(1, Math.round(base * (0.5 + Math.random()))))
            : Array(12).fill(0)
        );
      }
    } catch (e) { console.error(e); }
    finally { setStatsLoading(false); }
  }, [token, authHeaders]);

  const fetchProducts = useCallback(async (page = 1) => {
    if (!token) return;
    setProductsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/products?page=${page}&limit=10`, { headers: authHeaders() });
      const d = await res.json();
      if (d.success) { setProducts(d.products ?? []); if (d.pagination) setProductsPg(d.pagination); }
    } catch (e) { console.error(e); }
    finally { setProductsLoading(false); }
  }, [token, authHeaders]);

  const fetchCategories = useCallback(async () => {
    if (!token) return;
    setCatLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/categories`, { headers: authHeaders() });
      const d = await res.json();
      if (d.success) setCategories(d.categories ?? []);
    } catch (e) { console.error(e); }
    finally { setCatLoading(false); }
  }, [token, authHeaders]);

  const fetchCatProducts = useCallback(async (catName: string) => {
    if (!token) return;
    setCatProductsLoading(true);
    try {
      const attempts = [catName.toLowerCase(), catName, catName.charAt(0).toUpperCase() + catName.slice(1).toLowerCase()];
      let found: Product[] = [];
      for (const attempt of attempts) {
        const res = await fetch(`${API_URL}/api/admin/products?category=${encodeURIComponent(attempt)}&limit=50&isActive=true`, { headers: authHeaders() });
        const d = await res.json();
        if (d.success && (d.products ?? []).length > 0) { found = d.products; break; }
      }
      setCatProducts(found);
    } catch (e) { console.error(e); }
    finally { setCatProductsLoading(false); }
  }, [token, authHeaders]);

  const fetchOrders = useCallback(async (page = 1, status = "all") => {
    if (!token) return;
    setOrdersLoading(true);
    try {
      const q = status !== "all" ? `&status=${status}` : "";
      const res = await fetch(`${API_URL}/api/admin/orders?page=${page}&limit=10${q}`, { headers: authHeaders() });
      const d = await res.json();
      if (d.success) { setOrders(d.orders ?? []); if (d.pagination) setOrdersPg(d.pagination); }
    } catch (e) { console.error(e); }
    finally { setOrdersLoading(false); }
  }, [token, authHeaders]);

  const fetchCustomers = useCallback(async (page = 1) => {
    if (!token) return;
    setCustomersLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users?role=customer&page=${page}&limit=10`, { headers: authHeaders() });
      const d = await res.json();
      if (d.success) { setCustomers(d.users ?? []); if (d.pagination) setCustomersPg(d.pagination); }
    } catch (e) { console.error(e); }
    finally { setCustomersLoading(false); }
  }, [token, authHeaders]);

  const fetchVendors = useCallback(async (page = 1) => {
    if (!token) return;
    setVendorsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/vendors?page=${page}&limit=10`, { headers: authHeaders() });
      const d = await res.json();
      if (d.success) { setVendors(d.vendors ?? []); if (d.pagination) setVendorsPg(d.pagination); }
    } catch (e) { console.error(e); }
    finally { setVendorsLoading(false); }
  }, [token, authHeaders]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/notifications?limit=20`, { headers: authHeaders() });
      const d = await res.json();
      if (d.success) { setNotifications(d.notifications ?? []); setUnreadCount(d.unreadCount ?? 0); }
    } catch (e) { console.error(e); }
  }, [token, authHeaders]);

  useEffect(() => {
    if (!token) return;
    if (activeTab === "dashboard")  { fetchStats(); fetchOrders(1, "all"); }
    if (activeTab === "live")       { fetchStats(); fetchOrders(1, "all"); }
    if (activeTab === "products")   fetchProducts();
    if (activeTab === "categories") fetchCategories();
    if (activeTab === "orders")     fetchOrders(1, orderFilter);
    if (activeTab === "customers")  fetchCustomers();
    if (activeTab === "vendors")    fetchVendors();
  }, [activeTab, token]);

  useEffect(() => {
    if (!token) return;
    fetchNotifications();
    const t = setInterval(fetchNotifications, 30000);
    return () => clearInterval(t);
  }, [token, fetchNotifications]);

  const handleCatClick = (cat: Category) => {
    if (selectedCat?._id === cat._id) { setSelectedCat(null); setCatProducts([]); return; }
    setSelectedCat(cat);
    fetchCatProducts(cat.slug ?? cat.name.toLowerCase());
  };

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) return;
    setCatSaving(true);
    try {
      const isEdit = catModal === "edit" && selectedCat;
      const url    = isEdit ? `${API_URL}/api/admin/categories/${selectedCat._id}` : `${API_URL}/api/admin/categories`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify({ name: catForm.name }) });
      if (res.ok) { fetchCategories(); setCatModal(null); }
    } catch (e) { console.error(e); }
    finally { setCatSaving(false); }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCatModal) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/categories/${deleteCatModal._id}`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) {
        fetchCategories(); setDeleteCatModal(null);
        if (selectedCat?._id === deleteCatModal._id) { setSelectedCat(null); setCatProducts([]); }
      }
    } catch (e) { console.error(e); }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setImageUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => { if (reader.result) setImagePreview(reader.result as string); };
      reader.readAsDataURL(file);
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API_URL}/api/products/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const d = await res.json();
      if (d.success) {
        setProductForm(f => ({ ...f, image: d.imageUrl }));
        if (d.fullUrl) setImagePreview(d.fullUrl);
      } else {
        setProductError(d.message || "Image upload failed");
      }
    } catch (e) {
      setProductError("Image upload failed. Please try again.");
    } finally {
      setImageUploading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price || !productForm.brand || !productForm.description) {
      setProductError("Please fill in all required fields (name, price, brand, description)."); return;
    }
    setProductSaving(true); setProductError("");
    try {
      const isEdit = productModal.mode === "edit" && productModal.product;
      const url    = isEdit ? `${API_URL}/api/admin/products/${productModal.product!._id}` : `${API_URL}/api/admin/products`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: authHeaders(),
        body: JSON.stringify({
          ...productForm,
          price: parseFloat(productForm.price),
          originalPrice: productForm.originalPrice ? parseFloat(productForm.originalPrice) : undefined,
          stockQuantity: parseInt(productForm.stockQuantity) || 0,
          inStock: parseInt(productForm.stockQuantity) > 0,
          badge: productForm.badge || null,
          specs: specs.length > 0
            ? Object.fromEntries(specs.filter(s => s.key.trim()).map(s => [s.key.trim(), s.value.trim()]))
            : undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setProductError(d.message || "Failed to save product"); return; }
      fetchProducts(productsPg.page);
      setProductModal({ open: false, mode: "add" });
      setImagePreview("");
    } catch (e: unknown) {
      setProductError(e instanceof Error ? e.message : "Unknown error");
    } finally { setProductSaving(false); }
  };

  // ✅ FIXED: handleUpdateOrderStatus with toast feedback
  const handleUpdateOrderStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/orders/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || data.errors?.[0]?.msg || `Failed to mark as "${status}"`, 'error');
        return;
      }
      // Instant optimistic UI update
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
      fetchOrders(ordersPg.page, orderFilter);
      showToast(`Order marked as ${status} ✓`);
    } catch (e) {
      console.error('Update order status error:', e);
      showToast('Network error — could not update order', 'error');
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductModal) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/products/${deleteProductModal._id}`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) { fetchProducts(productsPg.page); setDeleteProductModal(null); }
    } catch (e) { console.error(e); }
  };

  const handleVendorApprove = async (id: string, approve: boolean) => {
    setApprovingVendor(id);
    try {
      const res = await fetch(`${API_URL}/api/admin/vendors/${id}/approve`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify({ isApproved: approve }),
      });
      if (res.ok) fetchVendors(vendorsPg.page);
    } catch (e) { console.error(e); }
    finally { setApprovingVendor(null); }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API_URL}/api/admin/notifications/read-all`, { method: "PUT", headers: authHeaders() });
      fetchNotifications();
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  // ✅ Real-time order updates via Socket.io
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    socket.on('order:updated', (updatedOrder: Partial<Order> & { _id: string }) => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? { ...o, ...updatedOrder } : o));
      fetchOrders(ordersPg.page, orderFilter);
    });
    socket.on('notification:new', (n: { title?: string; message?: string; type?: string; createdAt?: string }) => {
      setNotifications(prev => [
        { _id: `tmp-${Date.now()}`, isRead: false, type: n.type ?? 'info', ...n },
        ...prev,
      ]);
      setUnreadCount(c => c + 1);
      setNotifOpen(true);
    });
    return () => { socket.disconnect(); };
  }, [token]);

  const pendingVendors = vendors.filter(v => !v.isApproved).length;
  const navItems = [
    { id: "dashboard",  label: "Overview",     icon: "⊞",  badge: null as string | number | null },
    { id: "live",       label: "Live Monitor", icon: "◉",  badge: "LIVE" as string | number | null },
    { id: "orders",     label: "Orders",       icon: "🛒", badge: ordersPg.total || null },
    { id: "products",   label: "Products",     icon: "📦", badge: productsPg.total || null },
    { id: "categories", label: "Categories",   icon: "🗂", badge: categories.length || null },
    { id: "vendors",    label: "Vendors",      icon: "🏪", badge: pendingVendors || null },
    { id: "customers",  label: "Customers",    icon: "👥", badge: null },
    { id: "logistics",  label: "Logistics",    icon: "L", badge: null },
  ];

  const ICON_OPTIONS  = ["📦","💻","📱","🎧","🎮","🏷️","🛍️","📷","⌚","🖥️","🖱️","⌨️","🔋","📡","🎵"];
  const COLOR_OPTIONS = ["#2563eb","#7c3aed","#059669","#dc2626","#ea580c","#9333ea","#0284c7","#d97706","#db2777"];

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f8fafc;font-family:'Sora',sans-serif}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
        input,select,textarea{font-family:'Sora',sans-serif}
        input:focus,select:focus,textarea:focus{border-color:#2563eb!important;outline:none;box-shadow:0 0 0 3px rgba(37,99,235,0.1)!important}
        @keyframes ping{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.8);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blinkBadge{0%,100%{opacity:1}50%{opacity:.4}}
        .card-hover{transition:all .22s cubic-bezier(.4,0,.2,1)}
        .card-hover:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.08)!important}
        .nav-btn{transition:all .18s ease;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:11px;cursor:pointer;font-size:13.5px;font-weight:500;color:#64748b;border:none;background:transparent;width:100%;text-align:left;font-family:'Sora',sans-serif}
        .nav-btn:hover{background:#f1f5f9;color:#1e293b}
        .nav-btn.active{background:linear-gradient(135deg,rgba(37,99,235,.12),rgba(37,99,235,.06));color:#2563eb;border:1px solid rgba(37,99,235,.2)}
        .action-btn{border:none;cursor:pointer;border-radius:9px;padding:8px 16px;font-size:13px;font-weight:600;font-family:'Sora',sans-serif;transition:all .18s ease;display:inline-flex;align-items:center;gap:7px}
        .action-btn:hover:not(:disabled){transform:translateY(-1px)}
        .action-btn:disabled{opacity:.5;cursor:not-allowed}
        .action-btn.primary{background:linear-gradient(135deg,#2563eb,#4f46e5);color:white;box-shadow:0 4px 14px rgba(37,99,235,.25)}
        .action-btn.primary:hover:not(:disabled){box-shadow:0 6px 20px rgba(37,99,235,.35)}
        .action-btn.danger{background:#fee2e2;color:#dc2626;border:1px solid #fecaca}
        .action-btn.danger:hover:not(:disabled){background:#fecaca}
        .action-btn.ghost{background:#f8fafc;color:#64748b;border:1px solid #e2e8f0}
        .action-btn.ghost:hover:not(:disabled){background:#f1f5f9;color:#1e293b}
        .icon-btn{border:none;cursor:pointer;border-radius:8px;padding:7px;background:#f8fafc;color:#64748b;transition:all .15s ease;display:flex;align-items:center;justify-content:center;font-size:14px;border:1px solid #e2e8f0}
        .icon-btn:hover{background:#f1f5f9;color:#1e293b}
        .icon-btn.danger:hover{background:#fee2e2;color:#dc2626;border-color:#fecaca}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;padding:12px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;border-bottom:1px solid #f1f5f9;background:#fafafa}
        td{padding:13px 16px;border-bottom:1px solid #f8fafc;font-size:13.5px;color:#374151;vertical-align:middle}
        tr:hover td{background:#fafafa}
        tr:last-child td{border-bottom:none}
        .upload-zone{border:2px dashed #cbd5e1;border-radius:12px;padding:24px;text-align:center;cursor:pointer;transition:all .2s ease;background:#fafafa}
        .upload-zone:hover{border-color:#2563eb;background:#eff6ff}
        .upload-zone.dragover{border-color:#2563eb;background:#eff6ff}
      `}</style>

        <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", overflowX: "hidden" }}>

        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 900 }}
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          style={{
            width: isMobile ? 260 : (sidebarOpen ? 230 : 64),
            flexShrink: 0,
            transition: "transform .25s ease, width .3s cubic-bezier(.4,0,.2,1)",
            background: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            position: isMobile ? "fixed" : "sticky",
            left: 0,
            top: 0,
            height: "100vh",
            overflow: "hidden",
            boxShadow: "2px 0 10px rgba(0,0,0,0.08)",
            transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "none",
            zIndex: 1000,
          }}
        >
          <div style={{ padding: "18px 14px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,#2563eb,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
            {sidebarOpen && <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>AdminHub</span>}
          </div>

          <nav style={{ padding: "12px 10px", flex: 1, overflowY: "auto" }}>
            {navItems.map(item => (
              <button key={item.id} className={`nav-btn${activeTab === item.id ? " active" : ""}`} onClick={() => setActiveTab(item.id)} style={{ marginBottom: 2, justifyContent: sidebarOpen ? "flex-start" : "center" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && (
                  <>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge === "LIVE" && (
                      <span style={{ fontSize: 9, fontWeight: 800, background: "#dc2626", color: "white", borderRadius: 4, padding: "1px 5px", animation: "blinkBadge 2s infinite" }}>LIVE</span>
                    )}
                    {item.badge && item.badge !== "LIVE" && (
                      <span style={{ background: "#2563eb", color: "white", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 7px" }}>{item.badge}</span>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>

          {sidebarOpen && (
            <div style={{ padding: "12px 14px", borderTop: "1px solid #f1f5f9" }}>
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px", marginBottom: 8, border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3, textTransform: "uppercase", letterSpacing: ".08em" }}>Signed in as</div>
                <div style={{ color: "#0f172a", fontWeight: 600, fontSize: 13 }}>{user?.name ?? "Admin"}</div>
                <div style={{ color: "#94a3b8", fontSize: 11, textTransform: "capitalize" }}>{user?.role ?? "admin"}</div>
              </div>
              <button className="nav-btn" style={{ color: "#dc2626" }} onClick={handleLogout}>
                <span style={{ fontSize: 16 }}>↪</span><span>Logout</span>
              </button>
            </div>
          )}
        </aside>

        {/* ── Main ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden", minWidth: 0 }}>

          {/* Header */}
          <header style={{ height: 62, borderBottom: "1px solid #e2e8f0", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "0 14px" : "0 24px", position: "sticky", top: 0, zIndex: 100, flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button className="icon-btn" onClick={() => setSidebarOpen(s => !s)}>☰</button>
              <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 16 }}>
                {navItems.find(n => n.id === activeTab)?.label ?? activeTab}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <button className="icon-btn" onClick={() => setNotifOpen(o => !o)} style={{ fontSize: 16, position: "relative" }}>
                  🔔
                  {unreadCount > 0 && (
                    <span style={{ position: "absolute", top: -3, right: -3, background: "#dc2626", color: "white", borderRadius: 20, fontSize: 9, fontWeight: 800, padding: "1px 5px" }}>{unreadCount}</span>
                  )}
                </button>
                {notifOpen && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", width: 340, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 20px 40px rgba(0,0,0,.1)", zIndex: 500, overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>Notifications</span>
                      <button onClick={markAllRead} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 12 }}>Mark all read</button>
                    </div>
                    {notifications.length === 0
                      ? <EmptyState icon="🔔" text="No notifications" />
                      : notifications.slice(0, 10).map(n => (
                        <div key={n._id} style={{ padding: "12px 18px", borderBottom: "1px solid #f8fafc", background: n.isRead ? "transparent" : "#eff6ff", display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ fontSize: 18 }}>{n.type === "order" ? "🛒" : n.type === "vendor" ? "🏪" : n.type === "product" ? "📦" : "💬"}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: n.isRead ? "#64748b" : "#1e293b", fontSize: 12.5, lineHeight: 1.5 }}>{n.message}</div>
                            <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3, fontFamily: "'DM Mono', monospace" }}>{timeAgo(n.createdAt)}</div>
                          </div>
                          {!n.isRead && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563eb", flexShrink: 0, marginTop: 4 }} />}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 13 }}>
                {user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "AD"}
              </div>
              <button className="action-btn danger" onClick={handleLogout} style={{ fontSize: 12, padding: "6px 14px" }}>↪ Logout</button>
            </div>
          </header>

          {/* Content */}
          <main style={{ flex: 1, overflow: "auto", padding: isMobile ? 14 : 24 }} onClick={() => notifOpen && setNotifOpen(false)}>
            {activeTab === "dashboard" && <DashboardView stats={stats} loading={statsLoading} revenueHistory={revenueHistory} recentOrders={stats?.recentOrders ?? []} ordersByStatus={stats?.ordersByStatus ?? []} />}
            {activeTab === "live" && <LiveView stats={stats} orders={orders} revenueHistory={revenueHistory} onRefresh={() => { fetchStats(); fetchOrders(1, "all"); }} />}
            {activeTab === "orders" && <OrdersView orders={orders} loading={ordersLoading} pg={ordersPg} filter={orderFilter} setFilter={f => { setOrderFilter(f); fetchOrders(1, f); }} onPage={p => fetchOrders(p, orderFilter)} onUpdateStatus={handleUpdateOrderStatus} />}
            {activeTab === "products" && <ProductsView products={products} loading={productsLoading} pg={productsPg} search={productSearch} setSearch={setProductSearch} isMobile={isMobile} onAdd={() => { setProductForm({ name: "", description: "", price: "", originalPrice: "", category: "laptops", brand: "", image: "", stockQuantity: "0", badge: "" }); setImagePreview(""); setProductError(""); setSpecs([]); setSpecsError(""); loadSpecTemplate(productForm.category || "laptops"); setProductModal({ open: true, mode: "add" }); }} onEdit={p => { setProductForm({ name: p.name, description: p.description ?? "", price: String(p.price), originalPrice: String(p.originalPrice ?? ""), category: p.category ?? "laptops", brand: p.brand, image: typeof p.image === "string" ? p.image : (p.image?.url ?? ""), stockQuantity: String(p.stockQuantity ?? 0), badge: p.badge ?? "" }); setImagePreview(getImageUrlFrom(p.image)); setProductError(""); setProductModal({ open: true, mode: "edit", product: p });
            setSpecsError("");
            if (p.specs && typeof p.specs === "object") {
              const entries = Object.entries(p.specs as Record<string,string>);
              setSpecs(entries.length > 0 ? entries.map(([k,v]) => ({ key:k, value:v })) : []);
              if (entries.length === 0) loadSpecTemplate(p.category ?? "accessories");
            } else { loadSpecTemplate(p.category ?? "accessories"); } }} onDelete={p => setDeleteProductModal(p)} onPage={fetchProducts} />}
            {activeTab === "categories" && <CategoriesView categories={categories} loading={catLoading} selectedCat={selectedCat} catProducts={catProducts} catProductsLoading={catProductsLoading} onCatClick={handleCatClick} onAdd={() => { setCatForm({ name: "", icon: "📦", color: "#2563eb" }); setCatModal("add"); }} onEdit={c => { setCatForm({ name: c.name, icon: getCatIcon(c.name), color: getCatColor(c.name) }); setSelectedCat(c); setCatModal("edit"); }} onDelete={c => setDeleteCatModal(c)} />}
            {activeTab === "vendors" && <VendorsView vendors={vendors} loading={vendorsLoading} pg={vendorsPg} onApprove={handleVendorApprove} approvingVendor={approvingVendor} onPage={fetchVendors} />}
            {activeTab === "customers" && <CustomersView customers={customers} loading={customersLoading} pg={customersPg} onPage={fetchCustomers} />}
            {activeTab === "logistics" && <LogisticsView token={token!} />}
          </main>
        </div>
      </div>

      {/* ── Product Modal ── */}
      {productModal.open && (
        <Modal title={productModal.mode === "add" ? "Add New Product" : "Edit Product"} onClose={() => { setProductModal({ open: false, mode: "add" }); setImagePreview(""); }}>
          {productError && (
            <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 14 }}>{productError}</div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <Field label="Product Name *" value={productForm.name} onChange={v => setProductForm(f => ({ ...f, name: v }))} placeholder="e.g. iPhone 15 Pro" />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6, fontFamily: "'Sora',sans-serif", fontWeight: 500 }}>Description *</label>
              <textarea value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} placeholder="Product description..." rows={3}
                style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", color: "#0f172a", fontSize: 13, fontFamily: "'Sora',sans-serif", resize: "none", outline: "none", boxSizing: "border-box" as CSSProperties["boxSizing"] }} />
            </div>
            <Field label="Price (KES) *"        value={productForm.price}         onChange={v => setProductForm(f => ({ ...f, price: v }))}         type="number" placeholder="99000" />
            <Field label="Original Price (KES)" value={productForm.originalPrice} onChange={v => setProductForm(f => ({ ...f, originalPrice: v }))} type="number" placeholder="120000" />
            <Field label="Category *" value={productForm.category} onChange={v => setProductForm(f => ({ ...f, category: v }))} options={["laptops", "phones", "audio", "gaming", "tablets", "accessories", "cameras", "wearables"]} />
            <Field label="Brand *"    value={productForm.brand}    onChange={v => setProductForm(f => ({ ...f, brand: v }))}    placeholder="e.g. Apple" />
            <Field label="Stock Qty"  value={productForm.stockQuantity} onChange={v => setProductForm(f => ({ ...f, stockQuantity: v }))} type="number" placeholder="10" />
            <Field label="Badge" value={productForm.badge} onChange={v => setProductForm(f => ({ ...f, badge: v }))} options={["", "Featured", "New Arrival", "Sale", "Popular", "Best Seller", "Gaming"]} />

            {/* Specs Section */}
            <div style={{ gridColumn: "1/-1", marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600, fontFamily: "'Sora',sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Product Specs
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="action-btn ghost" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => loadSpecTemplate(productForm.category)} type="button">
                    Reset Template
                  </button>
                  <button className="action-btn primary" style={{ fontSize: 11, padding: "5px 12px", background: specsGenerating ? "#94a3b8" : "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "none" }} onClick={handleGenerateSpecs} disabled={specsGenerating} type="button">
                    {specsGenerating ? "Generating..." : "AI Generate"}
                  </button>
                  <button className="action-btn ghost" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => setSpecs(s => [...s, { key: "", value: "" }])} type="button">
                    + Add Row
                  </button>
                </div>
              </div>
              {specsError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", color: "#dc2626", fontSize: 12, marginBottom: 10 }}>
                  {specsError}
                </div>
              )}
              {specs.length === 0 ? (
                <div style={{ border: "2px dashed #e2e8f0", borderRadius: 10, padding: "18px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  No specs yet — click AI Generate or Reset Template to start
                </div>
              ) : (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 32px", background: "#f8fafc", padding: "7px 12px", borderBottom: "1px solid #e2e8f0", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Spec</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Value</span>
                    <span></span>
                  </div>
                  {specs.map((spec, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 32px", gap: 8, padding: "7px 12px", borderBottom: i < specs.length - 1 ? "1px solid #f1f5f9" : "none", alignItems: "center", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <input value={spec.key} onChange={e => setSpecs(s => s.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} placeholder="e.g. Processor" style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "#0f172a", fontFamily: "'Sora',sans-serif", outline: "none", width: "100%" }} />
                      <input value={spec.value} onChange={e => setSpecs(s => s.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="e.g. Intel Core i7" style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "#0f172a", fontFamily: "'Sora',sans-serif", outline: "none", width: "100%" }} />
                      <button onClick={() => setSpecs(s => s.filter((_, j) => j !== i))} style={{ background: "#fee2e2", border: "none", borderRadius: 6, width: 28, height: 28, color: "#dc2626", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }} type="button">x</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ✅ Image Upload Field */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6, fontFamily: "'Sora',sans-serif", fontWeight: 500 }}>Product Image *</label>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />

              {imagePreview ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={imagePreview} alt="preview" style={{ width: 120, height: 120, borderRadius: 12, objectFit: "cover", border: "2px solid #e2e8f0", display: "block" }} onError={e => { (e.currentTarget as HTMLImageElement).src = ""; }} />
                  <button onClick={() => { setImagePreview(""); setProductForm(f => ({ ...f, image: "" })); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    style={{ position: "absolute", top: -8, right: -8, background: "#dc2626", border: "none", borderRadius: "50%", width: 22, height: 22, color: "white", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  <button className="action-btn ghost" onClick={() => fileInputRef.current?.click()} style={{ marginTop: 8, width: "100%", justifyContent: "center", fontSize: 12 }}>
                    🔄 Change Image
                  </button>
                </div>
              ) : (
                <div className="upload-zone" onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("dragover"); }}
                  onDragLeave={e => e.currentTarget.classList.remove("dragover")}
                  onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove("dragover"); const f = e.dataTransfer.files?.[0]; if (f) handleImageUpload(f); }}>
                  {imageUploading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #bfdbfe", borderTop: "3px solid #2563eb", animation: "spin .7s linear infinite" }} />
                      <span style={{ color: "#64748b", fontSize: 13 }}>Uploading…</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
                      <div style={{ color: "#1e293b", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Click to upload or drag & drop</div>
                      <div style={{ color: "#94a3b8", fontSize: 12 }}>PNG, JPG, WEBP up to 5MB</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button className="action-btn ghost" onClick={() => { setProductModal({ open: false, mode: "add" }); setImagePreview(""); }}>Cancel</button>
            <button className="action-btn primary" onClick={handleSaveProduct} disabled={productSaving || imageUploading}>
              {productSaving ? "Saving…" : productModal.mode === "add" ? "＋ Add Product" : "✓ Save Changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Product ── */}
      {deleteProductModal && (
        <Modal title="Delete Product" onClose={() => setDeleteProductModal(null)} width={420}>
          <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
            <p style={{ color: "#0f172a", fontSize: 15, marginBottom: 8 }}>Delete <strong>"{deleteProductModal.name}"</strong>?</p>
            <p style={{ color: "#64748b", fontSize: 13 }}>This will deactivate the product from your shop.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="action-btn ghost" onClick={() => setDeleteProductModal(null)} style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
            <button className="action-btn danger" onClick={handleDeleteProduct} style={{ flex: 1, justifyContent: "center" }}>🗑️ Delete</button>
          </div>
        </Modal>
      )}

      {/* ── Add/Edit Category ── */}
      {catModal && (
        <Modal title={catModal === "add" ? "Add Category" : "Edit Category"} onClose={() => setCatModal(null)}>
          <Field label="Category Name *" value={catForm.name} onChange={v => setCatForm(f => ({ ...f, name: v }))} placeholder="e.g. Tablets" />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 8, fontFamily: "'Sora',sans-serif", fontWeight: 500 }}>Icon</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ICON_OPTIONS.map(icon => (
                <button key={icon} onClick={() => setCatForm(f => ({ ...f, icon }))} style={{ fontSize: 22, padding: "6px 10px", borderRadius: 10, cursor: "pointer", background: catForm.icon === icon ? "#eff6ff" : "#f8fafc", border: catForm.icon === icon ? "2px solid #2563eb" : "1px solid #e2e8f0" }}>{icon}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 8, fontFamily: "'Sora',sans-serif", fontWeight: 500 }}>Color</label>
            <div style={{ display: "flex", gap: 8 }}>
              {COLOR_OPTIONS.map(color => (
                <button key={color} onClick={() => setCatForm(f => ({ ...f, color }))} style={{ width: 28, height: 28, borderRadius: "50%", background: color, cursor: "pointer", border: catForm.color === color ? "3px solid white" : "3px solid transparent", outline: catForm.color === color ? `2px solid ${color}` : "none", outlineOffset: 2 }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="action-btn ghost" onClick={() => setCatModal(null)}>Cancel</button>
            <button className="action-btn primary" onClick={handleSaveCategory} disabled={catSaving}>{catSaving ? "Saving…" : catModal === "add" ? "＋ Add" : "✓ Save"}</button>
          </div>
        </Modal>
      )}

      {/* ── Delete Category ── */}
      {deleteCatModal && (
        <Modal title="Delete Category" onClose={() => setDeleteCatModal(null)} width={420}>
          <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
            <p style={{ color: "#0f172a", fontSize: 15, marginBottom: 8 }}>Delete <strong>"{deleteCatModal.name}"</strong>?</p>
            <p style={{ color: "#64748b", fontSize: 13 }}>Products in this category will not be deleted.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="action-btn ghost" onClick={() => setDeleteCatModal(null)} style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
            <button className="action-btn danger" onClick={handleDeleteCategory} style={{ flex: 1, justifyContent: "center" }}>🗑️ Delete</button>
          </div>
        </Modal>
      )}

      {/* ✅ ADDED: Toast notification for order action feedback */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === "success" ? "#0f172a" : "#dc2626",
          color: "white", borderRadius: 12, padding: "12px 20px",
          fontSize: 13, fontWeight: 600, fontFamily: "'Sora', sans-serif",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "fadeUp .3s ease",
        }}>
          {toast.type === "success" ? "✓" : "⚠️"} {toast.msg}
        </div>
      )}
    </>
  );
}

// ─── DashboardView ────────────────────────────────────────────────────────────
function DashboardView({ stats, loading, revenueHistory, recentOrders, ordersByStatus }: {
  stats: DashboardStats | null; loading: boolean; revenueHistory: number[];
  recentOrders: Order[]; ordersByStatus: { _id: string; count: number }[];
}) {
  if (loading || !stats) return <Spinner />;
  const statCards = [
    { label: "Total Revenue",   value: formatKES(stats.totalRevenue), color: "#059669", icon: "💰", history: revenueHistory },
    { label: "Total Orders",    value: String(stats.totalOrders),     color: "#2563eb", icon: "🛒", history: [12,18,14,22,19,25,21,28,24,30,27,33] },
    { label: "Customers",       value: String(stats.totalUsers),      color: "#7c3aed", icon: "👥", history: [60,72,65,80,74,88,82,91,86,95,89,100] },
    { label: "Active Products", value: String(stats.totalProducts),   color: "#ea580c", icon: "📦", history: [30,35,32,40,38,45,42,48,44,52,50,55] },
  ];
  const totalOrders = ordersByStatus.reduce((a, x) => a + x.count, 0) || 1;
  const statusColor: Record<string, string> = { pending: "#d97706", processing: "#2563eb", shipped: "#7c3aed", delivered: "#059669", cancelled: "#dc2626", failed: "#dc2626" };

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {statCards.map((s, i) => (
          <div key={s.label} className="card-hover" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 18, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", animation: `fadeUp .4s ease ${i * 60}ms both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", fontFamily: "'DM Mono',monospace" }}>{s.value}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 12, fontSize: 18, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</div>
            </div>
            <Sparkline data={s.history} color={s.color} />
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 15 }}>Recent Orders</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><PulseDot color="#2563eb" /><span style={{ fontSize: 11, color: "#2563eb", fontFamily: "'DM Mono',monospace" }}>Live</span></div>
          </div>
          {recentOrders.length === 0 ? <EmptyState icon="🛒" text="No orders yet" /> : recentOrders.map(o => (
            <div key={o._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", borderBottom: "1px solid #f8fafc" }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#1e293b", fontWeight: 600, fontSize: 13 }}>{getUserName(o.user)}</div>
                <div style={{ color: "#94a3b8", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>#{o.orderNumber ?? o._id.slice(-8)} · {o.orderItems?.length ?? 0} items</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 13, fontFamily: "'DM Mono',monospace" }}>{formatKES(o.totalPrice)}</div>
                <StatusBadge status={o.status} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 15 }}>Order Breakdown</span>
          </div>
          <div style={{ padding: 16 }}>
            {ordersByStatus.length === 0 ? <EmptyState icon="📊" text="No data yet" /> : ordersByStatus.map(s => (
              <div key={s._id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ color: "#374151", fontSize: 13, textTransform: "capitalize" }}>{s._id}</span>
                  <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>{s.count}</span>
                </div>
                <div style={{ height: 4, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: statusColor[s._id] ?? "#94a3b8", borderRadius: 4, width: `${(s.count / totalOrders) * 100}%`, transition: "width 1s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LiveView ─────────────────────────────────────────────────────────────────
function LiveView({ stats, orders, revenueHistory, onRefresh }: { stats: DashboardStats | null; orders: Order[]; revenueHistory: number[]; onRefresh: () => void }) {
  useEffect(() => { const t = setInterval(onRefresh, 15000); return () => clearInterval(t); }, [onRefresh]);
  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PulseDot color="#dc2626" />
          <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 14, fontFamily: "'DM Mono',monospace", letterSpacing: ".05em" }}>LIVE DASHBOARD</span>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>· refreshes every 15s</span>
        </div>
        <button className="action-btn ghost" onClick={onRefresh}>↻ Refresh now</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Total Revenue",   value: formatKES(stats?.totalRevenue ?? 0), icon: "💰", color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
          { label: "Total Orders",    value: String(stats?.totalOrders ?? 0),     icon: "🛒", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
          { label: "Active Products", value: String(stats?.totalProducts ?? 0),   icon: "📦", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 18, padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
          <PulseDot color="#059669" /><span style={{ color: "#0f172a", fontWeight: 700 }}>Live Order Feed</span>
        </div>
        {orders.length === 0 ? <EmptyState icon="🛒" text="No orders yet" /> : orders.slice(0, 8).map((o, i) => (
          <div key={o._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #f8fafc", background: i === 0 ? "#f0fdf4" : "transparent" }}>
            <span style={{ fontSize: 18 }}>🛒</span>
            <div style={{ flex: 1 }}>
              <span style={{ color: "#1e293b", fontWeight: 600, fontSize: 13 }}>{getUserName(o.user)}</span>
              <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 8, fontFamily: "'DM Mono',monospace" }}>#{o.orderNumber ?? o._id.slice(-8)}</span>
            </div>
            <span style={{ color: "#0f172a", fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{formatKES(o.totalPrice)}</span>
            <StatusBadge status={o.status} />
            <span style={{ color: "#94a3b8", fontSize: 11, fontFamily: "'DM Mono',monospace", minWidth: 60, textAlign: "right" }}>{timeAgo(o.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OrdersView ───────────────────────────────────────────────────────────────
function OrdersView({ orders, loading, pg, filter, setFilter, onPage, onUpdateStatus }: {
  orders: Order[]; loading: boolean; pg: Pagination; filter: string;
  setFilter: (f: string) => void; onPage: (p: number) => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const [paymentTab, setPaymentTab] = React.useState<'all' | 'cash_on_delivery' | 'mpesa'>('all');
  const [expandedOrder, setExpandedOrder] = React.useState<string | null>(null);

  const PAYMENT_TABS = [
    { key: 'all',              label: 'All Orders',        icon: '🛒', color: '#2563eb' },
    { key: 'cash_on_delivery', label: 'Cash on Delivery',  icon: '💵', color: '#059669' },
    { key: 'mpesa',            label: 'M-Pesa',            icon: '📱', color: '#7c3aed' },
  ] as const;

  const STATUS_FILTERS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed'];

  const filteredOrders = orders.filter(o => {
    const pm = (o.paymentMethod ?? '').toLowerCase();
    if (paymentTab === 'cash_on_delivery') return pm === 'cod' || pm.includes('cash') || pm.includes('delivery');
    if (paymentTab === 'mpesa')            return pm === 'mpesa' || pm.includes('m-pesa');
    return true;
  });

  const counts = {
    all:              orders.length,
    cash_on_delivery: orders.filter(o => { const pm = (o.paymentMethod ?? '').toLowerCase(); return pm === 'cod' || pm.includes('cash') || pm.includes('delivery'); }).length,
    mpesa:            orders.filter(o => { const pm = (o.paymentMethod ?? '').toLowerCase(); return pm === 'mpesa' || pm.includes('m-pesa'); }).length,
  };

  const NEXT_STATUS: Record<string, { label: string; next: string; color: string }> = {
    pending:    { label: 'Mark Processing', next: 'processing', color: '#f59e0b' },
    processing: { label: 'Mark Shipped',    next: 'shipped',    color: '#3b82f6' },
    shipped:    { label: 'Mark Delivered',  next: 'delivered',  color: '#059669' },
  };

  const activeTab = PAYMENT_TABS.find(t => t.key === paymentTab)!;

  return (
    <div style={{ animation: 'fadeUp .4s ease' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {PAYMENT_TABS.map(tab => {
          const isActive = paymentTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setPaymentTab(tab.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 14, border: isActive ? `2px solid ${tab.color}` : '2px solid #e2e8f0', background: isActive ? tab.color : 'white', color: isActive ? 'white' : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'Sora',sans-serif", transition: 'all .18s ease', boxShadow: isActive ? `0 4px 14px ${tab.color}40` : 'none' }}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span style={{ background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9', color: isActive ? 'white' : '#64748b', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{counts[tab.key]}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid #e2e8f0', background: filter === s ? '#0f172a' : 'white', color: filter === s ? 'white' : '#64748b', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: "'Sora',sans-serif", textTransform: 'capitalize' }}>
            {s === 'all' ? `All (${pg.total})` : s}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
         : filteredOrders.length === 0
         ? <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
             <div style={{ fontSize: 40, marginBottom: 12 }}>{activeTab.icon}</div>
             <p style={{ fontSize: 14 }}>No {activeTab.label} orders found</p>
           </div>
         : filteredOrders.map(o => {
            const nextAction = NEXT_STATUS[o.status];
            const isExpanded = expandedOrder === o._id;
            const pm = (o.paymentMethod ?? '').toLowerCase();
            const pmLabel = (pm === 'cod' || pm.includes('cash') || pm.includes('delivery')) ? 'Cash on Delivery' : (pm === 'mpesa' || pm.includes('m-pesa')) ? 'M-Pesa' : o.paymentMethod ?? 'Other';
            const pmIcon  = (pm === 'cod' || pm.includes('cash')) ? '💵' : (pm === 'mpesa' || pm.includes('m-pesa')) ? '📱' : '💳';
            const canFail = !['delivered', 'cancelled', 'failed'].includes(o.status);
            const STEPS = ['pending','processing','shipped','delivered'];
            const stepIdx = STEPS.indexOf(o.status);

            return (
              <div key={o._id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'all .2s ease' }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: o.status === 'delivered' ? '#dcfce7' : (o.status === 'cancelled' || o.status === 'failed') ? '#fee2e2' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {o.status === 'delivered' ? '✅' : o.status === 'failed' ? '⚠️' : o.status === 'cancelled' ? '❌' : o.status === 'shipped' ? '🚚' : o.status === 'processing' ? '⚙️' : '🕐'}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'DM Mono',monospace", color: '#2563eb', fontSize: 13, fontWeight: 700 }}>#{o.orderNumber ?? o._id.slice(-8)}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {timeAgo(o.createdAt)} · {pmIcon} {pmLabel} · <strong style={{ color: '#1e293b' }}>{getUserName(o.user)}</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', fontFamily: "'DM Mono',monospace" }}>{formatKES(o.totalPrice)}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{o.orderItems?.length ?? 0} items</div>
                    </div>
                    <StatusBadge status={o.status} />
                    {o.isPaid
                      ? <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: '#dcfce7', padding: '3px 9px', borderRadius: 10 }}>✓ Paid</span>
                      : <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706', background: '#fef9c3', padding: '3px 9px', borderRadius: 10 }}>Unpaid</span>
                    }
                  </div>
                </div>

                {o.status !== 'cancelled' && o.status !== 'failed' && (
                  <div style={{ padding: '12px 24px', background: '#fafafa', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 0 }}>
                    {STEPS.map((step, i) => {
                      const done = i <= stepIdx;
                      const active = i === stepIdx;
                      return (
                        <React.Fragment key={step}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: done ? (active ? '#2563eb' : '#22c55e') : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, border: active ? '3px solid #bfdbfe' : 'none', transition: 'all .3s ease' }}>
                              {done ? (active ? '●' : '✓') : '○'}
                            </div>
                            <span style={{ fontSize: 10, color: done ? '#0f172a' : '#94a3b8', fontWeight: done ? 600 : 400, textTransform: 'capitalize', fontFamily: "'Sora',sans-serif" }}>{step}</span>
                          </div>
                          {i < STEPS.length - 1 && (
                            <div style={{ flex: 1, height: 3, background: i < stepIdx ? '#22c55e' : '#e2e8f0', margin: '0 4px', marginBottom: 20, borderRadius: 4, transition: 'background .3s ease' }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                    {o.status === 'delivered' && (
                      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#059669', fontWeight: 600 }}>
                        ✓ {pm.includes('cash') ? 'Cash collected · Revenue recorded' : 'Payment confirmed · Revenue recorded'}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ padding: '10px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                  {(pm === 'mpesa') ? (
                    o.status === 'cancelled' ? (
                      <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, background: '#fee2e2', padding: '6px 14px', borderRadius: 10 }}>✕ Payment not received — order cancelled</span>
                    ) : o.status === 'failed' ? (
                      <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, background: '#fee2e2', padding: '6px 14px', borderRadius: 10 }}>⚠️ Delivery failed — admin follow-up required</span>
                    ) : !o.isPaid ? (
                      <span style={{ fontSize: 12, color: '#d97706', fontWeight: 600, background: '#fef9c3', padding: '6px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', display: 'inline-block', animation: 'ping 1.2s ease infinite' }} />
                        Waiting for payment… auto-cancels in 5 min
                      </span>
                    ) : (
                      <>
                        {o.status === 'processing' && (
                          <>
                            <span style={{ fontSize: 11, color: '#059669', fontWeight: 600, background: '#dcfce7', padding: '4px 10px', borderRadius: 8 }}>Paid via M-Pesa</span>
                            <button className="action-btn primary" style={{ fontSize: 12, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', boxShadow: 'none' }} onClick={() => onUpdateStatus(o._id, 'shipped')}>📦 Mark Shipped →</button>
                          </>
                        )}
                        {o.status === 'shipped' && (
                          <>
                            <span style={{ fontSize: 11, color: '#059669', fontWeight: 600, background: '#dcfce7', padding: '4px 10px', borderRadius: 8 }}>✓ Paid · Shipped</span>
                            <button className="action-btn primary" style={{ fontSize: 12, background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: 'none' }} onClick={() => onUpdateStatus(o._id, 'delivered')}>✅ Mark Delivered →</button>
                          </>
                        )}
                        {o.status === 'delivered' && (
                          <span style={{ fontSize: 11, color: '#059669', fontWeight: 600, background: '#dcfce7', padding: '4px 10px', borderRadius: 8 }}>✓ Paid · Shipped · Delivered — Complete</span>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      {nextAction && o.status !== 'cancelled' && o.status !== 'failed' && (
                        <button className="action-btn primary"
                          style={{ fontSize: 12, background: nextAction.color === '#f59e0b' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : nextAction.color === '#3b82f6' ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: 'none' }}
                          onClick={() => onUpdateStatus(o._id, nextAction.next)}>
                          {nextAction.label} →
                        </button>
                      )}
                      {o.status === 'pending' && (
                        <button className="action-btn danger" style={{ fontSize: 12 }}
                          onClick={() => onUpdateStatus(o._id, 'cancelled')}>
                          Cancel
                        </button>
                      )}
                    </>
                  )}
                  {canFail && (
                    <button className="action-btn danger" style={{ fontSize: 12 }}
                      onClick={() => onUpdateStatus(o._id, 'failed')}>
                      Mark Failed
                    </button>
                  )}
                  <button className="action-btn ghost" style={{ fontSize: 12 }}
                    onClick={() => setExpandedOrder(isExpanded ? null : o._id)}>
                    {isExpanded ? '▲ Hide' : '▼ Details'}
                  </button>
                </div>

                {isExpanded && (
                  <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Order Info</div>
                        <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.8 }}>
                          <div>Order: <strong style={{ fontFamily: "'DM Mono',monospace" }}>#{o.orderNumber}</strong></div>
                          <div>Customer: <strong>{getUserName(o.user)}</strong></div>
                          <div>Payment: <strong>{pmIcon} {pmLabel}</strong></div>
                          <div>Status: <strong style={{ textTransform: 'capitalize' }}>{o.status}</strong></div>
                          <div>Paid: <strong style={{ color: o.isPaid ? '#059669' : '#dc2626' }}>{o.isPaid ? 'Yes ✓' : 'No'}</strong></div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Items</div>
                        {(o.orderItems ?? []).map((item: { name?: string; quantity: number; price?: number }, idx: number) => (
                          <div key={idx} style={{ fontSize: 13, color: '#1e293b', padding: '4px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{item.name ?? 'Product'} × {item.quantity}</span>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>{item.price ? formatKES(item.price * item.quantity) : ''}</span>
                          </div>
                        ))}
                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
                          <span>Total</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", color: '#2563eb' }}>{formatKES(o.totalPrice)}</span>
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
      <div style={{ marginTop: 16 }}><Paginator pg={pg} onPage={onPage} /></div>
    </div>
  );
}

// ─── ProductsView ─────────────────────────────────────────────────────────────
function ProductsView({ products, loading, pg, search, setSearch, isMobile, onAdd, onEdit, onDelete, onPage }: {
  products: Product[]; loading: boolean; pg: Pagination; search: string; setSearch: (s: string) => void; isMobile: boolean;
  onAdd: () => void; onEdit: (p: Product) => void; onDelete: (p: Product) => void; onPage: (p: number) => void;
}) {
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h2 style={{ color: "#0f172a", fontWeight: 700, fontSize: 17 }}>Products</h2>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>{pg.total} total products in your store</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 14px 9px 36px", color: "#1e293b", fontSize: 13, width: 220, outline: "none", fontFamily: "'Sora',sans-serif" }} />
          </div>
          <button className="action-btn primary" onClick={onAdd}>＋ Add Product</button>
        </div>
      </div>
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState icon="📦" text="No products found" /> : (
          isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
              {filtered.map(p => {
                const imgSrc = getImageUrlFrom(p.image) || getImageUrlFrom(p.images?.[0]);
                return (
                  <div key={p._id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12, background: "#fff" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 52, height: 52, borderRadius: 12, background: "#f8fafc", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #f1f5f9" }}>
                        {imgSrc
                          ? <img src={imgSrc} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          : <span style={{ fontSize: 20 }}>📦</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                        <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{p.category ?? "—"} • {p.brand}</div>
                        {p.badge && <span style={{ fontSize: 10, color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: 10, display: "inline-block", marginTop: 6 }}>{p.badge}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#0f172a" }}>{formatKES(p.price)}</div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: p.inStock ? "#059669" : "#dc2626", background: p.inStock ? "#dcfce7" : "#fee2e2", padding: "3px 9px", borderRadius: 10 }}>
                        {p.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button className="action-btn primary" style={{ fontSize: 12, flex: 1 }} onClick={() => onEdit(p)}>✎ Edit</button>
                      <button className="action-btn danger" style={{ fontSize: 12, flex: 1 }} onClick={() => onDelete(p)}>🗑 Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Brand</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(p => {
                  const imgSrc = getImageUrlFrom(p.image) || getImageUrlFrom(p.images?.[0]);
                  return (
                    <tr key={p._id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f8fafc", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #f1f5f9" }}>
                            {imgSrc
                              ? <img src={imgSrc} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 2 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                              : <span style={{ fontSize: 20 }}>📦</span>}
                          </div>
                          <div>
                            <div style={{ color: "#1e293b", fontWeight: 600 }}>{p.name}</div>
                            {p.badge && <span style={{ fontSize: 10, color: "#2563eb", background: "#eff6ff", padding: "1px 7px", borderRadius: 10 }}>{p.badge}</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ textTransform: "capitalize", color: "#64748b" }}>{p.category ?? "—"}</td>
                      <td style={{ color: "#374151" }}>{p.brand}</td>
                      <td style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: "#0f172a" }}>{formatKES(p.price)}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, color: p.inStock ? "#059669" : "#dc2626", background: p.inStock ? "#dcfce7" : "#fee2e2", padding: "3px 9px", borderRadius: 10 }}>
                          {p.inStock ? "In Stock" : "Out of Stock"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="icon-btn" onClick={() => onEdit(p)} title="Edit">✎</button>
                          <button className="icon-btn danger" onClick={() => onDelete(p)} title="Delete">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}
        <Paginator pg={pg} onPage={onPage} />
      </div>
    </div>
  );
}

// ─── CategoriesView ───────────────────────────────────────────────────────────
function CategoriesView({ categories, loading, selectedCat, catProducts, catProductsLoading, onCatClick, onAdd, onEdit, onDelete }: {
  categories: Category[]; loading: boolean; selectedCat: Category | null;
  catProducts: Product[]; catProductsLoading: boolean;
  onCatClick: (c: Category) => void; onAdd: () => void; onEdit: (c: Category) => void; onDelete: (c: Category) => void;
}) {
  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ color: "#0f172a", fontWeight: 700, fontSize: 17 }}>Category Management</h2>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>{categories.length} categories in your store</p>
        </div>
        <button className="action-btn primary" onClick={onAdd}>＋ Add Category</button>
      </div>
      {loading ? <Spinner /> : (
        <div style={{ display: "grid", gridTemplateColumns: selectedCat ? "1fr 1.4fr" : "1fr", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, alignContent: "start" }}>
            {categories.length === 0 ? <EmptyState icon="🗂" text="No categories yet" /> : categories.map((cat, i) => {
              const color = getCatColor(cat.name);
              const icon  = getCatIcon(cat.name);
              const sel   = selectedCat?._id === cat._id;
              return (
                <div key={cat._id} className="card-hover" onClick={() => onCatClick(cat)} style={{ background: sel ? `${color}12` : "#ffffff", border: `1px solid ${sel ? color + "44" : "#e2e8f0"}`, borderRadius: 16, padding: "18px 16px", cursor: "pointer", animation: `fadeUp .4s ease ${i * 50}ms both`, boxShadow: sel ? `0 4px 16px ${color}22` : "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, fontSize: 22, background: `${color}15`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="icon-btn" style={{ fontSize: 13 }} onClick={e => { e.stopPropagation(); onEdit(cat); }}>✎</button>
                      <button className="icon-btn danger" style={{ fontSize: 13 }} onClick={e => { e.stopPropagation(); onDelete(cat); }}>🗑</button>
                    </div>
                  </div>
                  <div style={{ color: "#1e293b", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{cat.name}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>{cat.count ?? 0} products</span>
                    {sel && <span style={{ color, fontSize: 11, fontWeight: 600 }}>● open</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {selectedCat && (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 18, overflow: "hidden", animation: "slideIn .3s ease", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", background: `${getCatColor(selectedCat.name)}08`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{getCatIcon(selectedCat.name)}</span>
                  <div>
                    <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>{selectedCat.name}</div>
                    <div style={{ color: "#94a3b8", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{catProducts.length} products</div>
                  </div>
                </div>
                <button className="icon-btn" onClick={() => onCatClick(selectedCat)}>✕</button>
              </div>
              <div style={{ maxHeight: 440, overflow: "auto" }}>
                {catProductsLoading ? <Spinner /> : catProducts.length === 0 ? <EmptyState icon="📭" text="No products in this category" /> : catProducts.map(p => (
                  <div key={p._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 20px", borderBottom: "1px solid #f8fafc" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #f1f5f9" }}>
                      {getImageUrlFrom(p.image)
                        ? <img src={getImageUrlFrom(p.image)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 2 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        : <span>📦</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#1e293b", fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                      <div style={{ color: "#94a3b8", fontSize: 11 }}>{p.brand}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 13, fontFamily: "'DM Mono',monospace" }}>{formatKES(p.price)}</div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: p.inStock ? "#059669" : "#dc2626", background: p.inStock ? "#dcfce7" : "#fee2e2", padding: "1px 7px", borderRadius: 10 }}>
                        {p.inStock ? "In Stock" : "Out"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── VendorsView ──────────────────────────────────────────────────────────────
function VendorsView({ vendors, loading, pg, onApprove, approvingVendor, onPage }: {
  vendors: AppUser[]; loading: boolean; pg: Pagination;
  onApprove: (id: string, approve: boolean) => void; approvingVendor: string | null; onPage: (p: number) => void;
}) {
  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ color: "#0f172a", fontWeight: 700, fontSize: 17 }}>Vendor Management</h2>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>{vendors.filter(v => !v.isApproved).length} pending approvals · {vendors.length} total</p>
      </div>
      {loading ? <Spinner /> : vendors.length === 0 ? <EmptyState icon="🏪" text="No vendors registered yet" /> : (
        <div style={{ display: "grid", gap: 14 }}>
          {vendors.map((v, i) => (
            <div key={v._id} style={{ background: "#ffffff", border: `1px solid ${!v.isApproved ? "#fed7aa" : "#e2e8f0"}`, borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, animation: `fadeUp .4s ease ${i * 60}ms both`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: v.isApproved ? "#dcfce7" : "#fef9c3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🏪</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>{v.name}</div>
                {v.businessName && <div style={{ color: "#64748b", fontSize: 12 }}>{v.businessName}</div>}
                <div style={{ color: "#94a3b8", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>{v.email}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <StatusBadge status={v.isApproved ? "approved" : "pending"} />
                {!v.isApproved && (
                  <button className="action-btn primary" style={{ padding: "7px 14px", fontSize: 12 }} disabled={approvingVendor === v._id} onClick={() => onApprove(v._id, true)}>
                    {approvingVendor === v._id ? "…" : "✓ Approve"}
                  </button>
                )}
                {v.isApproved && (
                  <button className="action-btn danger" style={{ padding: "7px 14px", fontSize: 12 }} disabled={approvingVendor === v._id} onClick={() => onApprove(v._id, false)}>
                    {approvingVendor === v._id ? "…" : "Revoke"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Paginator pg={pg} onPage={onPage} />
    </div>
  );
}

// ─── CustomersView ────────────────────────────────────────────────────────────
function CustomersView({ customers, loading, pg, onPage }: { customers: AppUser[]; loading: boolean; pg: Pagination; onPage: (p: number) => void }) {
  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ color: "#0f172a", fontWeight: 700, fontSize: 17 }}>Customer Management</h2>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>{pg.total} registered customers</p>
      </div>
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        {loading ? <Spinner /> : customers.length === 0 ? <EmptyState icon="👥" text="No customers yet" /> : (
          <table>
            <thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Status</th><th>Joined</th></tr></thead>
            <tbody>
              {customers.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                        {u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ color: "#1e293b", fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#64748b" }}>{u.email}</td>
                  <td style={{ fontSize: 12, color: "#64748b" }}>{u.phone ?? "—"}</td>
                  <td><StatusBadge status={u.isActive !== false ? "active" : "inactive"} /></td>
                  <td style={{ color: "#94a3b8", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginator pg={pg} onPage={onPage} />
      </div>
    </div>
  );
}
