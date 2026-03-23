import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const triggers: ScrollTrigger[] = [];

    const ctx = gsap.context(() => {
      const trigger = ScrollTrigger.create({
        trigger: element,
        start: 'top 80%',
        onEnter: () => {
          gsap.fromTo(
            element,
            { opacity: 0, y: 50 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
          );
        },
        once: true,
      });
      triggers.push(trigger);
    }, element);

    return () => {
      triggers.forEach((t) => t.kill());
      ctx.revert();
    };
  }, []);

  return ref;
}

export function useStaggerAnimation(selector: string) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const triggers: ScrollTrigger[] = [];

    const ctx = gsap.context(() => {
      const items = container.querySelectorAll(selector);
      const trigger = ScrollTrigger.create({
        trigger: container,
        start: 'top 80%',
        onEnter: () => {
          gsap.fromTo(
            items,
            { opacity: 0, y: 40, scale: 0.95 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.6,
              stagger: 0.1,
              ease: 'power3.out',
            }
          );
        },
        once: true,
      });
      triggers.push(trigger);
    }, container);

    return () => {
      triggers.forEach((t) => t.kill());
      ctx.revert();
    };
  }, [selector]);

  return containerRef;
}

export function useParallax(speed: number = 0.5) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const triggers: ScrollTrigger[] = [];

    const ctx = gsap.context(() => {
      const trigger = ScrollTrigger.create({
        trigger: element,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          gsap.set(element, {
            y: self.progress * 100 * speed,
          });
        },
      });
      triggers.push(trigger);
    }, element);

    return () => {
      triggers.forEach((t) => t.kill());
      ctx.revert();
    };
  }, [speed]);

  return ref;
}
