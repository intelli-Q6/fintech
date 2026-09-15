import React from 'react';

interface KoshQLogoProps {
  size?: number;
  glow?: boolean;
}

export const KoshQLogo: React.FC<KoshQLogoProps> = ({ size = 32, glow = true }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: glow ? 'drop-shadow(0 0 10px var(--accent-glow))' : 'none',
          transition: 'transform var(--transition-normal)'
        }}
      >
        <defs>
          <linearGradient id="koshqGradientPrimary" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--accent-primary)" />
            <stop offset="1" stopColor="var(--accent-secondary)" />
          </linearGradient>
          <linearGradient id="koshqGradientInner" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.05" />
          </linearGradient>
          <radialGradient id="koshqCoreGlow" cx="24" cy="24" r="14" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--accent-primary)" stopOpacity="0.4" />
            <stop offset="1" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Outer Isometric Sovereign Vault Hexagon */}
        <path
          d="M24 3 L42 13.5 V34.5 L24 45 L6 34.5 V13.5 Z"
          fill="var(--bg-surface-elevated)"
          stroke="url(#koshqGradientPrimary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Inner Diamond Facet Grid (Treasury/Kosh Vault Structure) */}
        <path
          d="M24 3 L24 24 L42 13.5 M24 24 L6 13.5 M24 24 L24 45"
          stroke="url(#koshqGradientPrimary)"
          strokeWidth="1.5"
          strokeOpacity="0.4"
          strokeLinecap="round"
        />

        {/* Concentric Quantum Core (Q Identifier) */}
        <circle
          cx="24"
          cy="24"
          r="10.5"
          fill="url(#koshqGradientInner)"
          stroke="url(#koshqGradientPrimary)"
          strokeWidth="2.2"
        />

        <circle
          cx="24"
          cy="24"
          r="5.5"
          fill="url(#koshqCoreGlow)"
        />

        {/* Q Sovereign Tail / Diamond Scepter Accent */}
        <path
          d="M31 31 L41 41"
          stroke="url(#koshqGradientPrimary)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Precision Center Star Node */}
        <circle
          cx="24"
          cy="24"
          r="2"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
};
