import styles from './CardBack.module.css';

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
  return (
    <div aria-hidden="true" className={`${styles.card}${compact ? ` ${styles.compact}` : ''}`}>
      <svg viewBox="0 0 40 60" preserveAspectRatio="xMidYMid meet" className={styles.glyph}>
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
          x="2"
          y="2"
          width="36"
          height="56"
          rx="2"
          ry="2"
          fill="none"
          stroke="#7c94ff"
          strokeOpacity="0.3"
          strokeWidth="0.6"
        />
      </svg>
    </div>
  );
}
