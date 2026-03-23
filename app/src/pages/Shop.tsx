import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useStore } from '@/context/StoreContext';
import type { Product } from '@/types';
import ProductImage from '@/components/ProductImage';
import { products as staticProducts } from '@/data/products';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';;

const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string' || !url.trim()) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
};

const findFallbackImage = (productName: string): string => {
  const normalizedName = productName.toLowerCase();
  const staticProduct = staticProducts.find(sp =>
    normalizedName.includes(sp.name.toLowerCase()) ||
    sp.name.toLowerCase().includes(normalizedName)
  );
  return staticProduct?.image || '';
};

const convertProduct = (p: any): Product | null => {
  if (!p) return null;
  let primaryImage = p.images?.find((img: any) => img.isPrimary)?.url
    || p.images?.[0]?.url
    || p.image
    || '';
  if (!isValidImageUrl(primaryImage)) primaryImage = findFallbackImage(p.name);
  return {
    id:            p._id || p.id || '',
    name:          p.name || 'Unnamed Product',
    description:   p.description || p.shortDescription || '',
    price:         p.price || 0,
    originalPrice: p.discountPrice || p.originalPrice || undefined,
    image:         primaryImage,
    images:        p.images?.map((img: any) => img.url || img) || [],
    category:      typeof p.category === 'object' ? p.category?.name || 'uncategorized' : p.category || 'uncategorized',
    brand:         p.brand || 'Unknown',
    rating:        p.rating?.average ?? p.rating ?? 0,
    reviews:       p.rating?.count ?? p.numReviews ?? p.reviews ?? 0,
    inStock:       (p.stock ?? p.stockQuantity ?? 0) > 0,
    stockQuantity: p.stock ?? p.stockQuantity ?? 0,
    badge:         p.badge || undefined,
    specs:         p.specifications || p.specs || undefined,
    features:      p.tags || p.features || [],
    isActive:      p.isActive ?? true,
    isFeatured:    p.isFeatured ?? false,
  };
};

const ALL_CATEGORIES = ['all', 'laptops', 'phones', 'audio', 'gaming', 'tablets', 'accessories'];
const ALL_BRANDS     = ['all', 'Dell', 'Apple', 'Samsung', 'Sony', 'ASUS', 'HP', 'Lenovo'];

