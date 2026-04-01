import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Trash2, ArrowLeft, Lock, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/context/StoreContext';
import { useAuth } from '@/context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function resolveImg(img?: string): string {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  if (img.startsWith('/uploads')) return `${API_URL}${img}`;
  return img;
}

interface LiveProduct {
  id: string;
  _id: string;
  name: string;
  image?: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  numReviews?: number;
  inStock?: boolean;
  badge?: string;
  category?: string;
}

export default function Wishlist() {
  const { isAuthenticated } = useAuth();
  const { wishlist, toggleWishlist, addToCart, cart, wishlistLoading } = useStore();
  const navigate = useNavigate();

  const [products, setProducts]   = useState<LiveProduct[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Fetch live product data for every wishlisted ID
  useEffect(() => {
    if (!isAuthenticated || wishlist.length === 0) {
      setProducts([]);
      return;
    }
    setLoading(true);
    setError('');
    Promise.all(
      wishlist.map(id =>
        fetch(`${API_URL}/api/products/${id}`)
          .then(r => r.json())
          .then(d => {
            const p = d.product || d;
            return { ...p, id: p._id || p.id } as LiveProduct;
          })
          .catch(() => null)
      )
    )
      .then(results => setProducts(results.filter(Boolean) as LiveProduct[]))
      .catch(() => setError('Failed to load wishlist products'))
      .finally(() => setLoading(false));
  }, [wishlist, isAuthenticated]);

  const isLoading = wishlistLoading || loading;

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pt-28 sm:pt-24 pb-16">
        <div className="section-padding">
          <div className="container-custom">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
              <Link to="/" className="hover:text-primary">Home</Link>
              <span>/</span>
              <span className="text-gray-700">Wishlist</span>
            </div>
            <div className="max-w-md mx-auto text-center py-16 bg-white rounded-2xl shadow-sm px-8">
              <div className="w-24 h-24 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-secondary mb-3">Login to View Your Wishlist</h2>
              <p className="text-gray-500 mb-8">
                Sign in or create an account to save and view your favourite products.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="bg-primary hover:bg-primary-dark text-white px-8">
                  <Link to="/login" state={{ from: '/wishlist' }}>Sign In</Link>
                </Button>
                <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white px-8">
                  <Link to="/register">Create Account</Link>
                </Button>
              </div>
              <p className="text-sm text-gray-400 mt-6">
                Just browsing?{' '}
                <Link to="/shop" className="text-primary hover:underline">Continue Shopping</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-28 sm:pt-24 pb-16">
      <div className="section-padding">
        <div className="container-custom">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link to="/" className="hover:text-primary">Home</Link>
              <span>/</span>
              <span className="text-gray-700">Wishlist</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-secondary">My Wishlist</h1>
            <p className="text-gray-600 mt-2">
              {isLoading
                ? 'Loading…'
                : products.length > 0
                  ? `${products.length} item${products.length !== 1 ? 's' : ''} saved`
                  : 'Your wishlist is empty'}
            </p>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Empty */}
          {!isLoading && products.length === 0 && !error && (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Heart className="w-12 h-12 text-gray-300" />
              </div>
              <h2 className="text-2xl font-bold text-secondary mb-2">Your wishlist is empty</h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Click the heart icon on any product to save it here.
              </p>
              <Button asChild className="bg-primary hover:bg-primary-dark text-white px-8">
                <Link to="/shop">
                  <ShoppingCart className="w-5 h-5 mr-2" /> Start Shopping
                </Link>
              </Button>
            </div>
          )}

          {/* Grid */}
          {!isLoading && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <WishlistCard
                  key={product.id}
                  product={product}
                  isInCart={cart.some(i => i.product.id === product.id)}
                  onRemove={() => toggleWishlist(product.id)}
                  onAddToCart={() => addToCart(product as any)}
                  onView={() => navigate(`/product/${product.id}`)}
                />
              ))}
            </div>
          )}

          {/* Continue Shopping */}
          {!isLoading && products.length > 0 && (
            <div className="mt-12">
              <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                <Link to="/shop">
                  <ArrowLeft className="w-5 h-5 mr-2" /> Continue Shopping
                </Link>
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function WishlistCard({ product, isInCart, onRemove, onAddToCart, onView }: {
  product: LiveProduct;
  isInCart: boolean;
  onRemove: () => void;
  onAddToCart: () => void;
  onView: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
      {/* Image */}
      <div className="relative h-56 bg-gray-50 overflow-hidden cursor-pointer" onClick={onView}>
        {!imgError && product.image ? (
          <img
            src={resolveImg(product.image)}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* Badges */}
        {product.badge && (
          <span className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {product.badge}
          </span>
        )}
        {discount && (
          <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            -{discount}%
          </span>
        )}

        {/* Remove button */}
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white text-red-500 hover:bg-red-50 flex items-center justify-center shadow-md transition-colors"
          title="Remove from wishlist"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Add to cart overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Button
            onClick={e => { e.stopPropagation(); onAddToCart(); }}
            disabled={isInCart || product.inStock === false}
            className={`w-full gap-2 text-sm ${isInCart ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary-dark'} text-white`}
          >
            <ShoppingCart className="w-4 h-4" />
            {isInCart ? 'In Cart' : product.inStock === false ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 cursor-pointer" onClick={onView}>
        {product.rating !== undefined && (
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium text-gray-700">{product.rating.toFixed(1)}</span>
            {product.numReviews !== undefined && (
              <span className="text-xs text-gray-400">({product.numReviews})</span>
            )}
          </div>
        )}

        <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 text-sm leading-snug mb-2">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2">
          <span className="font-bold text-gray-900 text-lg">KES {product.price.toLocaleString()}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-sm text-gray-400 line-through">KES {product.originalPrice.toLocaleString()}</span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${product.inStock !== false ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className={`text-xs font-medium ${product.inStock !== false ? 'text-green-600' : 'text-red-500'}`}>
            {product.inStock !== false ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
      </div>
    </div>
  );
}
