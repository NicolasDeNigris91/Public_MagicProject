/**
 * Decorative back-of-card used to represent the opponent's hidden hand.
 * Pure SVG - no network, no defs (avoids duplicate-id collisions when
 * the component is rendered five times side-by-side).
 */
export interface CardBackProps {
  /** Thin strip mode used in the opponent's hand. */
  compact?: boolean;
}

export function CardBack({ compact = false }: CardBackProps) {
  const dims = compact
    ? { width: 26, height: 36, radius: 4, borderWidth: 1 }
    : { width: 160, height: 223, radius: 10, borderWidth: 2 };

  return (
    <div
      aria-hidden="true"
      style={{
        width: dims.width,
        height: dims.height,
        borderRadius: dims.radius,
        border: `${dims.borderWidth}px solid #455a64`,
        background: 'linear-gradient(135deg,#1a237e 0%, #0a1440 100%)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        viewBox="0 0 40 60"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '90%', height: '90%', display: 'block' }}
      >
        <g stroke="#7c94ff" fill="none" strokeLinejoin="round">
          {/* Outer diamond */}
          <polygon points="20,8 32,30 20,52 8,30" strokeWidth="1" opacity="0.75" />
          {/* Inner filled diamond */}
          <polygon
            points="20,18 26,30 20,42 14,30"
            fill="#3d5afe"
            fillOpacity="0.45"
            strokeWidth="0.6"
          />
        </g>
        {/* Inner frame for a "card" feel */}
        <rect
          x="2" y="2" width="36" height="56"
          rx="2" ry="2"
          fill="none"
          stroke="#7c94ff"
          strokeOpacity="0.3"
          strokeWidth="0.6"
        />
      </svg>
    </div>
  );
}
