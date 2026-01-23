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
  const [loading, setLoading] = useState(true);

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    if (tenant?.id) {
      const billingHistory = await billingService.getBillingHistory(tenant.id);
      setHistory(billingHistory);
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

  const daysRemaining = tenant?.paid_until 
    ? Math.max(0, Math.ceil((new Date(tenant.paid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleContactSupport = () => {
    const message = encodeURIComponent(`Hola, soy del comercio ${tenant?.name}. Quisiera informar un pago o realizar una consulta sobre mi cuenta.`);
    window.open(`https://wa.me/5491100000000?text=${message}`, '_blank'); // Reemplazar con el número real de soporte
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl font-extralight text-slate-900 dark:text-white tracking-tight">Estado de Cuenta</h1>
          <p className="text-slate-500 mt-2 uppercase tracking-widest text-xs font-bold opacity-60">Historial de pagos y soporte técnico</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats & Support */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-700">
              <span className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest block">Días Disponibles</span>
              <div className={`text-5xl font-black ${daysRemaining < 7 ? 'text-red-500' : 'text-emerald-500'}`}>
                {daysRemaining}
              </div>
              <p className="text-xs text-slate-500 mt-4">
                {tenant?.paid_until 
                  ? `Vence el ${new Date(tenant.paid_until).toLocaleDateString()}`
                  : 'Sin suscripción activa'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-700">
              <h2 className="text-lg font-bold mb-4">Soporte y Pagos</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Para registrar un nuevo pago o si tienes dudas sobre tu balance, por favor contacta a nuestro equipo de soporte por WhatsApp.
              </p>
              <button
                onClick={handleContactSupport}
                className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>📱</span> Contactar por WhatsApp
              </button>
              <p className="text-[10px] text-center text-slate-400 mt-4 uppercase tracking-widest font-bold">
                Horario: Lunes a Viernes 9hs a 18hs
              </p>
            </div>
          </div>

          {/* Right Column: History */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="text-2xl">📋</span> Historial de Movimientos
              </h2>

              <div className="overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((tx) => (
                      <div key={tx.id} className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {tx.description || (tx.type === 'payment' ? 'Pago recibido' : 'Cargo por servicio')}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(tx.created_at).toLocaleDateString('es-AR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {tx.receipt_url && (
                            <a 
                              href={tx.receipt_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-2 hover:underline"
                            >
                              <span>📄</span> Ver Comprobante
                            </a>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <div className={`font-black text-xl ${tx.type === 'payment' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {tx.type === 'payment' ? '-' : '+'}${parseFloat(tx.amount.toString()).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {history.length === 0 && (
                      <div className="py-20 text-center">
                        <p className="text-slate-400 italic">No se registran movimientos aún.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
