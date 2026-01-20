'use client';

import { useAuthStore } from '@/lib/store';
import { useEffect } from 'react';

/**
 * Helper to adjust hex color brightness
 * @param hex - Color hex
 * @param percent - Positive to lighten, negative to darken
 */
function adjustColor(hex: string, percent: number) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useAuthStore();

  useEffect(() => {
    const root = document.documentElement;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Default system colors
    let primary = '#f97316';
    let secondary = '#0f172a';

    if (tenant?.settings?.theme) {
      primary = tenant.settings.theme.primary || primary;
      secondary = tenant.settings.theme.secondary || secondary;
    }

    // Apply Base Colors
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--secondary', secondary);
    
    // Generate adaptive variants
    // Primary Light (for backgrounds/hover)
    root.style.setProperty('--primary-light', primary + '1A'); // 10% opacity
    
    // Dark Mode adaptations
    if (isDark) {
      // If system is in dark mode, we use a slightly brighter primary for better contrast
      const primaryDark = adjustColor(primary, 10);
      root.style.setProperty('--primary-dark-variant', primaryDark);
      // We can also adjust background/foreground if secondary is very dark
      root.style.setProperty('--secondary-darker', adjustColor(secondary, -20));
    } else {
      root.style.setProperty('--primary-dark-variant', adjustColor(primary, -10));
    }

    // Force re-calculation of any specific components using these variables
  }, [tenant]);

  return <>{children}</>;
}
