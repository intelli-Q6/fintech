import React from 'react';
import { Sparkles, Lock } from 'lucide-react';

interface ProBadgeProps {
  label?: string;
  variant?: 'gold' | 'violet' | 'lock' | 'subtle';
  isLocked?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export const ProBadge: React.FC<ProBadgeProps> = ({
  label = 'PRO',
  variant = 'gold',
  isLocked = false,
  size = 'sm',
  onClick
}) => {
  const isClickable = Boolean(onClick);
  const activeVariant = isLocked ? 'lock' : variant;

  // Gradient & color themes
  const styles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    borderRadius: 4,
    fontWeight: 800,
    fontFamily: 'var(--font-mono, monospace)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: isClickable ? 'pointer' : 'default',
    transition: 'all 0.15s ease',
    userSelect: 'none',
    verticalAlign: 'middle',
    fontSize: size === 'sm' ? '9px' : '11px',
    padding: size === 'sm' ? '1px 5px' : '3px 8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
  };

  if (activeVariant === 'gold') {
    Object.assign(styles, {
      background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      color: '#ffffff',
      border: '1px solid rgba(245, 158, 11, 0.4)'
    });
  } else if (activeVariant === 'violet') {
    Object.assign(styles, {
      background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
      color: '#ffffff',
      border: '1px solid rgba(124, 58, 237, 0.3)'
    });
  } else if (activeVariant === 'lock') {
    Object.assign(styles, {
      background: 'rgba(245, 158, 11, 0.12)',
      color: '#f59e0b',
      border: '1px solid rgba(245, 158, 11, 0.3)'
    });
  } else {
    // subtle
    Object.assign(styles, {
      background: 'var(--bg-surface-elevated, rgba(255,255,255,0.06))',
      color: 'var(--text-muted)',
      border: '1px solid var(--border-subtle)'
    });
  }

  return (
    <span
      style={styles}
      onClick={onClick}
      title={isClickable ? 'Click to view KoshQ Pro feature access' : 'KoshQ Pro Feature'}
      role={isClickable ? 'button' : undefined}
    >
      {activeVariant === 'lock' ? (
        <Lock size={size === 'sm' ? 8 : 10} />
      ) : (
        <Sparkles size={size === 'sm' ? 8 : 10} />
      )}
      <span>{label}</span>
    </span>
  );
};