export default function Shop() {
  const [searchParams] = useSearchParams();

  // ── Read URL params on mount ──────────────────────────────────────────
  const urlCat      = searchParams.get('cat')      || 'all';
  const urlSearch   = searchParams.get('search')   || '';
  const urlFeatured = searchParams.get('featured') || '';

  const [selectedCategory, setSelectedCategory] = useState<string>(urlCat);
  const [selectedBrands, setSelectedBrands]     = useState<string[]>(['all']);
  const [priceRange, setPriceRange]             = useState<string>('all');
  const [inStockOnly, setInStockOnly]           = useState(false);
  const [searchQuery, setSearchQuery]           = useState(urlSearch);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading]     = useState(false);

  // Sync URL params when they change (e.g. navigating from header search)
  useEffect(() => {
    setSelectedCategory(searchParams.get('cat') || 'all');
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  const allProducts = (() => {
    if (apiProducts.length === 0) return staticProducts;
    const staticNames = new Set(staticProducts.map(p => p.name.toLowerCase()));
    const uniqueApi   = apiProducts.filter(p => !staticNames.has(p.name.toLowerCase()));
    return [...staticProducts, ...uniqueApi];
  })();

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/products?limit=50`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.products?.length > 0) {
            setApiProducts(data.products.map(convertProduct).filter(Boolean) as Product[]);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Fetch products error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    const t = setTimeout(fetchProducts, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, []);

  // ── Filtering ─────────────────────────────────────────────────────────
  const featuredOnly = urlFeatured === '1' || urlFeatured.toLowerCase() === 'true';
  const filteredProducts = allProducts.filter(product => {
    if (!product?.name) return false;

    const matchesCategory = selectedCategory === 'all' ||
      product.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesBrand = selectedBrands.includes('all') ||
      selectedBrands.some(b => product.brand.toLowerCase() === b.toLowerCase());

    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStock = !inStockOnly || product.inStock;
    const matchesFeatured = !featuredOnly || product.isFeatured || product.badge?.toLowerCase() === 'featured';

    let matchesPrice = true;
    if (priceRange === 'under50k')   matchesPrice = product.price < 50000;
    else if (priceRange === '50k-100k')  matchesPrice = product.price >= 50000  && product.price < 100000;
    else if (priceRange === '100k-200k') matchesPrice = product.price >= 100000 && product.price < 200000;
    else if (priceRange === 'over200k')  matchesPrice = product.price >= 200000;

    return matchesCategory && matchesBrand && matchesSearch && matchesStock && matchesPrice && matchesFeatured;
  });

  const clearAll = () => {
    setSelectedCategory('all');
    setSelectedBrands(['all']);
    setPriceRange('all');
    setInStockOnly(false);
    setSearchQuery('');
  };

  // ── Toggle brand checkbox ─────────────────────────────────────────────
  const toggleBrand = (brand: string) => {
    if (brand === 'all') { setSelectedBrands(['all']); return; }
    setSelectedBrands(prev => {
      const without = prev.filter(b => b !== 'all');
      if (without.includes(brand)) {
        const next = without.filter(b => b !== brand);
        return next.length === 0 ? ['all'] : next;
      }
      return [...without, brand];
    });
  };

  const activeFiltersCount = [
    selectedCategory !== 'all',
    !selectedBrands.includes('all'),
    priceRange !== 'all',
    inStockOnly,
    searchQuery !== '',
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 pt-28 sm:pt-24 pb-16">
      <div className="section-padding">
        <div className="container-custom">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-secondary">
              {featuredOnly
                ? 'Featured Products'
                : selectedCategory === 'all'
                  ? 'Shop All Products'
                  : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
            </h1>
            <p className="text-gray-600 mt-2">
              {searchQuery
                ? `Search results for "${searchQuery}"`
                : featuredOnly
                  ? 'Handpicked highlights from our catalog'
                  : 'Browse our complete collection of premium electronics'}
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">

            {/* ── Filters Sidebar ── */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-secondary">Filters</h3>
                    {activeFiltersCount > 0 && (
                      <span style={{ background:'#1d4ed8', color:'white', fontSize:11, fontWeight:700, borderRadius:20, padding:'2px 8px' }}>
                        {activeFiltersCount}
                      </span>
                    )}
                  </div>
                  <button onClick={clearAll} className="text-sm text-primary hover:underline">
                    Clear All
                  </button>
                </div>

                {/* Search */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* ── Category — checkboxes ── */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Category</label>
                  <div className="space-y-2">
                    {ALL_CATEGORIES.map(cat => (
                      <label key={cat} style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer', padding:'4px 0' }}>
                        <input
                          type="radio"
                          name="category"
                          checked={selectedCategory === cat}
                          onChange={() => setSelectedCategory(cat)}
                          style={{ accentColor:'#1d4ed8', width:15, height:15, cursor:'pointer', flexShrink:0 }}
                        />
                        <span style={{ fontSize:13.5, color: selectedCategory === cat ? '#1d4ed8' : '#374151', fontWeight: selectedCategory === cat ? 600 : 400, transition:'color .15s' }}>
                          {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </span>
                        <span style={{ marginLeft:'auto', fontSize:11, color:'#94a3b8' }}>
                          {cat === 'all'
                            ? allProducts.length
                            : allProducts.filter(p => p.category.toLowerCase() === cat).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <hr style={{ border:'none', borderTop:'1px solid #f1f5f9', margin:'0 0 20px' }} />

                {/* ── Brand — checkboxes (multi-select) ── */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Brand</label>
                  <div className="space-y-2">
                    {ALL_BRANDS.map(brand => (
                      <label key={brand} style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer', padding:'4px 0' }}>
                        <input
                          type="checkbox"
                          checked={brand === 'all' ? selectedBrands.includes('all') : selectedBrands.includes(brand)}
                          onChange={() => toggleBrand(brand)}
                          style={{ accentColor:'#1d4ed8', width:15, height:15, cursor:'pointer', flexShrink:0, borderRadius:4 }}
                        />
                        <span style={{ fontSize:13.5, color: (brand === 'all' ? selectedBrands.includes('all') : selectedBrands.includes(brand)) ? '#1d4ed8' : '#374151', fontWeight: (brand === 'all' ? selectedBrands.includes('all') : selectedBrands.includes(brand)) ? 600 : 400, transition:'color .15s' }}>
                          {brand === 'all' ? 'All Brands' : brand}
                        </span>
                        <span style={{ marginLeft:'auto', fontSize:11, color:'#94a3b8' }}>
                          {brand === 'all'
                            ? allProducts.length
                            : allProducts.filter(p => p.brand.toLowerCase() === brand.toLowerCase()).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <hr style={{ border:'none', borderTop:'1px solid #f1f5f9', margin:'0 0 20px' }} />

                {/* Price Range */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Price Range</label>
                  <select
                    value={priceRange}
                    onChange={e => setPriceRange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="all">All Prices</option>
                    <option value="under50k">Under KES 50,000</option>
                    <option value="50k-100k">KES 50,000 – 100,000</option>
                    <option value="100k-200k">KES 100,000 – 200,000</option>
                    <option value="over200k">Over KES 200,000</option>
                  </select>
                </div>

                {/* ── In Stock only — checkbox ── */}
                <label style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer', padding:'4px 0' }}>
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={e => setInStockOnly(e.target.checked)}
                    style={{ accentColor:'#1d4ed8', width:15, height:15, cursor:'pointer', flexShrink:0 }}
                  />
                  <span style={{ fontSize:13.5, color: inStockOnly ? '#1d4ed8' : '#374151', fontWeight: inStockOnly ? 600 : 400 }}>
                    In Stock Only
                  </span>
                </label>
              </div>
            </div>

            {/* ── Products Grid ── */}
            <div className="flex-1">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-gray-600">
                  {isLoading ? 'Updating products…' : `Showing ${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`}
                </p>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl">
                  <p className="text-gray-500 text-lg mb-2">No products found</p>
                  <p className="text-gray-400 text-sm mb-6">Try adjusting your filters or search term</p>
                  <Button onClick={clearAll}>Clear Filters</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} onQuickView={setQuickViewProduct} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {quickViewProduct && (
        <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
      )}
    </div>
  );
}

// ── ProductCard (unchanged) ───────────────────────────────────────────────
function ProductCard({ product, onQuickView }: { product: Product; onQuickView: (p: Product) => void }) {
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const isWishlisted = wishlist.includes(product.id);

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-500">
      <div className="relative h-56 overflow-hidden bg-gray-50">
        <ProductImage
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
        />
        {product.badge && (
          <Badge className="absolute top-4 left-4 bg-primary text-white">{product.badge}</Badge>
        )}
        {product.originalPrice && product.originalPrice > product.price && (
          <Badge className="absolute top-4 left-4 bg-accent text-white">
            {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
          </Badge>
        )}
        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button onClick={() => toggleWishlist(product.id)}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${isWishlisted ? 'bg-accent text-white' : 'bg-white text-gray-600 hover:text-accent'}`}>
            <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
          <button onClick={() => onQuickView(product)}
            className="w-10 h-10 rounded-full bg-white text-gray-600 hover:text-primary flex items-center justify-center shadow-lg">
            <Eye className="w-5 h-5" />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Button onClick={() => addToCart(product)} className="w-full bg-primary hover:bg-primary-dark text-white gap-2">
            <ShoppingCart className="w-4 h-4" /> Add to Cart
          </Button>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium">{product.rating}</span>
          <span className="text-sm text-gray-400">({product.reviews})</span>
        </div>
        <h3 className="font-semibold text-secondary group-hover:text-primary transition-colors">{product.name}</h3>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-bold text-secondary text-lg">KES {product.price.toLocaleString()}</span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">KES {product.originalPrice.toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── QuickViewModal (unchanged) ────────────────────────────────────────────
function QuickViewModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { addToCart } = useStore();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="grid md:grid-cols-2 gap-8 p-8">
          <div className="bg-gray-50 rounded-xl p-8 flex items-center justify-center">
            <ProductImage src={product.image} alt={product.name} className="max-h-80 object-contain" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{product.brand}</Badge>
              <Badge variant="outline">{product.category}</Badge>
            </div>
            <h2 className="text-2xl font-bold text-secondary">{product.name}</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-gray-500">({product.reviews} reviews)</span>
            </div>
            <p className="text-gray-600">{product.description}</p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-secondary">KES {product.price.toLocaleString()}</span>
              {product.originalPrice && (
                <span className="text-xl text-gray-400 line-through">KES {product.originalPrice.toLocaleString()}</span>
              )}
            </div>
            {product.specs && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-secondary mb-2">Specifications</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-gray-500 capitalize">{key}:</span>
                      <span className="ml-1 font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <Button onClick={() => { addToCart(product); onClose(); }} className="flex-1 btn-primary gap-2">
                <ShoppingCart className="w-5 h-5" /> Add to Cart
              </Button>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
