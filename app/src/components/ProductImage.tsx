import { useState, useEffect, useRef } from 'react';
import { ImageIcon } from 'lucide-react';
import { resolveProductImageUrl } from '@/lib/utils';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

const resolveImageUrl = (img: string | null | undefined): string | null => {
  if (!img) return null;
  return resolveProductImageUrl(img);
};

export default function ProductImage({
  src,
  alt,
  className = 'w-full h-full object-contain',
  fallbackClassName = 'w-full h-full flex items-center justify-center',
}: ProductImageProps) {
  const [status, setStatus]     = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState<string | null>(resolveImageUrl(src));
  const imgRef                  = useRef<HTMLImageElement>(null);

  // Reset when src prop changes
  useEffect(() => {
    if (!src) { setStatus('error'); return; }
    setImageSrc(resolveImageUrl(src));
    setStatus('loading');
  }, [src]);

  // Handle already-cached images (browser may fire onLoad before React hydrates)
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setStatus('loaded');
    }
  }, [imageSrc]);

  const handleLoad  = () => setStatus('loaded');
  const handleError = () => setStatus('error');

  if (!imageSrc || status === 'error') {
    return (
      <div className={`bg-gray-100 ${fallbackClassName}`}>
        <div className="text-center">
          <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <span className="text-xs text-gray-500">Image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {status === 'loading' && (
        <div className={`bg-gray-100 animate-pulse ${fallbackClassName}`} aria-hidden>
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
        </div>
      )}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`${className} ${status === 'loading' ? 'hidden' : ''}`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  );
}

