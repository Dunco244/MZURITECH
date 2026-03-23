import { useState, useEffect } from 'react';
import { products as staticProducts } from '@/data/products';
import { Star, ShoppingCart, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/context/StoreContext';
import type { Product } from '@/types';
import ProductImage from '@/components/ProductImage';
import { pickFirstProductImage, resolveProductImageUrl } from '@/lib/utils';

const API_URL = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5000';

const convertProduct = (p: any): Product | null => {
  if (!p) return null;
  const primaryImageRaw = pickFirstProductImage(p.image, p.images as any) || '';
  const primaryImage = resolveProductImageUrl(primaryImageRaw);
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

const MIN_DISCOUNT_PCT = 20;

export default function Deals() {
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading]     = useState(false);

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
        if (err.name !== 'AbortError') console.error('Fetch deals products error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
    return () => controller.abort();
  }, []);

  const allProducts = (() => {
    if (apiProducts.length === 0) return staticProducts;
    const apiNames = new Set(apiProducts.map(p => p.name.toLowerCase()));
    const uniqueStatic = staticProducts.filter(p => !apiNames.has(p.name.toLowerCase()));
    return [...apiProducts, ...uniqueStatic];
  })();

  const deals = allProducts.filter(p => {
    if (!p.originalPrice || p.originalPrice <= p.price) return false;
    const pct = Math.round((1 - p.price / p.originalPrice) * 100);
    return pct >= MIN_DISCOUNT_PCT;
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-28 sm:pt-24 pb-16">
      <div className="section-padding">
        <div className="container-custom">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-secondary">Special Deals</h1>
            <p className="text-gray-600 mt-2">Limited time offers and exclusive discounts</p>
          </div>

          {isLoading && deals.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl">
              <p className="text-gray-500">Loading deals...</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl">
              <p className="text-gray-500">No deals available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {deals.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onQuickView={setQuickViewProduct}
                />
              ))}
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

function ProductCard({ 
  product, 
  onQuickView 
}: { 
  product: Product;
  onQuickView: (product: Product) => void;
}) {
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const isWishlisted = wishlist.includes(product.id);
  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100) 
    : 0;

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-500">
      <div className="relative h-56 overflow-hidden bg-gray-50">
        <ProductImage
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
          fallbackClassName="w-full h-full flex items-center justify-center p-4"
        />
        
        {discount > 0 && (
          <Badge className="absolute top-4 left-4 bg-accent text-white">
            {discount}% OFF
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

function QuickViewModal({ 
  product, 
  onClose 
}: { 
  product: Product; 
  onClose: () => void;
}) {
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
                  <Star 
                    key={i} 
                    className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                  />
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

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => { addToCart(product); onClose(); }}
                className="flex-1 btn-primary gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
