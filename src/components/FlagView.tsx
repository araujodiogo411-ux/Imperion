import React from 'react';
import { FlagData } from '../types/game';

interface FlagViewProps {
  flag: FlagData;
  className?: string;
  width?: number;
  height?: number;
}

export const FlagView: React.FC<FlagViewProps> = ({
  flag,
  className = '',
  width = 36,
  height = 24,
}) => {
  if (flag.type === 'iso' && flag.value) {
    return (
      <span
        className={`fi fi-${flag.value.toLowerCase()} inline-block rounded-[3px] overflow-hidden border border-white/25 shadow-sm shrink-0 bg-slate-800 ${className}`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-label={`Bandeira ${flag.value.toUpperCase()}`}
      />
    );
  }

  if (flag.type === 'upload' && flag.value) {
    return (
      <img
        src={flag.value}
        alt="Flag"
        referrerPolicy="no-referrer"
        className={`object-cover rounded-[3px] border border-white/25 shadow-sm shrink-0 ${className}`}
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    );
  }

  if (flag.type === 'custom' && flag.customProps) {
    const { layout, colors, emblem, emblemColor = '#ffffff' } = flag.customProps;
    const c0 = colors[0] || '#dc2626';
    const c1 = colors[1] || '#ffffff';
    const c2 = colors[2] || '#1d4ed8';

    return (
      <svg
        viewBox="0 0 90 60"
        style={{ width: `${width}px`, height: `${height}px` }}
        className={`rounded-[3px] overflow-hidden border border-white/25 shadow-sm shrink-0 ${className}`}
      >
        {layout === 'solid' && <rect x="0" y="0" width="90" height="60" fill={c0} />}

        {layout === 'horizontal' && (
          <>
            {colors.length === 2 ? (
              <>
                <rect x="0" y="0" width="90" height="30" fill={c0} />
                <rect x="0" y="30" width="90" height="30" fill={c1} />
              </>
            ) : (
              <>
                <rect x="0" y="0" width="90" height="20" fill={c0} />
                <rect x="0" y="20" width="90" height="20" fill={c1} />
                <rect x="0" y="40" width="90" height="20" fill={c2} />
              </>
            )}
          </>
        )}

        {layout === 'vertical' && (
          <>
            {colors.length === 2 ? (
              <>
                <rect x="0" y="0" width="45" height="60" fill={c0} />
                <rect x="45" y="0" width="45" height="60" fill={c1} />
              </>
            ) : (
              <>
                <rect x="0" y="0" width="30" height="60" fill={c0} />
                <rect x="30" y="0" width="30" height="60" fill={c1} />
                <rect x="60" y="0" width="30" height="60" fill={c2} />
              </>
            )}
          </>
        )}

        {layout === 'cross' && (
          <>
            <rect x="0" y="0" width="90" height="60" fill={c0} />
            <rect x="26" y="0" width="16" height="60" fill={c1} />
            <rect x="0" y="22" width="90" height="16" fill={c1} />
            <rect x="30" y="0" width="8" height="60" fill={c2} />
            <rect x="0" y="26" width="90" height="8" fill={c2} />
          </>
        )}

        {layout === 'saltire' && (
          <>
            <rect x="0" y="0" width="90" height="60" fill={c0} />
            <polygon points="0,0 12,0 90,52 90,60 78,60 0,8" fill={c1} />
            <polygon points="90,0 78,0 0,52 0,60 12,60 90,8" fill={c1} />
            <polygon points="0,0 6,0 90,56 90,60 84,60 0,4" fill={c2} />
            <polygon points="90,0 84,0 0,56 0,60 6,60 90,4" fill={c2} />
          </>
        )}

        {layout === 'canton' && (
          <>
            <rect x="0" y="0" width="90" height="60" fill={c0} />
            <rect x="0" y="10" width="90" height="10" fill={c1} />
            <rect x="0" y="30" width="90" height="10" fill={c1} />
            <rect x="0" y="50" width="90" height="10" fill={c1} />
            <rect x="0" y="0" width="42" height="32" fill={c2} />
          </>
        )}

        {emblem === 'star' && (
          <polygon
            points="45,18 48,27 57,27 50,33 53,42 45,36 37,42 40,33 33,27 42,27"
            fill={emblemColor}
          />
        )}

        {emblem === 'sun' && (
          <g>
            <circle cx="45" cy="30" r="10" fill={emblemColor} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <line
                key={i}
                x1={45 + Math.cos((angle * Math.PI) / 180) * 12}
                y1={30 + Math.sin((angle * Math.PI) / 180) * 12}
                x2={45 + Math.cos((angle * Math.PI) / 180) * 16}
                y2={30 + Math.sin((angle * Math.PI) / 180) * 16}
                stroke={emblemColor}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ))}
          </g>
        )}

        {emblem === 'crescent' && (
          <path d="M 47,19 A 11,11 0 1 0 47,41 A 9,9 0 1 1 47,19 Z" fill={emblemColor} />
        )}

        {emblem === 'shield' && (
          <path d="M 37,20 L 53,20 L 53,32 C 53,40 45,44 45,44 C 45,44 37,40 37,32 Z" fill={emblemColor} />
        )}

        {emblem === 'crown' && (
          <polygon points="35,38 55,38 55,24 49,29 45,20 41,29 35,24" fill={emblemColor} />
        )}

        {emblem === 'eagle' && (
          <path
            d="M 45,18 C 42,22 36,24 33,26 C 36,30 40,32 41,38 L 45,34 L 49,38 C 50,32 54,30 57,26 C 54,24 48,22 45,18 Z"
            fill={emblemColor}
          />
        )}

        {emblem === 'circle' && <circle cx="45" cy="30" r="10" fill={emblemColor} />}

        {emblem === 'sword' && (
          <g>
            <rect x="43.5" y="18" width="3" height="20" fill={emblemColor} rx="1" />
            <rect x="38" y="32" width="14" height="2.5" fill={emblemColor} rx="1" />
            <circle cx="45" cy="40" r="2" fill={emblemColor} />
          </g>
        )}

        {emblem === 'lion' && (
          <path
            d="M 40,24 C 40,20 48,20 48,24 C 52,26 51,32 48,34 L 52,42 L 47,42 L 45,36 L 43,42 L 38,42 L 42,34 C 39,32 38,26 40,24 Z"
            fill={emblemColor}
          />
        )}
      </svg>
    );
  }

  return (
    <div
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`bg-slate-700 text-white flex items-center justify-center font-bold text-xs rounded-[3px] border border-white/20 shadow-sm shrink-0 ${className}`}
    >
      {flag.value?.slice(0, 3) || '🏳️'}
    </div>
  );
};
