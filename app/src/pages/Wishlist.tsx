import { Link } from 'react-router-dom';
import { products } from '@/data/products';
import { Star, ShoppingCart, Heart, Trash2, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/context/StoreContext';
import { useAuth } from '@/context/AuthContext';
import type { Product } from '@/types';

export default function Wishlist() {
  const { isAuthenticated } = useAuth();
  const { wishlist, toggleWishlist, addToCart } = useStore();

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pt-28 sm:pt-24 pb-16">
        <div className="section-padding">
          <div className="container-custom">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
              <Link to="/" className="hover:text-primary">Home</Link>
              <span>/</span>
              <span className="text-gray-700">Wishlist</span>
            </div>

            {/* Login Required Card */}
            <div className="max-w-md mx-auto text-center py-16 bg-white rounded-2xl shadow-sm px-8">
              <div className="w-24 h-24 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-secondary mb-3">
                Login to View Your Wishlist
              </h2>
              <p className="text-gray-500 mb-8">
                You need to be logged in to access your wishlist. Please sign in or create an account to save and view your favourite products.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="bg-primary hover:bg-primary-dark text-white px-8">
                  <Link to="/login" state={{ from: '/wishlist' }}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white px-8">
                  <Link to="/register">
                    Create Account
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-gray-400 mt-6">
                Just browsing?{' '}
                <Link to="/shop" className="text-primary hover:underline">
                  Continue Shopping
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get wishlisted products from the products array
  const wishlistProducts = products.filter(product => wishlist.includes(product.id));

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
              {wishlistProducts.length > 0 
                ? `You have ${wishlistProducts.length} item${wishlistProducts.length !== 1 ? 's' : ''} in your wishlist`
                : 'Your wishlist is empty'}
            </p>
          </div>

          {wishlistProducts.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Heart className="w-12 h-12 text-gray-300" />
              </div>
              <h2 className="text-2xl font-bold text-secondary mb-2">Your wishlist is empty</h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Save items you love by clicking the heart icon on any product. They'll appear here for easy access.
              </p>
              <Button asChild className="bg-primary hover:bg-primary-dark text-white px-8">
                <Link to="/shop">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Start Shopping
                </Link>
              </Button>
            </div>
          ) : (
            /* Wishlist Products Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {wishlistProducts.map((product) => (
                <WishlistProductCard 
                  key={product.id} 
                  product={product} 
                />
              ))}
            </div>
          )}

          {/* Continue Shopping */}
          {wishlistProducts.length > 0 && (
            <div className="mt-12">
              <Button 
                asChild 
                variant="outline" 
                className="border-primary text-primary hover:bg-primary hover:text-white"
              >
                <Link to="/shop">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Continue Shopping
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WishlistProductCard({ product }: { product: Product }) {
  const { toggleWishlist, addToCart, cart } = useStore();
  
  const isInCart = cart.some(item => item.product.id === product.id);

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-500">
      <div className="relative h-56 overflow-hidden bg-gray-50">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
        />
        
        {product.badge && (
          <Badge className="absolute top-4 left-4 bg-primary text-white">
            {product.badge}
          </Badge>
        )}

        {/* Remove from Wishlist Button */}
        <div className="absolute top-4 right-4">
          <button 
            onClick={() => toggleWishlist(product.id)}
            className="w-10 h-10 rounded-full bg-white text-red-500 hover:bg-red-50 flex items-center justify-center shadow-lg transition-colors"
            title="Remove from wishlist"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Add to Cart Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Button 
            onClick={() => addToCart(product)}
            disabled={isInCart}
            className={`w-full gap-2 ${isInCart ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary-dark'} text-white`}
          >
            <ShoppingCart className="w-4 h-4" />
            {isInCart ? 'Added to Cart' : 'Add to Cart'}
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

        <h3 className="font-semibold text-secondary group-hover:text-primary transition-colors line-clamp-2">
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

        {/* Stock Status */}
        <div className="mt-3">
          {product.inStock ? (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              In Stock
            </span>
          ) : (
            <span className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Out of Stock
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

