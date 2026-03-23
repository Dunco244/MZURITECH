import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star, ShoppingCart, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { products as staticProducts } from '@/data/products';
import { useStore } from '@/context/StoreContext';
import type { Product } from '@/types';
import ProductImage from '@/components/ProductImage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

gsap.registerPlugin(ScrollTrigger);

// ✅ Fixed convertProduct — matches actual MongoDB schema
const convertProduct = (p: any): Product => {
  // Helper to validate image URL
  const isValidImageUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string' || !url.trim()) return false;
    // Valid if starts with http/https or a local path
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

  // images is an array of objects: [{ url, alt, isPrimary, _id }]
  let primaryImage = p.images?.find((img: any) => img.isPrimary)?.url
    || p.images?.[0]?.url
    || p.image
    || '';

  // Validate the image URL - if invalid, try to find fallback
  if (!isValidImageUrl(primaryImage)) {
    console.warn(`Invalid image URL for "${p.name}": ${primaryImage}`);
    primaryImage = findFallbackImage(p.name);
    if (primaryImage) {
      console.log(`Using fallback image for "${p.name}": ${primaryImage}`);
    }
  }

  return {
    id: p._id || p.id || String(p._id),
    name: p.name || 'Unnamed Product',
    description: p.description || p.shortDescription || '',
    price: p.price || 0,
    // MongoDB uses discountPrice, frontend uses originalPrice
    originalPrice: p.discountPrice || p.originalPrice || undefined,
    // ✅ Extract URL from images array of objects
    image: primaryImage,
    images: p.images?.map((img: any) => img.url || img) || [],
    // category may be an ObjectId reference — use name if populated, else string
    category: typeof p.category === 'object'
      ? p.category?.name || 'uncategorized'
      : p.category || 'uncategorized',
    brand: p.brand || 'Unknown',
    // ✅ rating is an object { average, count } not a number
    rating: p.rating?.average ?? p.rating ?? 0,
    reviews: p.rating?.count ?? p.numReviews ?? p.reviews ?? 0,
    // ✅ stock field (not stockQuantity)
    inStock: (p.stock ?? p.stockQuantity ?? 0) > 0,
    stockQuantity: p.stock ?? p.stockQuantity ?? 0,
    badge: p.badge || undefined,
    // ✅ specifications field (not specs)
    specs: p.specifications || p.specs || undefined,
    // ✅ tags field (not features)
    features: p.tags || p.features || [],
    isActive: p.isActive ?? true,
    isFeatured: p.isFeatured ?? false,
  };
};

