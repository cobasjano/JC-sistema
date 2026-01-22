'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/lib/store';
import { billingService } from '@/lib/services/billing';
import { TenantBilling } from '@/lib/types';

export default function AdminBillingPage() {
  const router = useRouter();
  const { user, tenant } = useAuthStore();
  const [history, setHistory] = useState<TenantBilling[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    if (tenant?.id) {
      const [billingHistory, currentBalance] = await Promise.all([
        billingService.getBillingHistory(tenant.id),
        billingService.getBalance(tenant.id)
      ]);
      setHistory(billingHistory);
      setBalance(currentBalance);
    }
    setLoading(false);
  }, [tenant?.id]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }

    if (tenant?.id) {
      fetchBilling();
    }
  }, [user, tenant?.id, router, fetchBilling]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6 lg:p-10">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl font-extralight text-slate-900 dark:text-white tracking-tight">Estado de Facturación</h1>
          <p className="text-slate-500 mt-2 uppercase tracking-widest text-xs font-bold opacity-60">Control de pagos y servicios del sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="md:col-span-1 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-700 flex flex-col justify-center items-center text-center">
            <span className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Saldo Actual</span>
            <div className={`text-4xl font-black ${balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              ${balance.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 mt-4 leading-tight px-4">
              {balance > 0 
                ? 'Tienes un saldo pendiente de pago. Comunícate con soporte para regularizar.' 
                : 'Tu cuenta se encuentra al día. ¡Gracias por usar el sistema!'}
            </p>
          </div>

          <div className="md:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">📋</span> Últimos Movimientos
            </h2>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {tx.description || (tx.type === 'payment' ? 'Pago recibido' : 'Cargo por servicio')}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(tx.created_at).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className={`font-bold text-lg ${tx.type === 'payment' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {tx.type === 'payment' ? '-' : '+'}${parseFloat(tx.amount.toString()).toLocaleString()}
                    </div>
                  </div>
                ))}
                
                {history.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-slate-400 italic text-sm">No se registran movimientos aún.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl overflow-hidden relative">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">¿Necesitas ayuda con tu facturación?</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md">Si tienes dudas sobre un cargo o quieres informar un pago realizado, nuestro equipo de soporte está disponible para ayudarte.</p>
            <a 
              href="https://wa.me/5491122334455" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors"
            >
              <span>💬</span> Contactar Soporte
            </a>
          </div>
          <div className="absolute top-0 right-0 text-9xl opacity-10 translate-x-1/4 -translate-y-1/4 select-none">
            💰
          </div>
        </div>
      </div>
    </div>
  );
}
