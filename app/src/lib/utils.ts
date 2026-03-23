import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Add this function:
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Keep your existing functions below:
export function formatKES(n: number): string {
  return `KES ${Number(n).toLocaleString()}`;
}

export function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const API_URL = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:5000";

export type ProductImageLike = string | { url?: string } | null | undefined;

export function pickFirstProductImage(
  image?: string | null,
  images?: ProductImageLike[] | null
): string | undefined {
  if (image) return image;
  const first = images?.[0];
  if (!first) return undefined;
  return typeof first === "string" ? first : first.url;
}

export function resolveProductImageUrl(image?: string | null): string {
  if (!image) return "";
  if (image.startsWith("http") || image.startsWith("data:")) return image;
  if (image.startsWith("/uploads/") || image.includes("/uploads/")) {
    return `${API_URL}${image.startsWith("/") ? image : `/${image}`}`;
  }
  if (image.startsWith("/")) return image;
  return `/${image}`;
}
