import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowRight, Play, Zap, X, ShoppingCart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/context/StoreContext';
import type { Product } from '@/types';

const DELL_PRODUCT_ID = '69aeeb9de93f6648267c049d';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const heroProductSpecs = {
  Processor: 'Intel Core Ultra 7',
  RAM: '16GB LPDDR5X',
  Storage: '512GB SSD',
  Display: '13.4" InfinityEdge OLED',
  Battery: 'Up to 14 hours',
  Graphics: 'Intel Arc Graphics',
  Weight: '1.17 kg',
  OS: 'Windows 11 Pro',
};

export default function Hero() {
  const heroRef   = useRef<HTMLDivElement>(null);
  const laptopRef = useRef<HTMLImageElement>(null);
  const textRef   = useRef<HTMLDivElement>(null);

  const [showSpecs,   setShowSpecs]   = useState(false);
  const [isAdding,    setIsAdding]    = useState(false);
  const [added,       setAdded]       = useState(false);
  const [heroProduct, setHeroProduct] = useState<Product | null>(null);

  const { addToCart } = useStore();

  // Fetch hero product
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/products/${DELL_PRODUCT_ID}`);
        if (res.ok) {
          const data = await res.json();
          setHeroProduct(data.product || data);
        }
      } catch (err) {
        console.error('Failed to fetch hero product:', err);
      }
    })();
  }, []);

  // Add to cart
  const handleAddToCart = async () => {
    if (!heroProduct) return;
    setIsAdding(true);
    try {
      addToCart(heroProduct);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } finally {
      setIsAdding(false);
    }
  };

  // GSAP entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-title span', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.05, ease: 'power3.out', delay: 0.3 });
      gsap.fromTo('.hero-subtitle',  { y: 30,  opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.8 });
      gsap.fromTo('.hero-price',     { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)', delay: 1 });
      gsap.fromTo('.hero-buttons',   { y: 30,  opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 1.2 });
      gsap.fromTo(laptopRef.current, { rotateY: -30, z: -500, opacity: 0 }, { rotateY: 0, z: 0, opacity: 1, duration: 1.5, ease: 'power3.out', delay: 0.4 });
      gsap.to(laptopRef.current, { y: -10, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  // Mouse parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!laptopRef.current) return;
      const x = (e.clientX - window.innerWidth  / 2) / window.innerWidth;
      const y = (e.clientY - window.innerHeight / 2) / window.innerHeight;
      gsap.to(laptopRef.current, { rotateY: x * 15, rotateX: -y * 10, duration: 0.5, ease: 'power2.out' });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <section
      ref={heroRef}
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-primary-light via-white to-primary-light/30 pt-32"
      style={{ maxWidth: '100vw' }}
    >
      {/* Animated background shapes — clipped so they never cause horizontal scroll */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ maxWidth: '100%' }}>
        <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-0 w-64 h-64 md:w-96 md:h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        {/* 800px blob replaced with a % based size so it never overflows on mobile */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(800px,100vw)] h-[min(800px,100vw)] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      <div className="section-padding w-full relative z-10">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* ── Left: Text ── */}
            <div ref={textRef} className="space-y-6">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 px-4 py-1.5 text-sm font-medium animate-fade-in">
                <Zap className="w-4 h-4 mr-1" />
                New Arrival
              </Badge>

              <h1 className="hero-title text-5xl md:text-6xl lg:text-7xl font-bold text-secondary leading-tight overflow-hidden">
                {'Dell XPS 13'.split('').map((char, i) => (
                  <span key={i} className="inline-block">
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                ))}
                <br />
                <span className="text-gradient">Pro</span>
              </h1>

              <p className="hero-subtitle text-lg md:text-xl text-gray-600 max-w-lg leading-relaxed">
                Experience the future of computing with ultra-thin design and powerhouse
                performance. The perfect balance of portability and power.
              </p>

              <div className="hero-price flex items-baseline gap-3">
                <span className="text-4xl md:text-5xl font-bold text-secondary">KES 194,850</span>
                <span className="text-xl text-gray-400 line-through">KES 224,850</span>
                <Badge className="bg-accent text-white">Save KES 30,000</Badge>
              </div>

              <div className="hero-buttons flex flex-wrap gap-4 pt-4">
                <Button
                  size="lg"
                  className="btn-primary gap-2 text-lg px-8"
                  onClick={handleAddToCart}
                  disabled={isAdding || !heroProduct}
                >
                  {isAdding ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Adding...</>
                  ) : added ? (
                    <><ShoppingCart className="w-5 h-5" /> Added to Cart!</>
                  ) : (
                    <>Shop Now <ArrowRight className="w-5 h-5" /></>
                  )}
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 text-lg px-8 border-2 border-gray-200 hover:border-primary hover:text-primary"
                  onClick={() => setShowSpecs(true)}
                >
                  <Play className="w-5 h-5" />
                  View Specs
                </Button>
              </div>

              {/* ✅ FIXED: Trust badges — all on one row, no wrapping */}
              <div className="flex flex-nowrap items-center gap-3 pt-8 text-gray-500 overflow-x-auto pb-1">

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="whitespace-nowrap text-xs md:text-sm font-medium">Free Shipping</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="whitespace-nowrap text-xs md:text-sm font-medium">2 Year Warranty</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <span className="whitespace-nowrap text-xs md:text-sm font-medium">30-Day Returns</span>
                </div>

              </div>
            </div>

            {/* ── Right: Product Image ── */}
            <div className="relative flex items-center justify-center perspective-1000">
              <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-75 animate-pulse-glow" />
                <img
                  ref={laptopRef}
                  src="/hero-laptop.png"
                  alt="Dell XPS 13 Pro"
                  className="relative z-10 w-full max-w-xl drop-shadow-2xl"
                  style={{ transformStyle: 'preserve-3d' }}
                />
                <div className="absolute -left-8 top-1/4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg animate-float" style={{ animationDelay: '0.5s' }}>
                  <div className="text-xs text-gray-500">Processor</div>
                  <div className="font-semibold text-secondary">Intel Core Ultra 7</div>
                </div>
                <div className="absolute -right-4 top-1/2 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg animate-float" style={{ animationDelay: '1s' }}>
                  <div className="text-xs text-gray-500">Display</div>
                  <div className="font-semibold text-secondary">13.4" OLED</div>
                </div>
                <div className="absolute left-1/4 -bottom-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg animate-float" style={{ animationDelay: '1.5s' }}>
                  <div className="text-xs text-gray-500">Battery</div>
                  <div className="font-semibold text-secondary">Up to 14 hrs</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Specs Modal ── */}
      {showSpecs && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSpecs(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-secondary">Dell XPS 13 Pro</h2>
                <p className="text-primary font-semibold mt-1">KES 194,850</p>
              </div>
              <button
                onClick={() => setShowSpecs(false)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Object.entries(heroProductSpecs).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1">{key}</div>
                  <div className="font-semibold text-secondary text-sm">{value}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                className="flex-1 btn-primary"
                onClick={() => { setShowSpecs(false); handleAddToCart(); }}
                disabled={isAdding || !heroProduct}
              >
                {added ? 'Added to Cart!' : 'Shop Now'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={() => setShowSpecs(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
