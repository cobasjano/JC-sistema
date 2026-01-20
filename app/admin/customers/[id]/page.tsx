'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/lib/store';
import { customerService } from '@/lib/services/customers';
import { salesService } from '@/lib/services/sales';
import { Customer, Sale } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default function CustomerDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, tenant } = useAuthStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPos, setEditPos] = useState('1');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const [customerData, salesData] = await Promise.all([
        customerService.getById(id, user.tenant_id),
        salesService.getSalesByCustomer(id, user.tenant_id)
      ]);
      
      setCustomer(customerData);
      if (customerData) {
        setEditName(customerData.full_name);
        setEditPhone(customerData.phone_number);
        setEditPos(customerData.pos_number.toString());
      }
      setSales(salesData);
      setLoading(false);
    };

    fetchData();
  }, [id, user, router]);

  const posOptions = useMemo(() => {
    if (!tenant) return [];
    return Object.entries(tenant.settings.pos_names).map(([number, name]) => ({
      value: number,
      label: `POS ${number} - ${name}`
    }));
  }, [tenant]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editName.trim() || !editPhone.trim()) return;

    setIsUpdating(true);
    const updated = await customerService.update(id, user.tenant_id, {
      full_name: editName.trim(),
      phone_number: editPhone.trim(),
      pos_number: parseInt(editPos)
    });

    if (updated) {
      setCustomer(updated);
      setShowEditModal(false);
    }
    setIsUpdating(false);
  };

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    const success = await customerService.delete(id, user.tenant_id);
    if (success) {
      router.push('/admin/customers');
    } else {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      alert('Error al eliminar el cliente. Puede que tenga ventas asociadas.');
    }
  };

  const stats = useMemo(() => {
    const totalSpent = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const totalPurchases = sales.length;
    const averageTicket = totalPurchases > 0 ? totalSpent / totalPurchases : 0;
    const lastPurchase = sales.length > 0 ? sales[0].created_at : null;
    
    const timeAsCustomer = customer ? formatDistanceToNow(new Date(customer.created_at), { locale: es }) : '';
    const timeSinceLastPurchase = lastPurchase ? formatDistanceToNow(new Date(lastPurchase), { locale: es, addSuffix: true }) : 'N/A';
    
    return { totalSpent, totalPurchases, averageTicket, lastPurchase, timeAsCustomer, timeSinceLastPurchase };
  }, [sales, customer]);

  if (!user || user.role !== 'admin') return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex flex-col justify-center items-center py-32">
          <div className="w-12 h-12 border-t-2 border-orange-500 border-solid rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando perfil de cliente...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-7xl mx-auto p-8 text-center">
          <p className="text-slate-500">Cliente no encontrado.</p>
          <Link href="/admin/customers" className="text-orange-500 font-bold mt-4 block">Volver a Clientes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Sale Detail Modal (Reuse from AdminSalesPage) */}
      {selectedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Detalle de Venta</h3>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">
                  POS {selectedSale.pos_number} • {format(new Date(selectedSale.created_at), "dd/MM/yyyy HH:mm 'hs'")}
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
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Unitario: ${(item.subtotal / item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-900">${item.subtotal.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-slate-500">Método de Pago</span>
                <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm uppercase tracking-widest">
                  {selectedSale.payment_method}
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <span className="text-lg font-light text-slate-900 tracking-tight">Total Cobrado</span>
                <span className="text-3xl font-black text-orange-600 tracking-tighter">
                  ${selectedSale.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <Link href="/admin/customers" className="text-slate-400 hover:text-slate-900 transition-colors text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-6">
          ← Volver a Clientes
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center text-3xl">
                  👤
                </div>
              </div>
              <div className="relative z-10">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Perfil de Cliente</span>
                <h2 className="text-3xl font-bold text-slate-900 mt-2 uppercase tracking-tight">{customer.full_name}</h2>
                <p className="text-slate-500 font-medium mt-1">{customer.phone_number}</p>
                
                <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Antigüedad</span>
                    <span className="text-xs font-bold text-slate-700">Cliente hace {stats.timeAsCustomer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Última Visita</span>
                    <span className="text-xs font-bold text-orange-600 uppercase tracking-tighter">
                      {stats.timeSinceLastPurchase}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">POS Origen</span>
                    <span className="text-xs font-bold text-slate-700">POS {customer.pos_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Fecha Registro</span>
                    <span className="text-xs font-bold text-slate-700">{format(new Date(customer.created_at), 'dd/MM/yyyy')}</span>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl border border-slate-200 transition-all"
                  >
                    <span>✏️</span> Editar
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl border border-rose-100 transition-all"
                  >
                    <span>🗑️</span> Eliminar
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Valor de Vida (LTV)</span>
              <div className="mt-4">
                <h3 className="text-4xl font-black text-orange-500">${stats.totalSpent.toLocaleString()}</h3>
                <p className="text-xs text-slate-400 mt-2">Monto total invertido en todos los POS.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-800">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operaciones</p>
                  <p className="text-xl font-bold">{stats.totalPurchases}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ticket Promedio</p>
                  <p className="text-xl font-bold">${stats.averageTicket.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sales History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Historial de Compras</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sales.length} registros</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">POS</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Monto</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            POS {sale.pos_number}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                          ${sale.total.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedSale(sale)}
                            className="text-[10px] font-bold text-orange-500 uppercase tracking-tighter hover:underline"
                          >
                            VER TICKET
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sales.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">
                          No se registra historial de compras.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">Editar Cliente</h3>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Modificar datos personales</p>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">POS de Origen</label>
                <select
                  value={editPos}
                  onChange={(e) => setEditPos(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                >
                  {posOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 animate-in fade-in zoom-in duration-200 text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              ⚠️
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">¿Eliminar cliente?</h3>
            <p className="text-slate-500 text-sm mb-8">
              Esta acción no se puede deshacer. Se eliminarán los datos del cliente, pero sus ventas permanecerán registradas como anónimas.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-rose-500/30 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar permanentemente'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest py-4 rounded-2xl transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