function ProductCard({ 
  product, 
  featured = false,
  onQuickView 
}: { 
  product: Product; 
  featured?: boolean;
  onQuickView: (product: Product) => void;
}) {
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const isWishlisted = wishlist.includes(product.id);

  return (
    <div 
      className={`group relative bg-white rounded-2xl overflow-hidden border border-gray-100 
                  hover:shadow-xl hover:shadow-primary/10 transition-all duration-500
                  ${featured ? 'row-span-2' : ''}`}
    >
      <div className={`relative overflow-hidden bg-gray-50 ${featured ? 'h-80' : 'h-56'}`}>
        <ProductImage
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
        />
        
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {product.badge && (
            <Badge className={`${
              product.badge === 'Sale' ? 'bg-accent' :
              product.badge === 'New Arrival' ? 'bg-green-500' :
              product.badge === 'Featured' ? 'bg-primary' :
              product.badge === 'Best Seller' ? 'bg-purple-500' :
              'bg-secondary'
            } text-white`}>
              {product.badge}
            </Badge>
          )}
          {product.originalPrice && (
            <Badge className="bg-accent/90 text-white">
              {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
            </Badge>
          )}
        </div>

        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
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
            className="w-10 h-10 rounded-full bg-white text-gray-600 hover:text-primary flex items-center justify-center shadow-lg transition-colors"
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
          <span className="text-sm text-gray-400">({product.reviews} reviews)</span>
        </div>

        <h3 className={`font-semibold text-secondary group-hover:text-primary transition-colors ${
          featured ? 'text-xl' : 'text-base'
        }`}>
          {product.name}
        </h3>
        
        <p className={`text-gray-500 mt-1 line-clamp-2 ${featured ? 'text-sm' : 'text-xs'}`}>
          {product.description}
        </p>

        <div className="flex items-baseline gap-2 mt-3">
          <span className={`font-bold text-secondary ${featured ? 'text-2xl' : 'text-lg'}`}>
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
  isOpen, 
  onClose 
}: { 
  product: Product | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { addToCart } = useStore();
  
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm sm:max-w-lg md:max-w-4xl max-h-[82vh] sm:max-h-[88vh] overflow-auto animate-scale-in">
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 p-3 sm:p-6">
          <div className="bg-gray-50 rounded-xl p-4 sm:p-6 flex items-center justify-center">
            <ProductImage 
              src={product.image} 
              alt={product.name} 
              className="max-h-48 sm:max-h-64 md:max-h-80 object-contain"
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{product.brand}</Badge>
              <Badge variant="outline">{product.category}</Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-secondary">{product.name}</h2>
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
              <span className="text-2xl sm:text-3xl font-bold text-secondary">
                KES {product.price.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span className="text-lg sm:text-xl text-gray-400 line-through">
                  KES {product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
            {product.specs && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-secondary mb-2">Specifications</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-gray-500 capitalize">{key}:</span>
                      <span className="ml-1 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
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

export default function FeaturedProducts() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products?limit=10&sort=newest`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.products && data.products.length > 0) {
            setProducts(data.products.map(convertProduct));
            setIsLoading(false);
            return;
          }
        }
        setProducts(staticProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts(staticProducts);
      }
      setIsLoading(false);
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (isLoading || products.length === 0 || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo('.featured-title', { y: 50, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
      });
      gsap.fromTo('.product-grid > *', { scale: 0.9, opacity: 0 }, {
        scale: 1, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.product-grid', start: 'top 80%' },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [isLoading, products.length]);

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  if (isLoading) {
    return (
      <section id="products" className="py-20 bg-gray-50">
        <div className="section-padding"><div className="container-custom">
          <div className="mb-12">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-3"></div>
            <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-5 w-96 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="sm:col-span-2 sm:row-span-2">
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="h-80 bg-gray-200 animate-pulse"></div>
                <div className="p-5 space-y-3">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 w-1/3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="h-56 bg-gray-200 animate-pulse"></div>
                <div className="p-5 space-y-3">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div></div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section id="products" className="py-20 bg-gray-50">
        <div className="section-padding"><div className="container-custom">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Products Available</h2>
            <p className="text-gray-600">Products will appear here once they are added by vendors.</p>
          </div>
        </div></div>
      </section>
    );
  }

  const featuredProduct = products[0];
  const otherProducts = products.slice(1, 7);

  return (
    <section ref={sectionRef} id="products" className="py-20 bg-gray-50">
      <div className="section-padding">
        <div className="container-custom">
          <div className="featured-title flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-primary font-medium text-sm uppercase tracking-wider">
                Featured Collection
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-secondary mt-2">
                Featured Products
              </h2>
              <p className="text-gray-600 mt-3 max-w-xl">
                Handpicked premium electronics at unbeatable prices
              </p>
            </div>
            <Link to="/shop?featured=1" className="text-primary font-medium hover:underline flex items-center gap-1">
              View All Products
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <div className="product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProduct && (
              <div className="sm:col-span-2 sm:row-span-2">
                <ProductCard product={featuredProduct} featured onQuickView={handleQuickView} />
              </div>
            )}
            {otherProducts.map((product) => (
              <ProductCard key={product.id} product={product} onQuickView={handleQuickView} />
            ))}
          </div>
        </div>
      </div>

      <QuickViewModal 
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </section>
  );
}

