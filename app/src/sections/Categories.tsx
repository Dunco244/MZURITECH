import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Laptop, Smartphone, Headphones, Gamepad2, Tablet, Mouse,
  Camera, Watch, Tv, Cpu, Speaker, Keyboard, ArrowRight,
  Monitor, Tag, Package,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Icon map: covers all likely category slugs/names ──────────────────────────
const iconMap: Record<string, React.ElementType> = {
  // by id/slug
  laptops:      Laptop,
  phones:       Smartphone,
  audio:        Headphones,
  gaming:       Gamepad2,
  tablets:      Tablet,
  accessories:  Mouse,
  cameras:      Camera,
  wearables:    Watch,
  monitors:     Monitor,
  televisions:  Tv,
  tv:           Tv,
  computers:    Cpu,
  speakers:     Speaker,
  keyboards:    Keyboard,
  deals:        Tag,
  // by name (lowercase)
  laptop:       Laptop,
  phone:        Smartphone,
  headphones:   Headphones,
  earphones:    Headphones,
  earbuds:      Headphones,
  camera:       Camera,
  wearable:     Watch,
  smartwatch:   Watch,
  computer:     Cpu,
  desktop:      Cpu,
  speaker:      Speaker,
  keyboard:     Keyboard,
};

function getIcon(category: { id?: string; name?: string; icon?: string }): React.ElementType {
  // 1. Try the stored icon string (e.g. 'Laptop')
  if (category.icon) {
    const byIconField = iconMap[category.icon.toLowerCase()];
    if (byIconField) return byIconField;
  }
  // 2. Try the category id slug
  if (category.id) {
    const byId = iconMap[category.id.toLowerCase()];
    if (byId) return byId;
  }
  // 3. Try the category name
  if (category.name) {
    const byName = iconMap[category.name.toLowerCase()];
    if (byName) return byName;
    // 4. Try first word of name
    const firstWord = category.name.toLowerCase().split(/[\s_-]/)[0];
    const byFirstWord = iconMap[firstWord];
    if (byFirstWord) return byFirstWord;
  }
  // 5. Default fallback
  return Package;
}

// Route resolver — dedicated pages for main cats, shop filter for the rest
function getRoute(id: string): string {
  const dedicated: Record<string, string> = {
    laptops:     '/laptops',
    phones:      '/phones',
    accessories: '/accessories',
    deals:       '/deals',
  };
  return dedicated[id.toLowerCase()] || `/shop?category=${id}`;
}

// Gradient palette cycles through for visual variety
const GRADIENTS = [
  { from: '#eff6ff', icon: '#2563eb' },
  { from: '#f0fdf4', icon: '#16a34a' },
  { from: '#fdf4ff', icon: '#9333ea' },
  { from: '#fff7ed', icon: '#ea580c' },
  { from: '#f0fdfa', icon: '#0d9488' },
  { from: '#fef2f2', icon: '#dc2626' },
  { from: '#fefce8', icon: '#ca8a04' },
  { from: '#f8fafc', icon: '#475569' },
];

interface ApiCategory {
  _id?: string;
  id?: string;
  name: string;
  icon?: string;
  count?: number;
  productCount?: number;
  slug?: string;
}

export default function Categories() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef   = useRef<HTMLDivElement>(null);
  const navigate   = useNavigate();

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading]       = useState(true);

  // ── Fetch categories from API ─────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/categories`)
      .then(r => r.json())
      .then(data => {
        const cats: ApiCategory[] = data.categories || data || [];
        setCategories(cats);
      })
      .catch(() => {
        // Fallback to static if API fails
        setCategories([
          { id: 'laptops',     name: 'Laptops',     icon: 'Laptop',     count: 156 },
          { id: 'phones',      name: 'Phones',      icon: 'Smartphone', count: 89  },
          { id: 'audio',       name: 'Audio',       icon: 'Headphones', count: 45  },
          { id: 'gaming',      name: 'Gaming',      icon: 'Gamepad2',   count: 67  },
          { id: 'tablets',     name: 'Tablets',     icon: 'Tablet',     count: 34  },
          { id: 'accessories', name: 'Accessories', icon: 'Mouse',      count: 123 },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── GSAP animations (re-run when categories load) ─────────────────────────
  useEffect(() => {
    if (loading || categories.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.categories-title',
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        }
      );

      const cards = cardsRef.current?.querySelectorAll('.category-card');
      if (cards) {
        gsap.fromTo(
          cards,
          { rotateX: 90, opacity: 0, transformOrigin: 'center bottom' },
          {
            rotateX: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out',
            scrollTrigger: { trigger: cardsRef.current, start: 'top 80%' },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [loading, categories]);

  return (
    <section ref={sectionRef} className="py-20 bg-white">
      <div className="section-padding">
        <div className="container-custom">

          {/* Section Header */}
          <div className="categories-title text-center mb-12">
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Browse Categories
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-secondary mt-2">
              Shop by Category
            </h2>
            <p className="text-gray-600 mt-3 max-w-xl mx-auto">
              Explore our wide range of premium electronics across all major categories
            </p>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-gray-100 animate-pulse h-36" />
              ))}
            </div>
          )}

          {/* Categories Grid */}
          {!loading && (
            <div
              ref={cardsRef}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6"
              style={{ perspective: '1000px' }}
            >
              {categories.map((category, index) => {
                const id      = category._id || category.id || category.slug || category.name.toLowerCase().replace(/\s+/g, '-');
                const count   = category.count ?? category.productCount ?? 0;
                const Icon    = getIcon({ id, name: category.name, icon: category.icon });
                const route   = getRoute(id);
                const palette = GRADIENTS[index % GRADIENTS.length];

                return (
                  <button
                    key={id}
                    onClick={() => navigate(route)}
                    className="category-card group relative rounded-2xl p-6 border border-gray-100
                               hover:border-primary/30 transition-all duration-500
                               hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-2 text-left w-full"
                    style={{ background: `linear-gradient(135deg, ${palette.from}, #ffffff)` }}
                  >
                    {/* Icon */}
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-4
                                 group-hover:scale-110 transition-all duration-500"
                      style={{ background: `${palette.icon}18` }}
                    >
                      <Icon
                        className="w-7 h-7 transition-colors duration-300"
                        style={{ color: palette.icon }}
                      />
                    </div>

                    {/* Content */}
                    <h3 className="font-semibold text-secondary group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {count > 0 ? `${count} Products` : 'View all'}
                    </p>

                    {/* Hover arrow */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>

                    {/* Background glow */}
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0
                                    group-hover:opacity-100 transition-opacity -z-10" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!loading && categories.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No categories available yet.</p>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
