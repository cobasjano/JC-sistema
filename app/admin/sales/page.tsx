'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/lib/store';
import { salesService } from '@/lib/services/sales';
import { customerService } from '@/lib/services/customers';
import { Sale, Customer } from '@/lib/types';
import { format } from 'date-fns';

export default function AdminSalesPage() {
  const router = useRouter();
  const { user, tenant } = useAuthStore();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedPos, setSelectedPos] = useState<string>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }

    const fetchSales = async () => {
      setLoading(true);
      const [salesData, customersData] = await Promise.all([
        salesService.getSalesByDate(selectedDate, user.tenant_id),
        customerService.getAll(user.tenant_id)
      ]);
      
      setSales(salesData);
      
      const customerMap: Record<string, Customer> = {};
      customersData.forEach(c => {
        customerMap[c.id] = c;
      });
      setCustomers(customerMap);
      
      setLoading(false);
    };

    fetchSales();
  }, [user, router, selectedDate]);

  const posOptions = useMemo(() => {
    if (!tenant) return [];
    return Object.entries(tenant.settings.pos_names).map(([number, name]) => ({
      value: number,
      label: `POS ${number} - ${name}`
    }));
  }, [tenant]);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesPos = selectedPos === 'all' || sale.pos_number.toString() === selectedPos;
      return matchesPos;
    });
  }, [sales, selectedPos]);

  const totalAmount = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  }, [filteredSales]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      {/* Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Detalle de Venta</h3>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
                  POS {selectedSale.pos_number} • {format(new Date(selectedSale.created_at), "HH:mm 'hs'")}
                </p>
              </div>
              <button 
                onClick={() => setSelectedSale(null)}
                className="w-10 h-10 rounded-full hover:bg-white hover:shadow-md flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end pb-4 border-b border-dashed border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Productos</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtotal</span>
                </div>
                
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start group">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {item.quantity}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.product_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Unitario: ${((item.subtotal || 0) / (item.quantity || 1)).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-900">${(item.subtotal || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t border-slate-100">
              {selectedSale.customer_id && customers[selectedSale.customer_id] && (
                <div className="mb-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block mb-1">Cliente Asignado</span>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-orange-900">{customers[selectedSale.customer_id].full_name}</span>
                    <span className="text-xs text-orange-600">{customers[selectedSale.customer_id].phone_number}</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-slate-500">Método de Pago</span>
                <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm uppercase tracking-widest">
                  {selectedSale.payment_method || 'Desconocido'}
                </span>
              </div>
              
              {selectedSale.payment_method === 'Mixto' && selectedSale.payment_breakdown && (
                <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{selectedSale.payment_breakdown.method1}</span>
                    <span className="font-bold text-slate-700">${(selectedSale.payment_breakdown.amount1 || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{selectedSale.payment_breakdown.method2}</span>
                    <span className="font-bold text-slate-700">${(selectedSale.payment_breakdown.amount2 || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <span className="text-lg font-light text-slate-900 tracking-tight">Total Cobrado</span>
                <span className="text-3xl font-black text-orange-600 tracking-tighter">
                  ${(selectedSale.total || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extralight text-slate-900 tracking-tight">Consulta de Ventas</h1>
            <p className="text-slate-500 text-sm mt-1">Explora el detalle de ventas por día y punto de venta</p>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="flex flex-col gap-1.5 flex-1 md:flex-none">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1 md:flex-none">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Punto de Venta</label>
              <select
                value={selectedPos}
                onChange={(e) => setSelectedPos(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
              >
                <option value="all">Todos los POS</option>
                {posOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Total del Día</span>
            <div className="text-2xl font-bold text-slate-900">${totalAmount.toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Operaciones</span>
            <div className="text-2xl font-bold text-slate-900">{filteredSales.length} ventas</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Ticket Promedio</span>
            <div className="text-2xl font-bold text-slate-900">
              ${filteredSales.length > 0 ? (totalAmount / filteredSales.length).toLocaleString() : '0'}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-500 font-light">Cargando ventas...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
            <p className="text-slate-400 font-light italic">No se encontraron ventas para los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hora</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">POS</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Método</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {format(new Date(sale.created_at), 'HH:mm')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                          POS {sale.pos_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {sale.customer_id && customers[sale.customer_id] ? (
                          <span className="font-bold text-slate-900 uppercase tracking-tight text-[11px]">
                            {customers[sale.customer_id].full_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-light">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-700">{sale.payment_method}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        ${sale.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedSale(sale)}
                          className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:text-orange-600 transition-colors bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100"
                        >
                          VER DETALLE
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
