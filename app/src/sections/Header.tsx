import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, ShoppingCart, Heart, Menu, Phone, LogOut,
  LayoutDashboard, ChevronDown, ChevronRight, Search, X,
  Laptop, Smartphone, Headphones, Tag, ShoppingBag,
  Gamepad2, Tablet, Mouse, Camera, Watch, Cpu, Speaker,
  Keyboard, Package, Tv, Monitor, Zap, ArrowRight, Clock,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserMenuDropdown from '@/components/UserMenuDropdown';
import { pickFirstProductImage, resolveProductImageUrl } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ICON_MAP: Record<string, React.ElementType> = {
  laptops: Laptop, laptop: Laptop,
  phones: Smartphone, phone: Smartphone,
  audio: Headphones, headphones: Headphones, earphones: Headphones, earbuds: Headphones,
  speaker: Speaker, speakers: Speaker,
  gaming: Gamepad2, games: Gamepad2,
  tablets: Tablet, tablet: Tablet,
  accessories: Mouse, accessory: Mouse, keyboards: Keyboard, keyboard: Keyboard,
  cameras: Camera, camera: Camera,
  wearables: Watch, wearable: Watch, smartwatch: Watch,
  monitors: Monitor, monitor: Monitor,
  computers: Cpu, computer: Cpu, desktop: Cpu,
  tv: Tv, televisions: Tv,
  deals: Tag, shop: ShoppingBag, new: Zap,
};

function getCatIcon(id: string, name: string): React.ElementType {
  return (
    ICON_MAP[id.toLowerCase()] ||
    ICON_MAP[name.toLowerCase()] ||
    ICON_MAP[name.toLowerCase().split(/[\s_-]/)[0]] ||
    Package
  );
}

const CURATED_NAV = [
  { name: 'Home',                 href: '/'                  },
  { name: 'Shop',                 href: '/shop'               },
  { name: 'Laptops',              href: '/laptops'            },
  { name: 'Phones',               href: '/phones'             },
  { name: 'Computers & Monitors', href: '/computers-monitors' },
  { name: 'Accessories',          href: '/accessories'        },
  { name: 'Deals',                href: '/deals'              },
];

const TRENDING_SEARCHES = ['MacBook Air', 'iPhone 15', 'Samsung S24', 'Gaming Laptop', 'AirPods Pro'];

// ── FIX 1: Warm up the backend on page load to eliminate cold-start delay ──
// This fires a lightweight ping so the serverless function is already "hot"
// by the time the user types their first search.
let _warmedUp = false;
function warmUpSearch() {
  if (_warmedUp) return;
  _warmedUp = true;
  fetch(`${API_URL}/api/products?search=a&limit=1`).catch(() => {});
}

interface ApiCategory {
  _id?: string;
  id?: string;
  slug?: string;
  name: string;
  icon?: string;
}

interface Product {
  _id: string;
  id?: string;
  slug?: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  images?: Array<string | { url?: string }>;
  category: string;
  brand?: string;
  badge?: string;
}

function getCatRoute(id: string): string {
  const routes: Record<string, string> = {
    laptops:              '/laptops',
    phones:               '/phones',
    accessories:          '/accessories',
    deals:                '/deals',
    computers:            '/computers-monitors',
    monitors:             '/computers-monitors',
    'computers-monitors': '/computers-monitors',
  };
  return routes[id.toLowerCase()] || `/shop?category=${id}`;
}

