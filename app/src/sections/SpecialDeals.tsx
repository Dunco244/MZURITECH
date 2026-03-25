import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatKES, pickFirstProductImage, resolveProductImageUrl } from '@/lib/utils';
import { useStore } from '@/context/StoreContext';

gsap.registerPlugin(ScrollTrigger);

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface DealItem {
  title: string;
  highlight: string;
  description: string;
  image: string;
  imageAlt: string;
  price: string;
  saveLabel: string;
  product?: ProductForCart | null;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  images?: Array<string | { url?: string }>;
  badge?: string;
  category?: string;
  brand?: string;
  rating?: number;
  reviews?: number;
  inStock?: boolean;
  stockQuantity?: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ProductForCart {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: Array<string | { url?: string }>;
  category: string;
  brand: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  stockQuantity?: number;
  badge?: string;
}

const FALLBACK_DEALS: DealItem[] = [
  {
    title: "Summer Tech",
    highlight: "Sale",
    description: "Get up to 40% off on selected laptops, headphones, and accessories. Don't miss out on these incredible deals!",
    image: "/product-headphones.png",
    imageAlt: "Sony WH-1000XM5",
    price: "KES 7,650",
    saveLabel: "Save",
  },
  {
    title: "Laptop",
    highlight: "Bonanza",
    description: "Score powerful laptops for work and play. Limited stock, limited time — grab yours today.",
    image: "/product-laptop.png",
    imageAlt: "Performance Laptop",
    price: "KES 12,900",
    saveLabel: "Save",
  },
  {
    title: "Phone",
    highlight: "Deals",
    description: "Flagship phones at amazing prices. Upgrade now and enjoy fast delivery.",
    image: "/product-phone.png",
    imageAlt: "Smartphone",
    price: "KES 6,450",
    saveLabel: "Save",
  },
];

const DEAL_DURATION_MS = (3 * 24 * 60 * 60 + 12 * 60 * 60 + 45 * 60 + 30) * 1000;
const STORAGE_KEY_INDEX = "mzuri_deal_index";
const STORAGE_KEY_NEXT  = "mzuri_deal_next_at";

function calcTimeLeft(ms: number): TimeLeft {
  const clamped = Math.max(0, ms);
  const days = Math.floor(clamped / (24 * 60 * 60 * 1000));
  const hours = Math.floor((clamped % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((clamped % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((clamped % (60 * 1000)) / 1000);
  return { days, hours, minutes, seconds };
}

function loadDealState(length: number) {
  const now = Date.now();
  const rawIndex = Number(localStorage.getItem(STORAGE_KEY_INDEX));
  const rawNext  = Number(localStorage.getItem(STORAGE_KEY_NEXT));
  let index = Number.isFinite(rawIndex) ? rawIndex : 0;
  let nextAt = Number.isFinite(rawNext) ? rawNext : 0;

  if (!nextAt || nextAt <= now) {
    if (!nextAt) nextAt = now + DEAL_DURATION_MS;
    while (nextAt <= now) {
      index = length > 0 ? (index + 1) % length : 0;
      nextAt += DEAL_DURATION_MS;
    }
  }

  if (length > 0) {
    index = ((index % length) + length) % length;
  } else {
    index = 0;
  }
  localStorage.setItem(STORAGE_KEY_INDEX, String(index));
  localStorage.setItem(STORAGE_KEY_NEXT, String(nextAt));
  return { index, nextAt };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  const [prevValue, setPrevValue] = useState(value);
  const valueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== prevValue && valueRef.current) {
      gsap.fromTo(
        valueRef.current,
        { rotateX: -90, opacity: 0 },
        { rotateX: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
      );
      setPrevValue(value);
    }
  }, [value, prevValue]);

  return (
    <div className="flex flex-col items-center">
      <div 
        ref={valueRef}
        className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center
                   border border-white/20"
        style={{ perspective: '500px' }}
      >
        <span className="text-2xl md:text-3xl font-bold text-white">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-white/60 text-xs md:text-sm mt-2 uppercase tracking-wider">{label}</span>
    </div>
  );
}

export default function SpecialDeals() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [deals, setDeals] = useState<DealItem[]>(FALLBACK_DEALS);
  const [{ index, nextAt }, setDealState] = useState(() => loadDealState(FALLBACK_DEALS.length));
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(nextAt - Date.now()));
  const { addToCart } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const loadDeals = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products?limit=20`);
        const data = await res.json();
        const products: Product[] = data.products || data || [];

        // ✅ FIX: guard originalPrice before using it in arithmetic
        const candidates = products.filter(p => {
          if (!p.originalPrice || p.originalPrice <= p.price) return false;
          const pct = Math.round((1 - p.price / p.originalPrice) * 100);
          return (p.badge === 'Featured' || p.badge === 'Sale') && pct >= 20;
        });

        const list = (candidates.length > 0 ? candidates : products).slice(0, 6);

        const mapped: DealItem[] = list.map(p => {
          const img = pickFirstProductImage(p.image, p.images as any);
          const price = formatKES(p.price);

          // ✅ FIX: guard originalPrice before using it in arithmetic
          const savePct =
            p.originalPrice && p.originalPrice > p.price
              ? Math.round((1 - p.price / p.originalPrice) * 100)
              : null;

          const productForCart: ProductForCart = {
            id: p._id,
            name: p.name,
            description: p.description || 'Limited time deal item.',
            price: p.price,
            originalPrice: p.originalPrice,
            image: resolveProductImageUrl(img || ""),
            images: p.images,
            category: p.category || 'deals',
            brand: p.brand || 'MzuriTech',
            rating: p.rating ?? 4.5,
            reviews: p.reviews ?? 0,
            inStock: p.inStock ?? true,
            stockQuantity: p.stockQuantity,
            badge: p.badge,
          };

          return {
            title: p.name,
            highlight: "Deal",
            description: (p.description || "Limited time offer on this product. Grab it before the timer runs out.").slice(0, 140),
            image: resolveProductImageUrl(img || ""),
            imageAlt: p.name,
            price,
            saveLabel: savePct ? `Save ${savePct}%` : "Save",
            product: productForCart,
          };
        });

        if (mounted && mapped.length > 0) {
          setDeals(mapped);
        }
      } catch {
        // keep fallback deals
      }
    };
    loadDeals();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (deals.length === 0) return;
    const state = loadDealState(deals.length);
    setDealState(state);
    setTimeLeft(calcTimeLeft(state.nextAt - Date.now()));
  }, [deals.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (now >= nextAt) {
        const nextIndex = deals.length > 0 ? (index + 1) % deals.length : 0;
        const newNextAt = now + DEAL_DURATION_MS;
        localStorage.setItem(STORAGE_KEY_INDEX, String(nextIndex));
        localStorage.setItem(STORAGE_KEY_NEXT, String(newNextAt));
        setDealState({ index: nextIndex, nextAt: newNextAt });
        setTimeLeft(calcTimeLeft(newNextAt - now));
        return;
      }
      setTimeLeft(calcTimeLeft(nextAt - now));
    }, 1000);

    return () => clearInterval(timer);
  }, [index, nextAt, deals.length]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.deals-bg',
        { clipPath: 'circle(0% at 50% 50%)' },
        {
          clipPath: 'circle(150% at 50% 50%)',
          duration: 1.5,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        }
      );

      gsap.fromTo(
        '.deals-content > *',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
          },
        }
      );

      gsap.fromTo(
        '.deals-image',
        { x: 100, opacity: 0, rotate: 5 },
        {
          x: 0,
          opacity: 1,
          rotate: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
          },
        }
      );

      gsap.to('.deals-image', {
        rotate: 2,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="deals" className="py-20 overflow-hidden">
      {(() => { const deal = deals[index] || FALLBACK_DEALS[0]; return (
      <div className="section-padding">
        <div className="container-custom">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="deals-bg absolute inset-0 bg-gradient-to-br from-secondary via-secondary to-primary-dark" />
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />

            <div className="relative grid lg:grid-cols-2 gap-8 p-8 md:p-12 lg:p-16">
              {/* Left Content */}
              <div className="deals-content space-y-6">
                <Badge className="bg-accent text-white gap-1">
                  <Zap className="w-4 h-4" />
                  Limited Time Offer
                </Badge>

                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                  {deal.title}<br />
                  <span className="text-primary-light">{deal.highlight}</span>
                </h2>

                <p className="text-white/80 text-lg max-w-md">
                  {deal.description}
                </p>

                {/* Countdown */}
                <div className="flex gap-4 md:gap-6 py-4">
                  <CountdownUnit value={timeLeft.days} label="Days" />
                  <CountdownUnit value={timeLeft.hours} label="Hours" />
                  <CountdownUnit value={timeLeft.minutes} label="Minutes" />
                  <CountdownUnit value={timeLeft.seconds} label="Seconds" />
                </div>

                <Button 
                  size="lg" 
                  className="bg-accent hover:bg-accent/90 text-white gap-2 text-lg px-8 shadow-lg shadow-accent/30"
                  onClick={() => {
                    if (deal.product) {
                      addToCart(deal.product);
                    } else {
                      navigate('/deals');
                    }
                  }}
                >
                  Shop the Sale
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Right Content - Product Image */}
              <div className="relative flex items-center justify-center lg:justify-end">
                <div className="deals-image relative">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-75" />
                  
                  <img
                    src={deal.image}
                    alt={deal.imageAlt}
                    className="relative z-10 w-full max-w-md drop-shadow-2xl"
                  />

                  {/* Price tag */}
                  <div className="absolute top-8 right-8 bg-accent text-white rounded-xl p-4 shadow-lg animate-bounce-in">
                    <div className="text-sm opacity-80">{deal.saveLabel}</div>
                    <div className="text-2xl font-bold">{deal.price}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ); })()}
    </section>
  );
}