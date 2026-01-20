'use client';

import { useEffect, useState, useCallback } from 'react';
import { useOfflineStore, useAuthStore } from '@/lib/store';
import { salesService } from '@/lib/services/sales';
import { SaleItem, PaymentMethod } from '@/lib/types';

export function OfflineSync() {
  const { pendingSales, removePendingSale } = useOfflineStore();
  const { user } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const syncSales = useCallback(async () => {
    if (!user || isSyncing) return;
    setIsSyncing(true);
    
    // Process one by one to avoid overwhelming or conflicting
    for (const sale of pendingSales) {
      try {
        // Use current user's ID to avoid foreign key conflicts if IDs changed after database reset
        const mappedItems: SaleItem[] = sale.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.price * item.quantity
        }));

        const result = await salesService.createSale(
          user.id,
          user.pos_number || sale.posNumber,
          user.tenant_id,
          mappedItems,
          sale.total,
          (sale.paymentMethod as PaymentMethod) || undefined,
          sale.paymentBreakdown
        );

        if (result) {
          removePendingSale(sale.id);
        } else {
            console.error('Sale creation returned null. Possible conflict.');
        }
      } catch (error) {
        console.error('Failed to sync sale:', error);
        break;
      }
    }

    setIsSyncing(false);
  }, [user, pendingSales, isSyncing, removePendingSale]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingSales.length > 0 && !isSyncing && user) {
      const timer = setTimeout(() => {
        syncSales();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingSales.length, isSyncing, user, syncSales]);

  if (pendingSales.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-bounce">
      <div className={`px-4 py-2 rounded-full shadow-lg text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}>
        <span>{isOnline ? '🔄 Sincronizando' : '📡 Offline'}</span>
        <span className="bg-white/20 px-2 py-0.5 rounded-full">{pendingSales.length}</span>
      </div>
    </div>
  );
}
