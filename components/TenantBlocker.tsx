'use client';

import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { tenantService } from '@/lib/services/tenants';
import { billingService } from '@/lib/services/billing';

export function TenantBlocker({ children }: { children: React.ReactNode }) {
  const { tenant, user, setTenant, logout } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    async function checkStatus() {
      if (user?.role === 'superadmin') {
        setLoading(false);
        return;
      }

      if (tenant?.id) {
        const [updatedTenant, currentBalance] = await Promise.all([
          tenantService.getTenant(tenant.id),
          billingService.getBalance(tenant.id)
        ]);
        
        if (updatedTenant) {
          setTenant(updatedTenant);
        }
        setBalance(currentBalance);
      }
      setLoading(false);
    }

    checkStatus();

    // Poll for status changes every 60 seconds
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [user?.id, tenant?.id, user?.role, setTenant]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (user?.role !== 'superadmin' && tenant && tenant.is_active === false) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white rounded-3xl p-10 shadow-2xl">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Acceso Suspendido</h1>
          <p className="text-slate-500 mb-2 leading-relaxed">
            El acceso para <strong>{tenant.name}</strong> ha sido suspendido temporalmente por falta de pago o mantenimiento.
          </p>
          
          {balance > 0 && (
            <div className="mb-8 p-4 bg-red-50 rounded-2xl border border-red-100">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Saldo Pendiente</p>
              <p className="text-2xl font-black text-red-600">${balance.toLocaleString()}</p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm text-slate-400 font-medium uppercase tracking-widest">Comuníquese con Soporte</p>
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold transition hover:bg-slate-800"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
