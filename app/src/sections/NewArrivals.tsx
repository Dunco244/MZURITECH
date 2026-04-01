import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star, ShoppingCart, ChevronLeft, ChevronRight, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { products } from '@/data/products';
import { useStore } from '@/context/StoreContext';
import ProductImage from '@/components/ProductImage';
import type { Product } from '@/types';

gsap.registerPlugin(ScrollTrigger);

export default function NewArrivals() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { addToCart } = useStore();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const newArrivals = products.filter(p => p.badge === 'New Arrival' || p.badge === 'Best Seller');

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      checkScroll();
    }
    return () => container?.removeEventListener('scroll', checkScroll);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.arrivals-title',
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 bg-white overflow-hidden">
      <div className="section-padding">
        <div className="container-custom">
          <div className="arrivals-title flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-primary font-medium text-sm uppercase tracking-wider">Just Landed</span>
              <h2 className="text-3xl md:text-4xl font-bold text-secondary mt-2">New Arrivals</h2>
              <p className="text-gray-600 mt-3 max-w-xl">Be the first to get your hands on the latest tech</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                  canScrollLeft ? 'border-primary text-primary hover:bg-primary hover:text-white' : 'border-gray-200 text-gray-300 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                  canScrollRight ? 'border-primary text-primary hover:bg-primary hover:text-white' : 'border-gray-200 text-gray-300 cursor-not-allowed'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto pb-4 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {newArrivals.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={addToCart}
            onQuickView={setQuickViewProduct}
          />
        ))}
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </section>
  );
}

function ProductCard({
  product,
  onAddToCart,
  onQuickView,
}: {
  product: Product;
  onAddToCart: (p: Product) => void;
  onQuickView: (p: Product) => void;
}) {
  const { wishlist, toggleWishlist } = useStore();
  const isWishlisted = wishlist.includes(product.id);

  return (
    <div
      className="flex-shrink-0 w-72 sm:w-80 group"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500">
        <div className="relative h-56 overflow-hidden bg-gray-50">
          <ProductImage
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
          />

          {product.badge && (
            <Badge className="absolute top-4 left-4 bg-green-500 text-white">
              {product.badge}
            </Badge>
          )}

          {/* ✅ Wishlist + Eye icons */}
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
              className="w-10 h-10 rounded-full bg-white text-gray-600 hover:text-primary flex items-center justify-center shadow-lg transition-colors"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>

          {/* Add to Cart slide-up */}
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <Button
              onClick={() => onAddToCart(product)}
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
          <h3 className="font-semibold text-secondary group-hover:text-primary transition-colors line-clamp-1">
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
    </div>
  );
}

function QuickViewModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { addToCart } = useStore();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm sm:max-w-lg md:max-w-4xl max-h-[82vh] sm:max-h-[88vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 p-3 sm:p-6">
          <div className="bg-gray-50 rounded-xl p-4 sm:p-6 flex items-center justify-center">
            <ProductImage src={product.image} alt={product.name} className="max-h-48 sm:max-h-64 md:max-h-80 object-contain" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{product.brand}</Badge>
              <Badge variant="outline">{product.category}</Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-secondary">{product.name}</h2>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
              ))}
              <span className="text-gray-500 ml-2">({product.reviews} reviews)</span>
            </div>
            <p className="text-gray-600">{product.description}</p>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-bold text-secondary">KES {product.price.toLocaleString()}</span>
              {product.originalPrice && (
                <span className="text-lg sm:text-xl text-gray-400 line-through">KES {product.originalPrice.toLocaleString()}</span>
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
              <Button onClick={() => { addToCart(product); onClose(); }} className="flex-1 btn-primary gap-2">
                <ShoppingCart className="w-5 h-5" /> Add to Cart
              </Button>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
            <a href={`/product/${product.id}`} onClick={onClose}
              className="block text-center text-sm text-primary hover:underline pt-1">
              View Full Details &amp; Reviews →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

