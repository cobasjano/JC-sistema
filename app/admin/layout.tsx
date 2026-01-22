'use client';

import { TenantBlocker } from '@/components/TenantBlocker';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <TenantBlocker>{children}</TenantBlocker>;
}
