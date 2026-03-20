'use client';
import Image from 'next/image';
import { cn, getInitials, generateGradient } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export function Avatar({ src, name, size = 40, className, onClick }: AvatarProps) {
  const initials = name ? getInitials(name) : '?';
  const gradient = name ? generateGradient(name) : 'linear-gradient(135deg, #7c6af7, #00f5d4)';
  const fontSize = Math.max(10, Math.floor(size * 0.35));

  if (src) {
    return (
      <div
        className={cn('relative overflow-hidden rounded-full flex-shrink-0', className)}
        style={{ width: size, height: size }}
        onClick={onClick}
      >
        <Image
          src={src}
          alt={name || 'Avatar'}
          fill
          className="object-cover"
          sizes={`${size}px`}
          onError={(e) => {
            // Fallback to initials on error
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold select-none',
        onClick && 'cursor-pointer',
        className
      )}
      style={{ width: size, height: size, background: gradient, fontSize }}
      onClick={onClick}
      aria-label={name || 'Avatar'}
    >
      {initials}
    </div>
  );
}
