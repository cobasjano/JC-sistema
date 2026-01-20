'use client';

import { useAuthStore } from '@/lib/store';
import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useAuthStore();

  useEffect(() => {
    const root = document.documentElement;
    
    if (tenant?.settings?.theme) {
      const { primary, secondary } = tenant.settings.theme;
      if (primary) {
        root.style.setProperty('--primary', primary);
        // Also set a lighter version for backgrounds if needed
        root.style.setProperty('--primary-light', primary + '1A'); // 10% opacity
      }
      if (secondary) {
        root.style.setProperty('--secondary', secondary);
      }
    } else {
      // Default colors (Sistema JC Orange)
      root.style.setProperty('--primary', '#f97316');
      root.style.setProperty('--primary-light', '#f973161A');
      root.style.setProperty('--secondary', '#0f172a');
    }
  }, [tenant]);

  return <>{children}</>;
}
