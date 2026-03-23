import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Package, Search, CheckCircle2, Truck, Clock, MapPin,
  XCircle, Loader2, ArrowLeft, UserPlus, RefreshCw, Mail
} from 'lucide-react';

const API_URL = 'http://localhost:5000';

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered'] as const;
type OrderStatus = typeof STATUS_STEPS[number] | 'cancelled' | 'failed' | 'refunded';

const STATUS_META: Record<string, {
  label: string;
  color: string;
  bg: string;
  Icon: React.FC<{ className?: string }>;
  description: string;
}> = {
  pending: {
    label: 'Order Placed',
    color: 'text-yellow-700',
    bg: 'bg-yellow-100',
    Icon: ({ className }) => <Clock className={className} />,
    description: 'Your order has been received and is awaiting processing.',
  },
  processing: {
    label: 'Processing',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    Icon: ({ className }) => <Package className={className} />,
    description: 'Your items are being prepared and packed.',
  },
  shipped: {
    label: 'Out for Delivery',
    color: 'text-purple-700',
    bg: 'bg-purple-100',
    Icon: ({ className }) => <Truck className={className} />,
    description: 'Your order is on its way to you!',
  },
  delivered: {
    label: 'Delivered',
    color: 'text-green-700',
    bg: 'bg-green-100',
    Icon: ({ className }) => <CheckCircle2 className={className} />,
    description: 'Your order has been delivered. Enjoy!',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-700',
    bg: 'bg-red-100',
    Icon: ({ className }) => <XCircle className={className} />,
    description: 'This order has been cancelled.',
  },
  failed: {
    label: 'Delivery Failed',
    color: 'text-red-700',
    bg: 'bg-red-100',
    Icon: ({ className }) => <XCircle className={className} />,
    description: 'Delivery could not be completed. Please contact support.',
  },
  refunded: {
    label: 'Refunded',
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    Icon: ({ className }) => <RefreshCw className={className} />,
    description: 'A refund has been issued for this order.',
  },
};

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: string;
  orderItems: OrderItem[];
  shippingAddress: {
    fullName?: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
    landmark?: string;
  };
  itemsPrice: number;
  shippingPrice: number;
  totalPrice: number;
  isPaid: boolean;
  createdAt: string;
  isGuestOrder: boolean;
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function OrderProgress({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];

  if (status === 'cancelled' || status === 'failed' || status === 'refunded') {
    const { Icon } = meta;
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${meta.bg}`}>
        <Icon className={`w-5 h-5 ${meta.color}`} />
        <div>
          <p className={`font-semibold text-sm ${meta.color}`}>{meta.label}</p>
          <p className="text-xs text-gray-500">{meta.description}</p>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_STEPS.indexOf(status as typeof STATUS_STEPS[number]);

  return (
    <div className="w-full">
      {/* Step dots + connecting line */}
      <div className="relative flex items-center justify-between mb-3">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full transition-all duration-500"
          style={{ width: currentIdx === 0 ? '0%' : `${(currentIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
        />
        {STATUS_STEPS.map((step, i) => {
          const done   = i <= currentIdx;
          const active = i === currentIdx;
          const { Icon } = STATUS_META[step];
          return (
            <div key={step} className="relative z-10 flex flex-col items-center gap-1.5">
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
                ${done ? 'bg-primary border-primary text-white' : 'bg-white border-gray-300 text-gray-300'}
                ${active ? 'ring-4 ring-primary/20 scale-110' : ''}
              `}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Step labels */}
      <div className="flex justify-between">
        {STATUS_STEPS.map((step, i) => {
          const done   = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step} className="flex flex-col items-center w-1/4">
              <p className={`text-xs font-medium text-center leading-tight ${
                active ? 'text-primary' : done ? 'text-gray-700' : 'text-gray-400'
              }`}>
                {STATUS_META[step].label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Status description */}
      {meta && (
        <div className={`mt-4 px-4 py-3 rounded-lg ${meta.bg}`}>
          <p className={`text-sm font-medium ${meta.color}`}>{meta.description}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function GuestOrderTracking() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { user }       = useAuth();

  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [email, setEmail]             = useState('');
  const [order, setOrder]             = useState<Order | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [searched, setSearched]       = useState(false);

  useEffect(() => {
    const urlOrder = searchParams.get('order');
    if (urlOrder) setOrderNumber(urlOrder);
  }, [searchParams]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!orderNumber.trim()) { setError('Please enter an order number'); return; }
    if (!email.trim())       { setError('Please enter the email used at checkout'); return; }

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const res  = await fetch(
        `${API_URL}/api/orders/track/${orderNumber.trim().toUpperCase()}?email=${encodeURIComponent(email.trim().toLowerCase())}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Order not found');
        setOrder(null);
      } else {
        setOrder(data.order);
      }
    } catch {
      setError('Unable to connect. Please try again.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const paymentLabel: Record<string, string> = {
    cod:    'Cash on Delivery',
    mpesa:  'M-Pesa',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4">

        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2 text-gray-600">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {/* Page header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Enter your order number and the email you used at checkout
          </p>
        </div>

        {/* Search form */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  placeholder="e.g. ORD-202603-1234"
                  value={orderNumber}
                  onChange={e => { setOrderNumber(e.target.value.toUpperCase()); setError(''); }}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="trackEmail" className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email Used at Checkout
                </Label>
                <Input
                  id="trackEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  className="mt-1"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full btn-primary" disabled={loading}>
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...</>
                  : <><Search className="w-4 h-4 mr-2" /> Track Order</>
                }
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Order result */}
        {order && (
          <div className="space-y-4">

            {/* Status card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                    <CardDescription>
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-KE', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </CardDescription>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold
                    ${STATUS_META[order.status]?.bg || 'bg-gray-100'}
                    ${STATUS_META[order.status]?.color || 'text-gray-700'}`}>
                    {STATUS_META[order.status]?.label || order.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <OrderProgress status={order.status} />
              </CardContent>
            </Card>

            {/* Order items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Items Ordered</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.orderItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.image ? (
                        <img
                          src={item.image.startsWith('http') ? item.image : `${API_URL}${item.image}`}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-contain bg-gray-100 p-1 flex-shrink-0"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-gray-400 text-xs">Qty: {item.quantity} × KES {item.price.toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900 flex-shrink-0">
                      KES {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}

                <Separator className="my-2" />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>KES {order.itemsPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping</span>
                    <span className={order.shippingPrice === 0 ? 'text-green-600 font-medium' : ''}>
                      {order.shippingPrice === 0 ? 'Free' : `KES ${order.shippingPrice.toLocaleString()}`}
                    </span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-primary">KES {order.totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery + payment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Delivery Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide font-medium mb-1">Delivering to</p>
                  <p className="font-medium text-gray-800">{order.shippingAddress.fullName}</p>
                  <p className="text-gray-600 leading-relaxed">
                    {order.shippingAddress.street}<br />
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
                    {order.shippingAddress.country}
                    {order.shippingAddress.phone    && <><br />📞 {order.shippingAddress.phone}</>}
                    {order.shippingAddress.landmark && <><br />📍 Near: {order.shippingAddress.landmark}</>}
                  </p>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Payment</span>
                  <span className="font-medium text-gray-800">
                    {paymentLabel[order.paymentMethod] || order.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Payment Status</span>
                  <span className={`font-medium ${order.isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                    {order.isPaid ? '✅ Paid' : '⏳ Pending'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Create account nudge */}
            {!user && order.isGuestOrder && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserPlus className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 text-sm">Save time on your next order</p>
                      <p className="text-xs text-blue-600 mt-1 mb-3 leading-relaxed">
                        Create a free account to track all your orders in one place, save your delivery address,
                        earn loyalty points, and get exclusive member deals.
                      </p>
                      <Button size="sm" className="btn-primary" onClick={() => navigate('/register')}>
                        <UserPlus className="w-4 h-4 mr-2" /> Create Free Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        )}

        {/* No result state */}
        {searched && !order && !loading && !error && (
          <Card className="text-center py-10">
            <CardContent>
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No order found. Check the order number and email and try again.</p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
