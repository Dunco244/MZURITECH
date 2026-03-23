export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  brand: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  stockQuantity?: number;
  badge?: string;
  specs?: Record<string, string>;
  features?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  icon: string;
  count: number;
  description?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  text: string;
  product: string;
}

export interface FilterState {
  category: string | null;
  brand: string[];
  priceRange: [number, number];
  rating: number | null;
}

// User types for authentication
export interface Address {
  street?: string;
  apartment?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  landmark?: string;
  deliveryInstructions?: string;
}

export interface BusinessAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'admin' | 'vendor' | 'driver'; // ✅ driver added
  address?: Address;
  wishlist?: string[];
  isActive?: boolean;
  createdAt?: string;

  // ── Vendor-specific fields ──────────────────────────────────────────────
  isVendor?: boolean;
  isApproved?: boolean;
  businessName?: string;
  businessDescription?: string;
  businessAddress?: BusinessAddress;
  businessPhone?: string;
  totalSales?: number;
  totalOrders?: number;
  totalProducts?: number;

  // ── Driver-specific fields ──────────────────────────────────────────────
  // These are returned by getPublicProfile() when role === 'driver'
  vehicleType?: 'motorcycle' | 'bicycle' | 'car' | 'van' | 'truck';
  licensePlate?: string;
  zone?: string;
  driverStatus?: 'available' | 'busy' | 'offline';
  currentOrder?: string | null;
  totalDeliveries?: number;
  successfulDeliveries?: number;
  driverRating?: number;
}

// Order types
export interface OrderItem {
  product: Product | string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  user: string | User;
  orderItems: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentResult?: {
    id: string;
    status: string;
    email: string;
    updateTime: string;
  };
  itemsPrice: number;
  taxPrice?: number;
  shippingPrice?: number;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  pointsAwarded?: boolean;
  pointsEarned?: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  notes?: string;
  trackingNumber?: string;
  createdAt: string;
}

// Dashboard stats
export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  recentOrders: Order[];
  ordersByStatus: { _id: string; count: number }[];
  topProducts: (Product & { totalSold: number })[];
}

// Notification types
export type NotificationType =
  | 'new_vendor'
  | 'new_customer'
  | 'new_order'
  | 'new_driver'    // ✅ added
  | 'order_status'
  | 'system';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: string;
  relatedModel?: string;
  userName?: string;
  userEmail?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
