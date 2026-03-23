import ProductImage from '@/components/ProductImage';
import { useState, useEffect } from 'react';
import { Star, ShoppingCart, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/context/StoreContext';
import type { Product } from '@/types';

import { products as staticProducts } from '@/data/products';

const API_URL = 'http://localhost:5000';

// Helper to convert backend product to frontend Product type
const convertProduct = (p: any): Product => {
  if (!p) {
    return {
      id: 'placeholder',
      name: 'Loading...',
      description: '',
      price: 0,
      image: '',
      images: [],
      category: 'uncategorized',
      brand: 'Unknown',
      rating: 0,
      reviews: 0,
      inStock: false,
      stockQuantity: 0,
      badge: undefined,
      specs: undefined,
      features: [],
      isActive: false,
      isFeatured: false,
    };
  }

  // Helper to validate image URL
  const isValidImageUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string' || !url.trim()) return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
  };
  
  // Helper to find fallback image from static products
  const findFallbackImage = (productName: string): string => {
    const normalizedName = productName.toLowerCase();
    const staticProduct = staticProducts.find(sp => 
      normalizedName.includes(sp.name.toLowerCase()) ||
      sp.name.toLowerCase().includes(normalizedName)
    );
    return staticProduct?.image || '';
  };
  
  // Fix image URL - if it starts with /, it's a local asset in public folder
  let imageUrl = p.image || '';
  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
    imageUrl = imageUrl.startsWith('/') ? imageUrl : `${API_URL}${imageUrl}`;
  }
  
  // Validate and use fallback if invalid
  if (!isValidImageUrl(imageUrl)) {
    console.warn(`Invalid image URL for "${p.name}": ${imageUrl}`);
    imageUrl = findFallbackImage(p.name);
    if (imageUrl) {
      console.log(`Using fallback image for "${p.name}": ${imageUrl}`);
    }
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

// Filter static products for audio and accessories categories
const accessoryStaticProducts = staticProducts.filter(p => 
  p.category === 'audio' || p.category === 'accessories'
);

export default function Accessories() {
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  
  // Use static products as initial state for instant loading
  const [products, setProducts] = useState<Product[]>(accessoryStaticProducts);
  const [isLoading, setIsLoading] = useState(false); // Start with false for instant load

  // Background fetch to update products (non-blocking)
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/products?category=audio&limit=50`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.products && data.products.length > 0) {
            setProducts(data.products.map(convertProduct));
          }
        }
      } catch (err) {
        console.error('Error fetching accessories:', err);
        // Keep static products on error - no change needed
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce API calls
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pt-28 sm:pt-24 pb-16">
      <div className="section-padding">
        <div className="container-custom">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-secondary">Audio & Accessories</h1>
            <p className="text-gray-600 mt-2">Premium headphones, earbuds, and accessories</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                  <div className="h-56 bg-gray-200"></div>
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl">
              <p className="text-gray-500">No accessories available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
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

