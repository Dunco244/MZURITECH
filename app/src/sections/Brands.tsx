import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { brands } from '@/data/products';

gsap.registerPlugin(ScrollTrigger);

// SVG Brand Logos (simplified representations)
const brandLogos: Record<string, React.ReactNode> = {
  Dell: (
    <svg viewBox="0 0 100 30" className="w-full h-full">
      <text x="10" y="22" className="fill-current font-bold text-xl">DELL</text>
    </svg>
  ),
  Apple: (
    <svg viewBox="0 0 100 30" className="w-full h-full">
      <text x="15" y="22" className="fill-current font-bold text-xl">Apple</text>
    </svg>
  ),
  Samsung: (
    <svg viewBox="0 0 100 30" className="w-full h-full">
      <text x="5" y="22" className="fill-current font-bold text-lg">SAMSUNG</text>
    </svg>
  ),
  Sony: (
    <svg viewBox="0 0 100 30" className="w-full h-full">
      <text x="20" y="22" className="fill-current font-bold text-xl">SONY</text>
    </svg>
  ),
  ASUS: (
    <svg viewBox="0 0 100 30" className="w-full h-full">
      <text x="15" y="22" className="fill-current font-bold text-xl">ASUS</text>
    </svg>
  ),
  HP: (
    <svg viewBox="0 0 100 30" className="w-full h-full">
      <text x="30" y="22" className="fill-current font-bold text-2xl">hp</text>
    </svg>
  ),
  Lenovo: (
    <svg viewBox="0 0 100 30" className="w-full h-full">
      <text x="10" y="22" className="fill-current font-bold text-lg">lenovo</text>
    </svg>
  ),
  MSI: (
    <svg viewBox="0 0 100 30" className="w-full h-full">
      <text x="25" y="22" className="fill-current font-bold text-xl">MSI</text>
    </svg>
  ),
};

export default function Brands() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        '.brands-title',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        }
      );

      // Brand logos scanline effect
      const logos = sectionRef.current?.querySelectorAll('.brand-logo');
      if (logos) {
        gsap.fromTo(
          logos,
          { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
          {
            clipPath: 'inset(0 0% 0 0)',
            opacity: 1,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 70%',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 bg-white border-y border-gray-100">
      <div className="section-padding">
        <div className="container-custom">
          {/* Section Header */}
          <div className="brands-title text-center mb-10">
            <p className="text-gray-500 text-sm uppercase tracking-wider">
              Trusted by Leading Brands
            </p>
          </div>

          {/* Brands Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8 items-center">
            {brands.map((brand) => (
              <div
                key={brand}
                className="brand-logo group relative flex items-center justify-center h-12
                         text-gray-400 hover:text-primary transition-colors duration-300
                         cursor-pointer"
              >
                {/* Glitch effect on hover */}
                <div className="relative">
                  {brandLogos[brand] || (
                    <span className="font-bold text-lg">{brand}</span>
                  )}
                </div>
                
                {/* Hover glow */}
                <div className="absolute inset-0 bg-primary/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

