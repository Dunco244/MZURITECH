import ProductImage from '@/components/ProductImage';
import { useState, useEffect } from 'react';
import { Star, ShoppingCart, Heart, Eye, SlidersHorizontal, ChevronDown, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useStore } from '@/context/StoreContext';
import type { Product } from '@/types';
import { products as staticProducts } from '@/data/products';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SORT_OPTIONS = [
  { value: 'default',    label: 'Featured'          },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'rating',     label: 'Top Rated'         },
];

const convertProduct = (p: any): Product => {
  if (!p) {
    return {
      id: 'placeholder', name: 'Loading...', description: '', price: 0,
      image: '', images: [], category: 'uncategorized', brand: 'Unknown',
      rating: 0, reviews: 0, inStock: false, stockQuantity: 0,
      badge: undefined, specs: undefined, features: [], isActive: false, isFeatured: false,
    };
  }

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

  let imageUrl = p.image || '';
  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
    imageUrl = imageUrl.startsWith('/') ? imageUrl : `${API_URL}${imageUrl}`;
  }
  if (!isValidImageUrl(imageUrl)) {
    imageUrl = findFallbackImage(p.name);
  }

  return {
    id: p._id || p.id || String(p._id),
    name: p.name || 'Unnamed Product',
    description: p.description || '',
    price: p.price || 0,
    originalPrice: p.originalPrice || undefined,
    image: imageUrl,
    images: p.images || [],
    category: p.category || 'uncategorized',
    brand: p.brand || 'Unknown',
    rating: p.rating || 0,
    reviews: p.numReviews || p.reviews || 0,
    inStock: p.inStock !== false,
    stockQuantity: p.stockQuantity || 0,
    badge: p.badge || undefined,
    specs: p.specs ? (p.specs instanceof Map ? Object.fromEntries(p.specs) : p.specs) : undefined,
    features: p.features || [],
    isActive: p.isActive,
    isFeatured: p.isFeatured,
  };
};

const staticComputerProducts = staticProducts.filter(
  p => p.category === 'computers' || p.category === 'monitors'
);

export default function ComputersMonitors() {
  const [searchQuery, setSearchQuery]     = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [products, setProducts]           = useState<Product[]>(staticComputerProducts);
  const [isLoading, setIsLoading]         = useState(false);
  const [sort, setSort]                   = useState('default');
  const [subcat, setSubcat]               = useState<'all' | 'computers' | 'monitors'>('all');
  const [brand, setBrand]                 = useState('all');

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const [compRes, monRes] = await Promise.all([
          fetch(`${API_URL}/api/products?category=computers&limit=50`),
          fetch(`${API_URL}/api/products?category=monitors&limit=50`),
        ]);
        const compData = compRes.ok ? await compRes.json() : { products: [] };
        const monData  = monRes.ok  ? await monRes.json()  : { products: [] };
        const combined = [...(compData.products || []), ...(monData.products || [])];
        if (combined.length > 0) setProducts(combined.map(convertProduct));
      } catch (err) {
        console.error('Error fetching computers/monitors:', err);
      } finally {
        setIsLoading(false);
      }
    };
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, []);

  const brands = ['all', ...Array.from(new Set(products.map(p => p.brand))).sort()];

  const filteredProducts = products
    .filter(p => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      const matchBrand  = brand === 'all' || p.brand === brand;
      const matchSubcat = subcat === 'all' || p.category === subcat;
      return matchSearch && matchBrand && matchSubcat;
    })
    .sort((a, b) => {
      if (sort === 'price-asc')  return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'rating')     return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-50 pt-28 sm:pt-24 pb-16">
      <div className="section-padding">
        <div className="container-custom">

          {/* ── Header ── */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-secondary">
              Computers &amp; Monitors
            </h1>
            <p className="text-gray-600 mt-2">
              Browse desktop computers and displays for every workspace
            </p>
          </div>

          {/* ── Filter Bar ── */}
          <div className="mb-6 flex flex-wrap gap-3 items-center">

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search computers & monitors..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Subcategory pills */}
            <div className="flex gap-2">
              {([
                { v: 'all',       l: 'All'       },
                { v: 'computers', l: '🖥 Computers' },
                { v: 'monitors',  l: '📺 Monitors'  },
              ] as { v: 'all' | 'computers' | 'monitors'; l: string }[]).map(o => (
                <button
                  key={o.v}
                  onClick={() => setSubcat(o.v)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
                    subcat === o.v
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>

            {/* Brand filter */}
            <div className="relative">
              <select
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white cursor-pointer outline-none focus:border-primary font-medium"
              >
                {brands.map(b => (
                  <option key={b} value={b}>{b === 'all' ? 'All Brands' : b}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white cursor-pointer outline-none focus:border-primary font-medium"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Count */}
            <span className="ml-auto text-sm text-gray-400 font-medium whitespace-nowrap">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── Products Grid ── */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                  <div className="h-40 bg-gray-200 rounded-lg mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={setQuickViewProduct}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-16">
              <p className="text-lg font-medium mb-2">No products found</p>
              <p className="text-sm mb-4">Try adjusting your filters or search term</p>
              <button
                onClick={() => { setSearchQuery(''); setBrand('all'); setSubcat('all'); }}
                className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}

        </div>
      </div>

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </div>
  );
}

// ── Product Card — identical to Phones page ───────────────────────────────────
function ProductCard({
  product,
  onQuickView,
}: {
  product: Product;
  onQuickView: (product: Product) => void;
}) {
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
          <Badge className="absolute top-4 left-4 bg-primary text-white">
            {product.badge}
          </Badge>
        )}

        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={() => toggleWishlist(product.id)}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${
              isWishlisted ? 'bg-accent text-white' : 'bg-white text-gray-600 hover:text-accent'
            }`}
          >
            <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={() => onQuickView(product)}
            className="w-10 h-10 rounded-full bg-white text-gray-600 hover:text-primary flex items-center justify-center shadow-lg"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Button
            onClick={() => addToCart(product)}
            className="w-full bg-primary hover:bg-primary-dark text-white gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Add to Cart
          </Button>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{product.rating}</span>
          </div>
          <span className="text-sm text-gray-400">({product.reviews})</span>
        </div>

        <h3 className="font-semibold text-secondary group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2 mt-2">
          <span className="font-bold text-secondary text-lg">
            KES {product.price.toLocaleString()}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              KES {product.originalPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Quick View Modal — identical to Phones page ───────────────────────────────
function QuickViewModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { addToCart } = useStore();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="grid md:grid-cols-2 gap-8 p-8">
          <div className="bg-gray-50 rounded-xl p-8 flex items-center justify-center">
            <ProductImage
              src={product.image}
              alt={product.name}
              className="max-h-80 object-contain"
            />
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
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(product.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-500">({product.reviews} reviews)</span>
            </div>

            <p className="text-gray-600">{product.description}</p>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-secondary">
                KES {product.price.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span className="text-xl text-gray-400 line-through">
                  KES {product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>

            {product.specs && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-secondary mb-2">Specifications</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-gray-500 capitalize">{key}:</span>
                      <span className="ml-1 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => { addToCart(product); onClose(); }}
                className="flex-1 btn-primary gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </Button>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

