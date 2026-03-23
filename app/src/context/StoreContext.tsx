import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Product, CartItem } from '@/types';

const API_URL = ' import.meta.env.VITE_API_URL || 'http://localhost:5000'';

interface StoreContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isSyncing: boolean;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const safeJSONParse = <T,>(key: string, fallback: T): T => {
  try {
    if (typeof window === 'undefined') return fallback;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.error(`Error parsing ${key} from localStorage:`, error);
    localStorage.removeItem(key);
    return fallback;
  }
};

const getStoredCart = (): CartItem[] => safeJSONParse<CartItem[]>('cart', []);
const getStoredWishlist = (): string[] => safeJSONParse<string[]>('wishlist', []);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => getStoredCart());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>(() => getStoredWishlist());

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Persist wishlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Fetch latest product data from the backend for all cart items.
  // This ensures any admin price/name/image changes are reflected immediately.
  const syncCartWithProducts = useCallback(async (currentCart: CartItem[]) => {
    if (currentCart.length === 0) return;

    setIsSyncing(true);
    try {
      const updated = await Promise.all(
        currentCart.map(async (item) => {
          try {
            const res = await fetch(`${API_URL}/api/products/${item.product.id}`);
            const data = await res.json();
            if (!data.success || !data.product) return item;

            const freshProduct: Product = {
              ...item.product,
              ...data.product,
              id: data.product._id ?? item.product.id,
            };
            return { ...item, product: freshProduct };
          } catch {
            return item;
          }
        })
      );
      setCart(updated);
    } catch (err) {
      console.error('Failed to sync cart with latest product data:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sync on mount — fixes stale prices from a previous browser session
  useEffect(() => {
    const stored = getStoredCart();
    if (stored.length > 0) {
      syncCartWithProducts(stored);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync every time the cart drawer opens — always shows latest prices
  const handleSetIsCartOpen = useCallback((open: boolean) => {
    setIsCartOpen(open);
    if (open) {
      setCart((current) => {
        syncCartWithProducts(current);
        return current;
      });
    }
  }, [syncCartWithProducts]);

  const addToCart = useCallback((product: Product) => {
    if (!product?.id) {
      console.warn('Cannot add product to cart: invalid product');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item?.product?.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item?.product?.id === product.id
            ? { ...item, product, quantity: (item.quantity || 0) + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    if (!productId) return;
    setCart((prev) => prev.filter((item) => item?.product?.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (!productId) return;
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item?.product?.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem('cart');
  }, []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const cartTotal = cart.reduce(
    (sum, item) => sum + ((item?.product?.price || 0) * (item?.quantity || 0)),
    0
  );
  const cartCount = cart.reduce((sum, item) => sum + (item?.quantity || 0), 0);

  return (
    <StoreContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        isCartOpen,
        setIsCartOpen: handleSetIsCartOpen,
        isSyncing,
        wishlist,
        toggleWishlist,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}