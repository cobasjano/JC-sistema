'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/lib/store';
import { billingService } from '@/lib/services/billing';
import { TenantBilling } from '@/lib/types';

export default function AdminBillingPage() {
  const router = useRouter();
  const { user, tenant, setTenant } = useAuthStore();
  const [history, setHistory] = useState<TenantBilling[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);

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

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !amount) return;
    
    setIsSubmitting(true);
    const success = await billingService.registerTransaction({
      tenant_id: tenant.id,
      amount: parseFloat(amount),
      type: 'payment',
      description: description || 'Pago de sistema'
    }, 30); // Default 30 days as requested "pagas por 30 dias"

    if (success) {
      setAmount('');
      setDescription('');
      fetchBilling();
      // Optionally update local tenant state for paid_until if we want immediate feedback
    } else {
      alert('Error al registrar el pago');
    }
    setIsSubmitting(false);
  };

  const handleFileUpload = async (txId: string, file: File) => {
    if (!tenant) return;
    setUploadingReceipt(txId);
    const url = await billingService.uploadReceipt(tenant.id, txId, file);
    if (url) {
      fetchBilling();
    } else {
      alert('Error al subir el comprobante');
    }
    setUploadingReceipt(null);
  };

  if (!user || user.role !== 'admin') return null;

  const daysRemaining = tenant?.paid_until 
    ? Math.max(0, Math.ceil((new Date(tenant.paid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl font-extralight text-slate-900 dark:text-white tracking-tight">Pagos del Sistema</h1>
          <p className="text-slate-500 mt-2 uppercase tracking-widest text-xs font-bold opacity-60">Gestión de suscripción y comprobantes</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats & Register */}
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
              <h2 className="text-lg font-bold mb-6">Registrar Nuevo Pago</h2>
              <form onSubmit={handleRegisterPayment} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Monto a Pagar</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl border border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Descripción (Opcional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-5 py-3 rounded-2xl border border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    placeholder="Ej: Pago Mes de Marzo"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Registrando...' : 'Informar Pago (+30 días)'}
                </button>
              </form>
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
                          
                          {!tx.receipt_url && tx.type === 'payment' && (
                            <label className="cursor-pointer">
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) handleFileUpload(tx.id, e.target.files[0]);
                                }}
                                disabled={uploadingReceipt === tx.id}
                              />
                              <span className={`text-[10px] font-bold px-3 py-1 rounded-full border border-orange-500 text-orange-500 hover:bg-orange-50 transition-colors ${uploadingReceipt === tx.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {uploadingReceipt === tx.id ? 'Subiendo...' : 'Subir Comprobante'}
                              </span>
                            </label>
                          )}
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
