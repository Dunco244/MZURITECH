import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Send, Check, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

gsap.registerPlugin(ScrollTrigger);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';;

export default function Newsletter() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Something went wrong. Please try again.');
        return;
      }

      // Success
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setEmail('');
      }, 5000);

    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.newsletter-content',
        { y: 50, opacity: 0 },
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
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 bg-primary-light relative overflow-hidden">
      {/* Animated wave background */}
      <div className="absolute inset-0 overflow-hidden">
        <svg
          className="absolute bottom-0 left-0 w-[200%] h-32 animate-marquee"
          style={{ animationDuration: '20s' }}
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
        >
          <path
            fill="rgba(0, 104, 200, 0.05)"
            d="M0,60 C360,120 720,0 1080,60 C1260,90 1380,30 1440,60 L1440,120 L0,120 Z"
          />
        </svg>
        <svg
          className="absolute bottom-0 left-0 w-[200%] h-24 animate-marquee"
          style={{ animationDuration: '15s', animationDirection: 'reverse' }}
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
        >
          <path
            fill="rgba(0, 104, 200, 0.08)"
            d="M0,40 C480,100 960,0 1440,60 L1440,100 L0,100 Z"
          />
        </svg>
      </div>

      <div className="section-padding relative z-10">
        <div className="container-custom">
          <div className="newsletter-content max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-primary" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-4">
              Join the Tech Elite
            </h2>
            <p className="text-gray-600 mb-8">
              Subscribe to our newsletter and get exclusive offers, early access to new products,
              and expert tech tips delivered to your inbox.
            </p>

            <form onSubmit={handleSubmit} className="relative max-w-md mx-auto">
              <div
                className={`relative transition-all duration-300 ${
                  isFocused ? 'transform scale-105' : ''
                }`}
              >
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  disabled={isSubmitted || isLoading}
                  className={`w-full pl-5 pr-36 py-6 rounded-full border-2 text-base transition-all duration-300 ${
                    isFocused
                      ? 'border-primary shadow-glow'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isSubmitted ? 'border-green-500 bg-green-50' : ''}
                  ${error ? 'border-red-400' : ''}`}
                />

                <Button
                  type="submit"
                  disabled={isSubmitted || isLoading || !email}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-6 py-5 transition-all duration-500 ${
                    isSubmitted
                      ? 'bg-green-500 hover:bg-green-500 w-12 h-12 p-0'
                      : 'bg-primary hover:bg-primary-dark'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isSubmitted ? (
                    <Check className="w-5 h-5 animate-bounce-in" />
                  ) : (
                    <>
                      <span className="hidden sm:inline mr-2">Subscribe</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Success message */}
              {isSubmitted && (
                <p className="text-green-600 text-sm mt-3 animate-fade-in">
                  🎉 You're subscribed! Check your inbox for a confirmation email.
                </p>
              )}

              {/* Error message */}
              {error && (
                <p className="text-red-500 text-sm mt-3 animate-fade-in">
                  ⚠️ {error}
                </p>
              )}
            </form>

            <p className="text-gray-400 text-sm mt-4">
              No spam, ever. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}