function formatPrice(p: number) { return `KES ${p.toLocaleString()}`; }

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 3, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function Header() {
  const [isScrolled, setIsScrolled]           = useState(false);
  const [menuOpen, setMenuOpen]               = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showSearchDrop, setShowSearchDrop]   = useState(false);
  const [apiCategories, setApiCategories]     = useState<ApiCategory[]>([]);
  const [searchResults, setSearchResults]     = useState<Product[]>([]);
  const [searchLoading, setSearchLoading]     = useState(false);
  const [recentSearches, setRecentSearches]   = useState<string[]>([]);

  const { cartCount, setIsCartOpen, wishlist } = useStore();
  const { user, isAuthenticated, logout }      = useAuth();
  const navigate            = useNavigate();
  const dropdownRef         = useRef<HTMLDivElement>(null);
  const searchRef           = useRef<HTMLInputElement>(null);
  const mobileSearchRef     = useRef<HTMLInputElement>(null);
  const searchWrapRef       = useRef<HTMLDivElement>(null);
  const mobileSearchWrapRef = useRef<HTMLDivElement>(null);
  const debounceRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef            = useRef<AbortController | null>(null);
  const searchCacheRef      = useRef<Map<string, Product[]>>(new Map());
  const wishlistCount       = wishlist.length;

  // ── FIX 2: Keep selectedCatId as a simple string, not the full object ──
  // Storing the full object caused stale references when searchCategories rebuilt
  // on each render. A string ID is stable and avoids the entire class of bugs.
  const [selectedCatId, setSelectedCatId] = useState('all');

  const searchCategories = [
    { id: 'all', name: 'All Products', route: '/shop' },
    ...apiCategories.map(c => ({
      id:    c._id || c.id || c.slug || c.name.toLowerCase().replace(/\s+/g, '-'),
      name:  c.name,
      route: getCatRoute(c._id || c.id || c.slug || c.name.toLowerCase().replace(/\s+/g, '-')),
    })),
    { id: 'new', name: 'New Arrivals', route: '/shop?cat=new' },
  ];

  // Derive the selected category object fresh from the current list each render
  const selectedCat = searchCategories.find(c => c.id === selectedCatId) ?? searchCategories[0];

  useEffect(() => {
    // Fetch categories and warm up search backend simultaneously
    warmUpSearch();
    fetch(`${API_URL}/api/categories`)
      .then(r => r.json())
      .then(data => setApiCategories(data.categories || data || []))
      .catch(() => setApiCategories([]));
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('mzuri_recent_searches') || '[]');
      setRecentSearches(stored.slice(0, 5));
    } catch { setRecentSearches([]); }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setTimeout(() => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
          setShowCatDropdown(false);
        if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node))
          setShowSearchDrop(false);
        if (mobileSearchWrapRef.current && !mobileSearchWrapRef.current.contains(e.target as Node))
          setShowSearchDrop(false);
      }, 150);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => { setIsScrolled(window.scrollY > 10); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // ── FIX 3: Remove selectedCat.id from useCallback deps ──
  // Previously, every time selectedCat changed (which happened on EVERY render
  // because searchCategories was rebuilt), liveSearch got a new reference,
  // which triggered the debounce useEffect below to re-run and restart the
  // 380ms timer — causing apparent extra lag on every keystroke.
  // Now we read selectedCatId from a ref so the callback is stable forever.
  const selectedCatIdRef = useRef(selectedCatId);
  useEffect(() => { selectedCatIdRef.current = selectedCatId; }, [selectedCatId]);

  const liveSearch = useCallback(async (q: string) => {
    const catId = selectedCatIdRef.current;
    if (!q.trim()) { setSearchResults([]); setSearchLoading(false); return; }
    const key = `${catId}::${q.trim().toLowerCase()}`;
    const cached = searchCacheRef.current.get(key);
    if (cached) { setSearchResults(cached); setSearchLoading(false); return; }
    setSearchLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const catParam = catId !== 'all' ? `&category=${catId}` : '';
      const res  = await fetch(
        `${API_URL}/api/products?search=${encodeURIComponent(q)}${catParam}&limit=6`,
        { signal: controller.signal }
      );
      const data = await res.json();
      const results = data.products || data || [];
      searchCacheRef.current.set(key, results);
      setSearchResults(results);
    } catch (err: any) {
      if (err?.name !== 'AbortError') setSearchResults([]);
    } finally {
      if (!controller.signal.aborted) setSearchLoading(false);
    }
  }, []); // ← stable forever; reads catId via ref

  // ── FIX 4: Reduced debounce from 380ms → 220ms ──
  // Combined with the warm-up ping above, this makes results feel instant.
  // The abort controller already handles cancelling in-flight requests so
  // reducing debounce does not increase server load meaningfully.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length >= 2) {
      debounceRef.current = setTimeout(() => liveSearch(searchQuery), 220);
    } else { setSearchResults([]); setSearchLoading(false); }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, liveSearch]);

  const saveRecentSearch = (q: string) => {
    if (!q.trim()) return;
    const updated = [q, ...recentSearches.filter(r => r !== q)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('mzuri_recent_searches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => { setRecentSearches([]); localStorage.removeItem('mzuri_recent_searches'); };
  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };

  const goToShop = (cat: { id: string; route: string; name: string }, q?: string) => {
    const dedicatedRoutes = ['/laptops', '/phones', '/accessories', '/deals', '/computers-monitors'];
    if (dedicatedRoutes.includes(cat.route) && !q?.trim()) { navigate(cat.route); return; }
    const params = new URLSearchParams();
    if (cat.id !== 'all') params.set('cat', cat.id);
    if (q?.trim())        params.set('search', q.trim());
    const qs = params.toString();
    navigate(qs ? `${cat.route}?${qs}` : cat.route);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    saveRecentSearch(searchQuery.trim());
    goToShop(selectedCat, searchQuery);
    setSearchQuery(''); setShowSearchDrop(false);
    searchRef.current?.blur(); mobileSearchRef.current?.blur();
  };

  // ── FIX 5: handleCatSelect now sets ID only (not the full object) ──
  const handleCatSelect = (cat: typeof searchCategories[0]) => {
    setSelectedCatId(cat.id);
    setShowCatDropdown(false);
    goToShop(cat, searchQuery || undefined);
    searchRef.current?.focus();
    // Re-run search immediately with new category if there's an active query
    if (searchQuery.trim().length >= 2) {
      selectedCatIdRef.current = cat.id;
      liveSearch(searchQuery);
    }
  };

  const handleProductClick = (product: Product) => {
    const pid = product._id || product.id || product.slug;
    if (!pid) return;
    saveRecentSearch(searchQuery.trim());
    setSearchQuery('');
    setShowSearchDrop(false);
    navigate(`/product/${pid}`);
  };

  return (
    <>
      <style>{`
        .cat-dropdown{position:absolute;top:calc(100% + 8px);left:0;min-width:220px;background:white;border:1.5px solid #e2e8f0;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.12);overflow:hidden;z-index:999;animation:hdr-fade .15s ease;max-height:320px;overflow-y:auto}
        .cat-item{display:flex;align-items:center;gap:10px;padding:10px 16px;font-size:13px;font-weight:500;color:#374151;cursor:pointer;transition:background .15s;border:none;background:none;width:100%;text-align:left;font-family:inherit}
        .cat-item:hover,.cat-item.active{background:#f0f7ff;color:#1d4ed8}
        .cat-icon-wrap{color:#94a3b8;flex-shrink:0;transition:color .15s}
        .cat-item:hover .cat-icon-wrap,.cat-item.active .cat-icon-wrap{color:#1d4ed8}
        .search-wrap{display:flex;align-items:center;background:#f1f5f9;border:1.5px solid transparent;border-radius:12px;overflow:visible;transition:all .2s;position:relative}
        .search-wrap:focus-within{background:white;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
        .cat-trigger{display:flex;align-items:center;gap:5px;padding:0 10px 0 14px;height:40px;font-size:12px;font-weight:600;color:#475569;background:none;border:none;border-right:1.5px solid #e2e8f0;cursor:pointer;white-space:nowrap;transition:color .15s;flex-shrink:0;font-family:inherit}
        .cat-trigger:hover{color:#1d4ed8}
        .search-wrap:focus-within .cat-trigger{border-right-color:#bfdbfe}
        .search-field{flex:1;border:none;background:transparent;outline:none;font-size:13.5px;color:#1e293b;padding:0 10px;height:40px;font-family:inherit;min-width:0}
        .search-field::-webkit-search-cancel-button{display:none;-webkit-appearance:none}
        .search-field::-ms-clear{display:none}
        .search-field::placeholder{color:#94a3b8}
        .search-submit{display:flex;align-items:center;justify-content:center;width:36px;height:32px;margin:4px;background:linear-gradient(135deg,#1d4ed8,#3b82f6);border:none;border-radius:8px;cursor:pointer;flex-shrink:0;transition:all .2s}
        .search-submit:hover{box-shadow:0 3px 10px rgba(59,130,246,.4);transform:scale(1.05)}
        .search-results-drop{position:absolute;top:calc(100% + 10px);left:0;right:0;background:white;border:1.5px solid #e2e8f0;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.14);z-index:998;overflow:hidden;animation:hdr-fade .18s ease}
        @keyframes hdr-fade{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .srd-section-label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;padding:12px 16px 6px}
        .srd-trending-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;background:#f1f5f9;border:1.5px solid #e2e8f0;font-size:12px;font-weight:500;color:#475569;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit}
        .srd-trending-chip:hover{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
        .srd-recent-item{display:flex;align-items:center;gap:10px;padding:8px 16px;cursor:pointer;transition:background .15s;font-size:13px;color:#374151;width:100%;border:none;background:none;font-family:inherit;text-align:left}
        .srd-recent-item:hover{background:#f8fafc}
        .srd-product-item{display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;transition:background .15s}
        .srd-product-item:hover{background:#f8fafc}
        .srd-product-img{width:44px;height:44px;border-radius:10px;object-fit:contain;background:#f1f5f9;flex-shrink:0;border:1px solid #f1f5f9}
        .srd-product-img-ph{width:44px;height:44px;border-radius:10px;background:#f1f5f9;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1px solid #e2e8f0}
        .srd-view-all{display:flex;align-items:center;justify-content:center;gap:6px;padding:12px 16px;font-size:13px;font-weight:600;color:#1d4ed8;background:#f8fafc;border-top:1.5px solid #f1f5f9;cursor:pointer;transition:background .15s;border:none;width:100%;font-family:inherit}
        .srd-view-all:hover{background:#eff6ff}
        .srd-loading{display:flex;align-items:center;justify-content:center;padding:24px;gap:8px;color:#94a3b8;font-size:13px}
        .srd-no-results{display:flex;flex-direction:column;align-items:center;padding:28px 16px;color:#94a3b8;font-size:13px;gap:6px}
        .srd-spinner{width:18px;height:18px;border:2px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin .6s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .srd-divider{height:1px;background:#f1f5f9;margin:4px 0}
        .hdr-link{position:relative;font-size:13.5px;font-weight:500;transition:color .25s;color:inherit;text-decoration:none;white-space:nowrap}
        .hdr-link::after{content:'';position:absolute;bottom:-4px;left:0;width:0;height:2px;background:#2563eb;transition:width .25s;border-radius:2px}
        .hdr-link:hover{color:#2563eb}
        .hdr-link:hover::after{width:100%}
        .slide-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:50;animation:fadeIn .2s ease}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .slide-menu{position:fixed;top:0;left:0;height:100%;width:82vw;max-width:320px;background:white;z-index:51;display:flex;flex-direction:column;box-shadow:4px 0 24px rgba(0,0,0,.15);animation:slideIn .25s cubic-bezier(.4,0,.2,1)}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        .slide-header{display:flex;align-items:center;justify-content:space-between;padding:18px 16px 14px;border-bottom:1px solid #f1f5f9}
        .slide-body{flex:1;overflow-y:auto;padding-bottom:20px}
        .slide-nav-item{display:flex;align-items:center;justify-content:space-between;padding:15px 20px;border-bottom:1px solid #f1f5f9;color:#111827;font-size:15px;font-weight:500;text-decoration:none;transition:background .15s;cursor:pointer;background:none;border-left:none;border-right:none;border-top:none;width:100%;font-family:inherit;text-align:left}
        .slide-nav-item:hover{background:#f8fafc;color:#1d4ed8}
        .slide-nav-item:last-child{border-bottom:none}
        .slide-section-label{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;padding:16px 20px 8px}
        .slide-footer{padding:16px 20px;border-top:1px solid #f1f5f9;display:flex;flex-direction:column;gap:10px}
        .mob-row{display:flex;align-items:center;width:100%;gap:6px}
        .mob-logo{display:flex;align-items:center;justify-content:flex-start;min-width:0;margin-right:auto}
        .mob-icons{display:flex;align-items:center;gap:2px;flex-shrink:0}
        .mob-search-row{width:100%;position:relative}
        .mob-search-bar{display:flex;background:#fff;border-radius:999px;overflow:hidden;border:2px solid #ef4444;width:100%;box-sizing:border-box}
        .mob-search-bar:focus-within{border-color:#dc2626;box-shadow:0 0 0 3px rgba(239,68,68,.12)}
        .mob-search-input{flex:1;border:none;background:transparent;outline:none;padding:9px 14px;font-size:13px;font-family:inherit;color:#1e293b;min-width:0}
        .mob-search-input::-webkit-search-cancel-button{display:none;-webkit-appearance:none}
        .mob-search-input::-ms-clear{display:none}
        .mob-search-input::placeholder{color:#9ca3af}
        .mob-search-btn{width:40px;background:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      `}</style>

      {/* ── LEFT SLIDE MENU (mobile) ── */}
      {menuOpen && (
        <>
          <div className="slide-overlay" onClick={() => setMenuOpen(false)} />
          <div className="slide-menu">
            <div className="slide-header">
              <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <span className="text-base font-bold text-gray-900">MzuriTech</span>
              </Link>
              <button onClick={() => setMenuOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
                <X size={18} color="#374151" />
              </button>
            </div>

            <div className="slide-body">
              {isAuthenticated ? (
                <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Welcome back,</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0d2b47' }}>{user?.name || 'User'}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1 bg-primary">
                    <Link to="/register" onClick={() => setMenuOpen(false)}>Register</Link>
                  </Button>
                </div>
              )}

              <div className="slide-section-label">Navigation</div>
              {CURATED_NAV.map(link => (
                <Link key={link.href} to={link.href} onClick={() => setMenuOpen(false)} className="slide-nav-item">
                  <span>{link.name}</span>
                  <ChevronRight size={16} color="#d1d5db" />
                </Link>
              ))}

              <div className="slide-section-label">Categories</div>
              {searchCategories.filter(c => c.id !== 'all').map(cat => {
                const Icon = getCatIcon(cat.id, cat.name);
                return (
                  <button key={cat.id} className="slide-nav-item" onClick={() => { goToShop(cat); setMenuOpen(false); }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Icon size={16} color="#6b7280" />{cat.name}
                    </span>
                    <ChevronRight size={16} color="#d1d5db" />
                  </button>
                );
              })}

              <div className="slide-section-label">Trending Searches</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 20px 16px' }}>
                {TRENDING_SEARCHES.map(term => (
                  <button key={term} className="srd-trending-chip" onClick={() => { setSearchQuery(term); setMenuOpen(false); }}>
                    <Search size={11} /> {term}
                  </button>
                ))}
              </div>
            </div>

            <div className="slide-footer">
              {isAuthenticated && (
                <>
                  <Link to={user?.role === 'admin' ? '/admin' : '/profile'} onClick={() => setMenuOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#374151', textDecoration: 'none', padding: '4px 0' }}>
                    <LayoutDashboard size={16} color="#6b7280" />
                    {user?.role === 'admin' ? 'Admin Dashboard' : 'My Profile'}
                  </Link>
                  <Link to="/orders" onClick={() => setMenuOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#374151', textDecoration: 'none', padding: '4px 0' }}>
                    <ShoppingBag size={16} color="#6b7280" /> My Orders
                  </Link>
                  <button onClick={handleLogout}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}>
                    <LogOut size={16} /> Logout
                  </button>
                </>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                <Phone size={14} /> 1-800-MZURITECH
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── FIXED HEADER ── */}
      <header
        className={`fixed z-40 transition-shadow duration-300 py-2 ${
          isScrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg' : 'bg-white/95 backdrop-blur-md shadow-sm'
        }`}
        style={{ top: 0, left: 0, width: '100vw', maxWidth: '100vw', boxSizing: 'border-box' }}
      >
        <div className="section-padding">

          {/* ══ DESKTOP ══ */}
          <div className="hidden md:flex items-center justify-between gap-2 min-w-0">
            <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-primary rounded-xl flex items-center justify-center group-hover:shadow-glow transition-shadow">
                <span className="text-white font-bold text-lg md:text-xl">M</span>
              </div>
              <span className={`text-sm sm:text-base md:text-xl font-bold truncate max-w-[120px] sm:max-w-none ${isScrolled ? 'text-secondary' : 'text-gray-900'}`}>
                MzuriTech
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-5 flex-1 justify-center">
              {CURATED_NAV.map(link => (
                <Link key={link.href} to={link.href} className={`hdr-link ${isScrolled ? 'text-gray-700' : 'text-gray-800'}`}>
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Desktop search */}
            <div ref={searchWrapRef} style={{ position: 'relative' }}>
              <div ref={dropdownRef}>
                <form onSubmit={handleSearch}>
                  <div className="search-wrap" style={{ width: 300 }}>
                    <button type="button" className="cat-trigger" onClick={() => setShowCatDropdown(v => !v)}>
                      <span style={{ maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedCat.name === 'All Products' ? 'All' : selectedCat.name}
                      </span>
                      <ChevronDown size={13} style={{ transition: 'transform .2s', transform: showCatDropdown ? 'rotate(180deg)' : 'none' }} />
                    </button>
                    <input ref={searchRef} type="search" className="search-field" placeholder="Search products..."
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      onFocus={() => setShowSearchDrop(true)} autoComplete="off" />
                    {searchQuery && (
                      <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); searchRef.current?.focus(); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                        <X size={14} />
                      </button>
                    )}
                    <button type="submit" className="search-submit"><Search size={14} color="white" strokeWidth={2.5} /></button>
                    {showCatDropdown && (
                      <div className="cat-dropdown">
                        <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em' }}>Browse by category</div>
                        {searchCategories.map(cat => {
                          const Icon = getCatIcon(cat.id, cat.name);
                          return (
                            <button key={cat.id} type="button" className={`cat-item${selectedCat.id === cat.id ? ' active' : ''}`} onClick={() => handleCatSelect(cat)}>
                              <span className="cat-icon-wrap"><Icon size={15} /></span>
                              {cat.name}
                              {selectedCat.id === cat.id && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#1d4ed8', fontWeight: 700 }}>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {showSearchDrop && !showCatDropdown && (
                <div className="search-results-drop">
                  {searchLoading && <div className="srd-loading"><div className="srd-spinner" /> Searching…</div>}
                  {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length > 0 && (
                    <>
                      <div className="srd-section-label">Products</div>
                      {searchResults.map(product => {
                        const imgSrc = resolveProductImageUrl(pickFirstProductImage(product.image, product.images));
                        return (
                          <div
                            key={product._id || product.id || product.slug}
                            className="srd-product-item"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleProductClick(product); }}
                          >
                            {imgSrc ? <img src={imgSrc} alt={product.name} className="srd-product-img" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex'); }} /> : null}
                            <div className="srd-product-img-ph" style={{ display: imgSrc ? 'none' : 'flex' }}><Package size={18} color="#cbd5e1" /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 500, color: '#1e293b', lineHeight: 1.3 }}>
                                {highlight(product.name, searchQuery)}
                                {product.badge && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: '#dbeafe', color: '#1d4ed8', marginLeft: 6 }}>{product.badge}</span>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d4ed8' }}>{formatPrice(product.price)}</span>
                                {product.originalPrice && product.originalPrice > product.price && <span style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through', marginLeft: 5 }}>{formatPrice(product.originalPrice)}</span>}
                              </div>
                            </div>
                            <ArrowRight size={14} color="#cbd5e1" style={{ flexShrink: 0 }} />
                          </div>
                        );
                      })}
                      <button
                        className="srd-view-all"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveRecentSearch(searchQuery); goToShop(selectedCat, searchQuery); setShowSearchDrop(false); setSearchQuery(''); }}
                      >
                        View all results for "{searchQuery}" <ArrowRight size={14} />
                      </button>
                    </>
                  )}
                  {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                    <div className="srd-no-results">
                      <Search size={28} color="#e2e8f0" />
                      <span>No products found for "<strong>{searchQuery}</strong>"</span>
                    </div>
                  )}
                  {!searchLoading && searchQuery.trim().length < 2 && (
                    <>
                      {recentSearches.length > 0 && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
                            <span className="srd-section-label" style={{ padding: 0 }}>Recent</span>
                            <button onClick={clearRecentSearches} style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
                          </div>
                          {recentSearches.map(term => (
                            <button key={term} className="srd-recent-item" onClick={() => { setSearchQuery(term); searchRef.current?.focus(); }}>
                              <Clock size={13} color="#cbd5e1" /> {term}
                            </button>
                          ))}
                          <div className="srd-divider" />
                        </>
                      )}
                      <div className="srd-section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <TrendingUp size={11} /> Trending searches
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 16px 14px' }}>
                        {TRENDING_SEARCHES.map(term => (
                          <button key={term} className="srd-trending-chip" onClick={() => { setSearchQuery(term); setShowSearchDrop(true); searchRef.current?.focus(); }}>
                            <Search size={11} /> {term}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>{/* end desktop search */}

            <Link to="/wishlist" className="relative flex w-10 h-10 rounded-full items-center justify-center hover:bg-gray-100 transition-colors">
              <Heart className="w-5 h-5 text-gray-600" />
              {wishlistCount > 0 && <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">{wishlistCount}</Badge>}
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center gap-1">
                <Link to={user?.role === 'admin' ? '/admin' : '/profile'} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0">
                  <User className="w-5 h-5 text-gray-600" />
                </Link>
                <button onClick={handleLogout} title="Logout" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-red-500">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : <UserMenuDropdown />}
            <button onClick={() => setIsCartOpen(true)} className="relative flex w-10 h-10 rounded-full items-center justify-center hover:bg-gray-100 transition-colors">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {cartCount > 0 && <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-primary text-white text-xs">{cartCount}</Badge>}
            </button>
          </div>{/* ══ END DESKTOP ══ */}

          {/* ══ MOBILE ══ */}
          <div className="md:hidden flex flex-col gap-2" ref={mobileSearchWrapRef}>

            <div className="mob-row">
              <button onClick={() => setMenuOpen(true)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0">
                <Menu className="w-[18px] h-[18px] text-gray-600" />
              </button>

              <div className="mob-logo">
                <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">M</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 whitespace-nowrap">MzuriTech</span>
                </Link>
              </div>

              <div className="mob-icons">
                <Link to="/wishlist" className="relative w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <Heart className="w-[15px] h-[15px] text-gray-600" />
                  {wishlistCount > 0 && <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center bg-red-500 text-white text-[9px]">{wishlistCount}</Badge>}
                </Link>
                <Link to={isAuthenticated ? (user?.role === 'admin' ? '/admin' : '/profile') : '/login'}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <User className="w-[15px] h-[15px] text-gray-600" />
                </Link>
                <button onClick={() => setIsCartOpen(true)} className="relative w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <ShoppingCart className="w-[15px] h-[15px] text-gray-600" />
                  {cartCount > 0 && <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center bg-primary text-white text-[9px]">{cartCount}</Badge>}
                </button>
              </div>
            </div>

            {/* Search bar row */}
            <div className="mob-search-row">
              <form onSubmit={handleSearch} style={{ width: '100%' }}>
                <div className="mob-search-bar">
                  <input ref={mobileSearchRef} type="search" className="mob-search-input"
                    placeholder="Search products..." value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowSearchDrop(true); }}
                    autoComplete="off" onFocus={() => setShowSearchDrop(true)} />
                  {searchQuery && (
                    <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); mobileSearchRef.current?.focus(); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', color: '#94a3b8', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <X size={14} />
                    </button>
                  )}
                  <button type="submit" className="mob-search-btn"><Search size={16} color="#111827" /></button>
                </div>
              </form>

              {showSearchDrop && (
                <div style={{ borderRadius: 12, border: '1.5px solid #e2e8f0', overflow: 'hidden', background: 'white', marginTop: 6 }}>
                  {searchLoading && <div className="srd-loading"><div className="srd-spinner" /> Searching...</div>}
                  {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length > 0 && (
                    <>
                      <div className="srd-section-label">Products</div>
                      {searchResults.slice(0, 4).map(product => {
                        const imgSrc = resolveProductImageUrl(pickFirstProductImage(product.image, product.images));
                        return (
                          <div
                            key={product._id || product.id || product.slug}
                            className="srd-product-item"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleProductClick(product); }}
                          >
                            {imgSrc ? <img src={imgSrc} alt={product.name} className="srd-product-img" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex'); }} /> : null}
                            <div className="srd-product-img-ph" style={{ display: imgSrc ? 'none' : 'flex' }}><Package size={18} color="#cbd5e1" /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{highlight(product.name, searchQuery)}</div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginTop: 2 }}>{formatPrice(product.price)}</div>
                            </div>
                            <ArrowRight size={14} color="#cbd5e1" />
                          </div>
                        );
                      })}
                      <button
                        className="srd-view-all"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveRecentSearch(searchQuery); goToShop(selectedCat, searchQuery); setShowSearchDrop(false); setSearchQuery(''); }}
                      >
                        View all results <ArrowRight size={14} />
                      </button>
                    </>
                  )}
                  {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                    <div className="srd-no-results">
                      <Search size={24} color="#e2e8f0" />
                      <span style={{ fontSize: 13 }}>No results for "<strong>{searchQuery}</strong>"</span>
                    </div>
                  )}
                  {!searchLoading && searchQuery.trim().length < 2 && (
                    <>
                      {recentSearches.length > 0 && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
                            <span className="srd-section-label" style={{ padding: 0 }}>Recent</span>
                            <button onClick={clearRecentSearches} style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
                          </div>
                          {recentSearches.map(term => (
                            <button key={term} className="srd-recent-item" onClick={() => { setSearchQuery(term); mobileSearchRef.current?.focus(); }}>
                              <Clock size={13} color="#cbd5e1" /> {term}
                            </button>
                          ))}
                          <div className="srd-divider" />
                        </>
                      )}
                      <div className="srd-section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <TrendingUp size={11} /> Trending searches
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 16px 14px' }}>
                        {TRENDING_SEARCHES.map(term => (
                          <button key={term} className="srd-trending-chip" onClick={() => { setSearchQuery(term); setShowSearchDrop(true); mobileSearchRef.current?.focus(); }}>
                            <Search size={11} /> {term}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>{/* ══ END MOBILE ══ */}

        </div>
      </header>
    </>
  );
}