import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null): string {
  if (!date) return '从未';
  return new Date(date).toLocaleString('zh-CN');
}

export function formatAvailability(availability: string): string {
  if (availability === 'unavailable' || availability === '' || availability.toLowerCase() === 'unknown') {
    return '不可用';
  }

  if (availability.toLowerCase().includes('h')) {
    return `预计 ${availability} 小时内`;
  }

  if (availability.toLowerCase() === 'available') {
    return '现在可用';
  }

  // 120H 类型的情况
  const hourMatch = availability.match(/(\d+)H?/i);
  if (hourMatch && hourMatch[1]) {
    return `预计 ${hourMatch[1]} 小时内`;
  }

  return availability;
} 