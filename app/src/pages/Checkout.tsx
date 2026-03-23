import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/context/StoreContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2, Truck, Smartphone, Wallet,
  Loader2, ArrowLeft, MapPin, Phone, Trash2, Plus, Minus,
  User, UserPlus, ChevronDown, ChevronUp, Eye, EyeOff, Mail,
  Package
} from 'lucide-react';

const API_URL = ' import.meta.env.VITE_API_URL || 'http://localhost:5000'';

const getImageUrl = (img: string | null | undefined): string => {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  if (img.startsWith('/uploads')) return `${API_URL}${img}`;
  return img;
};

interface ShippingAddress {
  fullName: string;
  street: string;
  apartment: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  landmark: string;
  deliveryInstructions: string;
}

type PaymentMethod = 'cod' | 'mpesa';

const SHIPPING_FEE            = 350;
const FREE_SHIPPING_THRESHOLD = 50000;

export default function Checkout() {
  const navigate   = useNavigate();
  const { cart, cartTotal, clearCart, updateQuantity, removeFromCart } = useStore();
  const { user, token, login, register } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced]   = useState(false);
  const [orderNumber, setOrderNumber]   = useState('');
  const [error, setError]               = useState('');

  // ── Guest / Auth state ──────────────────────────────────────────────────────
  type AuthMode = 'guest' | 'login' | 'register';
  const [authMode, setAuthMode]           = useState<AuthMode>('guest');
  const [authEmail, setAuthEmail]         = useState('');
  const [authPassword, setAuthPassword]   = useState('');
  const [authName, setAuthName]           = useState('');
  const [authPhone, setAuthPhone]         = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [authLoading, setAuthLoading]     = useState(false);
  const [authError, setAuthError]         = useState('');
  const [showAuthPanel, setShowAuthPanel] = useState(false);

  // ── Guest email (for order confirmation) ────────────────────────────────────
  // When logged in → auto-filled from user.email and locked
  // When guest → required input field
  const [guestEmail, setGuestEmail]       = useState('');
  const [guestEmailError, setGuestEmailError] = useState('');

  // ── Shipping & Payment state ─────────────────────────────────────────────────
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '', street: '', apartment: '', city: '', state: '',
    zipCode: '', country: 'Kenya', phone: '', landmark: '', deliveryInstructions: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [mpesaPhone, setMpesaPhone]       = useState('');

  // ✅ FIX: scroll to top on mount — ScrollArea retains scroll from previous page
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  // ✅ FIX: scroll to top when order success screen appears
  useEffect(() => {
    if (orderPlaced) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [orderPlaced]);

  // Pre-fill when user logs in
  useEffect(() => {
    if (user) {
      setShippingAddress(prev => ({
        ...prev,
        fullName:  user.name               || '',
        phone:     user.phone              || '',
        street:    user.address?.street    || '',
        apartment: user.address?.apartment || '',
        city:      user.address?.city      || '',
        state:     user.address?.state     || '',
        zipCode:   user.address?.zipCode   || '',
        country:   user.address?.country   || 'Kenya',
        landmark:  user.address?.landmark  || '',
        deliveryInstructions: user.address?.deliveryInstructions || '',
      }));
      setShowAuthPanel(false);
      // Clear guest email — logged-in email will be used automatically
      setGuestEmail('');
    }
  }, [user]);

  useEffect(() => {
    if (!orderPlaced && cart.length === 0) navigate('/shop');
  }, [cart.length, navigate, orderPlaced]);

  const shippingCost  = cartTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const orderTotal    = cartTotal + shippingCost;
  const totalItems    = cart.reduce((sum, item) => sum + item.quantity, 0);

  // The email that will receive the confirmation
  const confirmationEmail = user ? (user as any).email : guestEmail;

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleQtyChange = (productId: string, delta: number, currentQty: number) => {
    const next = currentQty + delta;
    if (next <= 0) removeFromCart(productId);
    else updateQuantity(productId, next);
    setError('');
  };

  const validatePhone = (phone: string): string | null => {
    if (!phone) return 'Phone number is required';
    if (!/^\+254\d{9}$/.test(phone))
      return 'Phone must start with +254 followed by 9 digits (e.g., +254 700 000 000)';
    return null;
  };
  const validateAuthPhone = (phone: string): string | null => {
    if (!phone) return 'Phone number is required';
    if (!/^\+254\d{9}$/.test(phone))
      return 'Phone must start with +254 followed by 9 digits (e.g., +254 700 000 000)';
    return null;
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = (): boolean => {
    // Validate guest email if not logged in
    if (!user) {
      if (!guestEmail.trim()) {
        setGuestEmailError('Email address is required to receive your order confirmation');
        return false;
      }
      if (!validateEmail(guestEmail)) {
        setGuestEmailError('Please enter a valid email address');
        return false;
      }
    }
    setGuestEmailError('');

    if (!shippingAddress.fullName.trim()) { setError('Recipient full name is required'); return false; }
    if (!shippingAddress.street.trim())   { setError('Street address is required'); return false; }
    if (!shippingAddress.city.trim())     { setError('Town/City is required'); return false; }
    if (!shippingAddress.state.trim())    { setError('County is required'); return false; }
    if (!shippingAddress.zipCode.trim())  { setError('Postal code is required'); return false; }
    const phoneErr = validatePhone(shippingAddress.phone);
    if (phoneErr) { setError(phoneErr); return false; }
    if (paymentMethod === 'mpesa') {
      const mpesaErr = validatePhone(mpesaPhone);
      if (mpesaErr) { setError('M-Pesa ' + mpesaErr); return false; }
    }
    return true;
  };

  // ── Auth handlers ────────────────────────────────────────────────────────────
  const handleAuth = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        await login(authEmail, authPassword);
      } else if (authMode === 'register') {
        if (!authName.trim()) { setAuthError('Name is required'); return; }
        const phoneErr = validateAuthPhone(authPhone);
        if (phoneErr) { setAuthError(phoneErr); return; }
        await register(authName, authEmail, authPassword, authPhone);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Create order ─────────────────────────────────────────────────────────────
  const createOrder = async () => {
    const currentToken = token || localStorage.getItem('token') || sessionStorage.getItem('token');
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
      },
      body: JSON.stringify({
        orderItems: cart.map(item => ({
          product:  item.product.id,
          name:     item.product.name,
          image:    item.product.image,
          price:    item.product.price,
          quantity: item.quantity,
        })),
        shippingAddress: {
          fullName: shippingAddress.fullName,
          street:   shippingAddress.apartment
                      ? `${shippingAddress.street}, ${shippingAddress.apartment}`
                      : shippingAddress.street,
          city:     shippingAddress.city,
          state:    shippingAddress.state,
          zipCode:  shippingAddress.zipCode,
          country:  shippingAddress.country,
          phone:    shippingAddress.phone,
          landmark:             shippingAddress.landmark || undefined,
          deliveryInstructions: shippingAddress.deliveryInstructions || undefined,
        },
        paymentMethod,
        // Guest-specific fields
        ...(!currentToken && {
          isGuestOrder: true,
          guestEmail: guestEmail.trim().toLowerCase(),
        }),
        ...(paymentMethod === 'mpesa' && {
          mpesaPhone: mpesaPhone.replace(/^0|^254/, '254'),
        }),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create order');
    return data;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;
    setIsProcessing(true);
    setError('');
    try {
      const orderData = await createOrder();
      setOrderNumber(orderData.order?.orderNumber || 'ORD-XXXX');

      if (paymentMethod === 'cod') {
        setOrderPlaced(true);
        clearCart();
        if (user) window.dispatchEvent(new Event('rewards:refresh'));
      } else if (paymentMethod === 'mpesa') {
        const currentToken = token || localStorage.getItem('token') || sessionStorage.getItem('token');
        try {
          const mpesaRes = await fetch(`${API_URL}/api/payment/mpesa/stkpush`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
            },
            body: JSON.stringify({
              orderId:     orderData.order._id,
              phoneNumber: mpesaPhone.replace(/^0|^254/, '254'),
            }),
          });
          const mpesaData = await mpesaRes.json();
          if (!mpesaData.success) throw new Error(mpesaData.message || 'M-Pesa failed');
        } catch (e) {
          console.error('M-Pesa error:', e);
        } finally {
          setOrderPlaced(true);
          clearCart();
          if (user) window.dispatchEvent(new Event('rewards:refresh'));
        }
      } else {
        setOrderPlaced(true);
        clearCart();
        if (user) window.dispatchEvent(new Event('rewards:refresh'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Order Success ─────────────────────────────────────────────────────────────
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h2>
              <p className="text-gray-600 mb-1">
                Thank you for your order.{orderNumber && <> Your order number is <span className="font-semibold text-gray-800">{orderNumber}</span>.</>}
              </p>

              {/* Email confirmation notice */}
              {confirmationEmail && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                  <Mail className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>
                    A confirmation email has been sent to{' '}
                    <span className="font-medium text-gray-700">{confirmationEmail}</span>
                  </span>
                </div>
              )}

              {paymentMethod === 'cod' && (
                <p className="text-sm text-gray-500 mb-6">
                  You will pay <span className="font-medium">KES {orderTotal.toLocaleString()}</span> when your order is delivered.
                </p>
              )}
              {paymentMethod === 'mpesa' && (
                <p className="text-sm text-gray-500 mb-6">
                  Please check your phone for the M-Pesa prompt to complete payment.
                </p>
              )}

              {/* Guest: nudge to create account + track order */}
              {!user && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm font-medium text-blue-800 mb-1">Want to track your order?</p>
                  <p className="text-xs text-blue-600 mb-3">
                    Create a free account to view order history and track deliveries in real time.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      className="btn-primary"
                      onClick={() => navigate(`/track-order?order=${orderNumber}`)}
                    >
                      <Package className="w-4 h-4 mr-2" /> Track My Order
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/register')}
                    >
                      <UserPlus className="w-4 h-4 mr-2" /> Create Account
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                {user && (
                  <Button onClick={() => navigate('/orders')} className="btn-primary">
                    View Orders
                  </Button>
                )}
                <Button onClick={() => navigate('/shop')} variant="outline">
                  Continue Shopping
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Main Checkout ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: Auth Banner + Email + Shipping + Payment ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Auth Panel — only shown when not logged in ── */}
            {!user && (
              <Card className="border-blue-200 bg-blue-50/40">
                <CardContent className="pt-4 pb-4">
                  <button
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => setShowAuthPanel(p => !p)}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-800 text-sm">
                          Have an account? Sign in for faster checkout
                        </p>
                        <p className="text-xs text-gray-500">
                          Or continue as guest — no account needed
                        </p>
                      </div>
                    </div>
                    {showAuthPanel
                      ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    }
                  </button>

                  {showAuthPanel && (
                    <div className="mt-4 border-t border-blue-200 pt-4">
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => { setAuthMode('login'); setAuthError(''); }}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            authMode === 'login'
                              ? 'bg-primary text-white'
                              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Sign In
                        </button>
                        <button
                          onClick={() => { setAuthMode('register'); setAuthError(''); }}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            authMode === 'register'
                              ? 'bg-primary text-white'
                              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Create Account
                        </button>
                      </div>

                      {authError && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                          {authError}
                        </p>
                      )}

                      <div className="space-y-3">
                        {authMode === 'register' && (
                          <>
                            <div>
                              <Label htmlFor="authName" className="text-xs">Full Name</Label>
                              <Input id="authName" placeholder="Jane Wanjiku" value={authName}
                                onChange={e => setAuthName(e.target.value)} className="h-9 text-sm" />
                            </div>
                            <div>
                              <Label htmlFor="authPhone" className="text-xs">Phone *</Label>
                              <Input id="authPhone" placeholder="+254 700 000 000" value={authPhone}
                                onChange={e => setAuthPhone(e.target.value)} className="h-9 text-sm" />
                            </div>
                          </>
                        )}
                        <div>
                          <Label htmlFor="authEmail" className="text-xs">Email</Label>
                          <Input id="authEmail" type="email" placeholder="you@example.com" value={authEmail}
                            onChange={e => setAuthEmail(e.target.value)} className="h-9 text-sm" />
                        </div>
                        <div>
                          <Label htmlFor="authPassword" className="text-xs">Password</Label>
                          <div className="relative">
                            <Input id="authPassword" type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••" value={authPassword}
                              onChange={e => setAuthPassword(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAuth()}
                              className="h-9 text-sm pr-9" />
                            <button type="button" onClick={() => setShowPassword(p => !p)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <Button className="w-full btn-primary h-9 text-sm" onClick={handleAuth} disabled={authLoading}>
                          {authLoading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : authMode === 'login' ? 'Sign In' : 'Create Account'
                          }
                        </Button>
                        <p className="text-xs text-center text-gray-500">
                          Or{' '}
                          <button className="text-primary underline hover:no-underline"
                            onClick={() => setShowAuthPanel(false)}>
                            continue as guest
                          </button>
                          {' '}— no account needed
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Logged-in user badge */}
            {user && (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                Signed in as <span className="font-medium">{(user as any).name || (user as any).email}</span>
                <span className="text-green-600 ml-1">— confirmation email: {(user as any).email}</span>
              </div>
            )}

            {/* ── Guest Email Card ── only shown when not logged in ── */}
            {!user && (
              <Card className={guestEmailError ? 'border-red-300' : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Mail className="w-5 h-5 text-primary" />
                    Order Confirmation Email
                  </CardTitle>
                  <CardDescription>
                    We'll send your order details and tracking info to this address
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="guestEmail" className="flex items-center gap-1">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="guestEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={guestEmail}
                      onChange={e => {
                        setGuestEmail(e.target.value);
                        setGuestEmailError('');
                      }}
                      className={`mt-1 ${guestEmailError ? 'border-red-400 focus:ring-red-400' : ''}`}
                    />
                    {guestEmailError ? (
                      <p className="text-xs text-red-500 mt-1">{guestEmailError}</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        Your order confirmation and tracking updates will be sent here
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" /> Shipping Address
                </CardTitle>
                <CardDescription>Enter your delivery address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div className="md:col-span-2">
                    <Label htmlFor="fullName">Full Name (Recipient) *</Label>
                    <Input id="fullName" placeholder="e.g. Jane Wanjiku" value={shippingAddress.fullName}
                      onChange={e => handleAddressChange('fullName', e.target.value)} />
                    <p className="text-xs text-gray-500 mt-1">Name of the person receiving the order</p>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Phone Number *
                    </Label>
                    <Input id="phone" placeholder="+254 700 000 000" value={shippingAddress.phone}
                      onChange={e => handleAddressChange('phone', e.target.value)} />
                    <p className="text-xs text-gray-500 mt-1">Kenyan format: +254 7XX XXX XXX</p>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="street">Street Address / Road *</Label>
                    <Input id="street" placeholder="e.g. Ngong Road, Kilimani" value={shippingAddress.street}
                      onChange={e => handleAddressChange('street', e.target.value)} />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="apartment">Apartment / Building / Floor <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Input id="apartment" placeholder="e.g. Westlands Square, 3rd Floor, Apt 12" value={shippingAddress.apartment}
                      onChange={e => handleAddressChange('apartment', e.target.value)} />
                  </div>

                  <div>
                    <Label htmlFor="city">Town / City *</Label>
                    <Input id="city" placeholder="e.g. Nairobi" value={shippingAddress.city}
                      onChange={e => handleAddressChange('city', e.target.value)} />
                  </div>

                  <div>
                    <Label htmlFor="state">County *</Label>
                    <Input id="state" placeholder="e.g. Nairobi County" value={shippingAddress.state}
                      onChange={e => handleAddressChange('state', e.target.value)} />
                  </div>

                  <div>
                    <Label htmlFor="zipCode">Postal Code *</Label>
                    <Input id="zipCode" placeholder="e.g. 00100" value={shippingAddress.zipCode}
                      onChange={e => handleAddressChange('zipCode', e.target.value)} />
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" value={shippingAddress.country} disabled
                      className="bg-gray-50 text-gray-500 cursor-not-allowed" />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="landmark">Nearest Landmark <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Input id="landmark" placeholder="e.g. Near KCB Bank, opposite Nakumatt" value={shippingAddress.landmark}
                      onChange={e => handleAddressChange('landmark', e.target.value)} />
                    <p className="text-xs text-gray-500 mt-1">Helps our riders find you faster</p>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="deliveryInstructions">Delivery Instructions <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <textarea
                      id="deliveryInstructions" rows={2}
                      placeholder="e.g. Green gate on the left, call on arrival, leave with security"
                      value={shippingAddress.deliveryInstructions}
                      onChange={e => handleAddressChange('deliveryInstructions', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" /> Payment Method
                </CardTitle>
                <CardDescription>Select your preferred payment method</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)} className="space-y-4">

                  <div className={`border rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                    <Label className="flex items-center gap-3 cursor-pointer">
                      <RadioGroupItem value="cod" id="cod" />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Cash on Delivery</p>
                          <p className="text-sm text-gray-500">Pay when you receive your order</p>
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className={`border rounded-lg p-4 cursor-pointer transition-all ${paymentMethod === 'mpesa' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                    <Label className="flex items-center gap-3 cursor-pointer">
                      <RadioGroupItem value="mpesa" id="mpesa" />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Smartphone className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium">M-Pesa</p>
                          <p className="text-sm text-gray-500">Pay instantly via STK Push</p>
                        </div>
                      </div>
                    </Label>
                    {paymentMethod === 'mpesa' && (
                      <div className="mt-4 ml-9">
                        <Label htmlFor="mpesaPhone">M-Pesa Phone Number</Label>
                        <Input id="mpesaPhone" placeholder="+254 700 000 000" value={mpesaPhone}
                          onChange={e => setMpesaPhone(e.target.value)} className="max-w-xs" />
                        <p className="text-xs text-gray-500 mt-1">Enter the M-Pesa registered number</p>
                      </div>
                    )}
                  </div>

                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>{totalItems} {totalItems === 1 ? 'item' : 'items'}</CardDescription>
              </CardHeader>
              <CardContent>

                <ScrollArea className="max-h-[360px] mb-4 pr-1">
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex gap-3 group">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.product.image ? (
                            <img
                              src={getImageUrl(item.product.image)}
                              alt={item.product.name}
                              className="w-full h-full object-contain p-1"
                              onError={e => {
                                const el = e.currentTarget as HTMLImageElement;
                                el.style.display = 'none';
                                el.parentElement!.innerHTML = '<span class="text-xs text-gray-400 text-center p-1">No image</span>';
                              }}
                            />
                          ) : (
                            <span className="text-xs text-gray-400 text-center p-1">No image</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-sm font-medium leading-tight line-clamp-2">{item.product.name}</p>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">KES {item.product.price.toLocaleString()} each</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleQtyChange(item.product.id, -1, item.quantity)}
                                className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                              <button
                                onClick={() => handleQtyChange(item.product.id, +1, item.quantity)}
                                className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              KES {(item.product.price * item.quantity).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator className="my-4" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>KES {cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shipping</span>
                    <span className={shippingCost === 0 ? 'text-green-600 font-medium' : ''}>
                      {shippingCost === 0 ? 'Free' : `KES ${shippingCost.toLocaleString()}`}
                    </span>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">Total</span>
                  <span className="font-bold text-xl text-primary">KES {orderTotal.toLocaleString()}</span>
                </div>

                {/* Show email preview in summary */}
                {confirmationEmail && (
                  <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>Confirmation to: <span className="font-medium text-gray-700">{confirmationEmail}</span></span>
                  </div>
                )}

                <Button
                  className="w-full mt-4 btn-primary py-6 text-lg"
                  onClick={handlePlaceOrder}
                  disabled={isProcessing || cart.length === 0}
                >
                  {isProcessing
                    ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                    : <><Truck className="w-5 h-5 mr-2" />Place Order</>
                  }
                </Button>

                {!user && (
                  <p className="text-xs text-gray-400 text-center mt-3">
                    No account required to place an order
                  </p>
                )}

                <p className="text-xs text-gray-500 text-center mt-2">
                  By placing this order, you agree to our terms and conditions
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
