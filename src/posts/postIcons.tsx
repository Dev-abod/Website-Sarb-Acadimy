import React from 'react';

export type SocialPlatform = 'facebook' | 'instagram' | 'x' | 'linkedin' | 'telegram';

export interface SocialPlatformDef {
  id: SocialPlatform;
  labelAr: string;
  labelEn: string;
}

export const SOCIAL_PLATFORMS: SocialPlatformDef[] = [
  { id: 'facebook', labelAr: 'فيسبوك', labelEn: 'Facebook' },
  { id: 'instagram', labelAr: 'إنستغرام', labelEn: 'Instagram' },
  { id: 'x', labelAr: 'إكس', labelEn: 'X' },
  { id: 'linkedin', labelAr: 'لينكدإن', labelEn: 'LinkedIn' },
  { id: 'telegram', labelAr: 'تيليجرام', labelEn: 'Telegram' },
];

export type IconEffect = 'none' | 'shadow' | 'glow' | 'neon';

/**
 * Draw crisp, optically-balanced 24x24 outline social icons inside a circular badge via Canvas vector geometry.
 * Supports isolated visual effects: 'none' | 'shadow' | 'glow' | 'neon'.
 */
export function drawSocialIconOnCanvas(
  ctx: CanvasRenderingContext2D,
  platform: SocialPlatform,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha = 0.9,
  badgeFill = '#1C1C1C',
  badgeStroke = 'rgba(230, 230, 230, 0.22)',
  effect: IconEffect = 'none'
) {
  // 1. Circular badge background + optional outer visual effect
  const cx = x + size / 2;
  const cy = y + size / 2;
  const radius = size / 2;

  ctx.save();
  if (effect === 'shadow') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.82)';
    ctx.shadowBlur = size * 0.34;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = size * 0.14;
  } else if (effect === 'glow') {
    ctx.shadowColor =
      color === '#D4FF00' ? 'rgba(212, 255, 0, 0.55)' : 'rgba(255, 255, 255, 0.28)';
    ctx.shadowBlur = size * 0.42;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  } else if (effect === 'neon') {
    ctx.shadowColor = 'rgba(212, 255, 0, 0.72)';
    ctx.shadowBlur = size * 0.56;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = badgeFill;
  ctx.fill();
  ctx.restore();

  // Badge ring (crisp stroke without muddy shadow overlap)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle =
    effect === 'neon'
      ? 'rgba(212, 255, 0, 0.72)'
      : effect === 'glow' && color === '#D4FF00'
        ? 'rgba(212, 255, 0, 0.58)'
        : badgeStroke;
  ctx.lineWidth = Math.max(1, size * (effect === 'neon' ? 0.055 : 0.042));
  ctx.stroke();

  // Subtle top rim highlight for shadow depth mode
  if (effect === 'shadow') {
    ctx.beginPath();
    ctx.arc(cx, cy, radius - size * 0.04, Math.PI * 1.15, Math.PI * 1.85);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = Math.max(0.8, size * 0.028);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Centered vector glyph inside the circle
  const innerSize = size * 0.54;
  const offset = (size - innerSize) / 2;
  const s = innerSize / 24;

  ctx.save();
  ctx.translate(x + offset, y + offset);
  ctx.scale(s, s);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.15;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (effect === 'glow' || effect === 'neon') {
    ctx.shadowColor =
      effect === 'neon' || color === '#D4FF00'
        ? 'rgba(212, 255, 0, 0.65)'
        : 'rgba(255, 255, 255, 0.35)';
    ctx.shadowBlur = effect === 'neon' ? 5 : 3;
  }

  switch (platform) {
    case 'facebook': {
      ctx.beginPath();
      ctx.moveTo(16.5, 3);
      ctx.lineTo(13.8, 3);
      ctx.arc(13.8, 7.2, 4.2, -Math.PI / 2, Math.PI, true);
      ctx.lineTo(9.6, 10);
      ctx.lineTo(6.8, 10);
      ctx.lineTo(6.8, 13.4);
      ctx.lineTo(9.6, 13.4);
      ctx.lineTo(9.6, 21);
      ctx.lineTo(13.2, 21);
      ctx.lineTo(13.2, 13.4);
      ctx.lineTo(16.1, 13.4);
      ctx.lineTo(16.7, 10);
      ctx.lineTo(13.2, 10);
      ctx.lineTo(13.2, 7.5);
      ctx.arc(14.4, 7.5, 1.2, Math.PI, -Math.PI / 2, false);
      ctx.lineTo(16.5, 6.3);
      ctx.closePath();
      ctx.stroke();
      break;
    }

    case 'instagram': {
      ctx.beginPath();
      ctx.roundRect(2.6, 2.6, 18.8, 18.8, 5.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(12, 12, 4.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(17.3, 6.7, 1.05, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'x': {
      // Sleek geometric X mark: crisp diagonal ribbon + broken counter-stroke
      ctx.beginPath();
      ctx.moveTo(4.2, 3.8);
      ctx.lineTo(8.7, 3.8);
      ctx.lineTo(19.8, 20.2);
      ctx.lineTo(15.3, 20.2);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(19.2, 3.8);
      ctx.lineTo(13.1, 10.6);
      ctx.moveTo(10.9, 13.4);
      ctx.lineTo(4.8, 20.2);
      ctx.stroke();
      break;
    }

    case 'linkedin': {
      ctx.beginPath();
      ctx.roundRect(2.6, 2.6, 18.8, 18.8, 4.2);
      ctx.stroke();

      // 'i' dot
      ctx.beginPath();
      ctx.arc(7.8, 7.5, 1.05, 0, Math.PI * 2);
      ctx.fill();

      // 'i' stem
      ctx.beginPath();
      ctx.moveTo(7.8, 10.6);
      ctx.lineTo(7.8, 16.8);
      ctx.stroke();

      // 'n' arch
      ctx.beginPath();
      ctx.moveTo(11.4, 16.8);
      ctx.lineTo(11.4, 10.6);
      ctx.moveTo(11.4, 13.1);
      ctx.arc(14, 13.1, 2.6, Math.PI, 0, false);
      ctx.lineTo(16.6, 16.8);
      ctx.stroke();
      break;
    }

    case 'telegram': {
      ctx.beginPath();
      ctx.moveTo(21.2, 4.1);
      ctx.lineTo(2.8, 11.4);
      ctx.lineTo(8.4, 13.5);
      ctx.lineTo(17.7, 7.6);
      ctx.lineTo(10.8, 14.9);
      ctx.lineTo(10.8, 19.6);
      ctx.lineTo(13.9, 16.3);
      ctx.lineTo(18.1, 19.5);
      ctx.closePath();
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

/** Crisp matching React SVG icons for the UI controls & preview legend */
export function SocialPlatformSvg({
  platform,
  className = 'w-4 h-4',
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  const shared = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (platform) {
    case 'facebook':
      return (
        <svg {...shared}>
          <path d="M16.5 3h-2.7a4.2 4.2 0 0 0-4.2 4.2V10H6.8v3.4h2.8V21h3.6v-7.6h2.9l.6-3.4h-3.5V7.5a1.2 1.2 0 0 1 1.2-1.2h2.1V3Z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...shared}>
          <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" />
          <circle cx="12" cy="12" r="4.3" />
          <circle cx="17.3" cy="6.7" r="1.05" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'x':
      return (
        <svg {...shared}>
          <path d="M4.2 3.8h4.5L19.8 20.2h-4.5L4.2 3.8Z" />
          <path d="M19.2 3.8l-6.1 6.8M10.9 13.4l-6.1 6.8" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...shared}>
          <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="4.2" />
          <circle cx="7.8" cy="7.5" r="1.05" fill="currentColor" stroke="none" />
          <path d="M7.8 10.6v6.2M11.4 16.8v-6.2M11.4 13.1a2.6 2.6 0 0 1 5.2 0v3.7" />
        </svg>
      );
    case 'telegram':
      return (
        <svg {...shared}>
          <path d="M21.2 4.1 2.8 11.4l5.6 2.1L17.7 7.6l-6.9 7.3v4.7l3.1-3.3 4.2 3.2 3.1-15.4Z" />
        </svg>
      );
  }
}
