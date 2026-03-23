import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/context/StoreContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductImage from '@/components/ProductImage';

const SHIPPING_FEE            = 350;
const FREE_SHIPPING_THRESHOLD = 50000;

export default function CartDrawer() {
  const navigate = useNavigate();
  const {
    cart,
    removeFromCart,
    updateQuantity,
    cartTotal,
    cartCount,
    isCartOpen,
    setIsCartOpen,
    isSyncing,
  } = useStore();

  const validCartItems = cart.filter((item) => item?.product?.id);

  const shippingCost = cartTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const orderTotal   = cartTotal + shippingCost;

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Shopping Cart
            {cartCount > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({cartCount} {cartCount === 1 ? 'item' : 'items'})
              </span>
            )}
            {/* Syncing indicator — shows while fetching latest prices */}
            {isSyncing && (
              <span className="ml-auto flex items-center gap-1 text-xs text-gray-400 font-normal">
                <Loader2 className="w-3 h-3 animate-spin" />
                Updating prices...
              </span>
            )}
          </SheetTitle>
        </div>

        {validCartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-secondary mb-2">Your cart is empty</h3>
            <p className="text-gray-500 mb-6 max-w-xs">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Button onClick={() => setIsCartOpen(false)} className="btn-primary gap-2">
              Continue Shopping <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 min-h-0 px-6">
              <div className="space-y-4 pb-2">
                {validCartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className={`flex gap-4 p-3 bg-gray-50 rounded-xl transition-opacity duration-300 ${
                      isSyncing ? 'opacity-60' : 'opacity-100'
                    }`}
                  >
                    <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <ProductImage
                        src={item.product.image || ''}
                        alt={item.product.name || 'Product'}
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-secondary truncate">
                        {item.product.name || 'Unknown Product'}
                      </h4>
                      <p className="text-sm text-gray-500">{item.product.brand || 'N/A'}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-primary">
                            KES {(item.product.price || 0).toLocaleString()}
                          </span>
                          {/* Spinning refresh icon while syncing this item's price */}
                          {isSyncing && (
                            <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            disabled={isSyncing}
                            className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={isSyncing}
                            className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      disabled={isSyncing}
                      className="text-gray-400 hover:text-danger transition-colors self-start disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex-shrink-0 border-t border-gray-100 px-6 pt-4 pb-6 bg-white space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">
                    {isSyncing ? (
                      <span className="text-gray-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Calculating...
                      </span>
                    ) : (
                      `KES ${cartTotal.toLocaleString()}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className={`font-medium ${shippingCost === 0 ? 'text-green-600' : ''}`}>
                    {shippingCost === 0 ? 'Free' : `KES ${shippingCost.toLocaleString()}`}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-xl text-primary">
                    {isSyncing ? (
                      <span className="text-gray-400 flex items-center gap-1">
                        <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                      </span>
                    ) : (
                      `KES ${orderTotal.toLocaleString()}`
                    )}
                  </span>
                </div>
              </div>

              <Button
                className="w-full btn-primary gap-2 py-6 text-lg"
                disabled={isSyncing}
                onClick={() => { setIsCartOpen(false); navigate('/checkout'); }}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Syncing prices...
                  </>
                ) : (
                  <>
                    Proceed to Checkout <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={() => setIsCartOpen(false)} className="w-full">
                Continue Shopping
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}