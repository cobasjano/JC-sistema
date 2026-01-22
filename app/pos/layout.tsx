'use client';

import { TenantBlocker } from '@/components/TenantBlocker';

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return <TenantBlocker>{children}</TenantBlocker>;
}
