import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart, Heart, ArrowLeft, Star, Shield,
  Truck, RotateCcw, Package, ChevronRight, Minus, Plus,
  X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/button';
import { pickFirstProductImage, resolveProductImageUrl } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';;

function imgSrc(image?: string): string {
  return resolveProductImageUrl(image ?? '');
}

interface Product {
  _id: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  originalPrice?: number;
  brand?: string;
  category: string;
  image?: string;
  images?: string[];
  stockQuantity?: number;
  inStock?: boolean;
  badge?: string;
  rating?: number;
  numReviews?: number;
  isFeatured?: boolean;
  specs?: Record<string, string>;
}

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={16}
          fill={s <= Math.round(rating) ? '#f59e0b' : 'none'}
          color={s <= Math.round(rating) ? '#f59e0b' : '#d1d5db'}
          strokeWidth={1.5}
        />
      ))}
      <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 2 }}>
        {rating.toFixed(1)}{count ? ` (${count} reviews)` : ''}
      </span>
    </div>
  );
}

// ── Responsive hook ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMobile;
}

export default function ProductDetail() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const isMobile   = useIsMobile();
  const { addToCart, wishlist, toggleWishlist } = useStore();

  const [product, setProduct]         = useState<Product | null>(null);
  const [related, setRelated]         = useState<Product[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [qty, setQty]                 = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeImg, setActiveImg]     = useState('');
  const [specsOpen, setSpecsOpen]     = useState(false);

  const isWishlisted = wishlist.some((w: any) => w._id === product?._id || w.id === product?._id);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    fetch(`${API_URL}/api/products/${id}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(data => {
        const p: Product = data.product || data;
        setProduct(p);

        // ✅ FIX: Try p.image first, then fall back to p.images[0]
        const firstImage = pickFirstProductImage(p.image, p.images as any);
        setActiveImg(imgSrc(firstImage));

        return fetch(`${API_URL}/api/products?category=${p.category}&limit=4`);
      })
      .then(r => r.json())
      .then(data => {
        const all: Product[] = data.products || data || [];
        setRelated(all.filter(p => p._id !== id).slice(0, 4));
      })
      .catch(() => setError('Product not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    for (let i = 0; i < qty; i++) addToCart(product as any);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const discount = product?.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <span style={{ color: '#94a3b8', fontSize: 14 }}>Loading product…</span>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !product) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Package size={56} color="#e2e8f0" />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Product not found</h2>
      <p style={{ color: '#94a3b8', fontSize: 14 }}>{error}</p>
      <Button onClick={() => navigate(-1)} variant="outline">
        <ArrowLeft size={15} className="mr-2" /> Go Back
      </Button>
    </div>
  );

  // ✅ FIX: Build allImages using same fallback logic
  const allImages = [
    pickFirstProductImage(product.image, product.images as any),
    ...(product.images || []),
  ]
    .filter((img, index, arr) => Boolean(img) && arr.indexOf(img) === index) // remove nulls & deduplicate
    .map(img => imgSrc(img));

  const hasSpecs = product.specs && Object.keys(product.specs).length > 0;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }

        .specs-modal-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: flex-end;
          animation: fade-in .2s ease;
        }
        .specs-modal-sheet {
          width: 100%; background: white;
          border-radius: 20px 20px 0 0;
          max-height: 80vh; overflow-y: auto;
          padding: 0 0 32px;
          animation: slide-up .25s ease;
        }
        @keyframes fade-in  { from { opacity: 0 }            to { opacity: 1 } }
        @keyframes slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }

        .specs-accordion {
          border: 1.5px solid #f1f5f9;
          border-radius: 14px;
          overflow: hidden;
          margin-top: 24px;
        }
        .specs-accordion-trigger {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px; background: #f8fafc;
          border: none; cursor: pointer; font-family: inherit;
          font-size: 14px; font-weight: 700; color: #1e293b;
          transition: background .15s;
        }
        .specs-accordion-trigger:hover { background: #f1f5f9; }
        .specs-table { width: 100%; border-collapse: collapse; }
        .specs-table tr:not(:last-child) td { border-bottom: 1px solid #f1f5f9; }
        .specs-table td { padding: 10px 18px; font-size: 13px; vertical-align: top; }
        .specs-table td:first-child { color: #64748b; font-weight: 600; width: 40%; }
        .specs-table td:last-child  { color: #1e293b; }

        .related-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 640px) {
          .related-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 900px) {
          .related-grid { grid-template-columns: repeat(4, 1fr); }
        }

        .product-main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 28px;
          align-items: start;
        }
        @media (min-width: 768px) {
          .product-main-grid {
            grid-template-columns: 1fr 1fr;
            gap: 48px;
          }
        }

        .trust-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .thumb-strip {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        .view-specs-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          background: white;
          font-size: 13px; font-weight: 600; color: #374151;
          cursor: pointer; font-family: inherit;
          transition: all .15s;
        }
        .view-specs-btn:hover { border-color: #3b82f6; color: #1d4ed8; background: #eff6ff; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '90px 16px 48px' : '100px 20px 60px' }}>

        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', marginBottom: 24, flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }} className="hover:text-primary">Home</Link>
          <ChevronRight size={13} />
          <Link to="/shop" style={{ color: '#94a3b8', textDecoration: 'none' }} className="hover:text-primary">Shop</Link>
          <ChevronRight size={13} />
          <Link to={`/${product.category}`} style={{ color: '#94a3b8', textDecoration: 'none', textTransform: 'capitalize' }} className="hover:text-primary">
            {product.category}
          </Link>
          <ChevronRight size={13} />
          <span style={{ color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 140 : 'none' }}>
            {product.name}
          </span>
        </nav>

        {/* ── Main product section ── */}
        <div className="product-main-grid">

          {/* Image gallery */}
          <div>
            <div style={{
              background: '#f8fafc', borderRadius: 20, overflow: 'hidden',
              aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid #f1f5f9', position: 'relative',
            }}>
              {product.badge && (
                <span style={{ position: 'absolute', top: 16, left: 16, background: '#1d4ed8', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                  {product.badge}
                </span>
              )}
              {activeImg
                ? <img src={activeImg} alt={product.name} style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                : <Package size={80} color="#e2e8f0" />
              }
            </div>

            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="thumb-strip">
                {allImages.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(img)}
                    style={{
                      width: 60, height: 60, borderRadius: 10, overflow: 'hidden',
                      border: activeImg === img ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                      background: '#f8fafc', cursor: 'pointer', padding: 4, flexShrink: 0,
                    }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div>
            {product.brand && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {product.brand}
              </span>
            )}

            <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: '#0f172a', marginTop: 6, marginBottom: 12, lineHeight: 1.25 }}>
              {product.name}
            </h1>

            {product.rating && (
              <div style={{ marginBottom: 16 }}>
                <StarRating rating={product.rating} count={product.numReviews} />
              </div>
            )}

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: isMobile ? 26 : 30, fontWeight: 800, color: '#0f172a' }}>
                KES {product.price.toLocaleString()}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span style={{ fontSize: 17, color: '#94a3b8', textDecoration: 'line-through' }}>
                    KES {product.originalPrice.toLocaleString()}
                  </span>
                  <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                    Save {discount}%
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            <p style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.7, marginBottom: 20, borderTop: '1px solid #f1f5f9', paddingTop: 18 }}>
              {product.description}
            </p>

            {/* Specs */}
            {hasSpecs && (
              <div style={{ marginBottom: 20 }}>
                {isMobile ? (
                  <button className="view-specs-btn" onClick={() => setSpecsOpen(true)}>
                    View Specs <ChevronRight size={14} />
                  </button>
                ) : (
                  <div className="specs-accordion">
                    <button className="specs-accordion-trigger" onClick={() => setSpecsOpen(v => !v)}>
                      <span>Technical Specifications</span>
                      {specsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {specsOpen && (
                      <table className="specs-table">
                        <tbody>
                          {Object.entries(product.specs!).map(([key, val]) => (
                            <tr key={key}>
                              <td>{key}</td>
                              <td>{val}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stock status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, fontSize: 13 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: product.inStock !== false ? '#22c55e' : '#ef4444' }} />
              <span style={{ color: product.inStock !== false ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                {product.inStock !== false
                  ? `In Stock${product.stockQuantity ? ` (${product.stockQuantity} available)` : ''}`
                  : 'Out of Stock'}
              </span>
            </div>

            {/* Quantity selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Qty:</span>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  style={{ width: 36, height: 36, border: 'none', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
                  <Minus size={14} />
                </button>
                <span style={{ width: 40, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.stockQuantity || 99, q + 1))}
                  style={{ width: 36, height: 36, border: 'none', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              <button onClick={handleAddToCart} disabled={product.inStock === false}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '13px 20px', borderRadius: 12, border: 'none',
                  cursor: product.inStock === false ? 'not-allowed' : 'pointer',
                  background: addedToCart ? '#16a34a' : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                  color: 'white', fontSize: 14, fontWeight: 700, transition: 'all .2s',
                  opacity: product.inStock === false ? .5 : 1,
                }}>
                <ShoppingCart size={17} />
                {addedToCart ? '✓ Added to Cart!' : 'Add to Cart'}
              </button>
              <button onClick={() => product && toggleWishlist(product as any)}
                style={{
                  width: 48, height: 48, borderRadius: 12, border: '1.5px solid #e2e8f0',
                  background: isWishlisted ? '#fef2f2' : 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .2s', flexShrink: 0,
                }}>
                <Heart size={18} fill={isWishlisted ? '#ef4444' : 'none'} color={isWishlisted ? '#ef4444' : '#94a3b8'} />
              </button>
            </div>

            {/* Trust badges */}
            <div className="trust-grid">
              {[
                { icon: <Truck size={16} />,     title: 'Free Delivery',     sub: 'Orders over KES 50,000' },
                { icon: <Shield size={16} />,    title: 'Genuine Products',  sub: '100% authentic'         },
                { icon: <RotateCcw size={16} />, title: 'Easy Returns',      sub: '30-day return policy'   },
                { icon: <Package size={16} />,   title: 'Secure Packaging',  sub: 'Safe & protected'       },
              ].map(({ icon, title, sub }) => (
                <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#3b82f6', marginTop: 1, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{title}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Related products ── */}
        {related.length > 0 && (
          <div style={{ marginTop: 56 }}>
            <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>You may also like</h2>
            <div className="related-grid">
              {related.map(p => (
                <Link key={p._id} to={`/product/${p._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #f1f5f9', overflow: 'hidden', transition: 'box-shadow .2s, transform .2s' }}
                    className="hover:shadow-md hover:-translate-y-1">
                    <div style={{ background: '#f8fafc', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                      {(p.image || (p.images && p.images[0]))
                        ? <img src={imgSrc(p.image || p.images?.[0])} alt={p.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                        : <Package size={40} color="#e2e8f0" />
                      }
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1d4ed8' }}>KES {p.price.toLocaleString()}</div>
                      {p.originalPrice && p.originalPrice > p.price && (
                        <div style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through' }}>KES {p.originalPrice.toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Specs bottom-sheet modal (mobile only) ── */}
      {specsOpen && isMobile && (
        <div className="specs-modal-overlay" onClick={() => setSpecsOpen(false)}>
          <div className="specs-modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: '#e2e8f0' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 14px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>Technical Specifications</h3>
              <button onClick={() => setSpecsOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={15} color="#64748b" />
              </button>
            </div>
            {hasSpecs ? (
              <table className="specs-table" style={{ width: '100%' }}>
                <tbody>
                  {Object.entries(product.specs!).map(([key, val], i) => (
                    <tr key={key} style={{ background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
                      <td style={{ padding: '11px 20px', fontSize: 13, color: '#64748b', fontWeight: 600, width: '40%', borderBottom: '1px solid #f1f5f9' }}>{key}</td>
                      <td style={{ padding: '11px 20px', fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ padding: '16px 20px', fontSize: 14, color: '#94a3b8' }}>No specifications available.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
